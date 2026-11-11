/**
 * DapurGizi — Module I: Reports & Export (js/pages/reports.js)
 * Implements:
 * - Report overview & 5 report categories (Production, Beneficiary, Financial, Distribution, Food Safety)
 * - Date range filters
 * - Live report preview table
 * - Export to CSV compatible with Microsoft Excel (UTF-8 BOM)
 * - Printable official report view with Save as PDF support (window.print + @media print)
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { showToast } from '../components/toast.js';
import { downloadCsvFile, escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons } from '../utils/motion.js';

const reportState = {
  reportType: 'production',
  startDate: '2026-11-01',
  endDate: '2026-11-30'
};

const REPORT_TYPES = [
  { id: 'production', label: 'Laporan Produksi Harian', icon: 'chef-hat' },
  { id: 'beneficiaries', label: 'Laporan Penerima Manfaat', icon: 'users' },
  { id: 'financial', label: 'Laporan Realisasi Keuangan', icon: 'wallet' },
  { id: 'distribution', label: 'Laporan Distribusi & Rute', icon: 'truck' },
  { id: 'food-safety', label: 'Laporan Keamanan Pangan & SLHS', icon: 'shield-check' }
];

export async function renderReportsPage(containerEl) {
  if (!containerEl) return;
  const res = await callApi('reports_generate', reportState);
  if (!res.success) return;

  const rep = res.data;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('file-bar-chart', { size: 14 })} PUSAT PELAPORAN & DOKUMEN EKSPOR</span>
        <h1 class="page-header__title">Laporan Operasional & Ekspor Data SPPG</h1>
        <p class="page-header__subtitle">
          Pratinjau laporan lintas modul dengan filter periode tanggal, unduh CSV kompatibel Microsoft Excel, atau cetak ke dokumen PDF.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-secondary btn-liquid" id="rep-print-pdf-btn">
          ${renderIcon('printer', { size: 16 })}
          <span>Cetak / Simpan sebagai PDF</span>
        </button>
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="rep-export-csv-btn">
          ${renderIcon('download', { size: 16 })}
          <span>Ekspor CSV (Kompatibel Excel)</span>
        </button>
      </div>
    </div>

    <!-- Report Type Selector & Date Filter Bar -->
    <div class="glass-panel anim-section mb-4 no-print">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${REPORT_TYPES.map(
            (rt) => `
            <button
              type="button"
              class="btn ${reportState.reportType === rt.id ? 'btn-primary' : 'btn-secondary'} btn-sm btn-liquid rep-type-btn"
              data-type="${rt.id}"
            >
              ${renderIcon(rt.icon, { size: 14 })}
              <span>${escapeHtml(rt.label)}</span>
            </button>
          `
          ).join('')}
        </div>

        <div style="display:flex;align-items:center;gap:8px;">
          <label style="font-size:12px;font-weight:600;color:var(--text-secondary);">Periode:</label>
          <input type="date" id="rep-start-date" class="form-input" style="width:142px;height:34px;" value="${escapeHtml(reportState.startDate)}" />
          <span>s/d</span>
          <input type="date" id="rep-end-date" class="form-input" style="width:142px;height:34px;" value="${escapeHtml(reportState.endDate)}" />
          <button type="button" class="btn btn-secondary btn-sm btn-liquid" id="rep-apply-filter-btn">
            ${renderIcon('filter', { size: 14 })} Terapkan
          </button>
        </div>
      </div>
    </div>

    <!-- Printable Report Preview Document -->
    <div class="glass-panel anim-section" id="printable-report-area">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--color-primary);padding-bottom:14px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="assets/images/logo-dapurgizi.svg" alt="DapurGizi" style="width:44px;height:44px;" />
          <div>
            <div style="font-size:11px;font-weight:800;color:var(--color-primary);letter-spacing:0.06em;">
              SATUAN PELAYANAN PEMENUHAN GIZI (SPPG) — KOTA MEDAN BARU UNIT 04
            </div>
            <h2 style="font-size:18px;font-weight:800;color:var(--text-primary);">${escapeHtml(rep.title)}</h2>
            <div style="font-size:12px;color:var(--text-secondary);">Periode Laporan: <strong>${escapeHtml(rep.period)}</strong></div>
          </div>
        </div>
        <div style="text-align:right;font-size:11.5px;color:var(--text-secondary);">
          <div>Kode Dokumen: <strong>DOC-SPPG-${reportState.reportType.toUpperCase()}-2026</strong></div>
          <div>Jumlah Baris Data: <strong>${rep.rows.length} Rekor</strong></div>
        </div>
      </div>

      <div class="dg-table-wrapper">
        <table class="dg-table">
          <thead>
            <tr>
              ${rep.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${
              rep.rows.length === 0
                ? `<tr><td colspan="${rep.headers.length}" class="text-center">Tidak ada data pada rentang tanggal ini.</td></tr>`
                : rep.rows
                    .map(
                      (row) => `
                  <tr>
                    ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}
                  </tr>
                `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>

      <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:flex-end;font-size:12px;color:var(--text-secondary);">
        <div>
          Dicetak melalui Sistem Desktop DapurGizi • Status Data: Simulasi Operasional SPPG
        </div>
        <div style="text-align:center;min-width:200px;">
          <div>Medan, 12 November 2026</div>
          <div style="margin-top:36px;font-weight:700;color:var(--text-primary);border-top:1px solid var(--border-strong);padding-top:4px;">
            Dr. Hendra Wijaya, M.Gz (Kepala SPPG)
          </div>
        </div>
      </div>
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  containerEl.querySelectorAll('.rep-type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      reportState.reportType = btn.getAttribute('data-type');
      renderReportsPage(containerEl);
    });
  });

  containerEl.querySelector('#rep-apply-filter-btn')?.addEventListener('click', () => {
    reportState.startDate = containerEl.querySelector('#rep-start-date').value || '2026-11-01';
    reportState.endDate = containerEl.querySelector('#rep-end-date').value || '2026-11-30';
    showToast({
      title: 'Filter Periode Diterapkan',
      message: `Menampilkan laporan periode ${reportState.startDate} s/d ${reportState.endDate}.`,
      type: 'info'
    });
    renderReportsPage(containerEl);
  });

  containerEl.querySelector('#rep-export-csv-btn')?.addEventListener('click', () => {
    downloadCsvFile(
      `DapurGizi_Laporan_${rep.reportType}_${reportState.startDate}_${reportState.endDate}.csv`,
      rep.headers,
      rep.rows
    );
    showToast({
      title: 'File CSV Berhasil Diunduh',
      message: `${rep.title} (${rep.rows.length} baris) telah diekspor dalam format UTF-8 CSV kompatibel Excel.`,
      type: 'success'
    });
  });

  containerEl.querySelector('#rep-print-pdf-btn')?.addEventListener('click', () => {
    showToast({
      title: 'Membuka Dialog Cetak / Simpan PDF',
      message: 'Pilih destinasi "Save as PDF" pada dialog cetak untuk menyimpan laporan resmi.',
      type: 'info'
    });
    setTimeout(() => {
      window.print();
    }, 250);
  });
}
