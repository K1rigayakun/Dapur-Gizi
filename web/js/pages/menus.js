/**
 * DapurGizi — Module D: Menu & Nutrition Planner (js/pages/menus.js)
 * Implements:
 * - Weekly menu planner & navigation
 * - Daily menu cards with drag-and-drop reordering powered by Anime.js v4 (`createDraggable`)
 * - Menu detail drawer (ingredients, gramasi, portion configuration, nutritional summary)
 * - Create & Edit menu modals
 * - Approval submission, Approval/Rejection, and Revision request workflows
 * - Note: Nutritional figures are presented as per-menu dietitian calculations without inventing legal thresholds.
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { store } from '../state.js';
import { canPerformAction } from '../utils/permissions.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { formatNumber, formatRupiah, escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons, createDraggable } from '../utils/motion.js';

let selectedWeek = 'Minggu 46 (09–13 Nov 2026)';

export async function renderMenusPage(containerEl) {
  if (!containerEl) return;
  const userRole = store.state.session?.user?.role || 'Kepala SPPG';
  const canApprove = canPerformAction(userRole, 'canApproveMenu', store.state.roleMatrix);

  const res = await callApi('menus_list', { weekLabel: 'ALL' });
  const menus = res.success ? res.data.items : [];

  const avgCalories =
    menus.length > 0 ? Math.round(menus.reduce((s, m) => s + Number(m.caloriesKcal || 0), 0) / menus.length) : 0;
  const avgProtein =
    menus.length > 0
      ? (menus.reduce((s, m) => s + Number(m.proteinGram || 0), 0) / menus.length).toFixed(1)
      : '0.0';
  const approvedCount = menus.filter((m) => m.status === 'Disetujui').length;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('utensils', { size: 14 })} SIKLUS MENU & KOMPOSISI GIZI</span>
        <h1 class="page-header__title">Perencanaan Menu Mingguan & Nutrisi</h1>
        <p class="page-header__subtitle">
          Susun komposisi bahan pangan, gramasi porsi, kalkulasi makronutrien (kalori, protein, karbohidrat, lemak), dan alur persetujuan menu.
        </p>
      </div>
      <div class="page-header__actions">
        <div class="dg-tabs">
          <button type="button" class="dg-tab-btn is-active" id="week-prev-btn">
            ${renderIcon('chevron-left', { size: 14 })} ${escapeHtml(selectedWeek)} ${renderIcon('chevron-right', { size: 14 })}
          </button>
        </div>
        <button type="button" class="btn btn-secondary btn-liquid" id="menu-shuffle-order-btn" title="Tukar urutan hari layanan">
          ${renderIcon('arrow-up-down', { size: 15 })}
          <span>Urutkan Siklus</span>
        </button>
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="menu-create-btn">
          ${renderIcon('plus', { size: 16 })}
          <span>Buat Menu Harian</span>
        </button>
      </div>
    </div>

    <!-- Nutritional Summary Banner -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-4 glass-panel" style="padding:16px 18px;">
        <div class="text-muted" style="font-size:12px;font-weight:600;">Rata-Rata Energi Siklus Mingguan</div>
        <div style="font-size:24px;font-weight:800;color:var(--color-primary);margin-top:4px;">
          ${formatNumber(avgCalories)} kkal <span style="font-size:12px;color:var(--text-secondary);font-weight:600;">/ porsi saji</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:4px;">
          Dihitung dari komposisi gramasi bahan pangan pada setiap kartu menu.
        </div>
      </div>

      <div class="col-4 glass-panel" style="padding:16px 18px;">
        <div class="text-muted" style="font-size:12px;font-weight:600;">Rata-Rata Protein Hewani & Nabati</div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-top:4px;">
          ${avgProtein} gram <span style="font-size:12px;color:var(--text-secondary);font-weight:600;">/ porsi saji</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:4px;">
          Kombinasi ayam, ikan tanpa duri, daging sapi, telur, tahu, dan tempe.
        </div>
      </div>

      <div class="col-4 glass-panel" style="padding:16px 18px;">
        <div class="text-muted" style="font-size:12px;font-weight:600;">Status Verifikasi Menu Mingguan</div>
        <div style="font-size:24px;font-weight:800;color:var(--text-primary);margin-top:4px;">
          ${approvedCount} / ${menus.length} <span style="font-size:12px;color:var(--color-success);font-weight:700;">Menu Disetujui</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:4px;">
          Tarik kartu (drag) untuk simulasi penyesuaian urutan hari siklus.
        </div>
      </div>
    </div>

    <!-- Weekly Menu Cards Grid -->
    <div class="menu-week-grid anim-section" id="menu-cards-grid">
      ${menus
        .map((m) => {
          const badgeClass =
            m.status === 'Disetujui'
              ? 'badge-success'
              : m.status === 'Menunggu Persetujuan'
              ? 'badge-warning'
              : m.status === 'Perlu Revisi'
              ? 'badge-danger'
              : 'badge-neutral';
          return `
            <div class="menu-day-card" data-menu-id="${escapeHtml(m.id)}">
              <div class="menu-day-card__day">
                <span>${escapeHtml(m.dayName)} • ${escapeHtml(m.date)}</span>
                <span class="drag-handle" title="Geser kartu (Anime.js v4 Draggable)" style="color:var(--text-muted);">
                  ${renderIcon('grip-vertical', { size: 15 })}
                </span>
              </div>

              <div>
                <span class="badge ${badgeClass}">${escapeHtml(m.status)}</span>
              </div>

              <h3 class="menu-day-card__title">${escapeHtml(m.name)}</h3>

              <div class="menu-nutrition-pills">
                <div class="menu-nutrition-pill">
                  <div class="text-muted">Energi</div>
                  <strong>${m.caloriesKcal} kkal</strong>
                </div>
                <div class="menu-nutrition-pill">
                  <div class="text-muted">Protein</div>
                  <strong>${m.proteinGram} g</strong>
                </div>
                <div class="menu-nutrition-pill">
                  <div class="text-muted">Karbo / Lemak</div>
                  <strong>${m.carbsGram}g / ${m.fatGram}g</strong>
                </div>
                <div class="menu-nutrition-pill">
                  <div class="text-muted">Target Porsi</div>
                  <strong>${formatNumber(m.plannedPortions)}</strong>
                </div>
              </div>

              <div style="font-size:12px;color:var(--text-secondary);border-top:1px solid var(--border-subtle);padding-top:8px;">
                Estimasi Bahan: <strong>${formatRupiah(m.costEstimatePerPortion)} / porsi</strong>
              </div>

              <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:6px;">
                <button type="button" class="btn btn-secondary btn-sm menu-detail-btn" data-id="${escapeHtml(m.id)}" style="flex:1;">
                  ${renderIcon('eye', { size: 14 })} Detail & Bahan
                </button>
                <button type="button" class="btn btn-secondary btn-sm menu-edit-btn" data-id="${escapeHtml(m.id)}" title="Ubah Menu">
                  ${renderIcon('edit', { size: 14 })}
                </button>
                ${
                  canApprove && m.status !== 'Disetujui'
                    ? `
                  <button type="button" class="btn btn-primary btn-sm menu-review-btn" data-id="${escapeHtml(m.id)}" style="width:100%;">
                    ${renderIcon('check-circle', { size: 14 })} Tinjau & Setujui
                  </button>
                `
                    : ''
                }
                ${
                  m.status === 'Draft' || m.status === 'Perlu Revisi'
                    ? `
                  <button type="button" class="btn btn-accent btn-sm menu-submit-btn" data-id="${escapeHtml(m.id)}" style="width:100%;">
                    ${renderIcon('send', { size: 14 })} Ajukan Persetujuan
                  </button>
                `
                    : ''
                }
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  // Attach Anime.js v4 createDraggable to each menu card
  containerEl.querySelectorAll('.menu-day-card').forEach((card) => {
    createDraggable(card, {
      trigger: card.querySelector('.drag-handle') || card,
      onRelease(inst) {
        if (Math.abs(inst.deltaX) > 65) {
          const id = card.getAttribute('data-menu-id');
          const idx = menus.findIndex((m) => m.id === id);
          const swapIdx = inst.deltaX > 0 ? Math.min(menus.length - 1, idx + 1) : Math.max(0, idx - 1);
          if (swapIdx !== idx && menus[swapIdx]) {
            const orderedIds = menus.map((m) => m.id);
            const temp = orderedIds[idx];
            orderedIds[idx] = orderedIds[swapIdx];
            orderedIds[swapIdx] = temp;
            callApi('menus_reorder', { orderedIds }).then(() => {
              showToast({
                title: 'Urutan Siklus Menu Diperbarui',
                message: `Urutan kartu menu telah disesuaikan.`,
                type: 'info',
                duration: 2200
              });
              renderMenusPage(containerEl);
            });
          }
        }
      }
    });
  });

  // Shuffle / Reverse cycle order button
  containerEl.querySelector('#menu-shuffle-order-btn')?.addEventListener('click', async () => {
    const reversedIds = [...menus].reverse().map((m) => m.id);
    await callApi('menus_reorder', { orderedIds: reversedIds });
    showToast({
      title: 'Siklus Menu Diurutkan Ulang',
      message: 'Urutan tampilan menu mingguan berhasil diperbarui.',
      type: 'info'
    });
    renderMenusPage(containerEl);
  });

  // Create menu button
  const createBtn = containerEl.querySelector('#menu-create-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openMenuFormModal(null, createBtn, () => renderMenusPage(containerEl));
    });
  }

  // Edit menu buttons
  containerEl.querySelectorAll('.menu-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = menus.find((x) => x.id === btn.getAttribute('data-id'));
      if (m) openMenuFormModal(m, btn, () => renderMenusPage(containerEl));
    });
  });

  // Detail & Ingredient management drawer
  containerEl.querySelectorAll('.menu-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = menus.find((x) => x.id === btn.getAttribute('data-id'));
      if (m) openMenuDetailDrawer(m, btn, () => renderMenusPage(containerEl));
    });
  });

  // Submit for review
  containerEl.querySelectorAll('.menu-submit-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const res = await callApi('menus_submit_for_review', { id });
      if (res.success) {
        showToast({
          title: 'Menu Diajukan',
          message: 'Menu telah dikirim untuk ditinjau oleh Kepala SPPG.',
          type: 'success'
        });
        renderMenusPage(containerEl);
      }
    });
  });

  // Review modal (Approve / Revision / Reject)
  containerEl.querySelectorAll('.menu-review-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const m = menus.find((x) => x.id === btn.getAttribute('data-id'));
      if (m) openMenuReviewModal(m, btn, () => renderMenusPage(containerEl));
    });
  });
}

function openMenuDetailDrawer(menu, triggerEl, onUpdated) {
  openModal({
    title: `Detail Menu & Komposisi Gizi • ${menu.dayName}`,
    size: 'drawer',
    triggerEl,
    bodyHtml: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="padding:14px;border-radius:12px;background:var(--bg-surface-muted);border:1px solid var(--border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span class="badge badge-info">${escapeHtml(menu.date)}</span>
            <span class="badge ${menu.status === 'Disetujui' ? 'badge-success' : 'badge-warning'}">${escapeHtml(menu.status)}</span>
          </div>
          <h3 style="font-size:16.5px;font-weight:800;margin-top:8px;">${escapeHtml(menu.name)}</h3>
          <p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">Sasaran: ${escapeHtml(menu.targetCategory)} • Target: ${formatNumber(menu.plannedPortions)} porsi</p>
        </div>

        <div class="glass-panel" style="padding:14px;">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;">Ringkasan Kandungan Gizi per Porsi</h4>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center;">
            <div style="padding:8px;border-radius:8px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11px;">Kalori</div>
              <strong>${menu.caloriesKcal} kkal</strong>
            </div>
            <div style="padding:8px;border-radius:8px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11px;">Protein</div>
              <strong>${menu.proteinGram} g</strong>
            </div>
            <div style="padding:8px;border-radius:8px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11px;">Karbohidrat</div>
              <strong>${menu.carbsGram} g</strong>
            </div>
            <div style="padding:8px;border-radius:8px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11px;">Lemak</div>
              <strong>${menu.fatGram} g</strong>
            </div>
          </div>
        </div>

        <div class="glass-panel" style="padding:14px;">
          <h4 style="font-size:13px;font-weight:700;margin-bottom:10px;">Daftar Bahan Pangan & Gramasi</h4>
          <table class="dg-table">
            <thead>
              <tr>
                <th>Bahan Pangan</th>
                <th>Peran Gizi</th>
                <th class="text-right">Gramasi/Porsi</th>
              </tr>
            </thead>
            <tbody>
              ${(menu.ingredients || [])
                .map(
                  (ing) => `
                <tr>
                  <td class="font-semibold">${escapeHtml(ing.name)}</td>
                  <td>${escapeHtml(ing.role)}</td>
                  <td class="text-right font-mono">${ing.amountGr} gr</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);font-size:12.5px;">
          <strong>Catatan Peninjau (${escapeHtml(menu.reviewedBy)}):</strong>
          <p style="color:var(--text-secondary);margin-top:4px;">${escapeHtml(menu.reviewNotes)}</p>
        </div>
      </div>
    `,
    footerHtml: `<button type="button" class="btn btn-primary btn-liquid" data-modal-close>Tutup Detail</button>`
  });
}

function openMenuFormModal(editingMenu, triggerEl, onSuccess) {
  const isEdit = Boolean(editingMenu);
  const m = editingMenu || {
    dayName: 'Jumat',
    date: '2026-11-13',
    name: '',
    plannedPortions: 2960,
    caloriesKcal: 650,
    proteinGram: 29.0,
    carbsGram: 83.0,
    fatGram: 19.5,
    costEstimatePerPortion: 11900,
    status: 'Draft'
  };

  openModal({
    title: isEdit ? `Ubah Menu Harian • ${m.dayName}` : 'Buat Menu Harian Baru',
    triggerEl,
    bodyHtml: `
      <form id="menu-crud-form" class="form-grid" novalidate>
        <div class="form-group">
          <label class="form-label">Hari Layanan *</label>
          <select name="dayName" class="form-select">
            ${['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu (Khusus)']
              .map((d) => `<option value="${d}" ${m.dayName === d ? 'selected' : ''}>${d}</option>`)
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Tanggal Layanan *</label>
          <input type="date" name="date" class="form-input" value="${escapeHtml(m.date)}" required />
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Nama Lengkap Menu (Karbohidrat, Lauk Hewani, Lauk Nabati, Sayur & Buah) *</label>
          <input type="text" name="name" class="form-input" value="${escapeHtml(m.name)}" placeholder="Contoh: Nasi Putih, Ayam Bumbu Rujak, Tahu Kukus, Sayur Sop & Pisang" required />
        </div>
        <div class="form-group">
          <label class="form-label">Konfigurasi Target Porsi *</label>
          <input type="number" name="plannedPortions" class="form-input" value="${m.plannedPortions}" min="50" required />
        </div>
        <div class="form-group">
          <label class="form-label">Estimasi Biaya Bahan / Porsi (Rp) *</label>
          <input type="number" name="costEstimatePerPortion" class="form-input" value="${m.costEstimatePerPortion}" min="1000" required />
        </div>
        <div class="form-group">
          <label class="form-label">Energi (kkal / porsi) *</label>
          <input type="number" name="caloriesKcal" class="form-input" value="${m.caloriesKcal}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Protein (gram / porsi) *</label>
          <input type="number" step="0.1" name="proteinGram" class="form-input" value="${m.proteinGram}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Karbohidrat (gram / porsi)</label>
          <input type="number" step="0.1" name="carbsGram" class="form-input" value="${m.carbsGram}" />
        </div>
        <div class="form-group">
          <label class="form-label">Lemak (gram / porsi)</label>
          <input type="number" step="0.1" name="fatGram" class="form-input" value="${m.fatGram}" />
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="menu-save-btn">
        ${renderIcon('check', { size: 16 })} Simpan Menu
      </button>
    `,
    onMount(dialog, close) {
      const formEl = dialog.querySelector('#menu-crud-form');
      const saveBtn = dialog.querySelector('#menu-save-btn');
      saveBtn.addEventListener('click', async () => {
        const data = extractFormData(formEl);
        if (!data.name || data.name.length < 5) {
          showToast({ title: 'Validasi Menu', message: 'Nama lengkap menu wajib diisi (min. 5 karakter).', type: 'warning' });
          return;
        }
        saveBtn.disabled = true;
        const fn = isEdit ? 'menus_update' : 'menus_create';
        const payload = isEdit ? { ...data, id: editingMenu.id } : data;
        const res = await callApi(fn, payload);
        saveBtn.disabled = false;
        if (res.success) {
          showToast({
            title: isEdit ? 'Menu Diperbarui' : 'Menu Baru Dibuat',
            message: `${data.dayName}: ${data.name} berhasil disimpan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}

function openMenuReviewModal(menu, triggerEl, onSuccess) {
  openModal({
    title: `Keputusan Peninjauan Menu • ${menu.dayName}`,
    triggerEl,
    bodyHtml: `
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
          <strong>${escapeHtml(menu.name)}</strong>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
            Energi: ${menu.caloriesKcal} kkal • Protein: ${menu.proteinGram}g • Target: ${formatNumber(menu.plannedPortions)} porsi
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="review-decision">Keputusan Peninjauan</label>
          <select id="review-decision" class="form-select">
            <option value="Disetujui">Setujui Menu untuk Produksi</option>
            <option value="Perlu Revisi">Minta Revisi Komposisi / Gramasi</option>
            <option value="Ditolak">Tolak Menu</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="review-notes">Catatan Verifikasi Gizi / Kepala SPPG</label>
          <textarea id="review-notes" class="form-textarea">Komposisi gizi dan ketersediaan bahan baku lokal telah diverifikasi serta disetujui.</textarea>
        </div>
      </div>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="confirm-review-btn">
        ${renderIcon('check-circle', { size: 16 })} Simpan Keputusan
      </button>
    `,
    onMount(dialog, close) {
      const btn = dialog.querySelector('#confirm-review-btn');
      btn.addEventListener('click', async () => {
        const decision = dialog.querySelector('#review-decision').value;
        const reviewNotes = dialog.querySelector('#review-notes').value;
        const reviewer = store.state.session?.user?.name || 'Dr. Hendra Wijaya, M.Gz';
        btn.disabled = true;
        const res = await callApi('menus_review', { id: menu.id, decision, reviewNotes, reviewer });
        if (res.success) {
          showToast({
            title: `Status Menu: ${decision}`,
            message: `Keputusan peninjauan untuk menu ${menu.dayName} telah disimpan.`,
            type: decision === 'Disetujui' ? 'success' : 'warning'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}
