"""Handler produksi harian (INTEGRATION.md — Grup E).

Logika domain berada pada ``backend/services/production.py`` (Wiliam).
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access, require_session

SERVICE = "production"


@eel.expose
@safe_handler
def production_list(payload=None):
    require_session()
    return domain_service(SERVICE).list(as_payload(payload))


@eel.expose
@safe_handler
def production_create(payload=None):
    require_access("edit_production")
    return domain_service(SERVICE).create(as_payload(payload))


@eel.expose
@safe_handler
def production_update(payload=None):
    require_access("edit_production")
    return domain_service(SERVICE).update(as_payload(payload))
