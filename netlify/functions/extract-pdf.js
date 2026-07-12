/*
  extract-pdf.js — Netlify Function
  ─────────────────────────────────
  Extracts text from a base64-encoded PDF using pure JS (no native deps),
  then sends to Groq for MCQ extraction.

  WHY NO pdf-parse:
  pdf-parse tries to access the filesystem for test files at require() time,
  which crashes Netlify's esbuild bundler. Instead we use a lightweight
  pure-JS PDF text extractor that works in any serverless environment.

  Env variable required:
    GROQ_API_KEY  — set in Netlify Dashboard → Site → Environment Variables
*/

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

/* ─────────────────────────────────────────────────────────────
   Lightweight PDF text extractor — pure JS, no dependencies.
   Reads the raw PDF bytes and pulls out all text stream content.
   Works for text-based PDFs (not scanned images).
───────────────────────────────────────────────────────────── */
function extractTextFromPDFBuffer(buffer) {
  const str = buffer.toString('latin1');
  const chunks = [];

  // Extract content between BT (Begin Text) and ET (End Text) operators
  const btEtRegex = /BT([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(str)) !== null) {
    const block = match[1];

    // Extract strings from Tj, TJ, ' and " operators
    // Tj: (text)Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      chunks.push(decodePDFString(tjMatch[1]));
    }

    // TJ: [(text) spacing (text)] TJ
    const tjArrRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let tjArrMatch;
    while ((tjArrMatch = tjArrRegex.exec(block)) !== null) {
      const inner = tjArrMatch[1];
      const strRegex = /\(([^)]*)\)/g;
      let strMatch;
      while ((strMatch = strRegex.exec(inner)) !== null) {
        chunks.push(decodePDFString(strMatch[1]));
      }
    }

    // ' operator: (text)'
    const quoteRegex = /\(([^)]*)\)\s*'/g;
    let qMatch;
    while ((qMatch = quoteRegex.exec(block)) !== null) {
      chunks.push(decodePDFString(qMatch[1]));
      chunks.push('\n');
    }
  }

  // Also try to extract from stream objects (for some PDF variants)
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  while ((match = streamRegex.exec(str)) !== null) {
    const streamContent = match[1];
    if (streamContent.includes('BT') || streamContent.includes('Tj')) continue; // already handled
    // Look for readable ASCII text blocks in stream
    const readable = streamContent.replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
    if (readable.length > 20 && /[A-Za-z]{3,}/.test(readable)) {
      chunks.push(' ' + readable);
    }
  }

  let text = chunks.join(' ')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function decodePDFString(s) {
  return s
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')');
}

/* ─────────────────────────────────────────────────────────────
   Extract embedded JPEG/PNG images from a PDF buffer.
   Returns an array of base64 data-URI strings, one per image.
   These are raw XObject image streams — works for PDFs that
   embed photos, graphs, or diagrams as raster images.
───────────────────────────────────────────────────────────── */
function extractImagesFromPDFBuffer(buffer) {
  const images = [];
  const str    = buffer.toString('latin1');

  // Look for image XObjects: /Subtype /Image inside an obj block
  // followed by a stream containing the raw image bytes
  const objRegex = /\d+ \d+ obj([\s\S]*?)endobj/g;
  let objMatch;

  while ((objMatch = objRegex.exec(str)) !== null) {
    const obj = objMatch[1];

    // Must be an Image XObject
    if (!/\/Subtype\s*\/Image/.test(obj)) continue;

    // Get image dimensions for sanity check (skip tiny icons/decorations)
    const wMatch = obj.match(/\/Width\s+(\d+)/);
    const hMatch = obj.match(/\/Height\s+(\d+)/);
    const w = wMatch ? parseInt(wMatch[1]) : 0;
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    if (w < 60 || h < 60) continue; // skip tiny decorations

    // Determine type
    const isJPEG = /\/DCTDecode|\/DCT\b/.test(obj);
    const isPNG  = /\/FlateDecode/.test(obj) && /\/ColorSpace/.test(obj);

    if (!isJPEG && !isPNG) continue;

    // Extract stream content
    const streamMatch = obj.match(/stream\r?\n([\s\S]*?)\r?\nendstream/);
    if (!streamMatch) continue;

    const streamBytes = Buffer.from(streamMatch[1], 'latin1');
    if (streamBytes.length < 200) continue; // too small to be a real image

    const mimeType = isJPEG ? 'image/jpeg' : 'image/png';
    const b64      = streamBytes.toString('base64');
    images.push(`data:${mimeType};base64,${b64}`);

    if (images.length >= 10) break; // cap at 10 images per PDF
  }

  return images;
}

