"""Handler manajemen pengguna (INTEGRATION.md — Grup J)."""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container, require_access


@eel.expose
@safe_handler
def users_list(payload=None):
    require_access("manage_users")
    return container().users.list(as_payload(payload))


@eel.expose
@safe_handler
def users_create(payload=None):
    session = require_access("manage_users")
    return container().users.create(as_payload(payload), actor=session.user.id)


@eel.expose
@safe_handler
def users_update(payload=None):
    session = require_access("manage_users")
    return container().users.update(as_payload(payload), actor=session.user.id)


@eel.expose
@safe_handler
def users_change_password(payload=None):
    # Setiap pengguna boleh mengubah kata sandinya sendiri.
    return container().auth.change_password(as_payload(payload))
