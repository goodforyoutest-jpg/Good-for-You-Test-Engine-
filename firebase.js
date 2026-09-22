/* ═─ GUARD: redirect to login if not authenticated ── */
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
  const role = doc?.role || 'student';
  const roleAllowed = role === 'admin' || role === 'teacher' || role === 'super_admin';
  if (!doc || !roleAllowed) {
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
    } else if (role === 'admin' || role === 'teacher' || role === 'super_admin') {
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
