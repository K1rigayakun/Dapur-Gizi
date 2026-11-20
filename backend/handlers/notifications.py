"""Handler notifikasi (INTEGRATION.md — Grup K)."""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container, require_session


@eel.expose
@safe_handler
def notifications_list(payload=None):
    require_session()
    return container().notifications.list(as_payload(payload))


@eel.expose
@safe_handler
def notifications_mark_read(payload=None):
    require_session()
    return container().notifications.mark_read(as_payload(payload))
