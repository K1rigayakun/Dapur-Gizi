/**
 * DapurGizi — Topbar Component (js/components/topbar.js)
 * Features:
 * - Global search bar (navigates or filters modules)
 * - Active operational date & Effective Service Day indicator
 * - Visible DEMO MODE / EEL PRODUCTION MODE badge & quick switcher
 * - Role switcher (for testing RBAC visibility in Demo Mode)
 * - Notification dropdown trigger with unread badge
 * - Light / Dark theme toggle
 * - User profile summary
 */

import { renderIcon } from './icon.js';
import { store } from '../state.js';
import { ROLES } from '../utils/permissions.js';
import { formatDateID, escapeHtml } from '../utils/format.js';
import { callApi } from '../services/api.js';
import { showToast } from './toast.js';

export function renderTopbar(containerEl, onNavigate) {
  if (!containerEl) return;
  const {
    theme,
    backendMode,
    eelConnected,
    session,
    unreadNotificationCount,
    selectedOperationDate,
    globalSearchQuery
  } = store.state;

  const user = (session && session.user) || {
    name: 'Dr. Hendra Wijaya, M.Gz',
    role: 'Kepala SPPG',
    email: 'kepala@dapurgizi.id'
  };
  const initials = user.name
    .split(' ')
    .filter((w) => !w.includes('.'))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'DG';

  const isDemo = backendMode === 'DEMO';

  containerEl.innerHTML = `
    <div class="dg-topbar__left">
      <div class="dg-topbar__search">
        <span class="dg-topbar__search-icon">
          ${renderIcon('search', { size: 16 })}
        </span>
        <input
          type="search"
          id="topbar-global-search"
          class="dg-topbar__search-input"
          placeholder="Cari penerima manfaat, NIK, menu, batch produksi, atau rute..."
          value="${escapeHtml(globalSearchQuery)}"
          aria-label="Pencarian cepat operasional SPPG"
        />
      </div>
    </div>

    <div class="dg-topbar__right">
      <!-- Visible Demo Mode / Eel Bridge Status Indicator -->
      <button
        type="button"
        id="topbar-mode-badge"
        class="dg-mode-pill ${isDemo ? 'dg-mode-pill--demo' : 'dg-mode-pill--eel'}"
        title="Klik untuk melihat konfigurasi jembatan Python Eel / Mode Demo"
      >
        ${renderIcon(isDemo ? 'database' : 'plug', { size: 14 })}
        <span>${isDemo ? 'DEMO MODE (Simulasi Lokal)' : eelConnected ? 'EEL PYTHON CONNECTED' : 'PRODUCTION (Eel Offline)'}</span>
      </button>

      <!-- Operational Date Pill -->
      <div class="dg-topbar__date" title="Tanggal Operasional Aktif SPPG">
        ${renderIcon('calendar', { size: 15 })}
        <span>Kamis, ${formatDateID(selectedOperationDate)}</span>
      </div>

      <!-- Quick Role Switcher for University Evaluation / RBAC Testing -->
      <div style="display:flex;align-items:center;gap:6px;">
        <select
          id="topbar-role-switcher"
          class="form-select"
          style="height:36px;padding:0 10px;font-size:12px;font-weight:700;border-radius:999px;width:auto;"
          aria-label="Simulasi Peran Pengguna (RBAC)"
          title="Uji visibilitas modul berdasarkan Peran Pengguna (RBAC)"
        >
          ${Object.values(ROLES)
            .map(
              (r) =>
                `<option value="${escapeHtml(r)}" ${user.role === r ? 'selected' : ''}>Peran: ${escapeHtml(r)}</option>`
            )
            .join('')}
        </select>
      </div>

      <!-- Notification Dropdown Trigger -->
      <button
        type="button"
        class="dg-topbar__icon-btn"
        id="topbar-notif-btn"
        aria-label="Notifikasi (${unreadNotificationCount} belum dibaca)"
        title="Pusat Notifikasi"
      >
        ${renderIcon('bell', { size: 18 })}
        ${
          unreadNotificationCount > 0
            ? `<span class="dg-topbar__notif-badge">${unreadNotificationCount}</span>`
            : ''
        }
      </button>

      <!-- Theme Toggle (Light / Dark) -->
      <button
        type="button"
        class="dg-topbar__icon-btn"
        id="topbar-theme-btn"
        aria-label="Alihkan tema terang atau gelap"
        title="${theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}"
      >
        ${renderIcon(theme === 'dark' ? 'sun' : 'moon', { size: 18 })}
      </button>

      <!-- User Profile Pill -->
      <button
        type="button"
        class="dg-topbar__profile"
        id="topbar-profile-btn"
        title="Profil & Manajemen Pengguna"
      >
        <span class="dg-topbar__avatar">${escapeHtml(initials)}</span>
        <span class="dg-topbar__profile-info">
          <span class="dg-topbar__profile-name">${escapeHtml(user.name)}</span>
          <span class="dg-topbar__profile-role">${escapeHtml(user.role)}</span>
        </span>
      </button>
    </div>

    <div id="topbar-notif-dropdown-mount"></div>
  `;

  // Global search handler
  const searchInput = containerEl.querySelector('#topbar-global-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        store.state.globalSearchQuery = q;
        if (!q) return;
        const lower = q.toLowerCase();
        if (lower.includes('menu') || lower.includes('ayam') || lower.includes('ikan')) {
          onNavigate('menus');
        } else if (lower.includes('rute') || lower.includes('smp') || lower.includes('sma')) {
          onNavigate('distribution');
        } else if (lower.includes('batch') || lower.includes('produksi')) {
          onNavigate('production');
        } else {
          onNavigate('beneficiaries');
        }
        showToast({
          title: 'Pencarian Cepat Diterapkan',
          message: `Menampilkan hasil relevan untuk "${q}".`,
          type: 'info',
          duration: 2400
        });
      }
    });
  }

  // Mode pill click -> navigate to settings
  const modeBtn = containerEl.querySelector('#topbar-mode-badge');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      onNavigate('settings');
    });
  }

  // Role switcher change
  const roleSelect = containerEl.querySelector('#topbar-role-switcher');
  if (roleSelect) {
    roleSelect.addEventListener('change', (e) => {
      const nextRole = e.target.value;
      store.switchDemoRole(nextRole);
      showToast({
        title: `Peran Beralih: ${nextRole}`,
        message: 'Hak akses menu bilah sisi dan tombol aksi telah disesuaikan.',
        type: 'success'
      });
    });
  }

  // Theme toggle
  const themeBtn = containerEl.querySelector('#topbar-theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      store.toggleTheme();
      showToast({
        title: store.state.theme === 'dark' ? 'Mode Gelap Aktif' : 'Mode Terang Aktif',
        message: 'Preferensi tampilan disimpan secara lokal.',
        type: 'info',
        duration: 2000
      });
    });
  }

  // Profile click
  const profileBtn = containerEl.querySelector('#topbar-profile-btn');
  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      onNavigate('users');
    });
  }

  // Notification dropdown toggle
  const notifBtn = containerEl.querySelector('#topbar-notif-btn');
  const dropdownMount = containerEl.querySelector('#topbar-notif-dropdown-mount');
  if (notifBtn && dropdownMount) {
    notifBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (dropdownMount.innerHTML.trim() !== '') {
        dropdownMount.innerHTML = '';
        return;
      }
      const res = await callApi('notifications_list');
      if (!res.success) return;
      const items = res.data.items || [];
      dropdownMount.innerHTML = `
        <div class="notif-dropdown" role="dialog" aria-label="Notifikasi Terbaru">
          <div style="padding:12px 16px;border-bottom:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;">
            <strong style="font-size:13.5px;">Notifikasi Operasional (${res.data.unreadCount} Baru)</strong>
            <button type="button" class="btn btn-ghost btn-sm" id="dropdown-mark-all-read">Tandai Semua Dibaca</button>
          </div>
          <div class="notif-dropdown__list">
            ${
              items.length === 0
                ? `<div style="padding:20px;text-align:center;color:var(--text-secondary);">Tidak ada notifikasi.</div>`
                : items
                    .map(
                      (n) => `
                  <div class="notif-item ${!n.read ? 'is-unread' : ''}" data-notif-id="${escapeHtml(n.id)}" data-target-route="${escapeHtml(n.relatedRoute)}">
                    <div style="margin-top:2px;color:var(--color-primary);">
                      ${renderIcon('bell', { size: 16 })}
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);">${escapeHtml(n.title)}</div>
                      <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(n.message)}</div>
                      <div style="font-size:10.5px;color:var(--text-muted);margin-top:4px;">${escapeHtml(n.category)}</div>
                    </div>
                  </div>
                `
                    )
                    .join('')
            }
          </div>
          <div style="padding:10px 16px;border-top:1px solid var(--border-subtle);background:var(--bg-surface-muted);text-align:center;">
            <button type="button" class="btn btn-secondary btn-sm" id="dropdown-open-all-notifs" style="width:100%;">
              Buka Pusat Notifikasi Lengkap
            </button>
          </div>
        </div>
      `;

      const markAllBtn = dropdownMount.querySelector('#dropdown-mark-all-read');
      if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
          const updated = await callApi('notifications_mark_read', { markAll: true });
          if (updated.success) {
            store.setUnreadCount(updated.data.unreadCount);
            dropdownMount.innerHTML = '';
          }
        });
      }

      const openAllBtn = dropdownMount.querySelector('#dropdown-open-all-notifs');
      if (openAllBtn) {
        openAllBtn.addEventListener('click', () => {
          dropdownMount.innerHTML = '';
          onNavigate('notifications');
        });
      }

      dropdownMount.querySelectorAll('.notif-item').forEach((row) => {
        row.addEventListener('click', async () => {
          const id = row.getAttribute('data-notif-id');
          const route = row.getAttribute('data-target-route') || 'notifications';
          const updated = await callApi('notifications_mark_read', { id });
          if (updated.success) {
            store.setUnreadCount(updated.data.unreadCount);
          }
          dropdownMount.innerHTML = '';
          onNavigate(route);
        });
      });
    });

    document.addEventListener(
      'click',
      (evt) => {
        if (dropdownMount && !dropdownMount.contains(evt.target) && evt.target !== notifBtn) {
          dropdownMount.innerHTML = '';
        }
      },
      { once: true }
    );
  }
}
