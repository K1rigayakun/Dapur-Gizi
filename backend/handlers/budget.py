"""Handler anggaran & insentif (INTEGRATION.md — Grup F)."""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, container, require_access, require_session


@eel.expose
@safe_handler
def budget_get_summary(payload=None):
    require_session()
    return container().budget.get_summary()


@eel.expose
@safe_handler
def budget_calculate(payload=None):
    require_session()
    return container().budget.calculate(as_payload(payload))


@eel.expose
@safe_handler
def budget_get_parameters(payload=None):
    require_session()
    return container().budget.get_parameters()


@eel.expose
@safe_handler
def budget_update_parameters(payload=None):
    session = require_access("configure_budget")
    return container().budget.update_parameters(
        as_payload(payload), actor=session.user.id
    )
