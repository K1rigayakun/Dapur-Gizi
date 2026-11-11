/**
 * DapurGizi — Python Eel 0.18.2 API Abstraction Bridge (js/services/api.js)
 *
 * Architecture:
 * Frontend (Vanilla JS) → Eel Bridge (`await eel.function_name(payload)()`) → Python 3.13 Backend → Supabase PostgreSQL
 *
 * Responsibilities:
 * 1. Detect Python Eel runtime availability (`window.eel`).
 * 2. Call exposed `@eel.expose` Python functions using `await eel.function_name(payload)()`.
 * 3. Validate expected response envelope: `{ "success": boolean, "data": any, "error": string|null }`.
 * 4. Enforce timeout & error handling.
 * 5. Never silently convert backend errors into successful demo responses.
 * 6. Route to `mock-api.js` ONLY when Demo Mode is explicitly active.
 */

import { store } from '../state.js';
import { mockApiHandlers } from './mock-api.js';

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Checks whether the real Python Eel WebSocket bridge is present and active.
 */
export function isEelAvailable() {
  const hasEelObj =
    typeof window !== 'undefined' &&
    typeof window.eel === 'object' &&
    window.eel !== null &&
    !window.__DAPURGIZI_EEL_STATIC_STUB__;
  return Boolean(hasEelObj);
}

/**
 * Validates that a response matches the DapurGizi contract:
 * { "success": boolean, "data": any, "error": string | null }
 */
export function validateApiResponse(res, functionName) {
  if (!res || typeof res !== 'object' || typeof res.success !== 'boolean') {
    return {
      success: false,
      data: null,
      error: `Respons tidak valid dari fungsi "${functionName}": struktur wajib { success, data, error }.`
    };
  }
  return {
    success: res.success,
    data: res.data ?? null,
    error: res.error ?? null,
    meta: res.meta || { source: 'EEL_PYTHON_BACKEND', timestamp: new Date().toISOString() }
  };
}

/**
 * Calls a backend function via Eel (when in PRODUCTION mode) or Mock API (when in DEMO mode).
 * NEVER silently falls back to Demo data if a real Eel call fails or if Production Mode is selected without Eel.
 *
 * @param {string} functionName - Exposed Python function name (e.g. 'dashboard_get_summary')
 * @param {object} payload - JSON-serializable input dictionary
 * @param {object} options - { timeoutMs = 10000 }
 */
export async function callApi(functionName, payload = {}, options = {}) {
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const eelPresent = isEelAvailable();
  store.setEelConnected(eelPresent);

  const currentMode = store.state.backendMode; // 'DEMO' | 'PRODUCTION'

  // If user configured PRODUCTION mode, strictly require real Python Eel bridge
  if (currentMode === 'PRODUCTION') {
    if (!eelPresent) {
      return {
        success: false,
        data: null,
        error: `Mode Produksi aktif, tetapi jembatan Python Eel (/eel.js) tidak terdeteksi. Jalankan aplikasi melalui 'python main.py' atau alihkan ke Mode Demo.`,
        meta: { source: 'EEL_BRIDGE_MISSING', timestamp: new Date().toISOString() }
      };
    }

    if (typeof window.eel[functionName] !== 'function') {
      return {
        success: false,
        data: null,
        error: `Fungsi Python @eel.expose "${functionName}" belum terdaftar pada backend Python. Lihat INTEGRATION.md untuk spesifikasi kontrak.`,
        meta: { source: 'EEL_FUNCTION_PENDING', timestamp: new Date().toISOString() }
      };
    }

    try {
      const eelPromise = window.eel[functionName](payload)();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Batas waktu panggilan Eel (${timeoutMs}ms) terlampaui.`)), timeoutMs)
      );
      const rawResponse = await Promise.race([eelPromise, timeoutPromise]);
      return validateApiResponse(rawResponse, functionName);
    } catch (err) {
      return {
        success: false,
        data: null,
        error: `Kesalahan komunikasi Eel pada "${functionName}": ${err && err.message ? err.message : String(err)}`,
        meta: { source: 'EEL_RUNTIME_ERROR', timestamp: new Date().toISOString() }
      };
    }
  }

  // DEMO MODE: Explicitly route to local mock-api.js
  const mockHandler = mockApiHandlers[functionName];
  if (typeof mockHandler !== 'function') {
    return {
      success: false,
      data: null,
      error: `Handler "${functionName}" tidak ditemukan pada layanan Demo API.`,
      meta: { source: 'DEMO_MODE', timestamp: new Date().toISOString() }
    };
  }

  try {
    const rawDemoResponse = await mockHandler.call(mockApiHandlers, payload);
    return validateApiResponse(rawDemoResponse, functionName);
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `Kesalahan eksekusi Demo API pada "${functionName}": ${err.message || String(err)}`,
      meta: { source: 'DEMO_MODE', timestamp: new Date().toISOString() }
    };
  }
}
