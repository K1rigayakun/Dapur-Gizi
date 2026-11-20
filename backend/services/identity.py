"""Service identitas: pengguna, notifikasi, dan pengaturan.

Milik Gabriel (platform). Tidak ada kredensial yang pernah dikembalikan ke
frontend; kata sandi hanya diproses oleh :class:`AuthService`.
"""

from __future__ import annotations

from typing import Any, Mapping

from backend.auth.rbac import ALL_ROLES, normalize_role
from backend.core.logging_setup import get_logger
from backend.database.repository import Repository
from backend.services._mapping import (
    NOTIFICATION_FIELDS,
    SETTINGS_FIELDS,
    map_row,
    map_rows,
    settings_to_api,
)

log = get_logger()

USER_FIELDS = {
    "id": "id",
    "name": "full_name",
    "email": "email",
    "role": "role",
    "status": "status",
    "phone": "phone",
    "unit": "unit_code",
    "lastLogin": "last_login",
}

USER_STATUSES = {"Aktif", "Nonaktif", "Menunggu Aktivasi"}

BOOLEAN_SETTINGS = {"enableSoundAlerts", "enableDesktopToast"}
INTEGER_SETTINGS = {"autoRefreshIntervalSec"}
TEXT_SETTINGS = {"unitName", "unitCode", "headName", "city", "defaultShiftStart"}


def _user_to_api(row: Mapping[str, Any]) -> dict[str, Any]:
    return map_row(row, USER_FIELDS)


def _require_text(payload: Mapping[str, Any], key: str, label: str) -> str:
    value = str(payload.get(key) or "").strip()
    if not value:
        raise ValueError(f"'{label}' wajib diisi.")
    return value


def _validate_email(email: str) -> str:
    cleaned = email.strip().lower()
    if "@" not in cleaned or cleaned.startswith("@") or cleaned.endswith("@"):
        raise ValueError("Format alamat email tidak valid.")
    return cleaned


