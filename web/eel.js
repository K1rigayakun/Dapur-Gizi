/**
 * Eel Static Fallback Stub (/eel.js)
 *
 * When DapurGizi is launched through Python Eel (`eel.init('web'); eel.start('index.html')`),
 * Eel's Bottle server intercepts `/eel.js` and serves the live WebSocket bridge that defines `window.eel`.
 *
 * When DapurGizi is opened directly in a browser or local static HTTP server for frontend testing
 * without the Python backend running, this file prevents a 404 console error while intentionally
 * leaving `window.eel` undefined (unless explicitly injected by a test harness), allowing
 * `js/services/api.js` to accurately detect standalone DEMO MODE.
 */
(function () {
  if (typeof window !== 'undefined' && typeof window.eel === 'undefined') {
    window.__DAPURGIZI_EEL_STATIC_STUB__ = true;
  }
})();
