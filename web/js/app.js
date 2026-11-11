/**
 * DapurGizi Minimal Frontend Shell.
 * Demonstrates the standard Eel integration contract:
 * { success: boolean, data: any | null, error: string | null }
 */

async function checkBackendStatus() {
    const badge = document.getElementById("connection-badge");
    if (!badge) return;

    if (typeof window.eel === "undefined" || typeof window.eel.get_app_status !== "function") {
        badge.dataset.state = "offline";
        badge.textContent = "Mode Statis (Eel tidak aktif)";
        return;
    }

    try {
        const response = await window.eel.get_app_status()();
        if (response && response.success) {
            badge.dataset.state = "ready";
            badge.textContent = `Backend Aktif (${response.data.environment})`;
        } else {
            badge.dataset.state = "offline";
            badge.textContent = response?.error || "Gagal memuat status backend";
        }
    } catch (err) {
        badge.dataset.state = "offline";
        badge.textContent = "Koneksi Eel terputus";
        console.error("Eel status check failed:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    checkBackendStatus();
});
