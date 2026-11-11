/**
 * DapurGizi — Module H: Food Safety, SLHS & Food Waste (js/pages/food-safety.js)
 * Implements:
 * - Food safety dashboard & Daily hygiene checklist (interactive toggle & completion)
 * - Inspection history
 * - SLHS Certificate management & expiration reminders
 * - Incident reports & Incident detail modal
 * - Food waste records & creation modal
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { escapeHtml, formatDateID } from '../utils/format.js';
import {
  animatePageEnter,
  bindGlassCards,
  bindInteractiveButtons,
  animateProgressFill,
  animateStatusTransition
} from '../utils/motion.js';

export async function renderFoodSafetyPage(containerEl) {
  if (!containerEl) return;
  const res = await callApi('hygiene_get_checklist');
  if (!res.success) return;

  const { checklist, slhsCertificates, incidents, foodWaste } = res.data;
  const items = checklist.items || [];
  const checkedCount = items.filter((i) => i.checked).length;
  const completionPct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 100;
  const totalWasteKg = (foodWaste || []).reduce((s, w) => s + Number(w.weightKg || 0), 0).toFixed(1);

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('shield-check', { size: 14 })} HIGIENITAS DAPUR, SLHS & KEAMANAN PANGAN</span>
        <h1 class="page-header__title">Pengawasan Sanitasi, SLHS & Food Waste</h1>
        <p class="page-header__subtitle">
          Verifikasi checklist higienitas harian penjamah makanan, masa berlaku Sertifikat Laik Higiene Sanitasi (SLHS), pelaporan insiden, dan pencatatan sisa pangan.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-secondary btn-liquid" id="fs-add-waste-btn">
          ${renderIcon('scale', { size: 16 })}
          <span>Catat Food Waste</span>
        </button>
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="fs-add-incident-btn">
          ${renderIcon('alert-triangle', { size: 16 })}
          <span>Lapor Insiden Keamanan Pangan</span>
        </button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-4 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Kepatuhan Checklist Harian</span>
          <span class="kpi-glass-card__icon">${renderIcon('clipboard-check', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${completionPct}% (${checkedCount}/${items.length})</div>
        <div class="progress-track mt-2">
          <div class="progress-bar-fill" data-target-width="${completionPct}"></div>
        </div>
      </div>

      <div class="col-4 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Status Sertifikat SLHS & Lab</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--gold">${renderIcon('award', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${slhsCertificates.length} Dokumen</div>
        <div class="kpi-glass-card__meta">
          <span class="badge badge-warning">1 Pengingat Perpanjangan (16 Hari)</span>
        </div>
      </div>

      <div class="col-4 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Total Food Waste Tercatat</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--warm">${renderIcon('scale', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${totalWasteKg} kg</div>
        <div class="kpi-glass-card__meta">
          <span class="badge badge-info">Diolah Kompos Mitra Bank Sampah</span>
        </div>
      </div>
    </div>

    <!-- Daily Hygiene Checklist (Col-7) & SLHS Certificates + History (Col-5) -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-7 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('check-square', { size: 18 })} Daftar Periksa Higienitas Harian (${escapeHtml(checklist.date)})</h2>
            <p class="glass-panel__subtitle">Inspektur: <strong>${escapeHtml(checklist.inspectorName)}</strong> • Klik baris untuk mengubah status verifikasi</p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;">
          ${items
            .map(
              (item) => `
            <div class="checklist-item ${item.checked ? 'is-checked' : ''}" data-check-id="${escapeHtml(item.id)}">
              <div style="display:flex;align-items:flex-start;gap:12px;">
                <input
                  type="checkbox"
                  ${item.checked ? 'checked' : ''}
                  aria-label="${escapeHtml(item.area)}"
                  style="width:18px;height:18px;margin-top:2px;accent-color:var(--color-primary);cursor:pointer;"
                />
                <div>
                  <div style="font-weight:700;font-size:13px;color:var(--text-primary);">
                    [${escapeHtml(item.id)}] ${escapeHtml(item.area)}
                  </div>
                  <div style="font-size:12.5px;color:var(--text-secondary);">${escapeHtml(item.parameter)}</div>
                  <div style="font-size:11.5px;color:var(--color-primary);margin-top:3px;">Catatan: ${escapeHtml(item.notes)}</div>
                </div>
              </div>
              <span class="badge ${item.checked ? 'badge-success' : 'badge-warning'}">
                ${item.checked ? 'Memenuhi' : 'Belum'}
              </span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="col-5 glass-panel">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">${renderIcon('award', { size: 18 })} Dokumen SLHS & Pengingat Masa Berlaku</h2>
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
          ${slhsCertificates
            .map(
              (cert) => `
            <div style="padding:12px 14px;border-radius:10px;background:var(--bg-surface-muted);border:1px solid var(--border-subtle);">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="font-mono font-bold" style="font-size:11.5px;">${escapeHtml(cert.certificateNumber)}</span>
                <span class="badge ${cert.status === 'Aktif' ? 'badge-success' : 'badge-warning'}">${escapeHtml(cert.status)}</span>
              </div>
              <div style="font-weight:700;font-size:13.5px;margin-top:6px;">${escapeHtml(cert.documentName)}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;">
                Penerbit: ${escapeHtml(cert.issuedBy)}<br/>
                Masa Berlaku: <strong>${formatDateID(cert.issueDate)} s/d ${formatDateID(cert.expiryDate)}</strong>
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="glass-panel__header" style="margin-bottom:10px;">
          <h3 class="glass-panel__title" style="font-size:14px;">Riwayat Inspeksi Sanitasi Sebelumnya</h3>
        </div>
        <div class="dg-table-wrapper">
          <table class="dg-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Inspektur</th>
                <th class="text-right">Skor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${(checklist.history || [])
                .map(
                  (h) => `
                <tr>
                  <td>${escapeHtml(h.date)}</td>
                  <td>${escapeHtml(h.inspector)}</td>
                  <td class="text-right font-bold">${h.scorePercent}%</td>
                  <td><span class="badge badge-success">${escapeHtml(h.status)}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Incidents & Food Waste Tables -->
    <div class="grid-12 anim-section">
      <div class="col-6 glass-panel">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">${renderIcon('alert-triangle', { size: 18 })} Catatan Insiden & Tindak Lanjut</h2>
        </div>
        <div class="dg-table-wrapper">
          <table class="dg-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Insiden & Lokasi</th>
                <th>Tingkat</th>
                <th>Status</th>
                <th class="text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              ${incidents
                .map(
                  (inc) => `
                <tr>
                  <td>${escapeHtml(inc.date)}</td>
                  <td>
                    <div class="font-bold">${escapeHtml(inc.title)}</div>
                    <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(inc.location)}</div>
                  </td>
                  <td><span class="badge badge-warning">${escapeHtml(inc.severity)}</span></td>
                  <td><span class="badge ${inc.status === 'Terselesaikan' ? 'badge-success' : 'badge-info'}">${escapeHtml(inc.status)}</span></td>
                  <td class="text-right">
                    <button type="button" class="btn btn-secondary btn-sm inc-detail-btn" data-id="${escapeHtml(inc.id)}">
                      ${renderIcon('eye', { size: 14 })}
                    </button>
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-6 glass-panel">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">${renderIcon('scale', { size: 18 })} Pencatatan Food Waste & Pengolahan</h2>
        </div>
        <div class="dg-table-wrapper">
          <table class="dg-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori Sisa Pangan</th>
                <th class="text-right">Berat (kg)</th>
                <th>Metode Penanganan</th>
              </tr>
            </thead>
            <tbody>
              ${foodWaste
                .map(
                  (w) => `
                <tr>
                  <td>${escapeHtml(w.date)}</td>
                  <td>
                    <div class="font-semibold">${escapeHtml(w.category)}</div>
                    <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(w.notes)}</div>
                  </td>
                  <td class="text-right font-mono font-bold">${w.weightKg} kg (${w.percentageOfBatch}%)</td>
                  <td style="font-size:12px;">${escapeHtml(w.handlingMethod)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindGlassCards(containerEl);
  bindInteractiveButtons(containerEl);
  animateProgressFill(containerEl);

  // Interactive checklist toggle
  containerEl.querySelectorAll('.checklist-item').forEach((row) => {
    row.addEventListener('click', async () => {
      const id = row.getAttribute('data-check-id');
      const current = items.find((i) => i.id === id);
      if (!current) return;
      const upd = await callApi('hygiene_save_checklist', {
        itemId: id,
        checked: !current.checked
      });
      if (upd.success) {
        animateStatusTransition(row);
        showToast({
          title: `Checklist ${id} Diperbarui`,
          message: `Status verifikasi "${current.area}" disimpan.`,
          type: 'success',
          duration: 2000
        });
        renderFoodSafetyPage(containerEl);
      }
    });
  });

  // Incident detail modal
  containerEl.querySelectorAll('.inc-detail-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inc = incidents.find((x) => x.id === btn.getAttribute('data-id'));
      if (!inc) return;
      openModal({
        title: `Rincian Laporan Insiden • ${inc.id}`,
        triggerEl: btn,
        bodyHtml: `
          <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
            <div><strong>Judul Insiden:</strong> ${escapeHtml(inc.title)}</div>
            <div><strong>Tanggal & Lokasi:</strong> ${escapeHtml(inc.date)} • ${escapeHtml(inc.location)}</div>
            <div><strong>Dilaporkan Oleh:</strong> ${escapeHtml(inc.reportedBy)}</div>
            <div><strong>Status Penanganan:</strong> <span class="badge badge-success">${escapeHtml(inc.status)}</span></div>
            <div style="padding:12px;border-radius:10px;background:var(--bg-surface-muted);">
              <strong>Tindakan Korektif yang Dilakukan:</strong>
              <p style="margin-top:4px;color:var(--text-secondary);">${escapeHtml(inc.actionTaken)}</p>
            </div>
          </div>
        `,
        footerHtml: `<button type="button" class="btn btn-primary btn-liquid" data-modal-close>Tutup</button>`
      });
    });
  });

  // Create Incident Modal
  const addIncBtn = containerEl.querySelector('#fs-add-incident-btn');
  if (addIncBtn) {
    addIncBtn.addEventListener('click', () => {
      openModal({
        title: 'Lapor Insiden Keamanan Pangan / Mutu',
        triggerEl: addIncBtn,
        bodyHtml: `
          <form id="inc-form" class="form-grid">
            <div class="form-group form-group--full">
              <label class="form-label">Judul Temuan / Insiden *</label>
              <input type="text" name="title" class="form-input" placeholder="Contoh: Suhu Chiller B-01 Naik ke 6.5°C" required />
            </div>
            <div class="form-group">
              <label class="form-label">Lokasi Kejadian *</label>
              <input type="text" name="location" class="form-input" value="Ruang Penyimpanan Dingin SPPG" required />
            </div>
            <div class="form-group">
              <label class="form-label">Tingkat Keparahan</label>
              <select name="severity" class="form-select">
                <option value="Rendah">Rendah</option>
                <option value="Sedang" selected>Sedang</option>
                <option value="Tinggi">Tinggi</option>
              </select>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Tindakan Korektif Langsung *</label>
              <textarea name="actionTaken" class="form-textarea" required>Bahan pangan dipindahkan ke Chiller B-02 (suhu 2.8°C) dan teknisi pendingin dijadwalkan memeriksa thermostat.</textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="save-inc-btn">Simpan Laporan</button>
        `,
        onMount(dialog, close) {
          const saveBtn = dialog.querySelector('#save-inc-btn');
          const formEl = dialog.querySelector('#inc-form');
          saveBtn.addEventListener('click', async () => {
            const data = extractFormData(formEl);
            if (!data.title) return;
            const r = await callApi('incidents_create', data);
            if (r.success) {
              showToast({ title: 'Insiden Tercatat', message: data.title, type: 'warning' });
              close();
              renderFoodSafetyPage(containerEl);
            }
          });
        }
      });
    });
  }

  // Create Food Waste Modal
  const addWasteBtn = containerEl.querySelector('#fs-add-waste-btn');
  if (addWasteBtn) {
    addWasteBtn.addEventListener('click', () => {
      openModal({
        title: 'Catat Rekapitulasi Sisa Pangan (Food Waste)',
        triggerEl: addWasteBtn,
        bodyHtml: `
          <form id="waste-form" class="form-grid">
            <div class="form-group">
              <label class="form-label">Tanggal Pencatatan *</label>
              <input type="date" name="date" class="form-input" value="2026-11-12" required />
            </div>
            <div class="form-group">
              <label class="form-label">Berat Sisa Pangan (kg) *</label>
              <input type="number" step="0.1" name="weightKg" class="form-input" value="12.5" required />
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Kategori Sisa Pangan</label>
              <select name="category" class="form-select">
                <option value="Sisa Konsumsi Sekolah (Plate Waste)">Sisa Konsumsi Sekolah (Plate Waste)</option>
                <option value="Trimming Persiapan Sayur/Buah">Trimming Persiapan Sayur/Buah</option>
                <option value="Porsi Cadangan Tidak Terdistribusi">Porsi Cadangan Tidak Terdistribusi</option>
              </select>
            </div>
            <div class="form-group form-group--full">
              <label class="form-label">Catatan Komposisi Sisa</label>
              <textarea name="notes" class="form-textarea">Kulit semangka dan sedikit sisa sayur dari ompreng kembali.</textarea>
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="save-waste-btn">Simpan Catatan</button>
        `,
        onMount(dialog, close) {
          const saveBtn = dialog.querySelector('#save-waste-btn');
          const formEl = dialog.querySelector('#waste-form');
          saveBtn.addEventListener('click', async () => {
            const data = extractFormData(formEl);
            const r = await callApi('food_waste_create', data);
            if (r.success) {
              showToast({ title: 'Food Waste Dicatat', message: `${data.weightKg} kg sisa pangan berhasil disimpan.`, type: 'success' });
              close();
              renderFoodSafetyPage(containerEl);
            }
          });
        }
      });
    });
  }
}
