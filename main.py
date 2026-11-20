"""DapurGizi Application Entrypoint.

Eel desktop shell for the DapurGizi SPPG Management System.
Semua handler domain didaftarkan oleh ``backend.handlers.register_all()``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import eel

from backend import create_response
from backend.core.config import load_settings
from backend.core.logging_setup import get_logger
from backend.handlers import register_all

APP_VERSION = "0.2.0-backend-platform"


def get_resource_path(relative_path: str) -> str:
    """Resolve resource path for both development and PyInstaller bundle."""
    base_path = getattr(sys, "_MEIPASS", os.path.abspath(os.path.dirname(__file__)))
    return str(Path(base_path) / relative_path)


@eel.expose
def get_app_status() -> dict[str, Any]:
    """Return minimal application shell readiness status."""
    settings = load_settings()
    return create_response(
        success=True,
        data={
            "app_name": "DapurGizi",
            "app_version": APP_VERSION,
            "status": "ready",
            "environment": settings.app_env,
            "supabaseConfigured": bool(
                settings.supabase_url and settings.supabase_anon_key
            ),
        },
        error=None,
    )


def start_app() -> None:
    settings = load_settings()
    log = get_logger()
    log.info(
        "Memulai DapurGizi %s (env=%s, eel=%s)",
        APP_VERSION,
        settings.app_env,
        os.getenv("APP_ENV", settings.app_env),
    )

    register_all()
    log.info("Handler Eel terdaftar: %d", len(eel._exposed_functions))

    if not (settings.supabase_url and settings.supabase_anon_key):
        log.warning(
            "SUPABASE_URL / SUPABASE_ANON_KEY belum diisi. Login dan data "
            "operasional akan gagal dengan pesan konfigurasi; Mode Demo "
            "frontend tetap dapat digunakan tanpa backend."
        )

    eel.init(get_resource_path("web"))
    eel.start(
        "index.html",
        host=settings.app_host,
        port=settings.app_port,
        size=(settings.window_width, settings.window_height),
    )


if __name__ == "__main__":
    start_app()
