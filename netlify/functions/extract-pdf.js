/* ═══════════════════════════════════════════════════════════════
   extract-pdf.js
   Netlify Function — receives plain text extracted client-side by
   PDF.js, sends it to Groq, returns structured MCQ JSON.

   ZERO npm dependencies. Node.js built-ins only (global fetch,
   available on Netlify's Node 18+ runtime).

   Request  (POST, application/json):
     { text: string, filename: string, instructions?: string }

   The client may split one PDF into several batches of ~50 questions
   each (see pdf-to-test.html) and call this function once per batch —
   this function itself has no knowledge of batching; it just structures
   whatever text it's given. `instructions` (optional, teacher-provided
   free text such as "only extract the first 50 questions" or "ignore
   the Roman Numerals chapter") is sent along with every batch so it's
   honored consistently no matter which part of the paper a batch covers.

   Response (200):
     { questions: QuestionObject[], total: number }

   QuestionObject:
     { q, opts, ans, section, passage, exp, imageRef, imageRefUnconfirmed }
       q        — full question text, preserved exactly
       opts     — option texts, labels (A) (a) 1. etc stripped
       ans      — 0-indexed correct option (A=0..D=3), or null if unknown
       section  — section/chapter name if detectable, else ""
       passage  — full shared passage text, copied into each question
                  that shares it, else ""
       exp      — always "" (teacher adds explanations in Phase 3)
       imageRef — a token like "IMG_1" if an image placeholder from the
                  extracted text was clearly associated with this
                  question, else null. The browser resolves these
                  tokens to actual cropped images — this function
                  never sees image bytes. Tokens may carry an inline
                  caption, e.g. "[[IMG_1]] (Fig. 1 — Quarterly Sales)" —
                  prefer matching a token to a question by that caption
                  or an explicit figure reference in the question text
                  ("the chart below", "Fig. 4") over pure adjacency.
       imageRefUnconfirmed — true if imageRef was set but the question
                  text itself contains no visual-reference language
                  (no "figure"/"diagram"/"chart"/"shown below" etc.) —
                  a hint for the teacher to double-check that specific
                  attachment rather than trust it blindly.

   Error responses: { error: string } with an appropriate status code.
   Error strings are teacher-facing — what to do, not what went wrong.
═══════════════════════════════════════════════════════════════    NOTE ON PASSAGE TEXT: admin.html now runs a vision-labeling pass
   (netlify/functions/label-diagrams.js) before sending text here. Any
   text sitting inside a region confirmed as a real diagram (a
   flowchart's box labels, an org-chart's node names, etc.) has already
   been stripped out client-side — you will only see a diagram's
   "Fig. N — ..." caption line, never its internal label text. Don't
   assume a passage containing scattered short words is a diagram
   description to reconstruct; if it looks like scrambled labels rather
   than prose, it's more likely leftover text from an unconfirmed region
   (the vision call can fail soft) — treat it as ordinary passage text
   and do your best, but don't invent structure that isn't there.
*/

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Rough safety cap so we never send more than Groq's context window can
// hold alongside our system prompt + the 8000-token response budget.
// ~4 chars/token is a safe average for this kind of mixed English/number text.
const MAX_TEXT_CHARS = 150000;

