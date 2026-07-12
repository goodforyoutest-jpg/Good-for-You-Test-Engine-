/*
  extract-pdf.js — Netlify Function
  ─────────────────────────────────
  Zero npm dependencies. Handles:
    • Raw uncompressed PDF text streams (BT/ET)
    • FlateDecode (zlib) compressed streams
    • ASCII85Decode + FlateDecode (ReportLab default)
    • ASCII85Decode only
  Then sends extracted text to Groq for MCQ extraction.

  Required env var (Netlify Dashboard → Environment Variables):
    GROQ_API_KEY
*/

const zlib = require('zlib');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

/* ─── ASCII85 decoder ─── */
function decodeASCII85(raw) {
  const endIdx = raw.indexOf('~>');
  const s = (endIdx !== -1 ? raw.slice(0, endIdx) : raw).replace(/\s/g, '');
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === 'z') { out.push(0, 0, 0, 0); i++; continue; }
    const chunk = [];
    for (let k = 0; k < 5 && i < s.length; k++, i++) chunk.push(s.charCodeAt(i) - 33);
    const pad = 5 - chunk.length;
    while (chunk.length < 5) chunk.push(84);
    let val = 0;
    for (const c of chunk) val = val * 85 + c;
    const bytes = [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff];
    out.push(...bytes.slice(0, 4 - pad));
  }
  return Buffer.from(out);
}

/* ─── Decode a raw stream given its filter chain ─── */
function decodeStream(rawStr, filters) {
  let data = Buffer.from(rawStr, 'latin1');
  // Apply filters in order
  for (const filter of filters) {
    if (filter === 'ASCII85Decode') {
      data = decodeASCII85(data.toString('latin1'));
    } else if (filter === 'FlateDecode') {
      data = zlib.inflateSync(data);
    }
    // Other filters (LZWDecode, RunLengthDecode etc.) — skip, not common in text PDFs
  }
  return data.toString('latin1');
}

/* ─── Extract text from decoded stream content ─── */
function extractTextFromStream(content) {
  const chunks = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btEt.exec(content)) !== null) {
    const block = m[1];
    // (text)Tj
    for (const t of block.matchAll(/\(([^)]*)\)\s*Tj/g))
      chunks.push(decodePDFStr(t[1]));
    // [(text)-spacing(text)]TJ
    for (const t of block.matchAll(/\[([\s\S]*?)\]\s*TJ/g))
      for (const s of t[1].matchAll(/\(([^)]*)\)/g))
        chunks.push(decodePDFStr(s[1]));
    // (text)'
    for (const t of block.matchAll(/\(([^)]*)\)\s*'/g)) {
      chunks.push(decodePDFStr(t[1]));
      chunks.push('\n');
    }
  }
  return chunks.join(' ');
}

function decodePDFStr(s) {
  return s
    .replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
    .replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\').replace(/\\\(/g, '(').replace(/\\\)/g, ')');
}

