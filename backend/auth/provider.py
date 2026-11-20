"""Penyedia autentikasi (Supabase dan in-memory untuk pengujian).

``SupabaseAuthProvider`` memakai **anon key** dan sesi pengguna. Service role
key tidak pernah dipakai di dalam aplikasi desktop/EXE.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Protocol

from backend.auth.rbac import normalize_role
from backend.auth.session import AuthUser
from backend.core.errors import ConfigError
from backend.core.logging_setup import get_logger

log = get_logger()


@dataclass(frozen=True)
class AuthResult:
    user: AuthUser
    access_token: str | None = None
    refresh_token: str | None = None
    expires_at: datetime | None = None


class AuthProvider(Protocol):
    def sign_in(self, email: str, password: str) -> AuthResult: ...

    def sign_out(self) -> None: ...

    def reset_password(self, email: str) -> None: ...

    def change_password(
        self, email: str, current_password: str, new_password: str
    ) -> AuthResult: ...


def _attr(obj: Any, name: str, default: Any = None) -> Any:
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def _profile_to_user(profile: dict[str, Any], auth_user: Any) -> AuthUser:
    """Petakan baris ``app_users`` + objek Supabase Auth ke :class:`AuthUser`."""
    status = str(profile.get("status") or "Aktif")
    if status != "Aktif":
        raise PermissionError("Akun pengguna ini berstatus Nonaktif. Hubungi Kepala SPPG.")
    role = normalize_role(profile.get("role"))
    return AuthUser(
        id=str(profile.get("id") or _attr(auth_user, "id")),
        name=str(profile.get("full_name") or _attr(auth_user, "email") or ""),
        email=str(profile.get("email") or _attr(auth_user, "email") or ""),
        role=role,
        unit=profile.get("unit_code"),
        phone=profile.get("phone"),
        status=status,
    )


class SupabaseAuthProvider:
    """Autentikasi melalui Supabase Auth memakai anon key."""

    def __init__(
        self,
        client: Any,
        profile_loader: Callable[[str], dict[str, Any] | None],
    ) -> None:
        self._client = client
        self._profile_loader = profile_loader

    def sign_in(self, email: str, password: str) -> AuthResult:
        try:
            response = self._client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
        except Exception as exc:  # pesan asli tidak boleh bocor ke pengguna
            log.warning("Login Supabase gagal: %s", type(exc).__name__)
            raise PermissionError("Email atau kata sandi tidak sesuai.") from exc

        auth_user = _attr(response, "user")
        if auth_user is None:
            raise PermissionError("Email atau kata sandi tidak sesuai.")

        session = _attr(response, "session")
        access_token = _attr(session, "access_token")

        try:
            profile = self._profile_loader(str(_attr(auth_user, "id")), access_token)
        except TypeError:
            profile = self._profile_loader(str(_attr(auth_user, "id")))

        if not profile:
            self.sign_out()
            raise PermissionError(
                "Akun ini belum memiliki profil SPPG. Hubungi Kepala SPPG."
            )

        user = _profile_to_user(profile, auth_user)
        expires_raw = _attr(session, "expires_at")
        expires_at = None
        if isinstance(expires_raw, (int, float)) and expires_raw > 0:
            expires_at = datetime.fromtimestamp(expires_raw, tz=timezone.utc)
        return AuthResult(
            user=user,
            access_token=_attr(session, "access_token"),
            refresh_token=_attr(session, "refresh_token"),
            expires_at=expires_at,
        )

    def sign_out(self) -> None:
        try:
            self._client.auth.sign_out()
        except Exception as exc:  # logout lokal harus tetap berhasil
            log.warning("Sign out Supabase gagal: %s", type(exc).__name__)

    def reset_password(self, email: str) -> None:
        # Pesan ke pengguna selalu generik di lapisan service agar tidak
        # membocorkan keberadaan akun.
        try:
            self._client.auth.reset_password_email(email)
        except Exception as exc:
            log.warning("Permintaan reset password gagal: %s", type(exc).__name__)

    def change_password(
        self, email: str, current_password: str, new_password: str
    ) -> AuthResult:
        # Validasi kata sandi lama dengan autentikasi ulang.
        self.sign_in(email, current_password)
        try:
            self._client.auth.update_user({"password": new_password})
        except Exception as exc:
            log.warning("Perubahan kata sandi Supabase gagal: %s", type(exc).__name__)
            raise ValueError(
                "Kata sandi baru tidak dapat disimpan. Periksa kebijakan kata sandi."
            ) from exc
        return self.sign_in(email, new_password)


class InMemoryAuthProvider:
    """Penyedia autentikasi palsu untuk unit test tanpa Supabase.

    Tidak dipakai pada mode production. Kredensial hanya berada di memori
    proses pengujian.
    """

    def __init__(self, users: dict[str, dict[str, Any]] | None = None) -> None:
        # email -> {password, id, full_name, role, unit_code, phone, status}
        self._users: dict[str, dict[str, Any]] = {}
        for email, data in (users or {}).items():
            self._users[email.lower()] = dict(data)

    def add_user(self, email: str, password: str, **profile: Any) -> None:
        self._users[email.lower()] = {"password": password, **profile}

    def _build(self, email: str) -> AuthResult:
        data = self._users[email.lower()]
        user = AuthUser(
            id=str(data.get("id") or f"test-{email}"),
            name=str(data.get("full_name") or email),
            email=email.lower(),
            role=normalize_role(data.get("role")),
            unit=data.get("unit_code"),
            phone=data.get("phone"),
            status=str(data.get("status") or "Aktif"),
        )
        return AuthResult(
            user=user,
            access_token=f"test-token-{email}",
            refresh_token=None,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )

    def sign_in(self, email: str, password: str) -> AuthResult:
        data = self._users.get(email.lower())
        if data is None or data.get("password") != password:
            raise PermissionError("Email atau kata sandi tidak sesuai.")
        if str(data.get("status") or "Aktif") != "Aktif":
            raise PermissionError("Akun pengguna ini berstatus Nonaktif. Hubungi Kepala SPPG.")
        return self._build(email)

    def sign_out(self) -> None:
        return None

    def reset_password(self, email: str) -> None:
        if email.lower() not in self._users:
            raise ConfigError("Email tidak terdaftar pada penyedia pengujian.")

    def change_password(
        self, email: str, current_password: str, new_password: str
    ) -> AuthResult:
        data = self._users.get(email.lower())
        if data is None or data.get("password") != current_password:
            raise PermissionError("Kata sandi saat ini tidak sesuai.")
        data["password"] = new_password
        return self._build(email)
