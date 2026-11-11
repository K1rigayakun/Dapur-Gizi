/**
 * DapurGizi — Sidebar Navigation Component (js/components/sidebar.js)
 * Features:
 * - Expanded width: 264px | Collapsed width: 80px
 * - Smooth sliding active navigation indicator powered by Anime.js v4 (`animateSidebarIndicator`)
 * - Role-based menu item visibility (RBAC)
 */

import { renderIcon } from './icon.js';
import { store } from '../state.js';
import { canAccessModule } from '../utils/permissions.js';
import { animateSidebarIndicator, bindInteractiveButtons } from '../utils/motion.js';
import { escapeHtml } from '../utils/format.js';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Beranda Operasional', icon: 'layout-dashboard', group: 'UTAMA' },
  { id: 'beneficiaries', label: 'Penerima Manfaat', icon: 'users', group: 'UTAMA' },
  { id: 'menus', label: 'Menu & Standar Gizi', icon: 'utensils', group: 'UTAMA' },
  { id: 'production', label: 'Produksi Harian', icon: 'chef-hat', group: 'OPERASIONAL' },
  { id: 'distribution', label: 'Distribusi & Rute', icon: 'truck', group: 'OPERASIONAL' },
  { id: 'food-safety', label: 'Keamanan Pangan & SLHS', icon: 'shield-check', group: 'OPERASIONAL' },
  { id: 'budget', label: 'Anggaran & Insentif', icon: 'wallet', group: 'MANAJEMEN' },
  { id: 'reports', label: 'Laporan & Ekspor', icon: 'file-bar-chart', group: 'MANAJEMEN' },
  { id: 'users', label: 'Manajemen Pengguna', icon: 'user-cog', group: 'SISTEM' },
  { id: 'notifications', label: 'Pusat Notifikasi', icon: 'bell', group: 'SISTEM', showUnreadBadge: true },
  { id: 'settings', label: 'Pengaturan Sistem', icon: 'settings', group: 'SISTEM' }
];

export function renderSidebar(containerEl, onNavigate) {
  if (!containerEl) return;
  const { currentRoute, sidebarCollapsed, session, unreadNotificationCount, roleMatrix } = store.state;
  const userRole = session && session.user ? session.user.role : 'Kepala SPPG';

  const visibleItems = NAV_ITEMS.filter((item) => canAccessModule(userRole, item.id, roleMatrix));

  let currentGroup = '';
  const navLinksHtml = visibleItems
    .map((item) => {
      let groupHeader = '';
      if (item.group !== currentGroup) {
        currentGroup = item.group;
        groupHeader = `<div class="dg-sidebar__section-label">${escapeHtml(currentGroup)}</div>`;
      }
      const isActive = currentRoute === item.id;
      const badgeHtml =
        item.showUnreadBadge && unreadNotificationCount > 0
          ? `<span class="dg-sidebar__link-badge">${unreadNotificationCount}</span>`
          : '';
      return `
        ${groupHeader}
        <button
          type="button"
          class="dg-sidebar__link ${isActive ? 'is-active' : ''}"
          data-route="${item.id}"
          title="${escapeHtml(item.label)}"
          aria-current="${isActive ? 'page' : 'false'}"
        >
          ${renderIcon(item.icon, { size: 19 })}
          <span class="dg-sidebar__link-text">${escapeHtml(item.label)}</span>
          ${badgeHtml}
        </button>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div class="dg-sidebar__brand">
      <div class="dg-sidebar__brand-left">
        <img src="assets/images/logo-dapurgizi.svg" alt="Logo DapurGizi" class="dg-sidebar__logo" />
        <div class="dg-sidebar__brand-text">
          <span class="dg-sidebar__brand-title">DapurGizi</span>
          <span class="dg-sidebar__brand-sub">SPPG — MBG Desktop</span>
        </div>
      </div>
      <button
        type="button"
        class="dg-sidebar__collapse-btn"
        id="sidebar-collapse-toggle"
        title="${sidebarCollapsed ? 'Perluas Navigasi (264px)' : 'Ciutkan Navigasi (80px)'}"
        aria-label="Alihkan lebar bilah sisi"
      >
        ${renderIcon(sidebarCollapsed ? 'panel-left-open' : 'panel-left-close', { size: 17 })}
      </button>
    </div>

    <nav class="dg-sidebar__nav" id="sidebar-nav-container" aria-label="Menu Utama SPPG">
      <div class="dg-sidebar__indicator" id="sidebar-active-indicator"></div>
      ${navLinksHtml}
    </nav>

    <div class="dg-sidebar__footer">
      <div class="dg-sidebar__unit-card">
        <div style="font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
          <span class="status-dot-live"></span>
          <span>SPPG Medan Baru 04</span>
        </div>
        <div style="color:var(--text-secondary);font-size:11px;margin-top:2px;">
          Peran Aktif: <strong>${escapeHtml(userRole)}</strong>
        </div>
      </div>
      <button type="button" class="dg-sidebar__link" id="sidebar-logout-btn" title="Keluar dari Sesi">
        ${renderIcon('log-out', { size: 18 })}
        <span class="dg-sidebar__link-text">Keluar Sesi</span>
      </button>
    </div>
  `;

  // Bind navigation clicks
  const navContainer = containerEl.querySelector('#sidebar-nav-container');
  const indicatorEl = containerEl.querySelector('#sidebar-active-indicator');
  const activeBtn = containerEl.querySelector(`.dg-sidebar__link[data-route="${currentRoute}"]`);

  if (navContainer && indicatorEl && activeBtn) {
    requestAnimationFrame(() => {
      animateSidebarIndicator(navContainer, indicatorEl, activeBtn);
    });
  }

  containerEl.querySelectorAll('.dg-sidebar__link[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const route = btn.getAttribute('data-route');
      if (route && typeof onNavigate === 'function') {
        onNavigate(route);
      }
    });
  });

  const collapseBtn = containerEl.querySelector('#sidebar-collapse-toggle');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      store.toggleSidebar();
    });
  }

  const logoutBtn = containerEl.querySelector('#sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof onNavigate === 'function') onNavigate('__logout__');
    });
  }

  bindInteractiveButtons(containerEl);
}
