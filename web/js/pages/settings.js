/**
 * DapurGizi — Module L: System Settings & Eel Integration Control (js/pages/settings.js)
 * Implements:
 * - Light mode & Dark mode with localStorage persistence
 * - Explicit Backend Mode Switch (DEMO MODE vs PYTHON EEL PRODUCTION MODE) + Eel Bridge Diagnostic
 * - General SPPG unit preferences & Notification settings
 * - Operational & Budget parameter settings
 * - Reset Demo Data utility
 */

import { renderIcon } from '../components/icon.js';
import { callApi, isEelAvailable } from '../services/api.js';
import { resetDemoDatabase } from '../services/mock-api.js';
import { store } from '../state.js';
import { showToast } from '../components/toast.js';
import { extractFormData } from '../components/form.js';
import { escapeHtml } from '../utils/format.js';
import { animatePageEnter, bindInteractiveButtons } from '../utils/motion.js';

export async function renderSettingsPage(containerEl) {
  if (!containerEl) return;
  const eelDetected = isEelAvailable();
  store.setEelConnected(eelDetected);

  const res = await callApi('settings_get');
  const settingsData = res.success
    ? res.data.settings
    : {
        unitName: 'SPPG Kota Medan Baru — Unit 04',
        unitCode: 'SPPG-SUMUT-MDN-004',
        headName: 'Dr. Hendra Wijaya, M.Gz',
        city: 'Kota Medan, Sumatera Utara',
        enableSoundAlerts: true,
        enableDesktopToast: true,
        defaultShiftStart: '03:00 WIB'
      };
  const budgetParams = res.success
    ? res.data.budgetParameters
    : {
        configLabel: 'DEMO — Parameter Simulasi Internal SPPG',
        standardFoodCostCeilingPerPortion: 10000,
        standardOperationalCostCeilingPerPortion: 2100,
        dailyFacilityIncentiveRate: 6000000
      };

  const { theme, backendMode } = store.state;

  containerEl.innerHTML = `
    <div class="page-header">
      <div class="page-header__title-group">
        <span class="page-header__eyebrow">${renderIcon('settings', { size: 14 })} KONFIGURASI SISTEM & JEMBATAN PYTHON EEL</span>
        <h1 class="page-header__title">Pengaturan Aplikasi, Tema & Integrasi Backend</h1>
        <p class="page-header__subtitle">
          Atur tema antarmuka (Terang/Gelap), koneksi jembatan Python Eel 0.18.2, parameter operasional unit SPPG, serta nilai anggaran.
        </p>
      </div>
      <div class="page-header__actions">
        <button type="button" class="btn btn-secondary btn-liquid" id="set-reset-demo-btn">
          ${renderIcon('refresh-cw', { size: 16 })}
          <span>Reset Data Simulasi Demo</span>
        </button>
      </div>
    </div>

    <div class="grid-12 mb-4 anim-section">
      <!-- Theme & Appearance Card -->
      <div class="col-6 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('sun', { size: 18 })} Tema Visual (Fresh Nusantara Glass)</h2>
            <p class="glass-panel__subtitle">Preferensi disimpan otomatis pada penyimpanan lokal perangkat</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <button
            type="button"
            class="glass-panel theme-choice-btn"
            data-theme-val="light"
            style="cursor:pointer;text-align:left;border-color:${theme === 'light' ? 'var(--color-primary)' : 'var(--border-subtle)'};"
          >
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <strong>Mode Terang (Light)</strong>
              ${renderIcon('sun', { size: 18 })}
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
              Latar #F5FBF8 bersih dengan aksen Hijau Nusantara #12805C.
            </p>
          </button>

          <button
            type="button"
            class="glass-panel theme-choice-btn"
            data-theme-val="dark"
            style="cursor:pointer;text-align:left;border-color:${theme === 'dark' ? 'var(--color-primary)' : 'var(--border-subtle)'};"
          >
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <strong>Mode Gelap (Dark)</strong>
              ${renderIcon('moon', { size: 18 })}
            </div>
            <p style="font-size:12px;color:var(--text-secondary);margin-top:6px;">
              Latar #0A1F1A nyaman untuk pemantauan dapur shift dini hari (03:00 WIB).
            </p>
          </button>
        </div>
      </div>

      <!-- Python Eel 0.18.2 Integration Switch -->
      <div class="col-6 glass-panel">
        <div class="glass-panel__header">
          <div>
            <h2 class="glass-panel__title">${renderIcon('plug', { size: 18 })} Arsitektur Jembatan Python Eel 0.18.2</h2>
            <p class="glass-panel__subtitle">Frontend → Eel (<code>await eel.fn(payload)()</code>) → Python → Supabase</p>
          </div>
          <span class="badge ${eelDetected ? 'badge-success' : 'badge-warning'}">
            ${eelDetected ? 'Jembatan Eel Aktif' : 'Standalone / Eel Belum Berjalan'}
          </span>
        </div>

        <div style="display:flex;gap:10px;margin-bottom:12px;">
          <button
            type="button"
            class="btn ${backendMode === 'DEMO' ? 'btn-primary' : 'btn-secondary'} btn-liquid"
            id="mode-switch-demo"
            style="flex:1;"
          >
            ${renderIcon('database', { size: 16 })} Mode Demo (Mock API)
          </button>
          <button
            type="button"
            class="btn ${backendMode === 'PRODUCTION' ? 'btn-primary' : 'btn-secondary'} btn-liquid"
            id="mode-switch-prod"
            style="flex:1;"
          >
            ${renderIcon('plug', { size: 16 })} Mode Produksi (Python Eel)
          </button>
        </div>

        <p style="font-size:12px;color:var(--text-secondary);">
          <strong>Keamanan Ketat:</strong> Kunci rahasia Supabase (Service Role Key, DB Password, JWT Secret) tidak pernah disimpan di JavaScript frontend. Dalam Mode Produksi, kesalahan backend ditampilkan apa adanya tanpa pernah dipalsukan menjadi respons demo.
        </p>
      </div>
    </div>

    <!-- Operational & Financial Configuration Form -->
    <div class="glass-panel anim-section">
      <div class="glass-panel__header">
        <h2 class="glass-panel__title">${renderIcon('building', { size: 18 })} Konfigurasi Identitas Unit SPPG & Parameter Anggaran</h2>
      </div>

      <form id="settings-master-form" class="form-grid">
        <div class="form-group">
          <label class="form-label">Nama Unit Operasional SPPG</label>
          <input type="text" name="unitName" class="form-input" value="${escapeHtml(settingsData.unitName)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Kode Registrasi Unit SPPG</label>
          <input type="text" name="unitCode" class="form-input font-mono" value="${escapeHtml(settingsData.unitCode)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Nama Kepala SPPG Penanggung Jawab</label>
          <input type="text" name="headName" class="form-input" value="${escapeHtml(settingsData.headName)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Jam Mulai Shift Masak Dini Hari</label>
          <input type="text" name="defaultShiftStart" class="form-input" value="${escapeHtml(settingsData.defaultShiftStart)}" />
        </div>
        <div class="form-group">
          <label class="form-label">Pagu Bahan Pangan / Porsi (Rp) [DEMO]</label>
          <input type="number" name="standardFoodCostCeilingPerPortion" class="form-input" value="${budgetParams.standardFoodCostCeilingPerPortion}" />
        </div>
        <div class="form-group">
          <label class="form-label">Pagu Biaya Operasional / Porsi (Rp) [DEMO]</label>
          <input type="number" name="standardOperationalCostCeilingPerPortion" class="form-input" value="${budgetParams.standardOperationalCostCeilingPerPortion}" />
        </div>
        <div class="form-group form-group--full">
          <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-weight:600;">
            <input type="checkbox" name="enableDesktopToast" ${settingsData.enableDesktopToast ? 'checked' : ''} />
            <span>Aktifkan Notifikasi Pop-up (Toast) Real-Time untuk Peringatan Sanitasi & Distribusi</span>
          </label>
        </div>
        <div class="form-group form-group--full" style="display:flex;justify-content:flex-end;">
          <button type="submit" class="btn btn-primary btn-liquid btn-magnetic">
            ${renderIcon('check', { size: 16 })} Simpan Seluruh Pengaturan
          </button>
        </div>
      </form>
    </div>
  `;

  animatePageEnter(containerEl);
  bindInteractiveButtons(containerEl);

  containerEl.querySelectorAll('.theme-choice-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-theme-val');
      store.setTheme(val);
      renderSettingsPage(containerEl);
    });
  });

  containerEl.querySelector('#mode-switch-demo')?.addEventListener('click', () => {
    store.setBackendMode('DEMO');
    showToast({
      title: 'Mode Demo Aktif',
      message: 'Aplikasi menggunakan simulasi data lokal (mock-api.js).',
      type: 'info'
    });
    renderSettingsPage(containerEl);
  });

  containerEl.querySelector('#mode-switch-prod')?.addEventListener('click', () => {
    store.setBackendMode('PRODUCTION');
    showToast({
      title: 'Mode Produksi Python Eel Aktif',
      message: eelDetected
        ? 'Terhubung ke jembatan Python Eel.'
        : 'Peringatan: Jembatan Python Eel tidak terdeteksi. Panggilan API akan menampilkan status error backend.',
      type: eelDetected ? 'success' : 'warning'
    });
    renderSettingsPage(containerEl);
  });

  containerEl.querySelector('#set-reset-demo-btn')?.addEventListener('click', () => {
    resetDemoDatabase();
    showToast({
      title: 'Data Simulasi Demo Direset',
      message: 'Seluruh data contoh SPPG telah dikembalikan ke kondisi awal.',
      type: 'success'
    });
    renderSettingsPage(containerEl);
  });

  const formEl = containerEl.querySelector('#settings-master-form');
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const raw = extractFormData(formEl);
      const upd = await callApi('settings_update', {
        settings: {
          unitName: raw.unitName,
          unitCode: raw.unitCode,
          headName: raw.headName,
          defaultShiftStart: raw.defaultShiftStart,
          enableDesktopToast: Boolean(raw.enableDesktopToast)
        },
        budgetParameters: {
          standardFoodCostCeilingPerPortion: Number(raw.standardFoodCostCeilingPerPortion) || 10000,
          standardOperationalCostCeilingPerPortion: Number(raw.standardOperationalCostCeilingPerPortion) || 2100
        }
      });
      if (upd.success) {
        showToast({
          title: 'Pengaturan Disimpan',
          message: 'Konfigurasi unit SPPG dan parameter anggaran berhasil diperbarui.',
          type: 'success'
        });
      }
    });
  }
}
