/**
 * DapurGizi — Accessible Modal & Drawer Dialog Component (js/components/modal.js)
 * Features:
 * - Natural grow animation from trigger coordinates via Anime.js v4 (250–400ms)
 * - Escape key dismissal & focus management
 * - Supports both standard centered modals and right-hand slide-over drawers
 */

import { renderIcon } from './icon.js';
import { animateModalOpen, animateModalClose, bindInteractiveButtons } from '../utils/motion.js';
import { escapeHtml } from '../utils/format.js';

let activeModal = null;

export function closeModal() {
  if (!activeModal) return Promise.resolve();
  const { backdrop, dialog, onKeyDown } = activeModal;
  window.removeEventListener('keydown', onKeyDown);
  activeModal = null;

  return animateModalClose(backdrop, dialog).then(() => {
    if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
  });
}

/**
 * Opens an accessible modal or drawer.
 * @param {object} config - { title, bodyHtml, footerHtml, size: 'md'|'lg'|'drawer', triggerEl, onMount }
 */
export function openModal(config = {}) {
  if (activeModal) {
    if (activeModal.backdrop && activeModal.backdrop.parentNode) {
      activeModal.backdrop.parentNode.removeChild(activeModal.backdrop);
    }
    window.removeEventListener('keydown', activeModal.onKeyDown);
    activeModal = null;
  }

  const triggerRect =
    config.triggerEl && typeof config.triggerEl.getBoundingClientRect === 'function'
      ? config.triggerEl.getBoundingClientRect()
      : null;

  const sizeClass =
    config.size === 'lg'
      ? 'dg-modal-dialog--lg'
      : config.size === 'drawer'
      ? 'dg-modal-dialog--drawer'
      : '';

  const backdrop = document.createElement('div');
  backdrop.className = 'dg-modal-backdrop';
  backdrop.setAttribute('role', 'presentation');

  backdrop.innerHTML = `
    <div class="dg-modal-dialog ${sizeClass}" role="dialog" aria-modal="true" aria-labelledby="dg-modal-title">
      <div class="dg-modal__header">
        <h2 class="dg-modal__title" id="dg-modal-title">${escapeHtml(config.title || 'Detail')}</h2>
        <button type="button" class="btn btn-ghost btn-sm" data-modal-close aria-label="Tutup dialog">
          ${renderIcon('x', { size: 18 })}
        </button>
      </div>
      <div class="dg-modal__body">
        ${config.bodyHtml || ''}
      </div>
      ${
        config.footerHtml !== undefined
          ? `<div class="dg-modal__footer">${config.footerHtml}</div>`
          : ''
      }
    </div>
  `;

  document.body.appendChild(backdrop);
  const dialog = backdrop.querySelector('.dg-modal-dialog');

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  backdrop.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal());
  });

  activeModal = { backdrop, dialog, onKeyDown };
  animateModalOpen(backdrop, dialog, triggerRect);
  bindInteractiveButtons(dialog);

  if (typeof config.onMount === 'function') {
    config.onMount(dialog, closeModal);
  }

  const firstInput = dialog.querySelector('input, select, textarea, button:not([data-modal-close])');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 60);
  }

  return { dialog, close: closeModal };
}

/**
 * Opens a standardized Confirmation Dialog (replaces native window.confirm).
 */
export function openConfirmDialog({
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  triggerEl = null,
  onConfirm
}) {
  return openModal({
    title,
    triggerEl,
    bodyHtml: `
      <div style="display:flex;align-items:flex-start;gap:14px;">
        <div style="width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:${
          danger ? 'rgba(239,68,68,0.14)' : 'rgba(245,158,11,0.16)'
        };color:${danger ? 'var(--color-danger)' : 'var(--color-warning)'}">
          ${renderIcon('alert-triangle', { size: 22 })}
        </div>
        <div>
          <p style="font-size:13.5px;color:var(--text-primary);line-height:1.55;">${escapeHtml(message)}</p>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>${escapeHtml(cancelLabel)}</button>
      <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'} btn-liquid btn-magnetic" id="dg-confirm-action-btn">
        ${escapeHtml(confirmLabel)}
      </button>
    `,
    onMount(dialog, close) {
      const confirmBtn = dialog.querySelector('#dg-confirm-action-btn');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
          confirmBtn.disabled = true;
          try {
            if (typeof onConfirm === 'function') await onConfirm();
          } finally {
            close();
          }
        });
      }
    }
  });
}
