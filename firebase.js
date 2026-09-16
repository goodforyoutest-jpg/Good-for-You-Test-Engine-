/* ═══════════════════════════════════════════════
   GOOD FOR YOU TEST ENGINE — FIREBASE + UTILS
   firebase.js  — paste YOUR Firebase config below
═══════════════════════════════════════════════ */

// ─── STEP 1: Replace with your Firebase project config ───────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAAa_-PwzGWJkYwZh46HxfePPqbKbVEkQ4",
  authDomain:        "good-for-you-test-engine.firebaseapp.com",
  projectId:         "good-for-you-test-engine",
  storageBucket:     "good-for-you-test-engine.firebasestorage.app",
  messagingSenderId: "818411947971",
  appId:             "1:818411947971:web:c3b848142b25a333ac1f76"
};
// ─────────────────────────────────────────────────────────────────────────────

// ─── Cloudinary config (for Notes PDFs) ────────────────────────────────────
const CLOUDINARY_CLOUD_NAME    = 'piwqv3hf';
const CLOUDINARY_UPLOAD_PRESET = 'gfyte_notes';

// Firebase SDK imports (loaded via CDN in each HTML file)
// We store the initialized app references on window so all pages share them.

function initFirebase() {
  if (window._fbInitialized) return;
  firebase.initializeApp(FIREBASE_CONFIG);
  window.db   = firebase.firestore();
  window.auth = firebase.auth();
  window._fbInitialized = true;
}

/* ── AUTH HELPERS ── */
function getCurrentUser() {
  return new Promise(resolve => {
    const unsub = firebase.auth().onAuthStateChanged(u => { unsub(); resolve(u); });
  });
}

async function getUserDoc(uid) {
  const snap = await window.db.collection('users').doc(uid).get();
  return snap.exists ? snap.data() : null;
}

/* ── TOAST ── */
function showToast(msg, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container')
    || (() => {
      const c = document.createElement('div');
      c.id = 'toast-container';
      document.body.appendChild(c);
      return c;
    })();
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

/* ── HEADER: inject user label ── */
async function injectHeaderUser() {
  const el = document.getElementById('headerCaLabel');
  if (!el) return;
  const user = await getCurrentUser();
  if (user) {
    const doc = await getUserDoc(user.uid);
    const name = doc?.username || user.displayName || user.email?.split('@')[0] || 'User';
    el.textContent = name;
  } else {
    el.textContent = 'Good for You';
  }
}

/* ── GUARD: redirect to login if not authenticated ── */
async function requireAuth(redirectTo = 'login.html') {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirectTo; return null; }
  return user;
}

/* ── GUARD: redirect to dashboard if admin ── */
async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  const doc = await getUserDoc(user.uid);
  if (!doc || (doc.role !== 'admin' && doc.role !== 'teacher')) {
    showToast('Access required.', 'error');
    setTimeout(() => window.location.href = 'dashboard.html', 1500);
    return null;
  }
  return { user, doc, orgCode: doc.orgCode || null };
}

/* ── DRAWER INIT ── */
function initDrawer() {
  const hamburger = document.getElementById('hamburgerBtn');
  const overlay   = document.getElementById('menuOverlay');
  const drawer    = document.getElementById('sideDrawer');
  const closeBtn  = document.getElementById('drawerClose');

  if (hamburger) hamburger.onclick = () => {
    drawer?.classList.add('open');
    overlay?.classList.add('open');
  };
  if (closeBtn) closeBtn.onclick = closeDrawer;
  if (overlay)  overlay.onclick  = closeDrawer;
}

function closeDrawer() {
  document.getElementById('sideDrawer')?.classList.remove('open');
  document.getElementById('menuOverlay')?.classList.remove('open');
}

/* ── DRAWER: populate user card ── */
async function populateDrawerUser() {
  const user = await getCurrentUser();
  const nameEl   = document.getElementById('drawerUserName');
  const roleEl   = document.getElementById('drawerUserRole');
  const avatarEl = document.getElementById('drawerAvatar');
  const loginItem = document.getElementById('drawerLoginItem');
  const logoutItem = document.getElementById('drawerLogoutItem');

  if (user) {
    const doc = await getUserDoc(user.uid);
    const name = doc?.username || user.displayName || user.email?.split('@')[0] || 'User';
    const role = doc?.role || 'student';
    if (nameEl)   nameEl.textContent   = name;
    if (roleEl)   roleEl.textContent   = role.charAt(0).toUpperCase() + role.slice(1);
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
    if (loginItem)  loginItem.style.display  = 'none';
    if (logoutItem) logoutItem.style.display = 'flex';
    // Show Super Admin or Admin link based on email
    const SUPER_ADMIN_EMAIL = 'gajanandhoble5@gmail.com';
    const adminLink      = document.getElementById('drawerAdminItem');
    const superAdminLink = document.getElementById('drawerSuperAdminItem');
    if (user.email === SUPER_ADMIN_EMAIL) {
      if (adminLink)      adminLink.style.display      = 'none';
      if (superAdminLink) superAdminLink.style.display  = 'flex';
    } else if (role === 'admin' || role === 'teacher') {
      if (adminLink)      adminLink.style.display      = 'flex';
      if (superAdminLink) superAdminLink.style.display  = 'none';
    }
  } else {
    if (nameEl)   nameEl.textContent   = 'Guest';
    if (roleEl)   roleEl.textContent   = 'Not logged in';
    if (avatarEl) avatarEl.textContent = '?';
    if (loginItem)  loginItem.style.display  = 'flex';
    if (logoutItem) logoutItem.style.display = 'none';
  }
}

