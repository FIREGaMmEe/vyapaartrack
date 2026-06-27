/**
 * VyaparTrack - App Layout (sidebar + topbar)
 * Call renderLayout(activePage, userId) at the top of each app page.
 */

import { signOut } from './supabase.js';
import { initTheme, applyTheme, initSidebar, initOffline, syncQueue } from './utils.js';

const NAV = [
  { page: 'dashboard', icon: '📊', label: 'Dashboard',  href: 'dashboard.html' },
  { page: 'add',       icon: '➕', label: 'Add Product', href: 'add.html' },
  { page: 'inventory', icon: '📦', label: 'Inventory',   href: 'inventory.html' },
  { page: 'store',     icon: '🏪', label: 'Store',       href: 'store.html' },
  { page: 'profile',   icon: '👤', label: 'Profile',     href: 'profile.html' },
];

export function renderLayout(activePage, userId = '') {
  const theme = localStorage.getItem('vt_theme') || 'light';
  initTheme();

  // Show Admin Panel link only for super-admin
  const nav = (userId && userId === window.SUPER_ADMIN_ID)
    ? [...NAV, { page: 'admin', icon: '⚙️', label: 'Admin Panel', href: 'admin.html' }]
    : NAV;

  const navHtml = nav.map(n => `
    <a href="${n.href}" class="nav-item${activePage === n.page ? ' active' : ''}" data-page="${n.page}">
      <span class="nav-icon">${n.icon}</span><span>${n.label}</span>
    </a>`).join('');

  document.body.innerHTML = `
    <div id="offline-banner">📵 You're offline — changes will sync when reconnected.</div>
    <div class="app-layout">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <img id="sidebar-logo" src="${theme === 'dark' ? 'assets/Logo_dark.png' : 'assets/Logo.png'}" alt="VyaparTrack" />
        </div>
        <nav class="sidebar-nav">${navHtml}</nav>
        <div class="sidebar-footer">
          <button class="nav-item" id="logout-btn">
            <span class="nav-icon">🚪</span><span>Logout</span>
          </button>
        </div>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
      <div class="main-content">
        <header class="topbar">
          <div class="topbar-left">
            <button class="hamburger" id="hamburger" aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
            <span id="topbar-title" style="font-weight:600;font-size:1rem;"></span>
          </div>
          <div class="topbar-right">
            <span id="sync-dot" class="sync-dot" title="Synced"></span>
            <div class="theme-toggle">
              <button class="theme-btn${theme === 'light' ? ' active' : ''}" data-theme="light">☀️</button>
              <button class="theme-btn${theme === 'dark'  ? ' active' : ''}" data-theme="dark">🌙</button>
            </div>
            <span id="user-badge" style="font-size:.8rem;color:var(--text-muted);"></span>
          </div>
        </header>
        <main class="page-content" id="page-content"></main>
      </div>
    </div>
    <div id="toast-container"></div>
  `;

  document.querySelectorAll('.theme-btn').forEach(b => {
    b.addEventListener('click', () => applyTheme(b.dataset.theme));
  });

  document.getElementById('logout-btn').addEventListener('click', signOut);
  initSidebar();
  initOffline();
  if (navigator.onLine) syncQueue();

  return document.getElementById('page-content');
}
