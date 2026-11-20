"""Pembacaan konfigurasi aplikasi dari environment variable (.env)."""

import os
from dataclasses import dataclass
from typing import Mapping

from dotenv import load_dotenv

from backend.core.errors import ConfigError

VALID_ENVS = {"development", "test", "production"}


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

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

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

    try:
        return Settings(
            app_env=app_env,
            app_host=environ.get("APP_HOST", "localhost"),
            app_port=int(environ.get("APP_PORT", "8000")),
            window_width=int(environ.get("APP_WINDOW_WIDTH", "1280")),
            window_height=int(environ.get("APP_WINDOW_HEIGHT", "800")),
            supabase_url=_clean(environ.get("SUPABASE_URL")),
            supabase_anon_key=_clean(environ.get("SUPABASE_ANON_KEY")),
        )
    except ValueError as exc:
        raise ConfigError("APP_PORT / ukuran jendela harus berupa angka.") from exc