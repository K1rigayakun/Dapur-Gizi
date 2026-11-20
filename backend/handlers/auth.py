"""Handler autentikasi (INTEGRATION.md — Grup A)."""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container


@eel.expose
@safe_handler
def auth_login(payload=None):
    return container().auth.login(as_payload(payload))


@eel.expose
@safe_handler
def auth_logout(payload=None):
    return container().auth.logout()


@eel.expose
@safe_handler
def auth_get_session(payload=None):
    return container().auth.get_session()


@eel.expose
@safe_handler
def auth_reset_password(payload=None):
    return container().auth.reset_password(as_payload(payload))
