"""Handler pengaturan sistem (INTEGRATION.md — Grup L)."""

from __future__ import annotations

import eel

from backend.auth.rbac import require_permission
from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container, require_session


@eel.expose
@safe_handler
def settings_get(payload=None):
    require_session()
    return container().settings_service.get(as_payload(payload))


@eel.expose
@safe_handler
def settings_update(payload=None):
    session = require_session()
    data = as_payload(payload)

    # Izin diperiksa per bagian: pengaturan umum vs parameter anggaran.
    if data.get("settings") is not None:
        require_permission(session.user.role, "manage_settings")
    if data.get("budgetParameters") is not None:
        require_permission(session.user.role, "configure_budget")
    if data.get("settings") is None and data.get("budgetParameters") is None:
        raise ValueError("Tidak ada pengaturan yang dikirim untuk diperbarui.")

    return container().settings_service.update(data, actor=session.user.id)
