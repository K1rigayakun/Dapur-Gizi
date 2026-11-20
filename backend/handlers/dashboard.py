"""Handler dashboard (INTEGRATION.md — Grup B)."""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container, require_session


@eel.expose
@safe_handler
def dashboard_get_summary(payload=None):
    require_session()
    return container().dashboard.get_summary(as_payload(payload))
