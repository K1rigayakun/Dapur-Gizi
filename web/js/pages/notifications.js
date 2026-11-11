/**
 * DapurGizi — Module K: Notification Center (js/pages/notifications.js)
 * Implements:
 * - Full notification center list
 * - Category filter (Menu & Gizi, Keamanan Pangan, Distribusi)
 * - Unread count & Mark as read (single & bulk)
 * - Direct navigation to related operational module
 * - Formatted Indonesian timestamps
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { store } from '../state.js';
import { showToast } from '../components/toast.js';
import { formatDateTimeID, escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons } from '../utils/motion.js';

let selectedCat = 'ALL';

export async function renderNotificationsPage(containerEl, onNavigate) {
  if (!containerEl) return;
  const res = await callApi('notifications_list');
  if (!res.success) return;

  const allItems = res.data.items || [];
  store.setUnreadCount(res.data.unreadCount);

  const items =
    selectedCat === 'ALL' ? allItems : allItems.filter((n) => n.category === selectedCat);

  const categories = ['ALL', 'Menu & Gizi', 'Keamanan Pangan', 'Distribusi'];

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('bell', { size: 14 })} PUSAT NOTIFIKASI & PERINGATAN DINI</span>
        <h1 class="page-header__title">Pusat Notifikasi Operasional (${res.data.unreadCount} Belum Dibaca)</h1>
        <p class="page-header__subtitle">
          Pantau seluruh pengingat persetujuan menu, masa berlaku sertifikat SLHS, serta konfirmasi kedatangan armada distribusi.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="notif-mark-all-btn" ${
          res.data.unreadCount === 0 ? 'disabled' : ''
        }>
          ${renderIcon('check-circle', { size: 16 })}
          <span>Tandai Semua Sudah Dibaca</span>
        </button>
      </div>
    </div>

    <div class="glass-panel anim-section">
      <div class="dg-table-toolbar">
        <div class="dg-tabs">
          ${categories
            .map(
              (c) => `
            <button type="button" class="dg-tab-btn ${selectedCat === c ? 'is-active' : ''}" data-notif-cat="${escapeHtml(c)}">
              ${c === 'ALL' ? 'Semua Kategori' : escapeHtml(c)}
            </button>
          `
            )
            .join('')}
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${items
          .map(
            (n) => `
          <div
            class="glass-panel"
            style="padding:14px 18px;border-color:${
              !n.read ? 'var(--color-primary)' : 'var(--border-subtle)'
            };background:${!n.read ? 'var(--bg-surface-hover)' : 'var(--bg-surface-solid)'};"
          >
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="width:38px;height:38px;border-radius:10px;background:var(--color-mint);color:var(--color-primary-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  ${renderIcon('bell', { size: 18 })}
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span class="badge badge-info">${escapeHtml(n.category)}</span>
                    ${!n.read ? `<span class="badge badge-warning">Baru</span>` : `<span class="badge badge-neutral">Dibaca</span>`}
                    <span style="font-size:11.5px;color:var(--text-muted);">${formatDateTimeID(n.timestamp)}</span>
                  </div>
                  <h3 style="font-size:14.5px;font-weight:800;margin-top:6px;">${escapeHtml(n.title)}</h3>
                  <p style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(n.message)}</p>
                </div>
              </div>

              <div style="display:flex;gap:8px;flex-shrink:0;">
                ${
                  !n.read
                    ? `
                  <button type="button" class="btn btn-secondary btn-sm btn-liquid notif-read-single" data-id="${escapeHtml(n.id)}">
                    ${renderIcon('check', { size: 14 })} Tandai Dibaca
                  </button>
                `
                    : ''
                }
                <button type="button" class="btn btn-primary btn-sm btn-liquid notif-goto-module" data-id="${escapeHtml(n.id)}" data-route="${escapeHtml(n.relatedRoute)}">
                  Buka Modul Terkait ${renderIcon('chevron-right', { size: 14 })}
                </button>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  containerEl.querySelectorAll('[data-notif-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedCat = btn.getAttribute('data-notif-cat');
      renderNotificationsPage(containerEl, onNavigate);
    });
  });

  containerEl.querySelector('#notif-mark-all-btn')?.addEventListener('click', async () => {
    const upd = await callApi('notifications_mark_read', { markAll: true });
    if (upd.success) {
      store.setUnreadCount(upd.data.unreadCount);
      showToast({
        title: 'Semua Notifikasi Dibaca',
        message: 'Seluruh pemberitahuan telah ditandai sudah dibaca.',
        type: 'success'
      });
      renderNotificationsPage(containerEl, onNavigate);
    }
  });

  containerEl.querySelectorAll('.notif-read-single').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const upd = await callApi('notifications_mark_read', { id });
      if (upd.success) {
        store.setUnreadCount(upd.data.unreadCount);
        renderNotificationsPage(containerEl, onNavigate);
      }
    });
  });

  containerEl.querySelectorAll('.notif-goto-module').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const route = btn.getAttribute('data-route') || 'dashboard';
      const upd = await callApi('notifications_mark_read', { id });
      if (upd.success) store.setUnreadCount(upd.data.unreadCount);
      if (typeof onNavigate === 'function') onNavigate(route);
    });
  });
}
