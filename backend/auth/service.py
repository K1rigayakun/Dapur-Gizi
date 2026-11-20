"""Service autentikasi: orkestrasi provider, sesi, dan repository."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from backend.auth.provider import AuthProvider
from backend.auth.session import SessionStore
from backend.core.logging_setup import get_logger
from backend.database.repository import Repository

log = get_logger()

GENERIC_RESET_MESSAGE = (
    "Jika email tersebut terdaftar, instruksi pemulihan kata sandi telah dikirim. "
    "Periksa kotak masuk email Anda."
)

MIN_PASSWORD_LENGTH = 6


class AuthService:
    def __init__(
        self,
        provider: AuthProvider,
        sessions: SessionStore,
        repository: Repository,
    ) -> None:
        self._provider = provider
        self._sessions = sessions
        self._repository = repository

    def login(self, payload: dict[str, Any]) -> dict[str, Any]:
        email = str(payload.get("email") or "").strip().lower()
        password = str(payload.get("password") or "")
        remember = bool(payload.get("remember"))

        if not email or not password:
            raise ValueError("Email dan kata sandi wajib diisi.")

        result = self._provider.sign_in(email, password)
        self._repository.set_access_token(result.access_token)
        session = self._sessions.start(
            result.user,
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_at=result.expires_at,
            remembered=remember,
        )

        # Catat waktu login terakhir; kegagalan audit tidak boleh menggagalkan login.
        try:
            self._repository.update_where(
                "app_users",
                {"id": result.user.id},
                {"last_login": datetime.now(timezone.utc).isoformat()},
            )
        except Exception as exc:  # noqa: BLE001 - audit bersifat best-effort
            log.warning("Gagal memperbarui last_login: %s", type(exc).__name__)

        data = session.to_api()
        data["isDemo"] = False
        return data

    def logout(self) -> dict[str, Any]:
        self._sessions.clear()
        self._provider.sign_out()
        self._repository.set_access_token(None)
        return {"loggedOut": True}

    def get_session(self) -> dict[str, Any] | None:
        session = self._sessions.current()
        return session.to_api() if session else None

    def reset_password(self, payload: dict[str, Any]) -> dict[str, Any]:
        email = str(payload.get("email") or "").strip().lower()
        if not email:
            raise ValueError("Masukkan alamat email terdaftar.")
        if "@" not in email or email.startswith("@") or email.endswith("@"):
            raise ValueError("Format alamat email tidak valid.")

        try:
            self._provider.reset_password(email)
        except Exception as exc:  # noqa: BLE001 - jangan bocorkan keberadaan akun
            log.warning("Permintaan reset password gagal: %s", type(exc).__name__)

        return {"message": GENERIC_RESET_MESSAGE}

    def change_password(self, payload: dict[str, Any]) -> dict[str, Any]:
        session = self._sessions.require()
        current_password = str(payload.get("currentPassword") or "")
        new_password = str(payload.get("newPassword") or "")

        if not current_password:
            raise ValueError("Kata sandi saat ini wajib diisi.")
        if len(new_password) < MIN_PASSWORD_LENGTH:
            raise ValueError(
                f"Kata sandi baru minimal {MIN_PASSWORD_LENGTH} karakter."
            )
        if new_password == current_password:
            raise ValueError("Kata sandi baru harus berbeda dari kata sandi saat ini.")

        result = self._provider.change_password(
            session.user.email, current_password, new_password
        )
        if result.access_token:
            self._sessions.refresh_tokens(result.access_token, result.refresh_token)
            self._repository.set_access_token(result.access_token)

        return {
            "updated": True,
            "message": "Kata sandi berhasil diperbarui. Gunakan kata sandi baru pada login berikutnya.",
        }
