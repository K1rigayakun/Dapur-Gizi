"""Manajemen sesi server-side.

Sesi disimpan **hanya di memori proses Python**. Frontend tidak pernah
menerima access token dan tidak boleh dipercaya sebagai sumber kebenaran
sesi (kontrak keamanan INTEGRATION.md bagian 1).

Batasan yang disengaja: aplikasi desktop ini melayani satu sesi aktif per
proses (satu pengguna SPPG per jendela aplikasi). Bila kelak dibutuhkan
multi-sesi, ganti ``_session`` menjadi pemetaan ``session_id -> Session``.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any


@dataclass(frozen=True)
class AuthUser:
    """Profil pengguna yang aman dikirim ke frontend."""

    id: str
    name: str
    email: str
    role: str
    unit: str | None = None
    phone: str | None = None
    status: str = "Aktif"

    def to_api(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "unit": self.unit,
            "phone": self.phone,
        }


@dataclass
class Session:
    user: AuthUser
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=8)
    )
    remembered: bool = False

    @property
    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at

    def to_api(self) -> dict[str, Any]:
        return {
            "user": self.user.to_api(),
            "expiresAt": self.expires_at.astimezone(timezone.utc).isoformat(),
            "isDemo": False,
        }


class SessionStore:
    """Penyimpan sesi tunggal yang aman terhadap akses multi-thread Eel."""

    def __init__(self, ttl_hours: int = 8, remember_ttl_hours: int = 168) -> None:
        self._ttl = timedelta(hours=ttl_hours)
        self._remember_ttl = timedelta(hours=remember_ttl_hours)
        self._lock = threading.RLock()
        self._session: Session | None = None

    def start(
        self,
        user: AuthUser,
        *,
        access_token: str | None = None,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
        remembered: bool = False,
    ) -> Session:
        ttl = self._remember_ttl if remembered else self._ttl
        with self._lock:
            self._session = Session(
                user=user,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at or (datetime.now(timezone.utc) + ttl),
                remembered=remembered,
            )
            return self._session

    def current(self) -> Session | None:
        """Kembalikan sesi aktif, atau ``None`` bila kosong/kedaluwarsa."""
        with self._lock:
            session = self._session
            if session is None:
                return None
            if session.is_expired:
                self._session = None
                return None
            return session

    def require(self) -> Session:
        session = self.current()
        if session is None:
            raise PermissionError("Sesi tidak aktif atau telah berakhir. Silakan masuk kembali.")
        return session

    def clear(self) -> None:
        with self._lock:
            self._session = None

    def refresh_tokens(self, access_token: str | None, refresh_token: str | None) -> None:
        with self._lock:
            if self._session is not None:
                self._session.access_token = access_token
                self._session.refresh_token = refresh_token
