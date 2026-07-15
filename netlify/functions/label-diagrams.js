/* ═══════════════════════════════════════════════════════════════
   label-diagrams.js
   Netlify Function — reviews ONE rendered PDF page image against a
   list of candidate regions that admin.html's geometric detector
   (extractPdfPageImageBoxes / clusterVectorPaths) already flagged as
   possible diagrams, and labels each one.

   This does NOT replace the geometric cropping — pdf.js still owns
   exact pixel boxes, which a vision model can't reproduce reliably.
   This function only answers the judgment calls geometry can't:
     - is this region a real diagram, or decorative page furniture
       (shaded backgrounds, table-row zebra-striping, dividers)?
     - is it a data TABLE (should stay as text) or a graphical
       DIAGRAM (should stay as a cropped image)?

   Uses GROQ_VISION_API_KEY — deliberately a separate key/env var from
   the GROQ_API_KEY used by extract-pdf.js, so a rate limit or outage
   on one call never blocks the other.

   Request (POST, application/json):
     {
       filename: string,
       pageImage: string,       // base64 PNG data URL, downscaled — see admin.html
       boxes: [{
         id: string,             // matches admin.html's box id, echoed back unchanged
         xPct, yPct, wPct, hPct: number, // 0-100, region position/size as a % of the page
         caption: string | null  // nearest "Fig. N — ..." caption text, if any was found
       }]
     }

   Response (200):
     {
       labels: { [id]: { isRealDiagram: boolean, isTable: boolean, reason: string } },
       tables: [{ xPct, yPct, wPct, hPct, reason: string }]  // independently
         // proposed table regions, found by scanning the whole page image —
         // not tied to any candidate box id, since plain-text tables have
         // no vector geometry to seed a candidate from in the first place.
     }

   If a box's id is missing from the response (model omitted it), the
   caller should treat it as "unconfirmed" and fall back to the
   geometry-only decision rather than assume either true or false.

   Error responses: { error: string } — teacher-facing, but this
   function is designed to fail SOFT: admin.html should treat any
   non-200 response the same as "no labels available" and continue
   with geometry-only detection, never block the upload on this call.
═══════════════════════════════════════════════════════════════ */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Groq's vision-model lineup changes frequently (see console.groq.com/docs/vision) —
// verify this is still current/production before relying on it long-term.
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

const MAX_BOXES = 12; // a page with more candidate regions than this is almost certainly noisy furniture — cap the request rather than send an oversized prompt

const SYSTEM_PROMPT = `You are reviewing a single page image from a scanned exam/question paper (Indian CA Foundation style mock tests). A geometric detector already found candidate regions on this page that MIGHT be diagrams — your job is to look at the actual page image and judge each one, AND separately look for any data TABLE on the page (tables have no drawn geometry, so nothing flags them automatically — you have to spot them visually).

You will be given the page image and a list of candidate regions, each described by its approximate position on the page (as a percentage from the top-left corner) and, if one was found nearby, the caption text printed under it (e.g. "Fig. 2 — Order-to-Cash Process").

PART 1 — for EACH candidate region given to you, decide two things by actually looking at that part of the image:
1. isRealDiagram: true if it is a genuine chart, flowchart, graph, tree/org-chart, geometric figure, or other diagram a student needs to SEE to answer a question. false if it's decorative page furniture instead — a shaded background box, table row shading/zebra-striping, a header banner, a divider line, a watermark, or any other non-content graphic.
2. isTable: true if the region is a data TABLE (rows and columns of text/numbers) rather than a graphical diagram. isTable is only meaningful when isRealDiagram is false — a genuine diagram is never also a table.

PART 2 — separately, scan the WHOLE page image (not just the candidate regions above) for any data table — rows and columns of text/numbers, such as a trial balance, an inventory register, or any other tabular data — that a question refers to. For each one you find, report its approximate bounding box as a percentage of the page (from the top-left corner). Only report genuine multi-row, multi-column tables — not a single line of text, not an ordinary paragraph, not the multiple-choice answer options themselves.

Be conservative on both parts: if something is just a shaded rectangle or background color with no genuine content inside it, it isn't a diagram or a table. If it's a real chart, flowchart, org chart, geometric figure, or table, say so.

Return ONLY a single JSON object, no markdown, no commentary, nothing before or after it:
{"labels":{"<id>":{"isRealDiagram":true,"isTable":false,"reason":"one short phrase"}},"tables":[{"xPct":10,"yPct":20,"wPct":80,"hPct":15,"reason":"one short phrase"}]}

Include an entry in "labels" for every candidate region id you were given. "tables" may be an empty array if you find no tables on the page. Nothing else in your response.`;

