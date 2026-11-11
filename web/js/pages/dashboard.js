/**
 * DapurGizi — Module B: Dashboard Operasional (js/pages/dashboard.js)
 * Implements:
 * - Dynamic KPI generation from data layer (never hardcoded):
 *   1. Total portions today
 *   2. Active beneficiaries
 *   3. Today's incentive
 *   4. Operational cost per portion
 * - Production line chart (SVG with Anime.js v4 path drawing)
 * - Weekly distribution visualization
 * - Budget composition chart
 * - Operational progress timeline
 * - Recent activities
 * - Pending approvals (direct review navigation)
 * - Hygiene warnings & SLHS reminders
 * - Interactive State Switcher: Normal, Loading Skeleton, Empty, Warning, and Error states
 */

import { renderIcon } from '../components/icon.js';
import { store } from '../state.js';
import { callApi } from '../services/api.js';
import { formatRupiah, formatNumber, formatPercent, escapeHtml } from '../utils/format.js';
import {
  bindGlassCards,
  bindInteractiveButtons,
  animateCountUp,
  animateSvgDraw,
  animateProgressFill,
  animatePageEnter
} from '../utils/motion.js';
import { showToast } from '../components/toast.js';

function buildProductionLineChartSvg(trend = []) {
  if (!trend.length) return '';
  const width = 560;
  const height = 195;
  const padLeft = 44;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 32;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const vals = trend.flatMap((d) => [d.planned, d.actual]);
  const minVal = Math.max(0, Math.min(...vals) - 150);
  const maxVal = Math.max(...vals) + 100;
  const range = Math.max(1, maxVal - minVal);

  const getX = (i) => padLeft + (trend.length > 1 ? (i / (trend.length - 1)) * plotW : plotW / 2);
  const getY = (v) => padTop + plotH - ((v - minVal) / range) * plotH;

  const actualPoints = trend.map((d, i) => `${getX(i).toFixed(1)},${getY(d.actual).toFixed(1)}`);
  const plannedPoints = trend.map((d, i) => `${getX(i).toFixed(1)},${getY(d.planned).toFixed(1)}`);

  const actualPath = `M ${actualPoints.join(' L ')}`;
  const plannedPath = `M ${plannedPoints.join(' L ')}`;
  const areaPath = `${actualPath} L ${getX(trend.length - 1).toFixed(1)},${padTop + plotH} L ${padLeft},${padTop + plotH} Z`;

  const gridLines = [0, 0.5, 1].map((pct) => {
    const y = padTop + plotH * (1 - pct);
    const labelVal = Math.round(minVal + range * pct);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="var(--border-subtle)" stroke-dasharray="4 4" />
      <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10.5" font-weight="600">${formatNumber(labelVal)}</text>
    `;
  });

  const dotsAndLabels = trend.map((d, i) => {
    const cx = getX(i);
    const cy = getY(d.actual);
    return `
      <circle cx="${cx}" cy="${cy}" r="4.5" fill="var(--color-primary)" stroke="#FFFFFF" stroke-width="2" />
      <text x="${cx}" y="${cy - 10}" text-anchor="middle" fill="var(--text-primary)" font-size="10.5" font-weight="700">${formatNumber(d.actual)}</text>
      <text x="${cx}" y="${height - 8}" text-anchor="middle" fill="var(--text-secondary)" font-size="11" font-weight="600">${escapeHtml(d.dayLabel)}</text>
    `;
  });

  return `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik Tren Produksi Porsi Harian">
      <defs>
        <linearGradient id="prod-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#12805C" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#12805C" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      ${gridLines.join('')}
      <path d="${areaPath}" fill="url(#prod-area-grad)" />
      <path d="${plannedPath}" fill="none" stroke="#FF8A3D" stroke-width="2" stroke-dasharray="5 4" />
      <path class="anim-draw-path" d="${actualPath}" fill="none" stroke="#12805C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      ${dotsAndLabels.join('')}
    </svg>
  `;
}

export async function renderDashboardPage(containerEl, onNavigate) {
  if (!containerEl) return;
  const simState = store.state.dashboardSimState || 'normal';

  const stateSwitcherHtml = `
    <div class="dg-tabs" role="tablist" aria-label="Simulasi Status Tampilan Beranda">
      ${[
        { id: 'normal', label: 'Normal' },
        { id: 'warning', label: 'Peringatan' },
        { id: 'loading', label: 'Memuat (Skeleton)' },
        { id: 'empty', label: 'Kosong' },
        { id: 'error', label: 'Galat' }
      ]
        .map(
          (st) => `
        <button type="button" class="dg-tab-btn ${simState === st.id ? 'is-active' : ''}" data-dash-state="${st.id}">
          ${st.label}
        </button>
      `
        )
        .join('')}
    </div>
  `;

  // 1. Loading Skeleton State
  if (simState === 'loading') {
    containerEl.innerHTML = `
      <div class="page-header">
        <div class="page-header__title-group">
          <span class="page-header__eyebrow">${renderIcon('sparkles', { size: 14 })} RINGKASAN EKSEKUTIF SPPG</span>
          <h1 class="page-header__title">Memuat Data Operasional...</h1>
        </div>
        <div class="page-header__actions">${stateSwitcherHtml}</div>
      </div>
      <div class="grid-12">
        ${[1, 2, 3, 4]
          .map(
            () => `
          <div class="col-3 kpi-glass-card">
            <div class="dg-skeleton" style="height:16px;width:55%;margin-bottom:16px;"></div>
            <div class="dg-skeleton" style="height:32px;width:75%;margin-bottom:12px;"></div>
            <div class="dg-skeleton" style="height:14px;width:90%;"></div>
          </div>
        `
          )
          .join('')}
        <div class="col-8 glass-panel"><div class="dg-skeleton" style="height:240px;width:100%;"></div></div>
        <div class="col-4 glass-panel"><div class="dg-skeleton" style="height:240px;width:100%;"></div></div>
      </div>
    `;
    bindDashStateButtons(containerEl, onNavigate);
    return;
  }

  // Fetch dynamic summary from API layer
  const res = await callApi('dashboard_get_summary', { date: store.state.selectedOperationDate });

  // 2. Error State (either real API error or simulated error)
  if (!res.success || simState === 'error') {
    const errMsg = !res.success
      ? res.error
      : 'Simulasi kegagalan koneksi layanan data SPPG (`dashboard_get_summary`).';
    containerEl.innerHTML = `
      <div class="page-header">
        <div class="page-header__title-group">
          <span class="page-header__eyebrow">BERANDA OPERASIONAL</span>
          <h1 class="page-header__title">Gangguan Sinkronisasi Data</h1>
        </div>
        <div class="page-header__actions">${stateSwitcherHtml}</div>
      </div>
      <div class="dg-state-box" style="border-color:rgba(239,68,68,0.45);background:rgba(239,68,68,0.06);">
        <div style="color:var(--color-danger);">${renderIcon('alert-circle', { size: 36 })}</div>
        <h3 style="font-size:16px;font-weight:800;">Gagal Memuat Ringkasan Operasional</h3>
        <p style="max-width:540px;color:var(--text-secondary);">${escapeHtml(errMsg)}</p>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button type="button" class="btn btn-primary btn-liquid" id="dash-retry-btn">
            ${renderIcon('refresh-cw', { size: 16 })} Coba Muat Ulang
          </button>
          <button type="button" class="btn btn-secondary btn-liquid" id="dash-switch-demo-btn">
            Gunakan Mode Demo
          </button>
        </div>
      </div>
    `;
    bindDashStateButtons(containerEl, onNavigate);
    const retryBtn = containerEl.querySelector('#dash-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        store.state.dashboardSimState = 'normal';
        renderDashboardPage(containerEl, onNavigate);
      });
    }
    const demoBtn = containerEl.querySelector('#dash-switch-demo-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        store.setBackendMode('DEMO');
        store.state.dashboardSimState = 'normal';
        renderDashboardPage(containerEl, onNavigate);
      });
    }
    return;
  }

  // 3. Empty State
  if (simState === 'empty') {
    containerEl.innerHTML = `
      <div class="page-header">
        <div class="page-header__title-group">
          <span class="page-header__eyebrow">BERANDA OPERASIONAL</span>
          <h1 class="page-header__title">Belum Ada Aktivitas Produksi Hari Ini</h1>
        </div>
        <div class="page-header__actions">${stateSwitcherHtml}</div>
      </div>
      <div class="dg-state-box">
        <div style="color:var(--color-primary);">${renderIcon('chef-hat', { size: 38 })}</div>
        <h3 style="font-size:16px;font-weight:800;">Jadwal Produksi Hari Ini Kosong</h3>
        <p style="max-width:500px;color:var(--text-secondary);">
          Belum ada batch produksi atau jadwal pengiriman yang tercatat untuk tanggal operasional ini. Mulai dengan membuat batch produksi harian atau merencanakan siklus menu.
        </p>
        <div style="display:flex;gap:10px;margin-top:8px;">
          <button type="button" class="btn btn-primary btn-liquid" id="empty-go-prod">
            ${renderIcon('plus', { size: 16 })} Buat Batch Produksi
          </button>
          <button type="button" class="btn btn-secondary btn-liquid" id="empty-restore-normal">
            Tampilkan Data Operasional Aktif
          </button>
        </div>
      </div>
    `;
    bindDashStateButtons(containerEl, onNavigate);
    containerEl.querySelector('#empty-go-prod')?.addEventListener('click', () => onNavigate('production'));
    containerEl.querySelector('#empty-restore-normal')?.addEventListener('click', () => {
      store.state.dashboardSimState = 'normal';
      renderDashboardPage(containerEl, onNavigate);
    });
    return;
  }

  // 4. Normal & Warning States (Dynamic Data from API)
  const d = res.data;
  const kpis = d.kpis;
  const budget = d.budgetComposition;
  const distSummary = d.distributionSummary;
  const hygiene = d.hygieneStatus;

  const foodPct = budget.totalSpent > 0 ? (budget.foodSpent / budget.totalSpent) * 100 : 72;
  const opPct = budget.totalSpent > 0 ? (budget.operationalSpent / budget.totalSpent) * 100 : 16;
  const incPct = budget.totalSpent > 0 ? (budget.incentiveAccrued / budget.totalSpent) * 100 : 12;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">
          ${renderIcon('sparkles', { size: 14 })}
          <span>${escapeHtml(d.unitMeta.sppgUnitName)} • ${escapeHtml(d.unitMeta.sppgCode)}</span>
        </span>
        <h1 class="page-header__title">Ringkasan Operasional Harian SPPG</h1>
        <p class="page-header__subtitle">
          Pemantauan real-time porsi Makan Bergizi Gratis, distribusi sekolah/posyandu, kepatuhan SLHS, dan serapan anggaran.
        </p>
      </div>
      <div class="page-header__actions">
        ${stateSwitcherHtml}
        <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="dash-quick-prod-btn">
          ${renderIcon('chef-hat', { size: 16 })}
          <span>Kelola Batch Hari Ini</span>
        </button>
      </div>
    </div>

    ${
      simState === 'warning' || hygiene.warnings.length > 0
        ? `
      <div class="glass-panel anim-section mb-4" style="border-left:4px solid var(--color-warning);background:rgba(245,158,11,0.09);padding:14px 18px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="color:var(--color-warning);">${renderIcon('alert-triangle', { size: 22 })}</span>
            <div>
              <div style="font-weight:800;font-size:13.5px;color:var(--text-primary);">
                Perhatian Operasional & Kepatuhan Sanitasi (${hygiene.warnings.length} Item Menunggu Verifikasi)
              </div>
              <div style="font-size:12.5px;color:var(--text-secondary);">
                ${escapeHtml(
                  hygiene.warnings[0]
                    ? `${hygiene.warnings[0].area}: ${hygiene.warnings[0].parameter}`
                    : 'Sertifikat Uji Air Bersih akan berakhir dalam 16 hari (28 Nov 2026).'
                )}
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm btn-liquid" id="dash-go-hygiene">
              Buka Checklist Sanitasi
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-liquid" id="dash-go-menus">
              ${d.pendingApprovals.length} Menu Menunggu Review
            </button>
          </div>
        </div>
      </div>
    `
        : ''
    }

    <!-- 4 Dynamic KPI Glass Cards -->
    <div class="grid-12 mb-4">
      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Total Porsi Hari Ini</span>
          <span class="kpi-glass-card__icon">${renderIcon('utensils', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value" id="kpi-portions-val">${formatNumber(kpis.totalPortionsToday)}</div>
        <div class="kpi-glass-card__meta">
          <span class="badge badge-success">${formatPercent(kpis.portionFulfillmentPct, 1)} dari Target</span>
          <span>Rencana: ${formatNumber(kpis.plannedPortionsToday)}</span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Penerima Manfaat Aktif</span>
          <span class="kpi-glass-card__icon">${renderIcon('users', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value" id="kpi-beneficiaries-val">${formatNumber(kpis.activeBeneficiaries)}</div>
        <div class="kpi-glass-card__meta">
          <span class="badge badge-info">6 Kategori MBG</span>
          <span>Total Terdaftar: ${formatNumber(kpis.totalRegisteredBeneficiaries)}</span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Insentif Layanan Hari Ini</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--gold">${renderIcon('award', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value" id="kpi-incentive-val">${formatRupiah(kpis.todayIncentive)}</div>
        <div class="kpi-glass-card__meta">
          <span class="badge ${kpis.isEffectiveServiceDay ? 'badge-success' : 'badge-neutral'}">
            ${kpis.isEffectiveServiceDay ? 'Hari Layanan Efektif' : 'Non-Efektif'}
          </span>
          <span>Simulasi DEMO</span>
        </div>
      </div>

      <div class="col-3 kpi-glass-card">
        <div class="kpi-glass-card__top">
          <span class="kpi-glass-card__label">Biaya Aktual / Porsi</span>
          <span class="kpi-glass-card__icon kpi-glass-card__icon--warm">${renderIcon('wallet', { size: 20 })}</span>
        </div>
        <div class="kpi-glass-card__value" id="kpi-cost-val">${formatRupiah(kpis.operationalCostPerPortion)}</div>
        <div class="kpi-glass-card__meta">
          <span class="badge ${
            kpis.operationalCostPerPortion <= kpis.costCeilingPerPortion ? 'badge-success' : 'badge-warning'
          }">
            Pagu: ${formatRupiah(kpis.costCeilingPerPortion)}
          </span>
          <span>Pangan + Ops</span>
        </div>
      </div>
    </div>

    <!-- Row 2: Production Line Chart (Col-8) & Budget Composition (Col-4) -->
    <div class="grid-12 mb-4">
      <div class="col-8 glass-panel anim-section">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">
              ${renderIcon('trending-up', { size: 18 })}
              <span>Tren Realisasi vs Rencana Produksi Porsi</span>
            </h2>
            <p class="glass-panel__subtitle">Perbandingan porsi rencana (garis putus oranye) dan realisasi aktual (garis hijau)</p>
          </div>
          <div style="display:flex;align-items:center;gap:14px;font-size:12px;">
            <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#12805C;"></span> Realisasi Porsi</span>
            <span style="display:inline-flex;align-items:center;gap:6px;"><span style="width:10px;height:3px;background:#FF8A3D;"></span> Target Rencana</span>
          </div>
        </div>
        <div class="chart-container">
          ${buildProductionLineChartSvg(d.productionTrend)}
        </div>
      </div>

      <div class="col-4 glass-panel anim-section">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">
              ${renderIcon('wallet', { size: 18 })}
              <span>Komposisi Anggaran Berjalan</span>
            </h2>
            <p class="glass-panel__subtitle">Total Realisasi: <strong>${formatRupiah(budget.totalSpent)}</strong></p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-nav="budget">Detail</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;margin-top:8px;">
          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span class="font-semibold">Belanja Bahan Pangan (${formatPercent(foodPct, 1)})</span>
              <strong>${formatRupiah(budget.foodSpent)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill" data-target-width="${foodPct.toFixed(1)}"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span class="font-semibold">Biaya Operasional Dapur (${formatPercent(opPct, 1)})</span>
              <strong>${formatRupiah(budget.operationalSpent)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill progress-bar-fill--warm" data-target-width="${opPct.toFixed(1)}"></div>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span class="font-semibold">Akumulasi Insentif Layanan (${formatPercent(incPct, 1)})</span>
              <strong>${formatRupiah(budget.incentiveAccrued)}</strong>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill" data-target-width="${incPct.toFixed(1)}" style="background:#3B82F6;"></div>
            </div>
          </div>

          <div style="padding:10px 12px;border-radius:10px;background:var(--bg-surface-muted);font-size:12px;display:flex;justify-content:space-between;">
            <span>Pagu Simulasi Bulanan:</span>
            <strong>${formatRupiah(budget.monthlyCeiling)}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- Row 3: Weekly Distribution Status (Col-7) & Operational Progress + Hygiene/Approvals (Col-5) -->
    <div class="grid-12 mb-4">
      <div class="col-7 glass-panel anim-section">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">
              ${renderIcon('truck', { size: 18 })}
              <span>Status Distribusi & Serah Terima Hari Ini (${distSummary.completedRoutes}/${distSummary.totalRoutes} Rute Selesai)</span>
            </h2>
            <p class="glass-panel__subtitle">
              Terkirim: <strong>${formatNumber(distSummary.totalDispatched)} porsi</strong> • Diterima: <strong>${formatNumber(distSummary.totalReceived)} porsi</strong>
            </p>
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-liquid" data-nav="distribution">
            Kelola Distribusi
          </button>
        </div>

        <div class="dg-table-wrapper">
          <table class="dg-table">
            <thead>
              <tr>
                <th>Rute</th>
                <th>Tujuan Sekolah / Posyandu</th>
                <th class="text-right">Dikirim</th>
                <th class="text-right">Diterima</th>
                <th>ETA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${d.weeklyDistribution
                .map((row) => {
                  const badgeClass =
                    row.status === 'Diterima'
                      ? 'badge-success'
                      : row.status === 'Dalam Perjalanan'
                      ? 'badge-info'
                      : 'badge-warning';
                  return `
                    <tr>
                      <td class="font-mono font-bold">${escapeHtml(row.routeCode)}</td>
                      <td class="font-semibold">${escapeHtml(row.destinationName)}</td>
                      <td class="text-right font-semibold">${formatNumber(row.dispatchedPortions)}</td>
                      <td class="text-right">${row.receivedPortions > 0 ? formatNumber(row.receivedPortions) : '-'}</td>
                      <td>${escapeHtml(row.etaTime)}</td>
                      <td><span class="badge ${badgeClass}">${escapeHtml(row.status)}</span></td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-5 glass-panel anim-section">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">
              ${renderIcon('clock', { size: 18 })}
              <span>Progres Tahapan Operasional Dapur</span>
            </h2>
            <p class="glass-panel__subtitle">Status tahapan BATCH-MDN04-1112 & Persetujuan</p>
          </div>
          <span class="badge badge-success">Skor Higienitas: ${hygiene.scorePct}%</span>
        </div>

        <div class="timeline-steps">
          ${d.operationalProgress
            .map(
              (st) => `
            <div class="timeline-step ${st.done ? 'timeline-step--done' : 'timeline-step--active'}">
              <div style="color:${st.done ? 'var(--color-success)' : 'var(--color-orange)'};margin-top:2px;">
                ${renderIcon(st.done ? 'check-circle' : 'clock', { size: 17 })}
              </div>
              <div style="flex:1;">
                <div style="font-size:12.5px;font-weight:700;color:var(--text-primary);">${escapeHtml(st.stage)}</div>
                <div style="font-size:11.5px;color:var(--text-secondary);">Jadwal: ${escapeHtml(st.time)} • ${
                  st.done ? 'Selesai Diverifikasi' : 'Sedang Berlangsung'
                }</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>

    <!-- Row 4: Pending Approvals & Hygiene Warnings (Col-6) + Recent Operational Activities (Col-6) -->
    <div class="grid-12">
      <div class="col-6 glass-panel anim-section">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">
            ${renderIcon('clipboard-check', { size: 18 })}
            <span>Persetujuan Tertunda & Peringatan Keamanan Pangan</span>
          </h2>
        </div>
        <div class="activity-list">
          ${d.pendingApprovals
            .map(
              (m) => `
            <div class="activity-item">
              <span class="activity-item__dot" style="background:var(--color-orange);"></span>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:13px;">Persetujuan Menu ${escapeHtml(m.dayName)} (${escapeHtml(m.date)})</div>
                <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(m.name)}</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm btn-liquid" data-nav="menus">Tinjau Menu</button>
            </div>
          `
            )
            .join('')}

          ${hygiene.warnings
            .map(
              (w) => `
            <div class="activity-item">
              <span class="activity-item__dot" style="background:var(--color-warning);"></span>
              <div style="flex:1;">
                <div style="font-weight:700;font-size:13px;">Checklist Sanitasi Belum Lengkap: ${escapeHtml(w.area)}</div>
                <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(w.parameter)}</div>
              </div>
              <button type="button" class="btn btn-secondary btn-sm btn-liquid" data-nav="food-safety">Verifikasi</button>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <div class="col-6 glass-panel anim-section">
        <div class="glass-panel__header">
          <h2 class="glass-panel__title">
            ${renderIcon('bell', { size: 18 })}
            <span>Log Aktivitas Operasional Terbaru</span>
          </h2>
        </div>
        <div class="activity-list">
          ${d.recentActivities
            .map(
              (act) => `
            <div class="activity-item">
              <span class="activity-item__dot"></span>
              <div style="flex:1;">
                <div style="display:flex;justify-content:space-between;font-size:12.5px;">
                  <strong>${escapeHtml(act.actor)}</strong>
                  <span class="text-muted">${escapeHtml(act.time)}</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(act.action)}</div>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    </div>
  `;

  // Trigger Anime.js v4 animations
  animatePageEnter(containerEl);
  bindGlassCards(containerEl);
  bindInteractiveButtons(containerEl);
  animateSvgDraw(containerEl, '.anim-draw-path', 540);
  animateProgressFill(containerEl);

  animateCountUp(containerEl.querySelector('#kpi-portions-val'), kpis.totalPortionsToday, (v) => formatNumber(Math.round(v)));
  animateCountUp(containerEl.querySelector('#kpi-beneficiaries-val'), kpis.activeBeneficiaries, (v) => formatNumber(Math.round(v)));
  animateCountUp(containerEl.querySelector('#kpi-incentive-val'), kpis.todayIncentive, (v) => formatRupiah(v));
  animateCountUp(containerEl.querySelector('#kpi-cost-val'), kpis.operationalCostPerPortion, (v) => formatRupiah(v));

  bindDashStateButtons(containerEl, onNavigate);

  containerEl.querySelector('#dash-quick-prod-btn')?.addEventListener('click', () => onNavigate('production'));
  containerEl.querySelector('#dash-go-hygiene')?.addEventListener('click', () => onNavigate('food-safety'));
  containerEl.querySelector('#dash-go-menus')?.addEventListener('click', () => onNavigate('menus'));
  containerEl.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => onNavigate(btn.getAttribute('data-nav')));
  });
}

function bindDashStateButtons(containerEl, onNavigate) {
  containerEl.querySelectorAll('[data-dash-state]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nextState = btn.getAttribute('data-dash-state');
      store.state.dashboardSimState = nextState;
      renderDashboardPage(containerEl, onNavigate);
      showToast({
        title: `Status Tampilan: ${nextState.toUpperCase()}`,
        message: 'Menguji responsivitas komponen terhadap perubahan state data.',
        type: 'info',
        duration: 2000
      });
    });
  });
}
