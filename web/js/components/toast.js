/**
 * DapurGizi — Toast Notification Component (js/components/toast.js)
 * Uses Anime.js v4 entrance/exit animations and local Lucide SVG icons.
 */

import { renderIcon } from './icon.js';
import { animateToastEnter, animateToastExit } from '../utils/motion.js';
import { escapeHtml } from '../utils/format.js';

let containerEl = null;

function ensureContainer() {
  if (containerEl && document.body.contains(containerEl)) return containerEl;
  containerEl = document.createElement('div');
  containerEl.className = 'dg-toast-container';
  containerEl.setAttribute('role', 'region');
  containerEl.setAttribute('aria-label', 'Notifikasi Sistem');
  document.body.appendChild(containerEl);
  return containerEl;
}

const TYPE_ICONS = {
  success: { icon: 'check-circle', color: 'var(--color-success)' },
  warning: { icon: 'alert-triangle', color: 'var(--color-warning)' },
  danger: { icon: 'alert-circle', color: 'var(--color-danger)' },
  info: { icon: 'info', color: 'var(--color-info)' }
};

export function showToast({ title, message = '', type = 'info', duration = 3800 }) {
  const container = ensureContainer();
  const cfg = TYPE_ICONS[type] || TYPE_ICONS.info;

  const toast = document.createElement('div');
  toast.className = `dg-toast dg-toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <div class="dg-toast__icon" style="color:${cfg.color}">
      ${renderIcon(cfg.icon, { size: 20 })}
    </div>
    <div class="dg-toast__content">
      <div class="dg-toast__title">${escapeHtml(title)}</div>
      ${message ? `<div class="dg-toast__msg">${escapeHtml(message)}</div>` : ''}
    </div>
    <button type="button" class="btn btn-ghost btn-sm dg-toast__close" aria-label="Tutup notifikasi" style="padding:0 6px;height:24px;">
      ${renderIcon('x', { size: 15 })}
    </button>
  `;

  container.appendChild(toast);
  animateToastEnter(toast);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    animateToastExit(toast).then(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  };

  const closeBtn = toast.querySelector('.dg-toast__close');
  if (closeBtn) closeBtn.addEventListener('click', dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }
  return { dismiss };
}
