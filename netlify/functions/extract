/*
  extract-pdf.js — Netlify Function
  Receives a base64 PDF, extracts text with pdf-parse,
  sends to Groq (llama-3.3-70b), returns structured questions JSON.

  Environment variables required (set in Netlify dashboard):
    GROQ_API_KEY   — your Groq API key
*/

const pdfParse = require('pdf-parse');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

/* ── Max body size Netlify allows is 6MB for background functions,
   1MB for normal. We'll work within 6MB (PDF already base64-encoded
   so ~1.33x original size — a 4MB PDF becomes ~5.3MB base64). ── */

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured (missing API key).' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const { pdf: base64Pdf, filename = 'paper.pdf' } = body;
  if (!base64Pdf) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No PDF provided.' }) };
  }

  /* ── 1. Decode base64 → Buffer ── */
  let pdfBuffer;
  try {
    pdfBuffer = Buffer.from(base64Pdf, 'base64');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Could not decode PDF.' }) };
  }

  /* ── 2. Extract text via pdf-parse ── */
  let rawText;
  try {
    const parsed = await pdfParse(pdfBuffer, { max: 0 });
    rawText = parsed.text?.trim();
    if (!rawText || rawText.length < 40) {
      return {
        statusCode: 422, headers,
        body: JSON.stringify({
          error: 'Could not extract text from this PDF. It may be a scanned image. Please use a text-based PDF (one where you can select and copy text).',
        }),
      };
    }
  } catch (e) {
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'PDF parsing failed: ' + (e.message || 'unknown error') }),
    };
  }

  /* ── 3. Truncate if massive (Groq context limit safety) ── */
  const MAX_CHARS = 28000;
  const truncated = rawText.length > MAX_CHARS;
  const textForAI = truncated ? rawText.slice(0, MAX_CHARS) : rawText;

  /* ── 4. Build extraction prompt ── */
  const SYSTEM_PROMPT = `You are an expert at reading Indian educational exam papers (CA Foundation, CBSE, state boards, coaching institute papers) and converting them into structured question banks.

Your task: extract ALL multiple-choice questions from the text provided and return them as a JSON array.

IMPORTANT RULES:
1. Return ONLY a valid JSON array — no explanation, no markdown, no code fences, no preamble whatsoever.
2. Each element must follow this exact schema:
   {
     "q": "Full question text (string)",
     "opts": ["Option text", "Option text", "Option text", "Option text"],
     "ans": null or integer (0-indexed: 0=A, 1=B, 2=C, 3=D),
     "section": "Section/subject name if present, else empty string",
     "passage": "Passage or case-study text if this question belongs to one, else empty string",
     "exp": ""
   }

3. For the "ans" field:
   - If the answer IS given in the PDF (e.g. "Ans: B", "Answer: (c)", "Correct: 3", answer key at the end), set "ans" to the 0-indexed integer (A=0, B=1, C=2, D=3).
   - If the answer is NOT given, set "ans" to null.

4. For PASSAGE / CASE STUDY questions:
   - Detect when multiple questions share a common reading passage or scenario.
   - Copy the FULL passage text into the "passage" field of EACH question that belongs to it.
   - The "q" field should contain only the specific sub-question, not the passage.

5. Option labeling: strip leading labels like "A)", "(a)", "1.", "(i)" from option text — store just the clean content.

6. Section detection: if the paper has sections (Section A, Paper 1, Chapter: Accounts, etc.) note the section name in the "section" field of each question under it.

7. Handle varied numbering: Q1, 1., (1), Q.1, 1) — all mean question number 1.

8. If a question has only 2 or 3 options (True/False etc.) include only those options. If it has 5+ options include all.

9. Never invent or hallucinate questions. Only extract what is explicitly present in the text.

10. Preserve the original question text exactly (including any figures of numbers, formula terms, or quoted text).`;

  const USER_PROMPT = `Extract all questions from the following exam paper text.\n\nFilename: ${filename}\n\n---\n\n${textForAI}${truncated ? '\n\n[Note: text was truncated at 28000 characters due to length — extract questions from what is available above]' : ''}`;

  /* ── 5. Call Groq ── */
  let groqResp;
  try {
    groqResp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: USER_PROMPT },
        ],
        temperature: 0.1,   // low = more consistent structure
        max_tokens:  8000,
        response_format: { type: 'json_object' }, // Groq supports this for JSON enforcement
      }),
    });
  } catch (e) {
    return {
      statusCode: 502, headers,
      body: JSON.stringify({ error: 'Could not reach Groq API: ' + (e.message || 'network error') }),
    };
  }

  if (!groqResp.ok) {
    const errBody = await groqResp.text().catch(() => '');
    console.error('Groq error:', groqResp.status, errBody);
    return {
      statusCode: 502, headers,
      body: JSON.stringify({ error: `Groq API error (${groqResp.status}). Please try again.` }),
    };
  }

  const groqData = await groqResp.json();
  const rawOutput = groqData?.choices?.[0]?.message?.content || '';

  /* ── 6. Parse JSON from model output ── */
  let questions;
  try {
    // response_format: json_object means the model wraps array in an object.
    // Handle both {"questions":[...]} and direct [...] responses.
    let parsed = JSON.parse(rawOutput.trim());

    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else {
      // Try to find an array value in the object
      const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (arrKey) {
        questions = parsed[arrKey];
      } else {
        throw new Error('No question array found in model response');
      }
    }
  } catch (e) {
    console.error('JSON parse error:', e.message, '\nRaw output:', rawOutput.slice(0, 500));
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'AI returned an unreadable response. Please try again, or try a different PDF.' }),
    };
  }

  /* ── 7. Sanitise & validate each question ── */
  const cleaned = [];
  for (const q of questions) {
    if (typeof q.q !== 'string' || !q.q.trim()) continue;           // skip empty questions
    if (!Array.isArray(q.opts) || q.opts.length < 2) continue;     // skip questions with <2 options

    cleaned.push({
      q:       q.q.trim(),
      opts:    q.opts.map(o => String(o).trim()),
      ans:     (typeof q.ans === 'number' && q.ans >= 0 && q.ans < q.opts.length) ? q.ans : null,
      section: typeof q.section === 'string' ? q.section.trim() : '',
      passage: typeof q.passage === 'string' ? q.passage.trim() : '',
      exp:     typeof q.exp === 'string'     ? q.exp.trim()     : '',
    });
  }

  if (!cleaned.length) {
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'No valid questions could be extracted. Make sure the PDF contains MCQ-style questions with clearly labeled options.' }),
    };
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ questions: cleaned, total: cleaned.length, truncated }),
  };
};
