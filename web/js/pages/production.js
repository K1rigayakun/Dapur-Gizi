/**
 * DapurGizi — Module E: Daily Production (js/pages/production.js)
 * Implements:
 * - Daily production overview & calendar strip
 * - Effective service day status
 * - Planned vs Actual portions & Quantity discrepancy warning
 * - Production records table
 * - Add/Edit production batch modal
 * - Interactive Production Timeline & Production Detail Drawer
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { formatNumber, formatRupiah, formatDateID, escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons, animateStatusTransition } from '../utils/motion.js';

let selectedBatchId = null;

export async function renderProductionPage(containerEl) {
  if (!containerEl) return;
  const res = await callApi('production_list');
  const items = res.success ? res.data.items : [];
  const activeBatch =
    items.find((p) => p.id === selectedBatchId) ||
    items.find((p) => p.date === '2026-11-12') ||
    items[items.length - 1];

  if (activeBatch) selectedBatchId = activeBatch.id;

  const discrepancy = activeBatch ? activeBatch.plannedPortions - activeBatch.actualPortions : 0;
  const hasDiscrepancy = Math.abs(discrepancy) > 0;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('chef-hat', { size: 14 })} MANAJEMEN PRODUKSI HARIAN</span>
        <h1 class="page-header__title">Kendali Batch Produksi & Pemorsian Dapur</h1>
        <p class="page-header__subtitle">
          Pantau kalender hari layanan efektif, target porsi vs realisasi aktual, tahapan pemasakan, dan peringatan selisih kuantitas.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="prod-add-btn">
          ${renderIcon('plus', { size: 16 })}
          <span>Catat Batch Produksi Baru</span>
        </button>
      </div>
    </div>

    <!-- Production Calendar Strip -->
    <div style="display:grid;grid-template-columns:repeat(${Math.min(6, items.length)},minmax(0,1fr));gap:12px;margin-bottom:20px;" class="anim-section">
      ${items
        .map((p) => {
          const isSelected = activeBatch && activeBatch.id === p.id;
          return `
            <button
              type="button"
              class="glass-panel prod-cal-btn"
              data-batch-id="${escapeHtml(p.id)}"
              style="padding:12px 14px;text-align:left;cursor:pointer;border-color:${
                isSelected ? 'var(--color-primary)' : 'var(--border-subtle)'
              };background:${isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-surface)'};"
            >
              <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:700;color:var(--text-secondary);">
                <span>${escapeHtml(p.dayLabel)}, ${escapeHtml(p.date)}</span>
                <span class="badge ${p.status === 'Selesai' ? 'badge-success' : 'badge-warning'}" style="font-size:10px;padding:2px 6px;">
                  ${escapeHtml(p.status)}
                </span>
              </div>
              <div style="font-size:16px;font-weight:800;margin-top:6px;color:var(--text-primary);">
                ${formatNumber(p.actualPortions)} / ${formatNumber(p.plannedPortions)} <span style="font-size:11px;font-weight:600;">porsi</span>
              </div>
              <div style="font-size:11px;color:var(--color-primary);font-weight:600;margin-top:2px;">
                ${p.isEffectiveServiceDay ? '✓ Hari Layanan Efektif' : 'Non-Efektif'}
              </div>
            </button>
          `;
        })
        .join('')}
    </div>

    ${
      activeBatch && hasDiscrepancy
        ? `
      <div class="glass-panel anim-section mb-4" style="border-left:4px solid var(--color-warning);background:rgba(245,158,11,0.09);padding:14px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:var(--color-warning);">${renderIcon('alert-triangle', { size: 22 })}</span>
            <div>
              <strong style="font-size:13.5px;">Peringatan Selisih Kuantitas Porsi (${escapeHtml(activeBatch.batchCode)})</strong>
              <p style="font-size:12.5px;color:var(--text-secondary);">
                Terdapat selisih <strong>${formatNumber(Math.abs(discrepancy))} porsi</strong> antara Rencana (${formatNumber(
                  activeBatch.plannedPortions
                )}) dan Realisasi Aktual (${formatNumber(activeBatch.actualPortions)}). Catatan: ${escapeHtml(activeBatch.notes)}
              </p>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-liquid prod-edit-btn" data-id="${escapeHtml(activeBatch.id)}">
            Sesuaikan Porsi Aktual
          </button>
        </div>
      </div>
    `
        : ''
    }

    <!-- Active Batch Detail & Interactive Timeline -->
    ${
      activeBatch
        ? `
      <div class="grid-12 mb-4 anim-section">
        <div class="col-7 glass-panel">
          <div class="glass-panel__header">
            <div>
              <span class="badge badge-info font-mono">${escapeHtml(activeBatch.batchCode)}</span>
              <h2 class="glass-panel__title" style="margin-top:6px;">${escapeHtml(activeBatch.menuName)}</h2>
              <p class="glass-panel__subtitle">Kepala Juru Masak: <strong>${escapeHtml(activeBatch.leadChef)}</strong> • Tanggal: ${formatDateID(activeBatch.date)}</p>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-secondary btn-sm btn-liquid prod-edit-btn" data-id="${escapeHtml(activeBatch.id)}">
                ${renderIcon('edit', { size: 14 })} Ubah Batch
              </button>
              ${
                activeBatch.status !== 'Selesai'
                  ? `
                <button type="button" class="btn btn-primary btn-sm btn-liquid" id="prod-mark-complete-btn" data-id="${escapeHtml(activeBatch.id)}">
                  ${renderIcon('check-circle', { size: 14 })} Tandai Selesai 100%
                </button>
              `
                  : ''
              }
            </div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
            <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11.5px;">Target Rencana</div>
              <div style="font-size:18px;font-weight:800;">${formatNumber(activeBatch.plannedPortions)}</div>
            </div>
            <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11.5px;">Realisasi Aktual</div>
              <div style="font-size:18px;font-weight:800;color:var(--color-primary);">${formatNumber(activeBatch.actualPortions)}</div>
            </div>
            <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11.5px;">Lolos QC Suhu/Gizi</div>
              <div style="font-size:18px;font-weight:800;color:var(--color-success);">${formatNumber(activeBatch.qcPassedPortions)}</div>
            </div>
            <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
              <div class="text-muted" style="font-size:11.5px;">Hari Layanan Efektif</div>
              <div style="font-size:15px;font-weight:800;margin-top:2px;">
                ${activeBatch.isEffectiveServiceDay ? 'YA (Aktif)' : 'TIDAK'}
              </div>
            </div>
          </div>

          <div style="padding:12px 14px;border-radius:10px;background:var(--bg-surface-muted);font-size:12.5px;">
            <strong>Catatan Operasional Dapur:</strong>
            <p style="color:var(--text-secondary);margin-top:4px;">${escapeHtml(activeBatch.notes)}</p>
          </div>
        </div>

        <div class="col-5 glass-panel">
          <div class="glass-panel__header">
            <div>
              <h2 class="glass-panel__title">${renderIcon('clock', { size: 18 })} Linimasa Tahapan Produksi</h2>
              <p class="glass-panel__subtitle">Klik tahapan untuk memperbarui status penyelesaian</p>
            </div>
          </div>
          <div class="timeline-steps">
            ${(activeBatch.timeline || [])
              .map(
                (step, idx) => `
              <div
                class="timeline-step ${step.done ? 'timeline-step--done' : 'timeline-step--active'} prod-timeline-toggle"
                data-step-idx="${idx}"
                style="cursor:pointer;"
                title="Klik untuk mengubah status tahapan"
              >
                <div style="color:${step.done ? 'var(--color-success)' : 'var(--color-orange)'};margin-top:2px;">
                  ${renderIcon(step.done ? 'check-circle' : 'clock', { size: 17 })}
                </div>
                <div style="flex:1;">
                  <div style="font-size:12.5px;font-weight:700;">${escapeHtml(step.stage)}</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);">Waktu Standar: ${escapeHtml(step.time)}</div>
                </div>
                <span class="badge ${step.done ? 'badge-success' : 'badge-warning'}">
                  ${step.done ? 'Selesai' : 'Proses'}
                </span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `
        : ''
    }

    <!-- Historical Production Records Table -->
    <div class="glass-panel anim-section">
      <div class="glass-panel__header">
        <h2 class="glass-panel__title">${renderIcon('file-text', { size: 18 })} Riwayat Catatan Produksi Harian</h2>
      </div>
      <div class="dg-table-wrapper">
        <table class="dg-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kode Batch</th>
              <th>Menu yang Diproduksi</th>
              <th>Hari Efektif</th>
              <th class="text-right">Rencana</th>
              <th class="text-right">Aktual</th>
              <th class="text-right">Selisih</th>
              <th>Status</th>
              <th class="text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map((p) => {
                const diff = p.actualPortions - p.plannedPortions;
                return `
                  <tr>
                    <td><strong>${escapeHtml(p.dayLabel)}</strong>, ${escapeHtml(p.date)}</td>
                    <td class="font-mono font-bold">${escapeHtml(p.batchCode)}</td>
                    <td style="max-width:280px;">${escapeHtml(p.menuName)}</td>
                    <td>
                      <span class="badge ${p.isEffectiveServiceDay ? 'badge-success' : 'badge-neutral'}">
                        ${p.isEffectiveServiceDay ? 'Efektif' : 'Non-Efektif'}
                      </span>
                    </td>
                    <td class="text-right font-mono">${formatNumber(p.plannedPortions)}</td>
                    <td class="text-right font-mono font-bold">${formatNumber(p.actualPortions)}</td>
                    <td class="text-right font-mono ${diff < 0 ? 'text-warning font-bold' : ''}">
                      ${diff === 0 ? '0' : diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td>
                      <span class="badge ${p.status === 'Selesai' ? 'badge-success' : 'badge-info'}">
                        ${escapeHtml(p.status)}
                      </span>
                    </td>
                    <td class="text-right">
                      <div style="display:inline-flex;gap:6px;">
                        <button type="button" class="btn btn-secondary btn-sm prod-detail-btn" data-id="${escapeHtml(p.id)}">
                          ${renderIcon('eye', { size: 14 })}
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm prod-edit-btn" data-id="${escapeHtml(p.id)}">
                          ${renderIcon('edit', { size: 14 })}
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  // Calendar switch
  containerEl.querySelectorAll('.prod-cal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedBatchId = btn.getAttribute('data-batch-id');
      renderProductionPage(containerEl);
    });
  });

  // Interactive timeline stage toggle
  containerEl.querySelectorAll('.prod-timeline-toggle').forEach((row) => {
    row.addEventListener('click', async () => {
      if (!activeBatch) return;
      const idx = Number(row.getAttribute('data-step-idx'));
      const updatedTimeline = activeBatch.timeline.map((s, i) => (i === idx ? { ...s, done: !s.done } : s));
      const allDone = updatedTimeline.every((s) => s.done);
      const resUpd = await callApi('production_update', {
        id: activeBatch.id,
        timeline: updatedTimeline,
        status: allDone ? 'Selesai' : 'Sedang Berjalan'
      });
      if (resUpd.success) {
        animateStatusTransition(row);
        showToast({
          title: 'Tahapan Produksi Diperbarui',
          message: `${updatedTimeline[idx].stage}: ${updatedTimeline[idx].done ? 'Selesai' : 'Sedang Berlangsung'}`,
          type: 'success',
          duration: 2200
        });
        renderProductionPage(containerEl);
      }
    });
  });

  // Mark batch complete button
  containerEl.querySelector('#prod-mark-complete-btn')?.addEventListener('click', async () => {
    if (!activeBatch) return;
    const completedTimeline = (activeBatch.timeline || []).map((s) => ({ ...s, done: true }));
    const resUpd = await callApi('production_update', {
      id: activeBatch.id,
      status: 'Selesai',
      actualPortions: activeBatch.plannedPortions,
      qcPassedPortions: activeBatch.plannedPortions,
      timeline: completedTimeline
    });
    if (resUpd.success) {
      showToast({
        title: `Batch ${activeBatch.batchCode} Selesai 100%`,
        message: 'Seluruh tahapan produksi dan pemorsian telah diverifikasi selesai.',
        type: 'success'
      });
      renderProductionPage(containerEl);
    }
  });

  // Add batch modal
  const addBtn = containerEl.querySelector('#prod-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openProductionModal(null, addBtn, () => renderProductionPage(containerEl));
    });
  }

  // Edit batch modal
  containerEl.querySelectorAll('.prod-edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = items.find((x) => x.id === btn.getAttribute('data-id'));
      if (p) openProductionModal(p, btn, () => renderProductionPage(containerEl));
    });
  });

  // Detail drawer
  containerEl.querySelectorAll('.prod-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = items.find((x) => x.id === btn.getAttribute('data-id'));
      if (!p) return;
      openModal({
        title: `Rincian Batch Produksi • ${p.batchCode}`,
        size: 'drawer',
        triggerEl: btn,
        bodyHtml: `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="padding:14px;border-radius:12px;background:var(--bg-surface-muted);">
              <span class="badge badge-info">${escapeHtml(p.dayLabel)}, ${escapeHtml(p.date)}</span>
              <h3 style="font-size:16.5px;font-weight:800;margin-top:8px;">${escapeHtml(p.menuName)}</h3>
              <p style="font-size:12.5px;color:var(--text-secondary);margin-top:4px;">Penanggung Jawab: ${escapeHtml(p.leadChef)}</p>
            </div>
            <div class="glass-panel" style="padding:14px;font-size:13px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Target Porsi:</span><strong>${formatNumber(p.plannedPortions)} porsi</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Realisasi Porsi:</span><strong>${formatNumber(p.actualPortions)} porsi</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Lolos QC:</span><strong>${formatNumber(p.qcPassedPortions)} porsi</strong></div>
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Belanja Bahan Pangan:</span><strong>${formatRupiah(p.foodCostTotal)}</strong></div>
              <div style="display:flex;justify-content:space-between;"><span>Biaya Operasional:</span><strong>${formatRupiah(p.operationalCostTotal)}</strong></div>
            </div>
          </div>
        `,
        footerHtml: `<button type="button" class="btn btn-primary btn-liquid" data-modal-close>Tutup</button>`
      });
    });
  });
}

function openProductionModal(editingProd, triggerEl, onSuccess) {
  const isEdit = Boolean(editingProd);
  const p = editingProd || {
    date: '2026-11-13',
    dayLabel: 'Jumat',
    batchCode: 'BATCH-MDN04-1113',
    menuName: 'Nasi Putih, Ikan Kembung Pesmol Kuning, Tempe Orek, Sayur Lodeh & Melon',
    plannedPortions: 2960,
    actualPortions: 2960,
    qcPassedPortions: 2960,
    foodCostTotal: 29100000,
    operationalCostTotal: 6150000,
    leadChef: 'Chef Surya Darma',
    status: 'Sedang Berjalan',
    isEffectiveServiceDay: true,
    notes: 'Persiapan produksi terverifikasi.'
  };

  openModal({
    title: isEdit ? `Ubah Batch Produksi • ${p.batchCode}` : 'Catat Batch Produksi Harian Baru',
    triggerEl,
    bodyHtml: `
      <form id="prod-crud-form" class="form-grid" novalidate>
        <div class="form-group">
          <label class="form-label">Tanggal Produksi *</label>
          <input type="date" name="date" class="form-input" value="${escapeHtml(p.date)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Hari Layanan *</label>
          <input type="text" name="dayLabel" class="form-input" value="${escapeHtml(p.dayLabel)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Kode Batch *</label>
          <input type="text" name="batchCode" class="form-input font-mono" value="${escapeHtml(p.batchCode)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Status Penyelesaian *</label>
          <select name="status" class="form-select">
            <option value="Terjadwal" ${p.status === 'Terjadwal' ? 'selected' : ''}>Terjadwal</option>
            <option value="Sedang Berjalan" ${p.status === 'Sedang Berjalan' ? 'selected' : ''}>Sedang Berjalan</option>
            <option value="Selesai" ${p.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
          </select>
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Menu yang Diproduksi *</label>
          <input type="text" name="menuName" class="form-input" value="${escapeHtml(p.menuName)}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Rencana Porsi *</label>
          <input type="number" name="plannedPortions" class="form-input" value="${p.plannedPortions}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Realisasi Porsi Aktual *</label>
          <input type="number" name="actualPortions" class="form-input" value="${p.actualPortions}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Total Belanja Bahan Pangan (Rp)</label>
          <input type="number" name="foodCostTotal" class="form-input" value="${p.foodCostTotal}" />
        </div>
        <div class="form-group">
          <label class="form-label">Total Biaya Operasional (Rp)</label>
          <input type="number" name="operationalCostTotal" class="form-input" value="${p.operationalCostTotal}" />
        </div>
        <div class="form-group form-group--full">
          <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
            <input type="checkbox" name="isEffectiveServiceDay" ${p.isEffectiveServiceDay ? 'checked' : ''} />
            <span>Tandai sebagai Hari Layanan Efektif SPPG (Dihitung untuk Insentif Layanan)</span>
          </label>
        </div>
        <div class="form-group form-group--full">
          <label class="form-label">Catatan Produksi / Penjelasan Selisih Kuantitas</label>
          <textarea name="notes" class="form-textarea">${escapeHtml(p.notes)}</textarea>
        </div>
      </form>
    `,
    footerHtml: `
      <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
      <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="prod-save-submit">
        ${renderIcon('check', { size: 16 })} Simpan Batch Produksi
      </button>
    `,
    onMount(dialog, close) {
      const formEl = dialog.querySelector('#prod-crud-form');
      const saveBtn = dialog.querySelector('#prod-save-submit');
      saveBtn.addEventListener('click', async () => {
        const raw = extractFormData(formEl);
        const payload = {
          ...raw,
          plannedPortions: Number(raw.plannedPortions) || 0,
          actualPortions: Number(raw.actualPortions) || 0,
          qcPassedPortions: Number(raw.actualPortions) || 0,
          foodCostTotal: Number(raw.foodCostTotal) || 0,
          operationalCostTotal: Number(raw.operationalCostTotal) || 0
        };
        if (isEdit) payload.id = editingProd.id;
        saveBtn.disabled = true;
        const res = await callApi(isEdit ? 'production_update' : 'production_create', payload);
        saveBtn.disabled = false;
        if (res.success) {
          selectedBatchId = res.data.id;
          showToast({
            title: isEdit ? 'Batch Produksi Diperbarui' : 'Batch Produksi Dicatat',
            message: `${payload.batchCode} (${formatNumber(payload.actualPortions)} porsi) berhasil disimpan.`,
            type: 'success'
          });
          close();
          if (typeof onSuccess === 'function') onSuccess();
        }
      });
    }
  });
}
