"""Handler sistem: pemeriksaan kesehatan backend."""

from __future__ import annotations

import eel

from backend.core.config import load_settings
from backend.core.container import DOMAIN_SERVICES, get_container
from backend.core.responses import safe_handler


@eel.expose
@safe_handler
def system_health(payload=None):
    settings = load_settings()

    services: dict[str, bool] = {}
    try:
        registry = get_container().services
    except Exception:  # noqa: BLE001 - diagnostik tidak boleh gagal total
        registry = None
    if registry is not None:
        for name in DOMAIN_SERVICES:
            try:
                services[name] = registry.available(name)
            except Exception:  # noqa: BLE001 - mis. Supabase belum dikonfigurasi
                services[name] = False

    return {
        "environment": settings.app_env,
        "supabaseConfigured": bool(settings.supabase_url and settings.supabase_anon_key),
        "domainServices": services,
    }
