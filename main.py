"""DapurGizi Application Entrypoint.

Minimal Eel desktop shell for the DapurGizi SPPG Management System.
Business modules are registered separately during feature development.
"""

import os
import sys
from pathlib import Path
from typing import Any

import eel

from backend import create_response
from backend.core.config import load_settings
from backend.core.logging_setup import get_logger
from backend.handlers import register_all


def get_resource_path(relative_path: str) -> str:
    """Resolve resource path for both development and PyInstaller bundle."""
    base_path = getattr(sys, "_MEIPASS", os.path.abspath(os.path.dirname(__file__)))
    return str(Path(base_path) / relative_path)


@eel.expose
def get_app_status() -> dict[str, Any]:
    """Return minimal application shell readiness status."""
    return create_response(
        success=True,
        data={
            "app_name": "DapurGizi",
            "status": "ready",
            "environment": os.getenv("APP_ENV", "development"),
        },
        error=None,
    )


def start_app() -> None:
    settings = load_settings()
    log = get_logger()
    log.info("Memulai DapurGizi (env=%s)", settings.app_env)

    register_all()
    eel.init(get_resource_path("web"))
    eel.start(
        "index.html",
        host=settings.app_host,
        port=settings.app_port,
        size=(settings.window_width, settings.window_height),
    )


if __name__ == "__main__":
    start_app()