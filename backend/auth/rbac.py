"""Matriks peran dan izin DapurGizi.

Catatan desain (bukan regulasi resmi pemerintah):
Matriks ini adalah keputusan desain proyek dan harus konsisten dengan
``web/js/utils/permissions.js`` milik frontend. Perubahan pada salah satu
sisi wajib disertai perubahan pada sisi lainnya.
"""

from __future__ import annotations

from typing import Final

ROLE_KEPALA: Final = "Kepala SPPG"
ROLE_GIZI: Final = "Pengawas Gizi"
ROLE_KEUANGAN: Final = "Pengawas Keuangan"
ROLE_SANITASI: Final = "Pengawas Sanitasi"

ALL_ROLES: Final[tuple[str, ...]] = (
    ROLE_KEPALA,
    ROLE_GIZI,
    ROLE_KEUANGAN,
    ROLE_SANITASI,
)

# Izin tindakan per peran. Nama izin internal backend; bukan nama izin frontend.
PERMISSIONS: Final[dict[str, frozenset[str]]] = {
    ROLE_KEPALA: frozenset(
        {
            "manage_users",
            "manage_settings",
            "approve_menu",
            "manage_menus",
            "manage_beneficiaries",
            "edit_production",
            "configure_budget",
            "manage_distribution",
            "confirm_distribution",
            "edit_hygiene",
            "export_reports",
        }
    ),
    ROLE_GIZI: frozenset(
        {
            "approve_menu",
            "manage_menus",
            "manage_beneficiaries",
            "edit_production",
            "export_reports",
        }
    ),
    ROLE_KEUANGAN: frozenset(
        {
            "configure_budget",
            "export_reports",
        }
    ),
    ROLE_SANITASI: frozenset(
        {
            "edit_production",
            "manage_distribution",
            "confirm_distribution",
            "edit_hygiene",
            "export_reports",
        }
    ),
}


def normalize_role(role: str | None) -> str:
    """Normalisasi nama peran; lempar ValueError bila tidak dikenal."""
    if not role:
        raise ValueError("Peran pengguna tidak tersedia pada sesi.")
    cleaned = " ".join(str(role).split())
    for known in ALL_ROLES:
        if cleaned.lower() == known.lower():
            return known
    raise ValueError(f"Peran '{role}' tidak dikenal pada matriks akses DapurGizi.")


def has_permission(role: str | None, permission: str) -> bool:
    try:
        normalized = normalize_role(role)
    except ValueError:
        return False
    return permission in PERMISSIONS.get(normalized, frozenset())


def require_permission(role: str | None, permission: str) -> None:
    """Lempar PermissionError bila peran tidak memiliki izin."""
    if not has_permission(role, permission):
        raise PermissionError("Anda tidak memiliki izin untuk tindakan ini.")
