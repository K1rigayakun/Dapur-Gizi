"""DapurGizi Application Entrypoint.

Minimal Eel desktop shell for the DapurGizi SPPG Management System.
Business modules are registered separately during feature development.
"""

import os
import sys
from pathlib import Path
from typing import Any

import eel
from dotenv import load_dotenv

from backend import create_response


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
    """Initialize Eel web directory and launch the desktop window."""
    load_dotenv()

    web_dir = get_resource_path("web")
    eel.init(web_dir)

    host = os.getenv("APP_HOST", "localhost")
    port = int(os.getenv("APP_PORT", "8000"))
    width = int(os.getenv("APP_WINDOW_WIDTH", "1280"))
    height = int(os.getenv("APP_WINDOW_HEIGHT", "800"))

    eel.start(
        "index.html",
        host=host,
        port=port,
        size=(width, height),
    )


if __name__ == "__main__":
    start_app()
