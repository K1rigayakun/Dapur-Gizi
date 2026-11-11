/**
 * DapurGizi — Module J: User Management & Configurable RBAC (js/pages/users.js)
 * Implements:
 * - User list across 4 SPPG roles (Kepala SPPG, Pengawas Gizi, Pengawas Keuangan, Pengawas Sanitasi)
 * - Add & Edit user modal
 * - User detail drawer
 * - Profile & Change password interface
 * - Configurable Role Access Matrix (explicitly documented as a project design decision)
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { store } from '../state.js';
import { ROLES } from '../utils/permissions.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons } from '../utils/motion.js';

export async function renderUsersPage(containerEl) {
  if (!containerEl) return;
  const res = await callApi('users_list');
  const users = res.success ? res.data.items : [];
  const activeSessionUser = store.state.session?.user || users[0];
  const roleMatrix = store.state.roleMatrix;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('user-cog', { size: 14 })} PERSONEL SPPG & HAK AKSES PERAN</span>
        <h1 class="page-header__title">Manajemen Pengguna & Matriks Hak Akses</h1>
        <p class="page-header__subtitle">
          Kelola akun personel SPPG (Kepala SPPG, Pengawas Gizi, Pengawas Keuangan, Pengawas Sanitasi), profil aktif, serta konfigurasi akses peran.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-secondary btn-liquid" id="usr-change-pass-btn">
          ${renderIcon('key', { size: 16 })}
          <span>Ubah Kata Sandi Saya</span>
        </button>
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="usr-add-btn">
          ${renderIcon('plus', { size: 16 })}
          <span>Tambah Pengguna SPPG</span>
        </button>
      </div>
    </div>

    <!-- Active Profile Card & RBAC Notice -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-5 glass-panel">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">${renderIcon('shield-check', { size: 18 })} Profil Sesi Pengguna Aktif</h2>
          <span class="badge badge-success">Sedang Aktif</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,var(--color-primary),var(--color-primary-dark));color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;">
            ${escapeHtml((activeSessionUser.name || 'DG').slice(0, 2).toUpperCase())}
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;">${escapeHtml(activeSessionUser.name)}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);">${escapeHtml(activeSessionUser.email)}</div>
            <div style="margin-top:4px;">
              <span class="badge badge-info">${escapeHtml(activeSessionUser.role)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="col-7 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('settings', { size: 18 })} Matriks Hak Akses Peran (Keputusan Desain Proyek)</h2>
            <p class="glass-panel__subtitle">
              Pembagian wewenang di bawah merupakan rancangan arsitektur perangkat lunak DapurGizi dan dapat dikonfigurasi sesuai kebutuhan unit SPPG.
            </p>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;font-size:12px;">
          ${Object.values(ROLES)
            .map((roleName) => {
              const cfg = roleMatrix[roleName] || {};
              return `
                <div style="padding:10px 12px;border-radius:10px;background:var(--bg-surface-muted);border:1px solid var(--border-subtle);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <strong>${escapeHtml(roleName)}</strong>
                    <span class="badge badge-info">${(cfg.modules || []).length} Modul</span>
                  </div>
                  <div style="color:var(--text-secondary);font-size:11.5px;margin-top:4px;">${escapeHtml(cfg.description || '')}</div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    </div>

    <!-- Users Directory Table -->
    <div class="glass-panel anim-section">
      <div class="glass-panel__header">
        <h2 class="glass-panel__title">${renderIcon('users', { size: 18 })} Daftar Akun Personel SPPG (${users.length} Pengguna)</h2>
      </div>
      <div class="dg-table-wrapper">
        <table class="dg-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama Lengkap & Gelar</th>
              <th>Email Kedinasan</th>
              <th>Peran Operasional</th>
              <th>No. Telepon</th>
              <th>Status Akun</th>
              <th class="text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (u) => `
              <tr>
                <td class="font-mono font-bold">${escapeHtml(u.id)}</td>
                <td class="font-bold">${escapeHtml(u.name)}</td>
                <td>${escapeHtml(u.email)}</td>
                <td><span class="badge badge-info">${escapeHtml(u.role)}</span></td>
                <td>${escapeHtml(u.phone)}</td>
                <td>
                  <span class="badge ${u.status === 'Aktif' ? 'badge-success' : 'badge-neutral'}">
                    ${escapeHtml(u.status)}
                  </span>
                </td>
                <td class="text-right">
                  <div style="display:inline-flex;gap:6px;">
                    <button type="button" class="btn btn-secondary btn-sm usr-detail-btn" data-id="${escapeHtml(u.id)}" title="Detail Pengguna">
                      ${renderIcon('eye', { size: 14 })}
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm usr-edit-btn" data-id="${escapeHtml(u.id)}" title="Ubah Peran / Status">
                      ${renderIcon('edit', { size: 14 })}
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  // Add user modal
  const addBtn = containerEl.querySelector('#usr-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openUserFormModal(null, addBtn, () => renderUsersPage(containerEl));
    });
  }

  // Edit user modal
  containerEl.querySelectorAll('.usr-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = users.find((x) => x.id === btn.getAttribute('data-id'));
      if (u) openUserFormModal(u, btn, () => renderUsersPage(containerEl));
    });
  });

  // Detail drawer
  containerEl.querySelectorAll('.usr-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const u = users.find((x) => x.id === btn.getAttribute('data-id'));
      if (!u) return;
      openModal({
        title: `Detail Personel SPPG • ${u.id}`,
        size: 'drawer',
        triggerEl: btn,
        bodyHtml: `
          <div style="display:flex;flex-direction:column;gap:14px;font-size:13px;">
            <div style="padding:14px;border-radius:12px;background:var(--bg-surface-muted);">
              <span class="badge badge-info">${escapeHtml(u.role)}</span>
              <h3 style="font-size:17px;font-weight:800;margin-top:8px;">${escapeHtml(u.name)}</h3>
              <p style="color:var(--text-secondary);">${escapeHtml(u.email)}</p>
            </div>
            <div class="glass-panel" style="padding:14px;">
              <div><strong>Unit Penugasan:</strong> ${escapeHtml(u.unit)}</div>
              <div style="margin-top:6px;"><strong>Nomor Kontak:</strong> ${escapeHtml(u.phone)}</div>
              <div style="margin-top:6px;"><strong>Status Akun:</strong> ${escapeHtml(u.status)}</div>
              <div style="margin-top:6px;"><strong>Aktivitas Masuk Terakhir:</strong> ${escapeHtml(u.lastLogin)}</div>
            </div>
          </div>
        `,
        footerHtml: `<button type="button" class="btn btn-primary btn-liquid" data-modal-close>Tutup</button>`
      });
    });
  });

  // Change password modal
  const passBtn = containerEl.querySelector('#usr-change-pass-btn');
  if (passBtn) {
    passBtn.addEventListener('click', () => {
      openModal({
        title: 'Ubah Kata Sandi Akun SPPG',
        triggerEl: passBtn,
        bodyHtml: `
          <form id="change-pass-form" class="form-grid">
            <div class="form-group form-group--full">
              <label class="form-label">Kata Sandi Saat Ini *</label>
              <input type="password" name="currentPassword" class="form-input" value="demo123" required />
            </div>
            <div class="form-group">
              <label class="form-label">Kata Sandi Baru (Min. 6 Karakter) *</label>
              <input type="password" name="newPassword" class="form-input" placeholder="Masukkan sandi baru" required />
            </div>
            <div class="form-group">
              <label class="form-label">Konfirmasi Kata Sandi Baru *</label>
              <input type="password" name="confirmPassword" class="form-input" placeholder="Ulangi sandi baru" required />
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="submit-pass-btn">Simpan Kata Sandi</button>
        `,
        onMount(dialog, close) {
          const btn = dialog.querySelector('#submit-pass-btn');
          const formEl = dialog.querySelector('#change-pass-form');
          btn.addEventListener('click', async () => {
            const data = extractFormData(formEl);
            if (!data.newPassword || data.newPassword.length < 6) {
              showToast({ title: 'Validasi Sandi', message: 'Kata sandi baru minimal 6 karakter.', type: 'warning' });
              return;
            }
            if (data.newPassword !== data.confirmPassword) {
              showToast({ title: 'Validasi Sandi', message: 'Konfirmasi kata sandi tidak cocok.', type: 'danger' });
              return;
            }
            const r = await callApi('users_change_password', data);
            if (r.success) {
              showToast({ title: 'Kata Sandi Diperbarui', message: r.data.message, type: 'success' });
              close();
            }
          });
        }
      });
    });
  }
}

function openUserFormModal(editingUser, triggerEl, onSuccess) {
  const isEdit = Boolean(editingUser);
  const u = editingUser || {
    name: '',
    email: '',
    role: 'Pengawas Gizi',
    phone: '0812-6000-1122',
    status: 'Aktif'
  };

  openModal({
    title: isEdit ? `Ubah Akun Pengguna • ${u.name}` : 'Tambah Pengguna Baru SPPG',
    triggerEl,
    bodyHtml: `
      <form id="usr-crud-form" class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama Lengkap & Gelar *</label>
          <input type="text" name="name" class="form-input" value="${escapeHtml(u.name)}" placeholder="Contoh: Dr. Ratna Sari, M.KM" required />
        </div>
        <div class="form-group">
          <label class="form-label">Alamat Email Kedinasan *</label>
          <input type="email" name="email" class="form-input" value="${escapeHtml(u.email)}" placeholder="ratna.sari@dapurgizi.id" required />
        </div>
        <div class="form-group">
          <label class="form-label">Penugasan Peran (Role) *</label>
          <select name="role" class="form-select">
            ${Object.values(ROLES)
              .map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${r}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Status Akun *</label>
          <select name="status" class="form-select">
            <option value="Aktif" ${u.status === 'Aktif' ? 'selected' : ''}>Aktif</option>
            <option value="Nonaktif" ${u.status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option>
          </select>
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Nomor Telepon / WhatsApp Operasional</label>
          <input type="text" name="phone" class="form-input" value="${escapeHtml(u.phone)}" />
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="usr-save-btn">
        ${renderIcon('check', { size: 16 })} Simpan Pengguna
      </button>
    `,
    onMount(dialog, close) {
      const btn = dialog.querySelector('#usr-save-btn');
      const formEl = dialog.querySelector('#usr-crud-form');
      btn.addEventListener('click', async () => {
        const data = extractFormData(formEl);
        if (!data.name || !data.email) {
          showToast({ title: 'Data Belum Lengkap', message: 'Nama dan email wajib diisi.', type: 'warning' });
          return;
        }
        const fn = isEdit ? 'users_update' : 'users_create';
        const payload = isEdit ? { ...data, id: editingUser.id } : data;
        const r = await callApi(fn, payload);
        if (r.success) {
          showToast({
            title: isEdit ? 'Pengguna Diperbarui' : 'Pengguna Ditambahkan',
            message: `${data.name} (${data.role}) berhasil disimpan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}
