"""Handler sistem: pemeriksaan kesehatan backend."""

import eel

from backend.core.config import load_settings
from backend.core.responses import safe_handler


@eel.expose
@safe_handler
def system_health(payload=None):
    settings = load_settings()
    return {
        "environment": settings.app_env,
        "supabaseConfigured": bool(settings.supabase_url and settings.supabase_anon_key),
    }