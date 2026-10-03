/* ═══════════════════════════════════════════════
   GOOD FOR YOU TEST ENGINE — DRAWER COMPONENT
   drawer.js — injects the nav drawer into any page
═══════════════════════════════════════════════ */

const SVG_ICONS = {
  home: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  live: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>`,
  pencil: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  chart: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  trophy: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/></svg>`,
  trending: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  user: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  key: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
  logout: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  close: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  zap: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  star: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
};

/* Guest Test highlight — a quiet tint + left accent, not a solid block.
   Special because it reads differently, not because it's louder.
   Purple is reserved for the Super Admin item. */
const GUEST_DRAWER_CSS = `
.drawer-item.drawer-item--guest {
  background:#FFF4EC; border-left:3px solid #D9480F;
  border-radius:0 8px 8px 0; margin:4px 10px 4px 0; padding-left:13px;
}
.drawer-item.drawer-item--guest:hover,
.drawer-item.drawer-item--guest.active { background:#FCE6D6; }
.drawer-item.drawer-item--guest .di-icon,
.drawer-item.drawer-item--guest .di-label { color:#B83A08; font-weight:700; }
.drawer-item--guest .di-badge {
  margin-left:auto; padding:1px 7px; background:#D9480F; color:#fff;
  font-size:.58rem; font-weight:800; letter-spacing:.03em; border-radius:20px; white-space:nowrap;
}
`;

function injectDrawer(activePage = '') {
  if (!document.getElementById('drawerGuestStyle')) {
    document.head.insertAdjacentHTML('beforeend', `<style id="drawerGuestStyle">${GUEST_DRAWER_CSS}</style>`);
  }
  const nav = [
    { id:'',            icon:'home',     label:'Home',               href:'index.html' },
    { id:'live',        icon:'live',     label:'Live Tests',         href:'dashboard.html#live' },
    { id:'own',         icon:'pencil',   label:'Take Your Own Test', href:'test-own.html' },
    { id:'guest',       icon:'zap',      label:'Guest Test',         href:'guest-create.html', cls:'drawer-item--guest', badge:'Exclusive' },
    { id:'results',     icon:'chart',    label:'Previous Results',   href:'dashboard.html#results' },
    { id:'leaderboard', icon:'trophy',   label:'Leaderboard',        href:'leaderboard.html' },
    { id:'notes', icon:'pencil', label:'Notes', href:'notes.html' },
    { id:'analytics',   icon:'trending', label:'Analytics',          href:'analytics.html' },
    { id:'profile',     icon:'user',     label:'Profile',            href:'profile.html' },
  ];

  const navHTML = nav.map(item => `
    <a href="${item.href}" class="drawer-item${item.cls ? ' ' + item.cls : ''}${activePage === item.id ? ' active' : ''}" onclick="closeDrawer()">
      <span class="di-icon">${SVG_ICONS[item.icon]}</span>
      <span class="di-label">${item.label}</span>${item.badge ? `<span class="di-badge">${item.badge}</span>` : ''}
    </a>
  `).join('');

  const html = `
  <!-- Overlay -->
  <div class="menu-overlay" id="menuOverlay"></div>

  <!-- Side Drawer -->
  <div class="side-drawer" id="sideDrawer">

    <!-- Header -->
    <div class="drawer-header">
      <div class="drawer-brand-row">
        <div class="drawer-brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="drawer-brand-text">
          <div class="drawer-title">Good <em>for You</em></div>
        </div>
      </div>
      <button class="drawer-close" id="drawerClose" aria-label="Close menu">${SVG_ICONS.close}</button>
    </div>

    <!-- Nav section label -->
    <div class="drawer-section-label">Navigation</div>

    <!-- Nav items -->
    <nav class="drawer-nav">
      ${navHTML}

      <!-- Admin item (hidden by default, shown by role) -->
      <a href="admin.html" class="drawer-item drawer-admin-sep" id="drawerAdminItem" style="display:none;" onclick="closeDrawer()">
        <span class="di-icon">${SVG_ICONS.settings}</span>
        <span class="di-label">Admin Panel</span>
      </a>

      <!-- Super Admin item (hidden by default, shown by role) -->
      <a href="super-admin.html" class="drawer-item drawer-item--super" id="drawerSuperAdminItem" style="display:none;" onclick="closeDrawer()">
        <span class="di-icon di-icon--gold">${SVG_ICONS.star}</span>
        <span class="di-label">Super Admin Panel</span>
      </a>
    </nav>

    <!-- User card -->
    <div class="drawer-user-section">
      <div class="drawer-user-card">
        <div class="drawer-avatar" id="drawerAvatar">?</div>
        <div class="drawer-user-info">
          <div class="drawer-user-name" id="drawerUserName">Loading…</div>
          <div class="drawer-user-role" id="drawerUserRole">—</div>
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="drawer-footer">
      <a href="login.html" class="drawer-item drawer-item--login" id="drawerLoginItem" style="display:none;" onclick="closeDrawer()">
        <span class="di-icon">${SVG_ICONS.key}</span>
        <span class="di-label">Login / Sign Up</span>
      </a>
      <button id="drawerLogoutItem" onclick="logoutUser()" style="display:none;" class="drawer-logout-btn">
        ${SVG_ICONS.logout}
        <span>Logout</span>
      </button>
      <div class="drawer-copyright">© 2026 Good for You</div>
    </div>

  </div>
  `;

  // Inject at start of body
  document.body.insertAdjacentHTML('afterbegin', html);
  initDrawer();
  populateDrawerUser();
}
