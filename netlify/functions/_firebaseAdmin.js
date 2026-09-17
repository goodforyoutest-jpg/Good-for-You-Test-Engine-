/* ═══════════════════════════════════════════════════════════════
   _firebaseAdmin.js
   Shared Firebase Admin SDK bootstrap for server-side functions.

   NOT deployed as its own endpoint — Netlify only exposes files that
   export a `handler`. This one exports `getAdmin()` / `getDb()` and is
   required() by start-test.js and submit-test.js.

   ── REQUIRED NETLIFY ENV VARS ──────────────────────────────────────
   Create a service account in the Firebase Console:
     Project Settings → Service Accounts → Generate new private key
   That downloads a JSON file. Set these three Netlify env vars from it
   (Site settings → Environment variables):

     FB_ADMIN_PROJECT_ID    = the "project_id" field
     FB_ADMIN_CLIENT_EMAIL  = the "client_email" field
     FB_ADMIN_PRIVATE_KEY   = the "private_key" field, PASTED AS-IS
                               (Netlify's UI preserves the \n escapes;
                               this file un-escapes them below)

   Never commit the downloaded JSON file itself, and never put these
   values in netlify.toml or any client-side file — this credential
   can read/write your entire database, bypassing all Firestore rules.
   ═══════════════════════════════════════════════════════════════ */

const admin = require('firebase-admin');

function getAdmin() {
  if (!admin.apps.length) {
    const projectId   = process.env.FB_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FB_ADMIN_CLIENT_EMAIL;
    const privateKey  = (process.env.FB_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Server credentials are not configured (missing FB_ADMIN_* env vars).');
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }
  return admin;
}

function getDb() { return getAdmin().firestore(); }

/* Verifies the Authorization: Bearer <idToken> header.
   Returns the decoded token (has .uid) or throws. */
async function verifyAuth(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match  = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) { const e = new Error('Not signed in.'); e.statusCode = 401; throw e; }
  try {
    return await getAdmin().auth().verifyIdToken(match[1]);
  } catch {
    const e = new Error('Your session has expired. Please sign in again.'); e.statusCode = 401; throw e;
  }
}

function respond(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

/* Mirrors firebase.js's client-side normaliseQuestion(), server-side,
   for reading whatever shape is already stored in `tests/{id}.questions`. */
function normaliseQuestion(raw) {
  const q       = raw.q || raw.question || raw.text || raw.stem || '';
  const opts    = raw.opts || raw.options || raw.choices || raw.answers || [];
  const section = raw.section || raw.topic || raw.chapter || raw.category || '';
  const passage = raw.passage || raw.caseStudy || raw.passageText || '';
  const image        = raw.image || null;
  const imageCaption = raw.imageCaption || raw.caption || '';
  return { q, opts: Array.isArray(opts) ? opts : [], section, passage, image, imageCaption };
}
function normaliseQuestions(arr) {
  return (Array.isArray(arr) ? arr : []).map(normaliseQuestion).filter(q => q.q && q.opts.length >= 2);
}

/* Fisher-Yates order permutation (mirrors client shuffleOrder in firebase.js) */
function shuffleOrder(n) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { getAdmin, getDb, verifyAuth, respond, normaliseQuestions, shuffleOrder };
