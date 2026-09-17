/* ═══════════════════════════════════════════════════════════════
   submit-test.js
   Netlify Function — the ONLY place a live test attempt is graded.
   Replaces the old client-side scoring in test.html's submitQuiz(),
   which compared the student's picks against `q.ans` sitting in the
   page's own JS state (trivially editable in devtools, and the score
   was then written straight to Firestore by the same client).

   Grading here uses two things the client never has access to:
     - `attempts/{testId}_{uid}.answerKeyOrder` — the shuffle mapping
       decided by start-test.js at attempt start (server-only field;
       Firestore rules block clients from ever writing it).
     - `testAnswers/{testId}` — the real answer key (Firestore rules
       block clients from reading this collection at all).

   The student's own answer choices ARE taken from the request body —
   that's not a trust issue, since nothing is gained by a student
   misreporting their own picks (the server already independently
   knows the correct answers). What's protected is *which answer is
   correct*, not *what the student clicked*.

   Request  (POST, application/json, Authorization: Bearer <idToken>):
     { testId, answered, timerSeconds, tabSwitchCount, cheatLog,
       autoSubmit, deviceInfo }

   Response (200):
     { correct, wrong, unattempted, total, pct, accuracy, finalScore,
       maxScore, marksCorrect, marksWrong, negativeMarking,
       sectionStats, rank, resultId, graded, alreadyCompleted? }
   ═══════════════════════════════════════════════════════════════ */