async function logoutUser() {
  await firebase.auth().signOut();
  window.location.href = 'index.html';
}

/* ── ANIMATED BACKGROUND ── */
function initBgCanvas(canvasId = 'bg-canvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], gradAngle = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function createParticles() {
    particles = [];
    const count = Math.min(Math.floor(W * H / 22000), 40);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.5+0.3,
        vx:(Math.random()-.5)*.25, vy:(Math.random()-.5)*.25,
        alpha:Math.random()*.5+.1
      });
    }
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    gradAngle += 0.002;
    const cx1 = W*.15+Math.sin(gradAngle)*W*.08;
    const cy1 = H*.15+Math.cos(gradAngle)*H*.08;
    const g1  = ctx.createRadialGradient(cx1,cy1,0,cx1,cy1,W*.4);
    g1.addColorStop(0,'rgba(201,168,76,.055)'); g1.addColorStop(1,'transparent');
    ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);
    const cx2 = W*.85+Math.cos(gradAngle*1.3)*W*.07;
    const cy2 = H*.85+Math.sin(gradAngle*1.3)*H*.07;
    const g2  = ctx.createRadialGradient(cx2,cy2,0,cx2,cy2,W*.35);
    g2.addColorStop(0,'rgba(32,112,180,.04)'); g2.addColorStop(1,'transparent');
    ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
    for (const p of particles) {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0;
      if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(201,168,76,${p.alpha})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize(); createParticles(); draw();
  window.addEventListener('resize',()=>{resize();createParticles();});
}

/* ── NOTES: CLOUDINARY UPLOAD ── */
async function uploadNotePdf(file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(url, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Cloudinary upload failed (' + res.status + ')');
  const data = await res.json();
  return data.secure_url;
}

/* ── NOTES: FIRESTORE ── */
async function getNotes() {
  const snap = await window.db.collection('notes').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
async function addNoteDoc({ title, column, pdfUrl }) {
  return window.db.collection('notes').add({
    title, column: column || 'General', pdfUrl,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
async function deleteNoteDoc(noteId) {
  return window.db.collection('notes').doc(noteId).delete();
}

/* ── UTILS ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function shuffleOrder(n){return shuffle(Array.from({length:n},(_,i)=>i));}
function debounce(fn,delay){let t;return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),delay);};}
function formatTime(secs) {
  const m=String(Math.floor(secs/60)).padStart(2,'0');
  const s=String(secs%60).padStart(2,'0');
  return `${m}:${s}`;
}
function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}

/* ── ELASTIC JSON NORMALISER (preserved from original) ── */
function normaliseQuestion(raw) {
  const q       = raw.q    ||raw.question ||raw.text  ||raw.stem ||'';
  const opts    = raw.opts ||raw.options  ||raw.choices||raw.answers||[];
  const ans     = raw.ans!==undefined?raw.ans:raw.answer!==undefined?raw.answer:raw.correct!==undefined?raw.correct:raw.correctIndex!==undefined?raw.correctIndex:raw.key!==undefined?raw.key:0;
  const exp     = raw.exp     ||raw.explanation||raw.explain||raw.note||'';
  const sec     = raw.section ||raw.topic      ||raw.chapter||raw.category||'';
  const passage = raw.passage ||raw.caseStudy  ||raw.passageText||'';
  const image        = raw.image        || null;
  const imageCaption = raw.imageCaption || raw.caption || '';
  return {
    q, opts, ans:typeof ans==='number'?ans:parseInt(ans)||0, exp, section:sec,
    passage, image, imageCaption,
  };
}
function normaliseQuestions(arr) {
  return arr.map(normaliseQuestion).filter(q=>q.q&&Array.isArray(q.opts)&&q.opts.length>=2); 
}
