/* ═══════════════════════════════════════════════════════════════
   extract-pdf.js
   Netlify Function — receives plain text extracted client-side by
   PDF.js, sends it to Groq, returns structured MCQ JSON.

   ZERO npm dependencies. Node.js built-ins only (global fetch,
   available on Netlify's Node 18+ runtime).

   Request  (POST, application/json):
     { text: string, filename: string }

   Response (200):
     { questions: QuestionObject[], total: number }

   QuestionObject:
     { q, opts, ans, section, passage, exp, imageRef }
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
                  never sees image bytes.

   Error responses: { error: string } with an appropriate status code.
   Error strings are teacher-facing — what to do, not what went wrong.
═══════════════════════════════════════════════════════════════ */

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Rough safety cap so we never send more than Groq's context window can
// hold alongside our system prompt + the 8000-token response budget.
// ~4 chars/token is a safe average for this kind of mixed English/number text.
const MAX_TEXT_CHARS = 150000;

const SYSTEM_PROMPT = `You are an expert at reading Indian CA Foundation exam papers and mock tests, and converting them into structured multiple-choice question data.

You will receive the plain text extracted from a PDF question paper. The text may contain inline tokens like [[IMG_1]], [[IMG_2]] etc. — these mark where a diagram or image appeared in the original PDF, roughly at that position in the reading order.

Return ONLY a single JSON object of this exact shape — no markdown, no code fences, no preamble, no explanation, nothing before or after the JSON:

{"questions":[{"q":"...","opts":["...","...","...","..."],"ans":0,"section":"","passage":"","exp":"","imageRef":null}]}

Field rules:
- q: the full question text, preserved exactly as written (keep Rs. amounts, accounting formulas, journal entries, numbers exactly as they appear).
- opts: an array of the option texts only. Strip all option labels/numbering — "A)", "(a)", "(A)", "a.", "1.", "(i)" and similar — none of that belongs in the option text itself.
- ans: the 0-indexed correct option if you can determine it from an inline answer marker or an answer key elsewhere in the text (A/1/i=0, B/2/ii=1, C/3/iii=2, D/4/iv=3). If no answer can be determined, use null. Never guess.
- section: the section, chapter, or paper name this question belongs to, if the text indicates one (e.g. "Section A", "Paper 1", "Chapter: Accounts"). Otherwise "".
- passage: if this question is part of a passage or case-study block shared with other questions, copy the FULL passage text here (the same full text repeated on every question that shares it). Otherwise "".
- exp: always "" — do not fill this in.
- imageRef: if an [[IMG_n]] token appears immediately before, within, or right after this question's text (and clearly belongs to this question rather than a neighboring one), set this to the token's identifier, e.g. "IMG_1". Otherwise null. A token should be assigned to at most one question — the one it's most clearly associated with by position.

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

Return ONLY the JSON object. Nothing else.`;

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

  if (text.length > MAX_TEXT_CHARS) {
    return respond(400, { error: 'This paper is too long to read in one go. Try splitting it into smaller sections and uploading each part separately.' }, headers);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return respond(500, { error: 'The AI reader isn\u2019t set up correctly. Please contact support.' }, headers);
  }

  let groqRes;
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Filename: ${String(body.filename || 'paper.pdf')}\n\nExtracted text:\n\n${text}` },
        ],
      }),
    });
  } catch {
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
    parsed = JSON.parse(stripCodeFences(rawContent));
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

// Safety net in case the model wraps its answer in ```json fences despite instructions.
function stripCodeFences(str) {
  const trimmed = str.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
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

  return { q, opts, ans, section, passage, exp: '', imageRef };
}