const { getDb, verifyAuth, respond } = require('./_firebaseAdmin');
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
    const attemptRef  = db.collection('attempts').doc(`${testId}_${uid}`);
    const attemptSnap = await attemptRef.get();
    if (!attemptSnap.exists) return respond(400, { error: 'No in-progress attempt found for this test.' });
    const attempt = attemptSnap.data();

    if (attempt.status === 'completed') {
      return respond(200, { alreadyCompleted: true, resultId: attempt.resultId || null });
    }

    const order = Array.isArray(attempt.answerKeyOrder) ? attempt.answerKeyOrder : null;
    const shown = Array.isArray(attempt.questionsSnapshot) ? attempt.questionsSnapshot : null;
    if (!order || !shown || order.length !== shown.length) {
      return respond(500, { error: 'This attempt is missing its question order. Please contact your administrator.' });
    }

    const keySnap = await db.collection('testAnswers').doc(testId).get();
    if (!keySnap.exists) {
      return respond(500, { error: 'This test is missing its answer key. Please contact your administrator.' });
    }
    const keyArr = Array.isArray(keySnap.data().answers) ? keySnap.data().answers : [];

    const n = shown.length;
    const answeredIn = Array.isArray(body.answered) ? body.answered : (attempt.answered || []);
    const answered = new Array(n).fill(null);
    for (let i = 0; i < n; i++) {
      const v = answeredIn[i];
      const optCount = Array.isArray(shown[i]?.opts) ? shown[i].opts.length : 0;
      answered[i] = (Number.isInteger(v) && v >= 0 && v < optCount) ? v : null;
    }

    let correct = 0, wrongCount = 0;
    const sectionStats = {};
    const graded = [];
    for (let i = 0; i < n; i++) {
      const key = keyArr[order[i]] || {};
      const ans = Number.isInteger(key.ans) ? key.ans : null;
      const exp = typeof key.exp === 'string' ? key.exp : '';
      graded.push({ ans, exp });

      const sel    = answered[i];
      const isSkip = sel === null;
      const isOk   = !isSkip && ans !== null && sel === ans;
      if (isOk) correct++;
      if (!isSkip && !isOk) wrongCount++;

      const sec = shown[i].section || 'General';
      if (!sectionStats[sec]) sectionStats[sec] = { c: 0, w: 0, u: 0, t: 0 };
      sectionStats[sec].t++;
      if (isOk) sectionStats[sec].c++;
      else if (isSkip) sectionStats[sec].u++;
      else sectionStats[sec].w++;
    }

    const total       = n;
    const unattempted = answered.filter(a => a === null).length;
    const accuracy    = total - unattempted > 0 ? Math.round(correct / (total - unattempted) * 100) : 0;

    const marksCorrect    = attempt.marksCorrect ?? 1;      // frozen at attempt start — never trust the body
    const marksWrong      = attempt.marksWrong ?? 0;
    const negativeMarking = !!attempt.negativeMarking;

    const rawScore   = (correct * marksCorrect) - (negativeMarking ? wrongCount * marksWrong : 0);
    const maxScore   = total * marksCorrect;
    const finalScore = Math.max(0, rawScore);
    const pct        = maxScore > 0 ? Math.min(100, Math.round((finalScore / maxScore) * 100)) : 0;

    // Anti-cheat counters: take the higher of what's already persisted
    // (accumulated via authenticated client autosaves through the
    // attempt) and what this final request reports, so a student can't
    // submit a lower count to erase already-logged violations.
    const storedTabCount = attempt.tabSwitchCount || 0;
    const bodyTabCount    = Number.isInteger(body.tabSwitchCount) ? body.tabSwitchCount : 0;
    const tabSwitchCount  = Math.max(storedTabCount, bodyTabCount);
    const storedCheatLog  = Array.isArray(attempt.cheatLog) ? attempt.cheatLog : [];
    const bodyCheatLog    = Array.isArray(body.cheatLog) ? body.cheatLog : [];
    const cheatLog        = bodyCheatLog.length > storedCheatLog.length ? bodyCheatLog : storedCheatLog;

    const timerSeconds = Number.isFinite(body.timerSeconds) ? Math.max(0, Math.floor(body.timerSeconds)) : 0;
    const autoSubmit   = !!body.autoSubmit;

    let deviceInfo = null;
    try { deviceInfo = body.deviceInfo ? JSON.parse(JSON.stringify(body.deviceInfo)) : null; } catch { deviceInfo = null; }

    const testSnap  = await db.collection('tests').doc(testId).get();
    const testTitle = testSnap.exists ? (testSnap.data().title || 'Live Test') : 'Live Test';

    const userSnap = await db.collection('users').doc(uid).get();
    const orgCode  = userSnap.exists ? (userSnap.data().orgCode || null) : null;

    const questionsSnapshot = shown.map((q, i) => ({
      q: q.q, opts: q.opts, ans: graded[i].ans, exp: graded[i].exp || null,
      section: q.section || null, passage: q.passage || null,
      image: q.image || null, imageCaption: q.imageCaption || null,
    }));

    const resultRef = db.collection('results').doc();
    await resultRef.set({
      userId: uid, orgCode, testId, testTitle,
      correct, wrong: wrongCount, skipped: unattempted, total,
      percentage: pct, accuracy, finalScore, maxScore,
      marksCorrect, marksWrong: negativeMarking ? marksWrong : 0, negativeMarking,
      timeTaken: timerSeconds, sectionStats,
      autoSubmitted: autoSubmit, tabSwitchCount, cheatLog, deviceInfo,
      answers: answered, questionsSnapshot,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Rank among all results for this test (same tie-break rule as before).
    const allSnap   = await db.collection('results').where('testId', '==', testId).get();
    const allScores = allSnap.docs.map(d => d.data().finalScore ?? d.data().percentage ?? 0).sort((a, b) => b - a);
    const rank = allScores.findIndex(s => s <= finalScore) + 1 || allScores.length + 1;
    await resultRef.update({ rank });

    await attemptRef.update({
      status: 'completed', resultId: resultRef.id,
      answered, tabSwitchCount, cheatLog,
      completedAt: FieldValue.serverTimestamp(),
    });

    return respond(200, {
      correct, wrong: wrongCount, unattempted, total, pct, accuracy,
      finalScore, maxScore, marksCorrect, marksWrong: negativeMarking ? marksWrong : 0, negativeMarking,
      sectionStats, rank, resultId: resultRef.id, graded,
    });
  } catch (e) {
    console.error('submit-test error:', e);
    return respond(500, { error: 'Could not submit your test. Please try again.' });
  }
};