const SYSTEM_PROMPT = `You are an expert at reading Indian CA Foundation exam papers and mock tests, and converting them into structured multiple-choice question data.

You will receive the plain text extracted from a PDF question paper. The text may contain inline tokens like [[IMG_1]], [[IMG_2]] etc. — these mark where a diagram or image appeared in the original PDF, roughly at that position in the reading order. A token is sometimes followed by a caption in parentheses, e.g. "[[IMG_1]] (Fig. 1 — Quarterly Sales, FY 2025-26)" — that caption is real text that was printed under the figure in the PDF, not something you need to verify.

Return ONLY a single JSON object of this exact shape — no markdown, no code fences, no preamble, no explanation, nothing before or after the JSON:

{"questions":[{"q":"...","opts":["...","...","...","..."],"ans":0,"section":"","passage":"","exp":"","imageRef":null}]}

Field rules:
- q: the full question text, preserved exactly as written (keep Rs. amounts, accounting formulas, journal entries, numbers exactly as they appear).
- opts: an array of the option texts only. Strip all option labels/numbering — "A)", "(a)", "(A)", "a.", "1.", "(i)" and similar — none of that belongs in the option text itself.
- ans: the 0-indexed correct option if you can determine it from an inline answer marker or an answer key elsewhere in the text (A/1/i=0, B/2/ii=1, C/3/iii=2, D/4/iv=3). If no answer can be determined, use null. Never guess.
- section: the section, chapter, or paper name this question belongs to, if the text indicates one (e.g. "Section A", "Paper 1", "Chapter: Accounts"). Otherwise "".
- passage: if this question is part of a passage or case-study block shared with other questions, copy the FULL passage text here (the same full text repeated on every question that shares it). Otherwise "".
- exp: always "" — do not fill this in.
- imageRef: set this to an [[IMG_n]] token's identifier (e.g. "IMG_1") only when you have a real reason to believe it belongs to THIS question. In order of preference:
  1. The question (or its shared passage) explicitly names the figure the token's caption matches — "the bar chart below", "Fig. 2", "the diagram shown", "study the flowchart above" — and the caption text next to the token corresponds.
  2. If there's no caption on the token, fall back to reading-order adjacency: the token appears immediately before, within, or right after this question's text, AND the question's own wording refers to a visual ("figure", "diagram", "chart", "shown above/below", "graph", "the table below" — not just any nearby text).
  Do NOT assign a token to a question purely because it is the nearest one in reading order if the question's text never references a figure at all — plenty of tokens mark decorative page elements, not real content, and a plain arithmetic or definition question next to one should get imageRef: null. A token should be assigned to at most one question — the one it's most clearly associated with.

What to extract:
- Extract every MCQ question you can find in the text, in the order they appear.
- Handle every question-numbering style you see: "Q1", "1.", "(1)", "Q.1", "1)".
- Handle every option-label style you see: "A)", "(a)", "(A)", "a.", "1.", "(i)".
- Detect passage / case-study blocks: text that precedes and is clearly shared context for multiple consecutive questions.
- Detect answer keys anywhere in the document — inline after each question, or as a table/list at the end — and use them only to fill in "ans". Never include the answer key itself as a question.

What to ignore completely (do not turn these into questions or include them anywhere in the output):
- Institute name, exam headers, general instructions, footers, page numbers.
- Roll number blanks, date blanks, signature lines, watermarks.
- The raw answer key table/list itself, once you've used it to fill in "ans" values.

If the text contains no identifiable MCQ questions, return {"questions":[]}.

Note: you may be receiving only part of a larger paper (the rest was sent in separate calls). Extract everything in the text you were given — do not skip questions assuming they'll appear elsewhere, and do not repeat questions from outside the text you were given.

Return ONLY the JSON object. Nothing else.`;

