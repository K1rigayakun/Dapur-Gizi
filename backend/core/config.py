"""Pembacaan konfigurasi aplikasi dari environment variable (.env)."""

import os
from dataclasses import dataclass
from typing import Mapping

from dotenv import load_dotenv

from backend.core.errors import ConfigError

VALID_ENVS = {"development", "test", "production"}
DEFAULT_TIMEZONE = "Asia/Jakarta"


def _clean(value: str | None) -> str | None:
    """Anggap nilai kosong atau placeholder bawaan .env.example sebagai 'belum diisi'."""
    if value is None:
        return None
    value = value.strip()
    if not value or "your-" in value:
        return None
    return value


@dataclass(frozen=True)
class Settings:
    app_env: str
    app_host: str
    app_port: int
    window_width: int
    window_height: int
    supabase_url: str | None
    supabase_anon_key: str | None
    timezone: str = DEFAULT_TIMEZONE
    session_ttl_hours: int = 8
    remember_session_ttl_hours: int = 168

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_test(self) -> bool:
        return self.app_env == "test"

    def require_supabase(self) -> tuple[str, str]:
        """Kembalikan (url, key) atau lempar ConfigError bila belum diisi."""
        missing = []
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_anon_key:
            missing.append("SUPABASE_ANON_KEY")
        if missing:
            raise ConfigError(
                "Konfigurasi Supabase belum lengkap: " + ", ".join(missing)
                + ". Isi file .env (lihat .env.example)."
            )
        return self.supabase_url, self.supabase_anon_key


def _positive_int(environ: Mapping[str, str], name: str, default: int) -> int:
    try:
        value = int(environ.get(name, str(default)))
    except (TypeError, ValueError) as exc:
        raise ConfigError(f"{name} harus berupa angka.") from exc
    if value <= 0:
        raise ConfigError(f"{name} harus lebih besar dari nol.")
    return value


def load_settings(environ: Mapping[str, str] | None = None) -> Settings:
    """Muat pengaturan. Parameter `environ` dipakai tes agar tidak menyentuh .env asli."""
    if environ is None:
        load_dotenv()
        environ = os.environ

    app_env = environ.get("APP_ENV", "development").strip().lower()
    if app_env not in VALID_ENVS:
        raise ConfigError(
            f"APP_ENV '{app_env}' tidak valid. Pilih salah satu: {', '.join(sorted(VALID_ENVS))}."
        )

    return Settings(
        app_env=app_env,
        app_host=environ.get("APP_HOST", "localhost"),
        app_port=_positive_int(environ, "APP_PORT", 8000),
        window_width=_positive_int(environ, "APP_WINDOW_WIDTH", 1280),
        window_height=_positive_int(environ, "APP_WINDOW_HEIGHT", 800),
        supabase_url=_clean(environ.get("SUPABASE_URL")),
        supabase_anon_key=_clean(environ.get("SUPABASE_ANON_KEY")),
        timezone=_clean(environ.get("APP_TIMEZONE")) or DEFAULT_TIMEZONE,
        session_ttl_hours=_positive_int(environ, "SESSION_TTL_HOURS", 8),
        remember_session_ttl_hours=_positive_int(
            environ, "REMEMBER_SESSION_TTL_HOURS", 168
        ),
    )
