/**
 * DapurGizi — Module F: Budget & Incentives (js/pages/budget.js)
 * Implements:
 * - Financial overview (Allocation, Food expenditure, Operational expenditure, Incentive calculations)
 * - Interactive Per-Portion & Multi-Day Calculator
 * - Actual served portions & Effective service day tracking
 * - Cost composition & Financial history table
 * - Configurable financial parameters (clearly labeled DEMO with source & effective date; never hardcoded as permanent law)
 */

import { renderIcon } from '../components/icon.js';
import { callApi } from '../services/api.js';
import { store } from '../state.js';
import { canPerformAction } from '../utils/permissions.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { formatRupiah, formatNumber, formatPercent, escapeHtml } from '../utils/format.js';
import {
  animatePageEnter,
  bindGlassCards,
  bindInteractiveButtons,
  animateProgressFill
} from '../utils/motion.js';

export async function renderBudgetPage(containerEl) {
  if (!containerEl) return;
  const userRole = store.state.session?.user?.role || 'Kepala SPPG';
  const canConfig = canPerformAction(userRole, 'canConfigureBudget', store.state.roleMatrix);

  const res = await callApi('budget_get_summary');
  if (!res.success) {
    containerEl.innerHTML = `<div class="dg-state-box"><p class="text-danger">${escapeHtml(res.error)}</p></div>`;
    return;
  }

  const { parameters, summary, history } = res.data;
  const ceilingUnit =
    Number(parameters.standardFoodCostCeilingPerPortion) +
    Number(parameters.standardOperationalCostCeilingPerPortion);
  const isOverUnitCeiling = summary.avgTotalUnitCost > ceilingUnit;

  const foodSharePct = summary.totalExpenditure > 0 ? (summary.foodExpenditure / summary.totalExpenditure) * 100 : 0;
  const opSharePct =
    summary.totalExpenditure > 0 ? (summary.operationalExpenditure / summary.totalExpenditure) * 100 : 0;
  const incSharePct = summary.totalExpenditure > 0 ? (summary.totalIncentive / summary.totalExpenditure) * 100 : 0;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('wallet', { size: 14 })} ANGGARAN, BIAYA PORSI & INSENTIF FASILITAS</span>
        <h1 class="page-header__title">Manajemen Anggaran & Kalkulator Biaya SPPG</h1>
        <p class="page-header__subtitle">
          Pantau realisasi belanja bahan pangan, biaya operasional dapur, insentif hari layanan efektif, serta konfigurasi parameter keuangan.
        </p>
      </div>
      <div class="page-header__actions">
        <span class="dg-mode-pill dg-mode-pill--demo">
          ${renderIcon('info', { size: 14 })}
          <span>${escapeHtml(parameters.configLabel)}</span>
        </span>
        ${
          canConfig
            ? `
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="budget-config-btn">
            ${renderIcon('settings', { size: 16 })}
            <span>Konfigurasi Parameter Anggaran</span>
          </button>
        `
            : ''
        }
      </div>
    </div>

    <!-- Regulatory / Parameter Transparency Notice -->
    <div class="glass-panel anim-section mb-4" style="padding:14px 18px;border-left:4px solid var(--color-primary);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
        <div style="font-size:12.5px;">
          <strong>Status Konfigurasi Parameter Keuangan:</strong>
          <span class="badge badge-warning" style="margin-left:6px;">${escapeHtml(parameters.configLabel)}</span>
          <div style="color:var(--text-secondary);margin-top:4px;">
            Sumber Referensi: <em>${escapeHtml(parameters.referenceSource)}</em> • Berlaku Efektif: <strong>${escapeHtml(
              parameters.effectiveDate
            )}</strong> • Seluruh nilai dapat dikonfigurasi tanpa mengubah kode sumber.
          </div>
        </div>
        <div style="font-size:12px;text-align:right;">
          <div>Pagu Bahan Pangan: <strong>${formatRupiah(parameters.standardFoodCostCeilingPerPortion)}/porsi</strong></div>
          <div>Pagu Operasional: <strong>${formatRupiah(parameters.standardOperationalCostCeilingPerPortion)}/porsi</strong></div>
        </div>
      </div>
    </div>

    ${
      isOverUnitCeiling
        ? `
      <div class="glass-panel anim-section mb-4" style="border-left:4px solid var(--color-danger);background:rgba(239,68,68,0.08);padding:14px 18px;">
        <strong style="color:var(--color-danger);">Peringatan Ambang Biaya per Porsi:</strong>
        Rata-rata biaya aktual (${formatRupiah(summary.avgTotalUnitCost)}/porsi) melampaui pagu parameter (${formatRupiah(ceilingUnit)}/porsi).
      </div>
    `
        : ''
    }

    <!-- 4 Financial KPI Cards -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Total Belanja Bahan Pangan</span>
          <span class="kpi-glass-card__icon">${renderIcon('utensils', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatRupiah(summary.foodExpenditure)}</div>
        <div class="kpi-glass-card__meta">
          <span>Rata-rata: <strong>${formatRupiah(summary.avgFoodCostPerPortion)}/porsi</strong></span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Total Biaya Operasional</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--warm">${renderIcon('flame', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatRupiah(summary.operationalExpenditure)}</div>
        <div class="kpi-glass-card__meta">
          <span>Rata-rata: <strong>${formatRupiah(summary.avgOpCostPerPortion)}/porsi</strong></span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Akumulasi Insentif Layanan</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--gold">${renderIcon('award', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatRupiah(summary.totalIncentive)}</div>
        <div class="kpi-glass-card__meta">
          <span class="badge badge-success">${summary.effectiveServiceDays} Hari Layanan Efektif</span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Porsi Aktual Terlayani</span>
          <span class="kpi-glass-card__icon">${renderIcon('check-circle', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value">${formatNumber(summary.totalActualPortions)}</div>
        <div class="kpi-glass-card__meta">
          <span>Biaya Unit Gabungan: <strong>${formatRupiah(summary.avgTotalUnitCost)}</strong></span>
        </div>
      </div>
    </div>

    <!-- Interactive Per-Portion Calculator (Col-7) & Cost Composition (Col-5) -->
    <div class="grid-12 mb-4 anim-section">
      <div class="col-7 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('calculator', { size: 18 })} Kalkulator Simulasi Biaya per Porsi & Insentif</h2>
            <p class="glass-panel__subtitle">Simulasikan porsi aktual yang dilayani, biaya bahan, biaya operasional, dan status hari layanan efektif</p>
          </div>
        </div>

        <form id="budget-calc-form" class="form-grid">
          <div class="form-group">
            <label class="form-label" for="calc-portions">Jumlah Porsi Terlayani Aktual / Hari</label>
            <input type="number" id="calc-portions" name="servedPortions" class="form-input" value="2960" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label" for="calc-days">Jumlah Hari Layanan Simulasi</label>
            <input type="number" id="calc-days" name="daysCount" class="form-input" value="1" min="1" max="31" />
          </div>
          <div class="form-group">
            <label class="form-label" for="calc-food">Biaya Bahan Pangan / Porsi (Rp)</label>
            <input type="number" id="calc-food" name="foodCostPerPortion" class="form-input" value="${parameters.standardFoodCostCeilingPerPortion}" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="calc-op">Biaya Operasional / Porsi (Rp)</label>
            <input type="number" id="calc-op" name="opCostPerPortion" class="form-input" value="${parameters.standardOperationalCostCeilingPerPortion}" min="0" />
          </div>
          <div class="form-group form-group--full">
            <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
              <input type="checkbox" id="calc-effective" name="isEffectiveServiceDay" checked />
              <span>Termasuk Hari Layanan Efektif (+${formatRupiah(parameters.dailyFacilityIncentiveRate)} / hari)</span>
            </label>
          </div>
        </form>

        <div id="budget-calc-output" style="margin-top:16px;padding:16px;border-radius:12px;background:var(--bg-surface-muted);border:1px solid var(--border-subtle);"></div>
      </div>

      <div class="col-5 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('scale', { size: 18 })} Komposisi Serapan Anggaran</h2>
            <p class="glass-panel__subtitle">Total Realisasi: <strong>${formatRupiah(summary.totalExpenditure)}</strong></p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span>1. Belanja Bahan Pangan (${formatPercent(foodSharePct, 1)})</span>
              <strong>${formatRupiah(summary.foodExpenditure)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill" data-target-width="${foodSharePct.toFixed(1)}"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span>2. Biaya Operasional Dapur (${formatPercent(opSharePct, 1)})</span>
              <strong>${formatRupiah(summary.operationalExpenditure)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill progress-bar-fill--warm" data-target-width="${opSharePct.toFixed(1)}"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span>3. Insentif Fasilitas SPPG (${formatPercent(incSharePct, 1)})</span>
              <strong>${formatRupiah(summary.totalIncentive)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill" data-target-width="${incSharePct.toFixed(1)}" style="background:#3B82F6;"></div>
            </div>
          </div>

          <div style="margin-top:8px;padding:12px;border-radius:10px;background:var(--bg-surface-solid);border:1px solid var(--border-subtle);font-size:12.5px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>Pagu Anggaran Bulanan (DEMO):</span>
              <strong>${formatRupiah(parameters.monthlyAllocationCeiling)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;color:var(--color-primary);">
              <span>Sisa Pagu Tersedia:</span>
              <strong>${formatRupiah(summary.remainingMonthlyBudget)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Financial History Table -->
    <div class="glass-panel anim-section">
      <div class="glass-panel__header">
        <h2 class="glass-panel__title">${renderIcon('file-bar-chart', { size: 18 })} Riwayat Keuangan Harian per Batch Produksi</h2>
      </div>
      <div class="dg-table-wrapper">
        <table class="dg-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Kode Batch</th>
              <th class="text-right">Porsi Terlayani</th>
              <th class="text-right">Belanja Bahan</th>
              <th class="text-right">Biaya Operasional</th>
              <th class="text-right">Biaya / Porsi</th>
              <th class="text-right">Insentif Harian</th>
              <th class="text-right">Total Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            ${history
              .map(
                (h) => `
              <tr>
                <td><strong>${escapeHtml(h.dayLabel)}</strong>, ${escapeHtml(h.date)}</td>
                <td class="font-mono font-bold">${escapeHtml(h.batchCode)}</td>
                <td class="text-right font-mono">${formatNumber(h.actualPortions)}</td>
                <td class="text-right font-mono">${formatRupiah(h.foodCostTotal)}</td>
                <td class="text-right font-mono">${formatRupiah(h.operationalCostTotal)}</td>
                <td class="text-right font-mono font-semibold">${formatRupiah(h.perPortion)}</td>
                <td class="text-right font-mono">${formatRupiah(h.incentive)}</td>
                <td class="text-right font-mono font-bold text-primary-green">${formatRupiah(h.totalDay)}</td>
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
  bindGlassCards(containerEl);
  bindInteractiveButtons(containerEl);
  animateProgressFill(containerEl);

  // Run live per-portion calculator
  const calcForm = containerEl.querySelector('#budget-calc-form');
  const calcOutput = containerEl.querySelector('#budget-calc-output');

  const updateCalculator = async () => {
    if (!calcForm || !calcOutput) return;
    const data = extractFormData(calcForm);
    const calcRes = await callApi('budget_calculate', data);
    if (!calcRes.success) return;
    const c = calcRes.data;
    calcOutput.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:12.5px;">
        <div>
          <span class="text-muted">Biaya Unit / Porsi:</span><br/>
          <strong style="font-size:15px;color:${c.overCeilingWarning ? 'var(--color-danger)' : 'var(--color-primary)'};">
            ${formatRupiah(c.combinedUnitCost)}
          </strong>
        </div>
        <div>
          <span class="text-muted">Total Bahan Pangan:</span><br/>
          <strong>${formatRupiah(c.foodTotal)}</strong>
        </div>
        <div>
          <span class="text-muted">Total Operasional:</span><br/>
          <strong>${formatRupiah(c.opTotal)}</strong>
        </div>
        <div>
          <span class="text-muted">Insentif (${c.effectiveDaysCount} hr):</span><br/>
          <strong>${formatRupiah(c.incentiveTotal)}</strong>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border-subtle);display:flex;justify-content:space-between;align-items:center;">
        <span>Total Estimasi Kebutuhan Anggaran:</span>
        <strong style="font-size:18px;color:var(--text-primary);">${formatRupiah(c.grandTotal)}</strong>
      </div>
      ${
        c.overCeilingWarning
          ? `<div style="margin-top:8px;color:var(--color-danger);font-size:12px;font-weight:700;">⚠ Peringatan: Biaya unit (${formatRupiah(
              c.combinedUnitCost
            )}) melebihi pagu parameter saat ini (${formatRupiah(c.ceilingUnitCost)}).</div>`
          : ''
      }
    `;
  };

  if (calcForm) {
    calcForm.addEventListener('input', updateCalculator);
    calcForm.addEventListener('change', updateCalculator);
    updateCalculator();
  }

  // Configure parameters modal
  const cfgBtn = containerEl.querySelector('#budget-config-btn');
  if (cfgBtn) {
    cfgBtn.addEventListener('click', () => {
      openModal({
        title: 'Konfigurasi Parameter Keuangan SPPG',
        triggerEl: cfgBtn,
        bodyHtml: `
          <form id="budget-param-form" class="form-grid">
            <div class="form-group form-group--full">
              <label class="form-label">Label Status Konfigurasi</label>
              <input type="text" name="configLabel" class="form-input" value="${escapeHtml(parameters.configLabel)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Sumber Referensi / Dasar Juknis</label>
              <input type="text" name="referenceSource" class="form-input" value="${escapeHtml(parameters.referenceSource)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal Berlaku Efektif</label>
              <input type="date" name="effectiveDate" class="form-input" value="${escapeHtml(parameters.effectiveDate)}" />
            </div>
            <div class="form-group">
              <label class="form-label">Pagu Bahan Pangan / Porsi (Rp)</label>
              <input type="number" name="standardFoodCostCeilingPerPortion" class="form-input" value="${parameters.standardFoodCostCeilingPerPortion}" />
            </div>
            <div class="form-group">
              <label class="form-label">Pagu Biaya Operasional / Porsi (Rp)</label>
              <input type="number" name="standardOperationalCostCeilingPerPortion" class="form-input" value="${parameters.standardOperationalCostCeilingPerPortion}" />
            </div>
            <div class="form-group">
              <label class="form-label">Tarif Insentif Fasilitas / Hari Layanan Efektif (Rp)</label>
              <input type="number" name="dailyFacilityIncentiveRate" class="form-input" value="${parameters.dailyFacilityIncentiveRate}" />
            </div>
            <div class="form-group">
              <label class="form-label">Pagu Alokasi Bulanan SPPG (Rp)</label>
              <input type="number" name="monthlyAllocationCeiling" class="form-input" value="${parameters.monthlyAllocationCeiling}" />
            </div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Batal</button>
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="save-budget-param-btn">
            ${renderIcon('check', { size: 16 })} Terapkan Parameter
          </button>
        `,
        onMount(dialog, close) {
          const saveBtn = dialog.querySelector('#save-budget-param-btn');
          const formEl = dialog.querySelector('#budget-param-form');
          saveBtn.addEventListener('click', async () => {
            const raw = extractFormData(formEl);
            const payload = {
              configLabel: raw.configLabel,
              referenceSource: raw.referenceSource,
              effectiveDate: raw.effectiveDate,
              standardFoodCostCeilingPerPortion: Number(raw.standardFoodCostCeilingPerPortion) || 10000,
              standardOperationalCostCeilingPerPortion: Number(raw.standardOperationalCostCeilingPerPortion) || 2100,
              dailyFacilityIncentiveRate: Number(raw.dailyFacilityIncentiveRate) || 6000000,
              monthlyAllocationCeiling: Number(raw.monthlyAllocationCeiling) || 1150000000
            };
            const upd = await callApi('budget_update_parameters', payload);
            if (upd.success) {
              showToast({
                title: 'Parameter Anggaran Diperbarui',
                message: 'Perhitungan biaya porsi dan insentif telah disesuaikan.',
                type: 'success'
              });
              close();
              renderBudgetPage(containerEl);
            }
          });
        }
      });
    });
  }
}
