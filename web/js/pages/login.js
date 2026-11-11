/**
 * DapurGizi — Module A: Authentication (js/pages/login.js)
 * Implements:
 * 1. Animated Splash screen (Anime.js v4 timeline)
 * 2. Login screen with Fresh Nusantara Glass showcase
 * 3. Email and password fields
 * 4. Password visibility toggle
 * 5. Remember me checkbox
 * 6. Forgot password modal workflow
 * 7. Loading state
 * 8. Invalid credential state
 * 9. Login success with checkmark draw animation
 * 10. Logout & 11. Session expired state banner
 */

import { renderIcon } from '../components/icon.js';
import { store } from '../state.js';
import { callApi } from '../services/api.js';
import { openModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import {
  animate,
  createTimeline,
  bindInteractiveButtons,
  animateSvgDraw
} from '../utils/motion.js';
import { escapeHtml } from '../utils/format.js';

export function renderLoginPage(containerEl, onLoginSuccess) {
  if (!containerEl) return;
  const isDemo = store.state.backendMode === 'DEMO';
  const sessionExpired = store.state.sessionExpiredAlert;
  const showSplash = !store.state.splashShown;

  containerEl.innerHTML = `
    ${
      showSplash
        ? `
      <div class="splash-overlay" id="dg-splash-overlay" aria-label="Memuat Aplikasi DapurGizi">
        <img src="assets/images/logo-dapurgizi.svg" alt="Logo DapurGizi" class="splash-overlay__logo" id="splash-logo" />
        <div class="splash-overlay__title" id="splash-title">DAPURGIZI</div>
        <div class="splash-overlay__subtitle" id="splash-sub">
          Sistem Manajemen Operasional SPPG — Makan Bergizi Gratis
        </div>
        <div class="splash-overlay__loader">
          <div class="splash-overlay__loader-bar" id="splash-bar"></div>
        </div>
      </div>
    `
        : ''
    }

    <div class="auth-screen">
      <div class="auth-card" id="auth-main-card">
        <!-- Left Brand & Operational Showcase -->
        <div class="auth-card__Showcase">
          <div>
            <div style="display:inline-flex;align-items:center;gap:10px;padding:6px 14px;border-radius:999px;background:rgba(255,255,255,0.14);font-size:12px;font-weight:700;">
              <img src="assets/images/logo-dapurgizi.svg" alt="" style="width:22px;height:22px;" />
              <span>SPPG Desktop Suite v1.0 • Fresh Nusantara</span>
            </div>
            <h1 style="font-size:28px;font-weight:800;line-height:1.2;margin-top:20px;letter-spacing:-0.02em;">
              Kendali Operasional Dapur SPPG Secara Terpadu & Akurat.
            </h1>
            <p style="font-size:13.5px;color:#DDF5EA;margin-top:12px;line-height:1.6;">
              Dirancang khusus untuk pengelolaan harian Satuan Pelayanan Pemenuhan Gizi: perencanaan gizi siklus mingguan, produksi batch ompreng, pengawasan SLHS, distribusi sekolah/posyandu, hingga akuntabilitas anggaran.
            </p>
          </div>

          <div style="margin:20px 0;">
            <img src="assets/images/splash-illustration.svg" alt="Ilustrasi DapurGizi" style="width:100%;max-height:175px;object-fit:contain;border-radius:16px;" />
          </div>

          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;font-size:11.5px;">
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.1);">
              <div style="font-weight:800;font-size:14px;color:#FFC83D;">6 Kategori</div>
              <div style="color:#DDF5EA;">Siswa SD–SMA, Bumil, Busui & Balita</div>
            </div>
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.1);">
              <div style="font-weight:800;font-size:14px;color:#6EE7B7;">QC & SLHS</div>
              <div style="color:#DDF5EA;">Pemantauan Higienitas & Suhu Inti</div>
            </div>
            <div style="padding:10px;border-radius:10px;background:rgba(255,255,255,0.1);">
              <div style="font-weight:800;font-size:14px;color:#FFFFFF;">Python Eel</div>
              <div style="color:#DDF5EA;">Arsitektur Aman Tanpa Ekspos Kunci</div>
            </div>
          </div>
        </div>

        <!-- Right Authentication Form Pane -->
        <div class="auth-card__form-pane">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <span class="dg-mode-pill ${isDemo ? 'dg-mode-pill--demo' : 'dg-mode-pill--eel'}" id="login-mode-toggle" title="Klik untuk mengalihkan Mode Demo / Mode Produksi Eel">
              ${renderIcon(isDemo ? 'database' : 'plug', { size: 14 })}
              <span>${isDemo ? 'DEMO AUTHENTICATION MODE' : 'PYTHON EEL AUTH MODE'}</span>
            </span>
            <button type="button" class="btn btn-ghost btn-sm" id="login-expired-sim-btn" title="Uji Tampilan Sesi Berakhir">
              Simulasi Sesi Habis
            </button>
          </div>

          ${
            sessionExpired
              ? `
            <div style="padding:12px 14px;border-radius:10px;background:rgba(245,158,11,0.16);border:1px solid rgba(245,158,11,0.4);color:var(--text-primary);font-size:12.5px;margin-bottom:14px;display:flex;align-items:center;gap:10px;" role="alert">
              <span style="color:var(--color-warning);">${renderIcon('clock', { size: 18 })}</span>
              <div>
                <strong>Sesi Operasional Telah Berakhir</strong><br/>
                Silakan masuk kembali untuk melanjutkan aktivitas administrasi SPPG.
              </div>
            </div>
          `
              : ''
          }

          <h2 style="font-size:22px;font-weight:800;color:var(--text-primary);">Masuk ke Panel Operasional</h2>
          <p style="font-size:13px;color:var(--text-secondary);margin-top:4px;margin-bottom:18px;">
            ${
              isDemo
                ? 'Mode Demo aktif: autentikasi disimulasikan secara lokal (bukan koneksi langsung ke Supabase).'
                : 'Mode Produksi aktif: autentikasi diteruskan melalui Python Eel (`auth_login`) ke Supabase.'
            }
          </p>

          <div id="login-alert-box" style="display:none;margin-bottom:14px;"></div>

          <form id="dg-login-form" novalidate style="display:flex;flex-direction:column;gap:14px;">
            <div class="form-group">
              <label class="form-label" for="login-email">Alamat Email Pegawai SPPG</label>
              <div style="position:relative;">
                <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);">
                  ${renderIcon('mail', { size: 16 })}
                </span>
                <input
                  type="email"
                  id="login-email"
                  name="email"
                  class="form-input"
                  style="padding-left:36px;"
                  placeholder="kepala@dapurgizi.id"
                  value="kepala@dapurgizi.id"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-group">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <label class="form-label" for="login-password">Kata Sandi</label>
                <button type="button" class="btn btn-ghost btn-sm" id="forgot-password-btn" style="height:24px;padding:0 6px;font-size:12px;color:var(--color-primary);">
                  Lupa Kata Sandi?
                </button>
              </div>
              <div style="position:relative;">
                <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);">
                  ${renderIcon('lock', { size: 16 })}
                </span>
                <input
                  type="password"
                  id="login-password"
                  name="password"
                  class="form-input"
                  style="padding-left:36px;padding-right:40px;"
                  placeholder="Masukkan kata sandi"
                  value="demo123"
                  required
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  id="toggle-password-vis"
                  class="btn btn-ghost btn-sm"
                  style="position:absolute;right:4px;top:50%;transform:translateY(-50%);height:30px;width:32px;padding:0;"
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                >
                  ${renderIcon('eye', { size: 16 })}
                </button>
              </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;">
              <label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;color:var(--text-secondary);">
                <input type="checkbox" id="login-remember" name="remember" checked />
                <span>Ingat perangkat operasional ini selama 8 jam</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-liquid btn-magnetic" id="login-submit-btn" style="width:100%;margin-top:4px;">
              ${renderIcon('shield-check', { size: 18 })}
              <span>Masuk ke Sistem DapurGizi</span>
            </button>
          </form>

          ${
            isDemo
              ? `
            <div class="auth-demo-accounts">
              <div style="font-size:11.5px;font-weight:700;color:var(--text-secondary);display:flex;align-items:center;justify-content:space-between;">
                <span>AKUN SIMULASI DEMO (Sandi: <code>demo123</code>)</span>
                <button type="button" class="btn btn-ghost btn-sm" id="test-invalid-cred-btn" style="height:22px;padding:0 6px;font-size:11px;color:var(--color-danger);">
                  Uji Sandi Salah
                </button>
              </div>
              <div class="auth-demo-accounts__grid">
                <button type="button" class="btn btn-secondary btn-sm demo-acc-btn" data-email="kepala@dapurgizi.id">
                  Kepala SPPG
                </button>
                <button type="button" class="btn btn-secondary btn-sm demo-acc-btn" data-email="gizi@dapurgizi.id">
                  Pengawas Gizi
                </button>
                <button type="button" class="btn btn-secondary btn-sm demo-acc-btn" data-email="keuangan@dapurgizi.id">
                  Pengawas Keuangan
                </button>
                <button type="button" class="btn btn-secondary btn-sm demo-acc-btn" data-email="sanitasi@dapurgizi.id">
                  Pengawas Sanitasi
                </button>
              </div>
            </div>
          `
              : ''
          }
        </div>
      </div>
    </div>
  `;

  // 1. Run Splash Screen Animation once per startup
  const splashEl = containerEl.querySelector('#dg-splash-overlay');
  if (splashEl) {
    store.state.splashShown = true;
    const tl = createTimeline({
      defaults: { ease: 'outQuart' }
    });
    tl.add('#splash-logo', { scale: [0.75, 1], opacity: [0, 1], duration: 360 }, 0)
      .add('#splash-title', { translateY: [12, 0], opacity: [0, 1], duration: 320 }, 100)
      .add('#splash-bar', { width: ['0%', '100%'], duration: 520, ease: 'inOutQuad' }, 120)
      .add(
        splashEl,
        {
          opacity: [1, 0],
          duration: 300,
          onComplete: () => {
            if (splashEl.parentNode) splashEl.parentNode.removeChild(splashEl);
          }
        },
        720
      );
  }

  // Password visibility toggle
  const passInput = containerEl.querySelector('#login-password');
  const togglePassBtn = containerEl.querySelector('#toggle-password-vis');
  if (passInput && togglePassBtn) {
    togglePassBtn.addEventListener('click', () => {
      const isHidden = passInput.type === 'password';
      passInput.type = isHidden ? 'text' : 'password';
      togglePassBtn.innerHTML = renderIcon(isHidden ? 'eye-off' : 'eye', { size: 16 });
    });
  }

  // Demo quick-fill buttons
  containerEl.querySelectorAll('.demo-acc-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.getAttribute('data-email');
      const emailInput = containerEl.querySelector('#login-email');
      if (emailInput) emailInput.value = email;
      if (passInput) passInput.value = 'demo123';
      const alertBox = containerEl.querySelector('#login-alert-box');
      if (alertBox) alertBox.style.display = 'none';
    });
  });

  // Test invalid credentials button
  const invalidTestBtn = containerEl.querySelector('#test-invalid-cred-btn');
  if (invalidTestBtn) {
    invalidTestBtn.addEventListener('click', () => {
      if (passInput) passInput.value = 'salah123';
      const form = containerEl.querySelector('#dg-login-form');
      if (form) form.requestSubmit();
    });
  }

  // Toggle Demo / Production Mode on Login Screen
  const modeToggle = containerEl.querySelector('#login-mode-toggle');
  if (modeToggle) {
    modeToggle.addEventListener('click', () => {
      store.setBackendMode(store.state.backendMode === 'DEMO' ? 'PRODUCTION' : 'DEMO');
      renderLoginPage(containerEl, onLoginSuccess);
    });
  }

  // Simulate session expired state
  const expiredSimBtn = containerEl.querySelector('#login-expired-sim-btn');
  if (expiredSimBtn) {
    expiredSimBtn.addEventListener('click', () => {
      store.state.sessionExpiredAlert = true;
      renderLoginPage(containerEl, onLoginSuccess);
    });
  }

  // Forgot password modal
  const forgotBtn = containerEl.querySelector('#forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      openModal({
        title: 'Pemulihan Kata Sandi Akun SPPG',
        triggerEl: forgotBtn,
        bodyHtml: `
          <form id="forgot-pass-form" style="display:flex;flex-direction:column;gap:12px;">
            <p style="font-size:13px;color:var(--text-secondary);">
              Masukkan alamat email kedinasan SPPG Anda. Permintaan reset akan diteruskan ke Kepala SPPG / Administrator Provinsi.
            </p>
            <div class="form-group">
              <label class="form-label" for="reset-email-input">Email Terdaftar</label>
              <input type="email" id="reset-email-input" class="form-input" value="kepala@dapurgizi.id" required />
            </div>
            <div id="reset-feedback" style="font-size:12.5px;"></div>
          </form>
        `,
        footerHtml: `
          <button type="button" class="btn btn-secondary btn-liquid" data-modal-close>Tutup</button>
          <button type="button" class="btn btn-primary btn-liquid btn-magnetic" id="submit-reset-btn">Kirim Permintaan Reset</button>
        `,
        onMount(dialog, close) {
          const submitBtn = dialog.querySelector('#submit-reset-btn');
          const emailEl = dialog.querySelector('#reset-email-input');
          const fbEl = dialog.querySelector('#reset-feedback');
          submitBtn.addEventListener('click', async () => {
            submitBtn.disabled = true;
            const res = await callApi('auth_reset_password', { email: emailEl.value });
            submitBtn.disabled = false;
            if (res.success) {
              fbEl.innerHTML = `<div style="padding:10px;border-radius:8px;background:rgba(34,197,94,0.15);color:#15803D;font-weight:600;">${escapeHtml(
                res.data.message
              )}</div>`;
              setTimeout(() => close(), 1800);
            } else {
              fbEl.innerHTML = `<div style="padding:10px;border-radius:8px;background:rgba(239,68,68,0.14);color:#B91C1C;font-weight:600;">${escapeHtml(
                res.error
              )}</div>`;
            }
          });
        }
      });
    });
  }

  // Form submit handler (Loading -> Invalid or Success state)
  const loginForm = containerEl.querySelector('#dg-login-form');
  const submitBtn = containerEl.querySelector('#login-submit-btn');
  const alertBox = containerEl.querySelector('#login-alert-box');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = containerEl.querySelector('#login-email').value.trim();
      const password = containerEl.querySelector('#login-password').value;
      const remember = containerEl.querySelector('#login-remember').checked;

      // Loading State
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span style="display:inline-flex;animation:spin 1s linear infinite;">${renderIcon('refresh-cw', { size: 17 })}</span>
        <span>Memverifikasi Kredensial...</span>
      `;

      const res = await callApi('auth_login', { email, password, remember });

      if (!res.success) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `${renderIcon('shield-check', { size: 18 })} <span>Masuk ke Sistem DapurGizi</span>`;
        alertBox.style.display = 'block';
        alertBox.innerHTML = `
          <div style="padding:12px 14px;border-radius:10px;background:rgba(239,68,68,0.14);border:1px solid rgba(239,68,68,0.35);color:#B91C1C;font-size:12.5px;display:flex;align-items:center;gap:10px;" role="alert">
            ${renderIcon('alert-circle', { size: 18 })}
            <div><strong>Autentikasi Gagal:</strong> ${escapeHtml(res.error)}</div>
          </div>
        `;
        animate('#auth-main-card', {
          translateX: [-8, 8, -5, 5, 0],
          duration: 320,
          ease: 'outQuad'
        });
        return;
      }

      // Login Success State with SVG Checkmark Draw
      alertBox.style.display = 'block';
      alertBox.innerHTML = `
        <div style="padding:12px 14px;border-radius:10px;background:rgba(34,197,94,0.16);border:1px solid rgba(34,197,94,0.4);color:#15803D;font-size:12.5px;display:flex;align-items:center;gap:10px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path class="anim-draw-path" d="M20 6 9 17l-5-5" />
          </svg>
          <div><strong>Autentikasi Berhasil!</strong> Selamat bertugas, ${escapeHtml(res.data.user.name)}.</div>
        </div>
      `;
      animateSvgDraw(alertBox, '.anim-draw-path', 280);

      store.setSession(res.data);
      showToast({
        title: `Selamat Datang, ${res.data.user.name}`,
        message: `Sesi aktif sebagai ${res.data.user.role} (${res.data.isDemo ? 'Mode Demo' : 'Python Eel'}).`,
        type: 'success'
      });

      setTimeout(() => {
        if (typeof onLoginSuccess === 'function') onLoginSuccess();
      }, 320);
    });
  }

  bindInteractiveButtons(containerEl);
}