/* ─────────────────────────────────────────────────────────────
   Main handler
───────────────────────────────────────────────────────────── */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: 'Server configuration error: API key not set. Contact the administrator.' }),
    };
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request.' }) };
  }

  const { pdf: base64Pdf, filename = 'paper.pdf' } = body;
  if (!base64Pdf) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No PDF data received.' }) };
  }

  // Decode base64 → Buffer
  let pdfBuffer;
  try {
    pdfBuffer = Buffer.from(base64Pdf, 'base64');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Could not decode PDF data.' }) };
  }

  // Verify it looks like a PDF
  const magic = pdfBuffer.slice(0, 5).toString('ascii');
  if (!magic.startsWith('%PDF')) {
    return {
      statusCode: 400, headers,
      body: JSON.stringify({ error: 'File does not appear to be a valid PDF.' }),
    };
  }

  // Extract text
  let rawText;
  try {
    rawText = extractTextFromPDFBuffer(pdfBuffer);
  } catch (e) {
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'Could not read text from PDF: ' + (e.message || 'unknown error') }),
    };
  }

  if (!rawText || rawText.replace(/\s/g, '').length < 30) {
    return {
      statusCode: 422, headers,
      body: JSON.stringify({
        error: 'No readable text found in this PDF. It may be a scanned/image-based PDF. Please use a text-based PDF — one where you can click and select text when opening it normally.',
      }),
    };
  }

  // Extract embedded images (graphs, diagrams) — best-effort, won't fail if none found
  let embeddedImages = [];
  try {
    embeddedImages = extractImagesFromPDFBuffer(pdfBuffer);
  } catch (e) {
    console.log('Image extraction skipped:', e.message);
  }
  console.log(`Text length: ${rawText.length}, Images found: ${embeddedImages.length}`);

  // Truncate to fit model context
  const MAX_CHARS = 24000;
  const truncated = rawText.length > MAX_CHARS;
  const textForAI = truncated ? rawText.slice(0, MAX_CHARS) : rawText;

  // Build prompt
  const SYSTEM_PROMPT = `You are an expert at reading Indian educational exam papers (CA Foundation, CBSE, state boards, coaching institute papers) and extracting MCQ questions into structured JSON.

RULES — follow exactly:
1. Return ONLY a raw JSON object in this exact shape: {"questions": [...]}
   No markdown, no code fences, no explanation before or after.

2. Each question object must have:
   {
     "q": "Full question text",
     "opts": ["Option A text", "Option B text", "Option C text", "Option D text"],
     "ans": null,
     "section": "",
     "passage": "",
     "image": null,
     "imageCaption": "",
     "exp": ""
   }

3. "ans" field:
   - If the PDF contains an answer key or inline answer (Ans: B / Answer: (c) / Correct: 3), set ans to 0-indexed integer (A=0, B=1, C=2, D=3).
   - Otherwise set ans to null.

4. "passage" field:
   - If multiple questions share a common reading passage or case-study scenario, copy the FULL passage text into this field for EACH of those questions.
   - Leave empty string if no passage.

5. "section" field: if the paper has labelled sections (Section A, Paper 1, Chapter: Accounts etc.), set the section name for questions under it. Else empty string.

6. "image" field: if the text contains a reference to a figure, graph, diagram, or chart for a question (e.g. "Refer to Figure 1", "See graph below", "Based on the diagram"), set "image" to the string "[IMAGE_${imageIndex}]" where imageIndex is a sequential number starting from 1. Leave null if the question has no diagram reference.

7. "imageCaption": if there is a caption or figure label near the image reference, put it here. Else empty string.

8. Strip option labels: remove leading A) (a) 1. (i) etc. from option text — keep only the content.

9. Ignore ALL non-question content: headers, institute names, instructions, footers, roll number fields, date fields, page numbers, watermarks.

10. Never invent questions. Only extract what is in the text.

11. Keep question text exactly as written including numbers, formulas, Rs. amounts.`;

  const USER_PROMPT = `Extract all MCQ questions from this exam paper.\nFilename: ${filename}\n\n---\n\n${textForAI}${truncated ? '\n\n[TEXT TRUNCATED — extract questions from what is above]' : ''}`;

  // Call Groq
  let groqResp;
  try {
    groqResp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.1,
        max_tokens:  8000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: USER_PROMPT   },
        ],
      }),
    });
  } catch (e) {
    return {
      statusCode: 502, headers,
      body: JSON.stringify({ error: 'Could not reach AI service. Check your internet connection and try again.' }),
    };
  }

  if (!groqResp.ok) {
    const errText = await groqResp.text().catch(() => '');
    console.error('Groq error', groqResp.status, errText.slice(0, 300));
    const msg = groqResp.status === 401
      ? 'Invalid Groq API key. Please check the server configuration.'
      : groqResp.status === 429
      ? 'AI service is busy. Please wait a moment and try again.'
      : `AI service error (${groqResp.status}). Please try again.`;
    return { statusCode: 502, headers, body: JSON.stringify({ error: msg }) };
  }

  const groqData = await groqResp.json().catch(() => null);
  if (!groqData) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'AI returned an empty response. Please try again.' }) };
  }

  const rawOutput = groqData?.choices?.[0]?.message?.content || '';
  console.log('Groq raw output (first 300 chars):', rawOutput.slice(0, 300));

  // Parse JSON — handle markdown fences, leading text, etc.
  let questions;
  try {
    // Strip markdown code fences if present
    let clean = rawOutput.trim();
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

    // Find the first { or [
    const firstBrace   = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx;
    if (firstBrace === -1 && firstBracket === -1) throw new Error('No JSON found');
    if (firstBrace === -1)  startIdx = firstBracket;
    else if (firstBracket === -1) startIdx = firstBrace;
    else startIdx = Math.min(firstBrace, firstBracket);
    clean = clean.slice(startIdx);

    const parsed = JSON.parse(clean);

    if (Array.isArray(parsed)) {
      questions = parsed;
    } else if (parsed.questions && Array.isArray(parsed.questions)) {
      questions = parsed.questions;
    } else {
      // Find first array value in object
      const arrKey = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (arrKey) questions = parsed[arrKey];
      else throw new Error('No question array found');
    }
  } catch (e) {
    console.error('JSON parse failed:', e.message, '\nOutput was:', rawOutput.slice(0, 600));
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'AI returned a response that could not be read. Please try uploading the PDF again.' }),
    };
  }

  // Sanitise and resolve image placeholders
  const cleaned = [];
  let imageIdx = 0; // track which embedded image to assign next

  for (const q of (questions || [])) {
    if (!q || typeof q.q !== 'string' || !q.q.trim()) continue;
    if (!Array.isArray(q.opts) || q.opts.length < 2)  continue;
    const ansVal = (typeof q.ans === 'number' && Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length)
      ? q.ans : null;

    // Resolve image placeholder — match [IMAGE_N] and map to actual extracted image
    let resolvedImage = null;
    const imgField = typeof q.image === 'string' ? q.image.trim() : '';
    if (imgField && imgField.startsWith('[IMAGE_')) {
      // Extract the index N from [IMAGE_N]
      const numMatch = imgField.match(/\[IMAGE_(\d+)\]/);
      const refNum   = numMatch ? parseInt(numMatch[1]) - 1 : imageIdx;
      if (embeddedImages[refNum]) {
        resolvedImage = embeddedImages[refNum];
        imageIdx = refNum + 1;
      } else if (embeddedImages[imageIdx]) {
        // Fall back to next available image in order
        resolvedImage = embeddedImages[imageIdx];
        imageIdx++;
      }
    }

    cleaned.push({
      q:            q.q.trim(),
      opts:         q.opts.map(o => String(o ?? '').trim()).filter(Boolean),
      ans:          ansVal,
      section:      typeof q.section      === 'string' ? q.section.trim()      : '',
      passage:      typeof q.passage      === 'string' ? q.passage.trim()      : '',
      image:        resolvedImage,
      imageCaption: typeof q.imageCaption === 'string' ? q.imageCaption.trim() : '',
      exp:          typeof q.exp          === 'string' ? q.exp.trim()          : '',
    });
  }

  if (!cleaned.length) {
    return {
      statusCode: 422, headers,
      body: JSON.stringify({
        error: 'No valid questions could be extracted from this PDF. Make sure the PDF contains MCQ questions with clearly labeled options (A, B, C, D).',
      }),
    };
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({
      questions:     cleaned,
      total:         cleaned.length,
      truncated,
      imagesFound:   embeddedImages.length,
    }),
  };
};