class UsersService:
    def __init__(self, repository: Repository) -> None:
        self._repository = repository

    def list(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        rows = self._repository.select("app_users", order="full_name")
        return {"items": [_user_to_api(row) for row in rows]}

    def create(self, payload: dict[str, Any], actor: str | None = None) -> dict[str, Any]:
        name = _require_text(payload, "name", "Nama")
        email = _validate_email(_require_text(payload, "email", "Email"))
        role = normalize_role(payload.get("role"))
        status = str(payload.get("status") or "Menunggu Aktivasi").strip()
        if status not in USER_STATUSES:
            raise ValueError(
                "Status pengguna harus salah satu dari: " + ", ".join(sorted(USER_STATUSES))
            )

        existing = self._repository.select("app_users", filters={"email": email}, limit=1)
        if existing:
            raise ValueError("Email tersebut sudah terdaftar sebagai pengguna SPPG.")

        row = {
            "full_name": name,
            "email": email,
            "role": role,
            "status": status,
            "phone": str(payload.get("phone") or "").strip() or None,
            "unit_code": str(payload.get("unit") or "").strip() or None,
        }
        if actor:
            row["created_by"] = actor
            row["updated_by"] = actor

        saved = self._repository.insert("app_users", row)
        log.info("Pengguna baru dibuat: %s", email)
        return _user_to_api(saved)

    def update(self, payload: dict[str, Any], actor: str | None = None) -> dict[str, Any]:
        record_id = str(payload.get("id") or "").strip()
        if not record_id:
            raise ValueError("'id' pengguna wajib diisi.")

        current = self._repository.get("app_users", record_id)
        if current is None:
            raise LookupError("Pengguna tidak ditemukan.")

        patch: dict[str, Any] = {}
        if "name" in payload:
            patch["full_name"] = _require_text(payload, "name", "Nama")
        if "role" in payload:
            patch["role"] = normalize_role(payload.get("role"))
        if "status" in payload:
            status = str(payload.get("status") or "").strip()
            if status not in USER_STATUSES:
                raise ValueError(
                    "Status pengguna harus salah satu dari: "
                    + ", ".join(sorted(USER_STATUSES))
                )
            patch["status"] = status
        if "phone" in payload:
            patch["phone"] = str(payload.get("phone") or "").strip() or None
        if "unit" in payload:
            patch["unit_code"] = str(payload.get("unit") or "").strip() or None
        if "email" in payload:
            new_email = _validate_email(str(payload.get("email") or ""))
            if new_email != str(current.get("email") or "").lower():
                raise ValueError(
                    "Email login tidak dapat diubah dari aplikasi. "
                    "Gunakan alur administrasi Supabase Auth."
                )

        if not patch:
            raise ValueError("Tidak ada perubahan pengguna yang dikirim.")
        patch["updated_by"] = actor

        saved = self._repository.update("app_users", record_id, patch)
        if saved is None:
            raise LookupError("Pengguna tidak ditemukan.")
        return _user_to_api(saved)


class NotificationsService:
    def __init__(self, repository: Repository) -> None:
        self._repository = repository

    def _payload(self) -> dict[str, Any]:
        rows = self._repository.select(
            "notifications", order="occurred_at", descending=True
        )
        items = map_rows(rows, NOTIFICATION_FIELDS)
        return {
            "items": items,
            "unreadCount": sum(1 for item in items if not item.get("read")),
        }

    def list(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        return self._payload()

    def mark_read(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        if payload.get("markAll"):
            self._repository.update_where(
                "notifications", {"is_read": False}, {"is_read": True}
            )
        else:
            record_id = str(payload.get("id") or "").strip()
            if not record_id:
                raise ValueError("'id' notifikasi atau 'markAll' wajib dikirim.")
            updated = self._repository.update(
                "notifications", record_id, {"is_read": True}
            )
            if updated is None:
                raise LookupError("Notifikasi tidak ditemukan.")
        return self._payload()


class SettingsService:
    def __init__(self, repository: Repository, budget_service: Any) -> None:
        self._repository = repository
        self._budget = budget_service

    def _row(self) -> dict[str, Any] | None:
        rows = self._repository.select("app_settings", limit=1)
        return rows[0] if rows else None

    def get(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        row = self._row()
        if row is None:
            raise LookupError(
                "Pengaturan unit SPPG belum dikonfigurasi pada database."
            )
        return {
            "settings": settings_to_api(row),
            "budgetParameters": self._budget.get_parameters(),
        }

    def update(self, payload: dict[str, Any], actor: str | None = None) -> dict[str, Any]:
        payload = payload or {}
        settings_payload = payload.get("settings")
        budget_payload = payload.get("budgetParameters")

        if settings_payload is None and budget_payload is None:
            raise ValueError("Tidak ada pengaturan yang dikirim untuk diperbarui.")

        if settings_payload is not None:
            if not isinstance(settings_payload, Mapping):
                raise ValueError("'settings' harus berupa objek.")
            self._update_settings(dict(settings_payload), actor)

        if budget_payload is not None:
            if not isinstance(budget_payload, Mapping):
                raise ValueError("'budgetParameters' harus berupa objek.")
            self._budget.update_parameters(dict(budget_payload), actor)

        return self.get()

    def _update_settings(self, patch: dict[str, Any], actor: str | None) -> None:
        row = self._row()
        if row is None:
            raise LookupError(
                "Pengaturan unit SPPG belum dikonfigurasi pada database."
            )

        cleaned: dict[str, Any] = {}
        for api_key, column in SETTINGS_FIELDS.items():
            if api_key not in patch:
                continue
            value = patch[api_key]
            if api_key in BOOLEAN_SETTINGS:
                if not isinstance(value, bool):
                    raise ValueError(f"'{api_key}' harus berupa boolean.")
                cleaned[column] = value
            elif api_key in INTEGER_SETTINGS:
                if isinstance(value, bool):
                    raise ValueError(f"'{api_key}' harus berupa angka.")
                try:
                    number = int(value)
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"'{api_key}' harus berupa angka.") from exc
                if not 5 <= number <= 3600:
                    raise ValueError(f"'{api_key}' harus antara 5 dan 3600 detik.")
                cleaned[column] = number
            elif api_key in TEXT_SETTINGS:
                text = str(value or "").strip()
                if api_key in {"unitName", "unitCode"} and not text:
                    raise ValueError(f"'{api_key}' tidak boleh kosong.")
                cleaned[column] = text

        if not cleaned:
            raise ValueError("Tidak ada field pengaturan yang dikenali.")
        if actor:
            cleaned["updated_by"] = actor
        self._repository.update("app_settings", row["id"], cleaned)
