/**
 * DapurGizi — Application Entry Point (js/app.js)
 * Initializes theme, Eel bridge detection, session state, shell layout, and routing.
 */

import { store } from './state.js';
import { callApi, isEelAvailable } from './services/api.js';
import { renderSidebar } from './components/sidebar.js';
import { renderTopbar } from './components/topbar.js';
import { renderLoginPage } from './pages/login.js';
import { navigateTo } from './router.js';
import { showToast } from './components/toast.js';

const rootEl = document.getElementById('app-root');

async function bootstrapApp() {
  // 1. Apply persisted theme
  document.documentElement.setAttribute('data-theme', store.state.theme);

  // 2. Detect Python Eel runtime availability
  const eelPresent = isEelAvailable();
  store.setEelConnected(eelPresent);

  // 3. Check existing session
  const sessionRes = await callApi('auth_get_session');
  if (sessionRes.success && sessionRes.data && sessionRes.data.user) {
    store.setSession(sessionRes.data);
  }

  // 4. Fetch initial unread notifications count
  const notifRes = await callApi('notifications_list');
  if (notifRes.success && notifRes.data) {
    store.setUnreadCount(notifRes.data.unreadCount);
  }

  // 5. Subscribe to global state updates
  store.subscribe((state, changedKey) => {
    if (changedKey === 'sidebarCollapsed') {
      const shell = document.querySelector('.app-shell');
      if (shell) {
        shell.classList.toggle('app-Shell--sidebar-collapsed', state.sidebarCollapsed);
      }
      const sidebarEl = document.getElementById('app-sidebar');
      if (sidebarEl) {
        sidebarEl.style.width = state.sidebarCollapsed ? '80px' : '264px';
        renderSidebar(sidebarEl, handleNavigation);
      }
    } else if (
      changedKey === 'theme' ||
      changedKey === 'backendMode' ||
      changedKey === 'unreadNotificationCount'
    ) {
      const topbarEl = document.getElementById('app-topbar');
      if (topbarEl) renderTopbar(topbarEl, handleNavigation);
      const sidebarEl = document.getElementById('app-sidebar');
      if (sidebarEl) renderSidebar(sidebarEl, handleNavigation);
    } else if (changedKey === 'session' && state.session) {
      const topbarEl = document.getElementById('app-topbar');
      const sidebarEl = document.getElementById('app-sidebar');
      const mainEl = document.getElementById('app-main-content');
      if (topbarEl && sidebarEl && mainEl) {
        renderSidebar(sidebarEl, handleNavigation);
        renderTopbar(topbarEl, handleNavigation);
        navigateTo(state.currentRoute, mainEl, syncShellChrome);
      }
    }
  });

  renderAppRoot();
}

function syncShellChrome() {
  const sidebarEl = document.getElementById('app-sidebar');
  const topbarEl = document.getElementById('app-topbar');
  if (sidebarEl) renderSidebar(sidebarEl, handleNavigation);
  if (topbarEl) renderTopbar(topbarEl, handleNavigation);
}

async function handleNavigation(targetRoute) {
  if (targetRoute === '__logout__') {
    await callApi('auth_logout');
    store.setSession(null);
    showToast({
      title: 'Sesi Ditutup',
      message: 'Anda telah keluar dari panel operasional DapurGizi.',
      type: 'info'
    });
    renderAppRoot();
    return;
  }

  const mainEl = document.getElementById('app-main-content');
  if (mainEl) {
    await navigateTo(targetRoute, mainEl, syncShellChrome);
  }
}

function renderAppRoot() {
  if (!rootEl) return;

  if (!store.state.session) {
    renderLoginPage(rootEl, () => {
      renderAppRoot();
    });
    return;
  }

  const collapsedClass = store.state.sidebarCollapsed ? 'app-Shell--sidebar-collapsed' : '';
  rootEl.innerHTML = `
    <div class="app-shell ${collapsedClass}">
      <aside class="dg-sidebar" id="app-sidebar" aria-label="Navigasi Utama"></aside>
      <div class="app-main-wrapper">
        <header class="dg-topbar" id="app-topbar"></header>
        <main class="app-content" id="app-main-content" role="main"></main>
      </div>
    </div>
  `;

  syncShellChrome();
  const mainEl = document.getElementById('app-main-content');
  navigateTo(store.state.currentRoute || 'dashboard', mainEl, syncShellChrome);
}

// Expose helper for automated verification / testing
window.__DAPURGIZI_APP__ = {
  store,
  navigate: handleNavigation,
  renderAppRoot
};

bootstrapApp();
