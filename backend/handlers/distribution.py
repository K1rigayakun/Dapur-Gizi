"""Handler distribusi (INTEGRATION.md — Grup G).

Logika domain berada pada ``backend/services/distribution.py`` (Visel).
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access, require_session

SERVICE = "distribution"


@eel.expose
@safe_handler
def distributions_list(payload=None):
    require_session()
    return domain_service(SERVICE).list(as_payload(payload))


@eel.expose
@safe_handler
def distributions_create(payload=None):
    require_access("manage_distribution")
    return domain_service(SERVICE).create(as_payload(payload))


@eel.expose
@safe_handler
def distributions_update(payload=None):
    require_access("manage_distribution")
    return domain_service(SERVICE).update(as_payload(payload))


@eel.expose
@safe_handler
def distributions_confirm_receipt(payload=None):
    require_access("confirm_distribution")
    return domain_service(SERVICE).confirm_receipt(as_payload(payload))
