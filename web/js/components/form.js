/**
 * DapurGizi — Form Serialization & Field Error Display Helper (js/components/form.js)
 */

import { escapeHtml } from '../utils/format.js';

export function extractFormData(formEl) {
  const fd = new FormData(formEl);
  const out = {};
  for (const [k, v] of fd.entries()) {
    out[k] = typeof v === 'string' ? v.trim() : v;
  }
  formEl.querySelectorAll('input[type="checkbox"][name]').forEach((cb) => {
    out[cb.name] = cb.checked;
  });
  return out;
}

export function clearFormErrors(formEl) {
  if (!formEl) return;
  formEl.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  formEl.querySelectorAll('.form-error').forEach((el) => el.remove());
}

export function showFormErrors(formEl, errors = {}) {
  if (!formEl) return;
  clearFormErrors(formEl);
  Object.entries(errors).forEach(([fieldName, msg]) => {
    const input = formEl.querySelector(`[name="${fieldName}"]`);
    if (input) {
      input.classList.add('is-invalid');
      const errEl = document.createElement('div');
      errEl.className = 'form-error';
      errEl.innerHTML = escapeHtml(msg);
      input.insertAdjacentElement('afterend', errEl);
    }
  });
}
