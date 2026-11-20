"""Registrasi semua handler Eel."""


def register_all() -> None:
    # Meng-import modul = mendaftarkan fungsi @eel.expose di dalamnya.
    from backend.handlers import system  # noqa: F401
    # Fase berikutnya: tambahkan auth, budget, dashboard, dst. di sini.