function buildSystemPrompt(instructions) {
  if (!instructions) return SYSTEM_PROMPT;
  return SYSTEM_PROMPT + `\n\nTEACHER'S INSTRUCTIONS — follow these strictly, they override the default extraction behavior above where they conflict:\n"""${instructions}"""\nIf these instructions say to skip, ignore, or exclude something, do not include it in "questions" at all. If they impose a limit (e.g. "only the first N questions"), respect that limit even if more questions are present in the text.\n\nRegardless of the instructions above, your entire response must still be ONLY the JSON object described earlier — no preamble like "Sure, here are...", no commentary, no markdown fences, nothing before or after the JSON.`;
}

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
    return respond(400, { error: 'Something went wrong reading your file. Please try uploading again.' }, headers);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return respond(400, { error: 'No readable text was found in this PDF. Make sure it\u2019s a text-based paper, not a scanned image.' }, headers);
  }

  const instructions = typeof body.instructions === 'string' ? body.instructions.trim().slice(0, 600) : '';

  if (text.length > MAX_TEXT_CHARS) {
    return respond(400, { error: 'This paper is too long to read in one go. Try splitting it into smaller sections and uploading each part separately.' }, headers);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return respond(500, { error: 'The AI reader isn\u2019t set up correctly. Please contact support.' }, headers);
  }

  let groqRes;
  const MAX_RETRIES = 2; // total up to 3 attempts: 0, 1, 2
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.1,
          max_tokens: 8000,
          messages: [
            { role: 'system', content: buildSystemPrompt(instructions) },
            { role: 'user', content: `Filename: ${String(body.filename || 'paper.pdf')}\n\nExtracted text:\n\n${text}` },
          ],
        }),
      });
    } catch {
      groqRes = null;
    }

    // Retry only on rate limiting or a network hiccup — not on other errors.
    const shouldRetry = (!groqRes || groqRes.status === 429) && attempt < MAX_RETRIES;
    if (!shouldRetry) break;
    await sleep(1500 * Math.pow(2, attempt)); // 1.5s, then 3s
  }

  if (!groqRes) {
    return respond(502, { error: 'Couldn\u2019t reach the AI service. Check your connection and try again.' }, headers);
  }

  if (!groqRes.ok) {
    if (groqRes.status === 401) {
      return respond(500, { error: 'The AI reader isn\u2019t set up correctly. Please contact support.' }, headers);
    }
    if (groqRes.status === 429) {
      return respond(429, { error: 'The AI reader is busy right now. Please try again in a minute.' }, headers);
    }
    return respond(502, { error: 'The AI reader had trouble with this paper. Please try again.' }, headers);
  }

  let groqData;
  try {
    groqData = await groqRes.json();
  } catch {
    return respond(502, { error: 'The AI reader sent back something unreadable. Please try again.' }, headers);
  }

  const rawContent = groqData?.choices?.[0]?.message?.content;
  if (typeof rawContent !== 'string' || !rawContent.trim()) {
    return respond(502, { error: 'The AI reader sent back something unreadable. Please try again.' }, headers);
  }

  let parsed;
  try {
    parsed = JSON.parse(extractJsonObject(stripCodeFences(rawContent)));
  } catch {
    return respond(502, { error: 'The AI reader sent back something unreadable. Please try again.' }, headers);
  }

  const questions = Array.isArray(parsed?.questions) ? parsed.questions.map(sanitiseQuestion).filter(Boolean) : [];

  if (questions.length === 0) {
    return respond(422, { error: 'No questions were found in this PDF. Make sure it\u2019s a question paper with multiple-choice questions.' }, headers);
  }

  return respond(200, { questions, total: questions.length }, headers);
};

function respond(statusCode, payload, headers) {
  return { statusCode, headers, body: JSON.stringify(payload) };
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// Safety net in case the model wraps its answer in ```json fences despite instructions.
function stripCodeFences(str) {
  const trimmed = str.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

// Safety net in case the model adds a preamble/commentary line before or
// after the JSON despite instructions (more likely to happen once a
// custom teacher instruction is in the prompt). Pulls out the outermost
// {...} block rather than requiring the whole response to be pure JSON.
function extractJsonObject(str) {
  const first = str.indexOf('{');
  const last = str.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return str;
  return str.slice(first, last + 1);
}

function sanitiseQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const q = typeof raw.q === 'string' ? raw.q.trim() : '';
  const opts = Array.isArray(raw.opts) ? raw.opts.map(o => String(o).trim()).filter(Boolean) : [];
  if (!q || opts.length < 2) return null;

  const ans = Number.isInteger(raw.ans) && raw.ans >= 0 && raw.ans < opts.length ? raw.ans : null;
  const section = typeof raw.section === 'string' ? raw.section.trim() : '';
  const passage = typeof raw.passage === 'string' ? raw.passage.trim() : '';
  const imageRef = typeof raw.imageRef === 'string' && raw.imageRef.trim() ? raw.imageRef.trim() : null;

  // The system prompt already asks the model to only attach a token when
  // the question references a figure, but models drift — this is a cheap,
  // deterministic second check so a stray attachment surfaces as "please
  // double-check this one" in the admin UI instead of silently shipping.
  const VISUAL_REF = /\b(figure|diagram|chart|graph|shown\s+(above|below)|table\s+below|flowchart|pie\s*chart|bar\s*chart)\b/i;
  const imageRefUnconfirmed = !!imageRef && !VISUAL_REF.test(q) && !VISUAL_REF.test(passage);

  return { q, opts, ans, section, passage, exp: '', imageRef, imageRefUnconfirmed };
}

