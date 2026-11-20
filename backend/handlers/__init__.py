"""Registrasi semua handler Eel.

Mengimpor modul = mendaftarkan fungsi ``@eel.expose`` di dalamnya.
Urutan impor tidak memengaruhi kontrak; nama fungsi harus persis seperti
INTEGRATION.md.
"""

from __future__ import annotations


def register_all() -> None:
    from backend.handlers import (  # noqa: F401
        auth,
        beneficiaries,
        budget,
        dashboard,
        distribution,
        food_safety,
        menus,
        notifications,
        production,
        reports,
        settings,
        system,
        users,
    )
