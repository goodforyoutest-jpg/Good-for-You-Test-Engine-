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
     { labels: { [id]: { isRealDiagram: boolean, isTable: boolean, reason: string } } }

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

const SYSTEM_PROMPT = `You are reviewing a single page image from a scanned exam/question paper (Indian CA Foundation style mock tests). A geometric detector already found candidate regions on this page that MIGHT be diagrams — your job is to look at the actual page image and judge each one.

You will be given the page image and a list of candidate regions, each described by its approximate position on the page (as a percentage from the top-left corner) and, if one was found nearby, the caption text printed under it (e.g. "Fig. 2 — Order-to-Cash Process").

For EACH region, decide two things by actually looking at that part of the image:
1. isRealDiagram: true if it is a genuine chart, flowchart, graph, tree/org-chart, geometric figure, or other diagram a student needs to SEE to answer a question. false if it's decorative page furniture instead — a shaded background box, table row shading/zebra-striping, a header banner, a divider line, a watermark, or any other non-content graphic.
2. isTable: true if the region is a data TABLE (rows and columns of text/numbers) rather than a graphical diagram. Tables should stay as plain text, not be treated as an image — set isRealDiagram to false for these too, since they don't need a cropped image. isTable is really only meaningful when isRealDiagram is false; leave it false whenever the region is a genuine diagram.

Be conservative: if a region is only a shaded rectangle or a background color with no genuine chart/diagram content inside it, isRealDiagram is false. If it's a real bar chart, pie chart, flowchart, org chart, geometric figure, or similar, isRealDiagram is true.

Return ONLY a single JSON object, no markdown, no commentary, nothing before or after it:
{"labels":{"<id>":{"isRealDiagram":true,"isTable":false,"reason":"one short phrase"}}}

Include an entry for every region id you were given. Nothing else in your response.`;

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
  if (boxes.length === 0) {
    return respond(200, { labels: {} }, headers); // nothing to label — not an error
  }

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
  return respond(200, { labels }, headers);
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