/* ─── Main PDF text extraction ─── */
function extractTextFromPDF(buf) {
  const str = buf.toString('latin1');
  let allText = '';

  // Walk through all stream objects
  let pos = 0;
  while (true) {
    const streamPos = str.indexOf('stream', pos);
    if (streamPos === -1) break;

    // Must be followed by \n (or \r\n)
    const charAfter = str[streamPos + 6];
    if (charAfter !== '\n' && charAfter !== '\r') { pos = streamPos + 1; continue; }
    const dataStart = streamPos + 6 + (charAfter === '\r' ? 2 : 1);

    // Find the dict before this stream to get filter info
    // Look backwards from streamPos for the most recent '<<'
    const dictEnd   = streamPos;
    const dictStart = str.lastIndexOf('<<', dictEnd);
    const dictStr   = dictStart !== -1 ? str.slice(dictStart, dictEnd) : '';

    // Parse filters
    const filters = [];
    const filterMatch = dictStr.match(/\/Filter\s*(?:\[([^\]]*)\]|(\S+))/);
    if (filterMatch) {
      const filterStr = (filterMatch[1] || filterMatch[2] || '').trim();
      for (const f of filterStr.matchAll(/\/(\w+)/g)) filters.push(f[1]);
    }

    // Skip non-text streams (images etc.)
    const isFont   = dictStr.includes('/Font');
    const isImage  = dictStr.includes('/Subtype /Image') || dictStr.includes('/Subtype/Image');
    const hasText  = filters.length === 0 || filters.some(f => ['ASCII85Decode','FlateDecode'].includes(f));
    if (isImage) { pos = streamPos + 1; continue; }

    // Find endstream
    const endPos  = str.indexOf('endstream', dataStart);
    if (endPos === -1) { pos = streamPos + 1; continue; }

    const rawData = str.slice(dataStart, endPos).replace(/\r?\n$/, '');
    pos = endPos + 9;

    try {
      let content;
      if (filters.length === 0) {
        content = rawData; // uncompressed
      } else {
        content = decodeStream(rawData, filters);
      }
      const text = extractTextFromStream(content);
      if (text.trim()) allText += text + '\n';
    } catch (e) {
      // Skip streams we can't decode — non-fatal
    }
  }

  // Clean up
  return allText
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ─── Main handler ─── */
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server configuration error: API key missing.' }) };

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) }; }

  const { pdf: base64Pdf, filename = 'paper.pdf' } = body;
  if (!base64Pdf)
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'No PDF data received.' }) };

  let pdfBuffer;
  try { pdfBuffer = Buffer.from(base64Pdf, 'base64'); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Could not decode PDF data.' }) }; }

  if (!pdfBuffer.slice(0, 5).toString('ascii').startsWith('%PDF'))
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'File does not appear to be a valid PDF.' }) };

  let rawText;
  try {
    rawText = extractTextFromPDF(pdfBuffer);
    console.log('Extracted text length:', rawText.length);
    console.log('Sample:', rawText.slice(0, 200));
  } catch (e) {
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'Could not read PDF: ' + e.message }) };
  }

  if (!rawText || rawText.replace(/\s/g, '').length < 30)
    return {
      statusCode: 422, headers,
      body: JSON.stringify({
        error: 'No readable text found in this PDF. It may be a scanned/image-based PDF. Please use a text-based PDF — one where you can click and select text when you open it normally.',
      }),
    };

  const MAX_CHARS = 24000;
  const truncated = rawText.length > MAX_CHARS;
  const textForAI = truncated ? rawText.slice(0, MAX_CHARS) : rawText;

  const SYSTEM_PROMPT = `You are an expert at reading Indian educational exam papers (CA Foundation, CBSE, state boards, coaching institute papers) and extracting MCQ questions into structured JSON.

RULES — follow exactly:
1. Return ONLY a raw JSON object: {"questions": [...]}
   No markdown, no code fences, no explanation before or after.

2. Each question object:
   {
     "q": "Full question text",
     "opts": ["Option A text", "Option B text", "Option C text", "Option D text"],
     "ans": null,
     "section": "",
     "passage": "",
     "exp": ""
   }

3. "ans": if an answer key exists (Ans: B / Answer: (c) / at end of paper), set to 0-indexed integer (A=0,B=1,C=2,D=3). Otherwise null.

4. "passage": if questions share a reading passage/case-study, copy the FULL passage into this field for EACH of those questions. Empty string otherwise.

5. "section": label from paper sections (Section A, Chapter: Accounts, etc.). Empty string if none.

6. Strip option labels: remove A) (a) 1. (i) etc. — keep only content text.

7. IGNORE: headers, institute name, instructions, footer, page numbers, roll number fields, date fields, watermarks, answer keys (use them for "ans" only).

8. Never invent questions. Only extract what is explicitly in the text.

9. Preserve exact question text including numbers, Rs. amounts, formulas.`;

  const USER_PROMPT = `Extract all MCQ questions from this exam paper.\nFilename: ${filename}\n\n---\n\n${textForAI}${truncated ? '\n\n[TEXT TRUNCATED]' : ''}`;

  let groqResp;
  try {
    groqResp = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL, temperature: 0.1, max_tokens: 8000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: USER_PROMPT   },
        ],
      }),
    });
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not reach AI service. Please try again.' }) };
  }

  if (!groqResp.ok) {
    const t = await groqResp.text().catch(() => '');
    console.error('Groq error', groqResp.status, t.slice(0, 200));
    const msg = groqResp.status === 401 ? 'Invalid Groq API key.'
              : groqResp.status === 429 ? 'AI service is busy. Please wait a moment and try again.'
              : `AI service error (${groqResp.status}). Please try again.`;
    return { statusCode: 502, headers, body: JSON.stringify({ error: msg }) };
  }

  const groqData  = await groqResp.json().catch(() => null);
  const rawOutput = groqData?.choices?.[0]?.message?.content || '';
  console.log('Groq output (first 300):', rawOutput.slice(0, 300));

  let questions;
  try {
    let clean = rawOutput.trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    const fi = Math.min(
      clean.indexOf('{') === -1 ? Infinity : clean.indexOf('{'),
      clean.indexOf('[') === -1 ? Infinity : clean.indexOf('['),
    );
    if (fi === Infinity) throw new Error('No JSON found');
    clean = clean.slice(fi);
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) questions = parsed;
    else if (Array.isArray(parsed.questions)) questions = parsed.questions;
    else {
      const k = Object.keys(parsed).find(k => Array.isArray(parsed[k]));
      if (k) questions = parsed[k]; else throw new Error('No array found');
    }
  } catch (e) {
    console.error('Parse fail:', e.message, rawOutput.slice(0, 400));
    return { statusCode: 422, headers, body: JSON.stringify({ error: 'AI returned an unreadable response. Please try again.' }) };
  }

  const cleaned = [];
  for (const q of (questions || [])) {
    if (!q || typeof q.q !== 'string' || !q.q.trim()) continue;
    if (!Array.isArray(q.opts) || q.opts.length < 2) continue;
    const ansVal = (typeof q.ans === 'number' && Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length)
      ? q.ans : null;
    cleaned.push({
      q:       q.q.trim(),
      opts:    q.opts.map(o => String(o ?? '').trim()).filter(Boolean),
      ans:     ansVal,
      section: typeof q.section === 'string' ? q.section.trim() : '',
      passage: typeof q.passage === 'string' ? q.passage.trim() : '',
      exp:     typeof q.exp     === 'string' ? q.exp.trim()     : '',
    });
  }

  if (!cleaned.length)
    return {
      statusCode: 422, headers,
      body: JSON.stringify({ error: 'No valid questions could be extracted. Make sure the PDF contains MCQ questions with clearly labeled options (A, B, C, D).' }),
    };

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ questions: cleaned, total: cleaned.length, truncated }),
  };
};