const MAX_TABLES = 6; // a page reporting more table regions than this is very likely a scanning error

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return respond(405, { error: 'This action isn\u2019t supported.' }, headers);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Couldn\u2019t read the page image data. Please try again.' }, headers);
  }

  const pageImage = typeof body.pageImage === 'string' ? body.pageImage : '';
  const boxes = Array.isArray(body.boxes) ? body.boxes.slice(0, MAX_BOXES) : [];

  if (!pageImage.startsWith('data:image/')) {
    return respond(400, { error: 'No valid page image was provided.' }, headers);
  }
  // Note: we deliberately do NOT short-circuit when boxes.length === 0 —
  // a page can have zero geometry-detected diagram candidates and still
  // contain a plain-text table, which only PART 2 of the prompt (scanning
  // the whole page image) can find.

  const cleanBoxes = boxes
    .filter(b => b && typeof b.id === 'string')
    .map(b => ({
      id: b.id,
      xPct: round1(b.xPct), yPct: round1(b.yPct),
      wPct: round1(b.wPct), hPct: round1(b.hPct),
      caption: typeof b.caption === 'string' && b.caption.trim() ? b.caption.trim() : null,
    }));

  const apiKey = process.env.GROQ_VISION_API_KEY;
  if (!apiKey) {
    return respond(500, { error: 'The diagram reviewer isn\u2019t set up correctly. Please contact support.' }, headers);
  }

  const userText = `Filename: ${String(body.filename || 'paper.pdf')}\n\nCandidate regions on this page:\n${JSON.stringify(cleanBoxes, null, 2)}`;

  let groqRes;
  try {
    groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: pageImage } },
            ],
          },
        ],
      }),
    });
  } catch {
    groqRes = null;
  }

  // This function is designed to fail soft from the CALLER's perspective
  // (admin.html falls back to geometry-only detection on any non-200), so
  // we still return clear statuses here for logging/debugging purposes —
  // just don't ever make the caller treat "vision review unavailable" as
  // fatal to the whole PDF upload.
  if (!groqRes) {
    return respond(502, { error: 'Couldn\u2019t reach the diagram reviewer. Falling back to automatic detection.' }, headers);
  }
  if (!groqRes.ok) {
    if (groqRes.status === 401) {
      return respond(500, { error: 'The diagram reviewer isn\u2019t set up correctly. Please contact support.' }, headers);
    }
    if (groqRes.status === 429) {
      return respond(429, { error: 'The diagram reviewer is busy right now.' }, headers);
    }
    return respond(502, { error: 'The diagram reviewer had trouble with this page.' }, headers);
  }

  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return respond(502, { error: 'The diagram reviewer sent back something unreadable.' }, headers);
  }

  const rawContent = groqData?.choices?.[0]?.message?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    return respond(502, { error: 'The diagram reviewer sent back something unreadable.' }, headers);
  }

  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(stripCodeFences(rawContent)));
  } catch {
    return respond(502, { error: 'The diagram reviewer sent back something unreadable.' }, headers);
  }

  const labels = sanitiseLabels(parsed?.labels, cleanBoxes);
  const tables = sanitiseTables(parsed?.tables);
  return respond(200, { labels, tables }, headers);
};

function sanitiseLabels(raw, cleanBoxes) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  const validIds = new Set(cleanBoxes.map(b => b.id));
  for (const [id, val] of Object.entries(raw)) {
    if (!validIds.has(id) || !val || typeof val !== 'object') continue;
    out[id] = {
      isRealDiagram: val.isRealDiagram === true,
      isTable: val.isTable === true,
      reason: typeof val.reason === 'string' ? val.reason.trim().slice(0, 200) : '',
    };
  }
  return out;
}

function sanitiseTables(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(t => t && typeof t === 'object')
    .map(t => ({
      xPct: clampPct(t.xPct), yPct: clampPct(t.yPct),
      wPct: clampPct(t.wPct), hPct: clampPct(t.hPct),
      reason: typeof t.reason === 'string' ? t.reason.trim().slice(0, 200) : '',
    }))
    // A genuine table region needs meaningful size — this also weeds out
    // the model reporting a stray answer-option line as a "table".
    .filter(t => t.wPct >= 15 && t.hPct >= 4)
    .slice(0, MAX_TABLES);
}

function clampPct(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

function round1(n) { return typeof n === 'number' ? Math.round(n * 10) / 10 : 0; }

function respond(statusCode, payload, headers) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function stripCodeFences(str) {
  const trimmed = str.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function extractJsonObject(str) {
  const first = str.indexOf('{');
  const last = str.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return str;
  return str.slice(first, last + 1);
}
