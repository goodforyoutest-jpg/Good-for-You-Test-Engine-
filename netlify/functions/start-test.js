/* ═══════════════════════════════════════════════════════════════
   start-test.js
   Netlify Function — the ONLY place a live test's question set is
   assembled for a student taking it. Replaces the old client-side
   flow in test.html that read `tests/{id}` (which used to embed the
   correct answer inline) straight from the browser.

   Why this exists: previously, `q.ans` for every question sat in the
   page's JS state for the whole attempt — open devtools, read
   `questions`, done. This function returns questions with NO `ans`/
   `exp` field at all. The correct answers live in a separate
   `testAnswers/{testId}` document that Firestore rules deny to every
   client (see firestore.rules) — only this server process, using the
   Admin SDK, can read it, and only submit-test.js ever does, at the
   very end, to grade.

   It also owns the one piece of state that MUST be decided
   server-side to keep grading honest: which shuffled order (if any)
   the student sees the questions in. That mapping (`answerKeyOrder`)
   is written to `attempts/{testId}_{uid}` by this function only —
   the client is never allowed to write that field (see the Firestore
   rule restricting client updates on `attempts/*` to a safe field
   allow-list). If the client could set its own order, it could point
   its answers at whichever slot it wants credited as "correct".

   Request  (POST, application/json, Authorization: Bearer <idToken>):
     { testId: string }

   Response (200):
     Fresh / resumed in-progress attempt:
       { status: 'in-progress', attemptDocId, testTitle, questions,
         answered, currentQ, tabSwitchCount, cheatLog, remainingSecs,
         durationMinutes, marksCorrect, marksWrong, negativeMarking,
         reloadIsViolation, autoSubmitReason }
     Already completed:
       { status: 'completed', resultId }
   ═══════════════════════════════════════════════════════════════ */

const { getDb, verifyAuth, respond, normaliseQuestions, shuffleOrder } = require('./_firebaseAdmin');
const admin = require('firebase-admin');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return respond(405, { error: 'This action isn\u2019t supported.' });

  let decoded;
  try { decoded = await verifyAuth(event); }
  catch (e) { return respond(e.statusCode || 401, { error: e.message }); }
  const uid = decoded.uid;

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return respond(400, { error: 'Bad request.' }); }

  const testId = typeof body.testId === 'string' ? body.testId.trim() : '';
  if (!testId) return respond(400, { error: 'Missing testId.' });

  const db = getDb();
  const FieldValue = admin.firestore.FieldValue;

  try {
    const testSnap = await db.collection('tests').doc(testId).get();
    if (!testSnap.exists) return respond(404, { error: 'Test not found.' });
    const test = testSnap.data();

    if (test.active !== true) return respond(403, { error: 'This test is not currently live.' });

    const userSnap  = await db.collection('users').doc(uid).get();
    const userOrg   = userSnap.exists ? (userSnap.data().orgCode || null) : null;
    if (test.orgCode && userOrg !== test.orgCode) {
      return respond(403, { error: 'This test is not available to your organisation.' });
    }

    const attemptDocId = `${testId}_${uid}`;
    const attemptRef    = db.collection('attempts').doc(attemptDocId);
    const attemptSnap   = await attemptRef.get();

    /* ── Already has an attempt doc ── */
    if (attemptSnap.exists) {
      const attempt = attemptSnap.data();

      if (attempt.status === 'completed') {
        return respond(200, { status: 'completed', resultId: attempt.resultId || null });
      }

      /* ── Resume in-progress ── */
      const durationMinutes = attempt.durationMinutes || 0;
      const startedMs  = attempt.startedAt?.toDate?.().getTime() || Date.now();
      const elapsedSec = Math.max(0, Math.floor((Date.now() - startedMs) / 1000));
      let remainingSecs = durationMinutes > 0 ? (durationMinutes * 60 - elapsedSec) : 0;

      let tabSwitchCount   = attempt.tabSwitchCount || 0;
      let cheatLog         = Array.isArray(attempt.cheatLog) ? [...attempt.cheatLog] : [];
      let autoSubmitReason = null;
      let reloadIsViolation = false;

      if (durationMinutes > 0 && remainingSecs <= 0) {
        autoSubmitReason = 'time';
      } else {
        // A reload/resume mid-test is itself a recorded strike, exactly as before.
        tabSwitchCount++;
        cheatLog.push({ type: 'page_reload', ts: Date.now(), count: tabSwitchCount });
        reloadIsViolation = true;
        if (tabSwitchCount >= 4) autoSubmitReason = 'violations';
      }

      await attemptRef.update({
        tabSwitchCount, cheatLog,
        lastSavedAt: FieldValue.serverTimestamp(),
      });

      return respond(200, {
        status: 'in-progress',
        attemptDocId,
        testTitle: test.title || 'Live Test',
        questions: attempt.questionsSnapshot || [],
        answered: attempt.answered || [],
        currentQ: attempt.currentQ || 0,
        tabSwitchCount, cheatLog,
        remainingSecs, durationMinutes,
        marksCorrect: attempt.marksCorrect ?? 1,
        marksWrong: attempt.marksWrong ?? 0,
        negativeMarking: !!attempt.negativeMarking,
        reloadIsViolation, autoSubmitReason,
      });
    }

    /* ── No attempt doc — check for a pre-attempt-feature completed result ── */
    const oldResults = await db.collection('results')
      .where('userId', '==', uid).where('testId', '==', testId).limit(1).get();
    if (!oldResults.empty) {
      const already = oldResults.docs[0];
      await attemptRef.set({
        userId: uid, testId, status: 'completed',
        resultId: already.id, completedAt: FieldValue.serverTimestamp(),
      });
      return respond(200, { status: 'completed', resultId: already.id });
    }

    /* ── Fresh start ── */
    const publicQuestions = normaliseQuestions(test.questions || []);
    if (!publicQuestions.length) return respond(400, { error: 'This test has no questions.' });

    let order = publicQuestions.map((_, i) => i);
    if (test.randomizeQuestions) order = shuffleOrder(publicQuestions.length);
    const shown = order.map(i => publicQuestions[i]);

    const durationMinutes = parseFloat(test.durationMinutes) || 0;
    const marksCorrect    = parseFloat(test.marksCorrect) || 1;
    const marksWrong      = parseFloat(test.marksWrong) || 0;
    const negativeMarking = test.negativeMarking === true;
    const answered = new Array(shown.length).fill(null);

    await attemptRef.set({
      userId: uid, orgCode: userOrg, testId,
      startedAt: FieldValue.serverTimestamp(),
      durationMinutes, marksCorrect, marksWrong, negativeMarking,
      answerKeyOrder: order,                 // server-only; never sent to the client
      questionsSnapshot: shown,              // no `ans` / `exp` — safe to expose
      answered, currentQ: 0, tabSwitchCount: 0, cheatLog: [],
      status: 'in-progress',
    });

    return respond(200, {
      status: 'in-progress',
      attemptDocId,
      testTitle: test.title || 'Live Test',
      questions: shown,
      answered, currentQ: 0,
      tabSwitchCount: 0, cheatLog: [],
      remainingSecs: durationMinutes * 60, durationMinutes,
      marksCorrect, marksWrong, negativeMarking,
      reloadIsViolation: false, autoSubmitReason: null,
    });
  } catch (e) {
    console.error('start-test error:', e);
    return respond(500, { error: 'Could not start the test. Please try again.' });
  }
};
