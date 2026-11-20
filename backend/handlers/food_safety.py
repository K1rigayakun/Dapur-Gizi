"""Handler keamanan pangan (INTEGRATION.md — Grup H).

Logika domain berada pada ``backend/services/food_safety.py`` (Visel).
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access, require_session

SERVICE = "food_safety"


@eel.expose
@safe_handler
def hygiene_get_checklist(payload=None):
    require_session()
    return domain_service(SERVICE).get_checklist(as_payload(payload))


@eel.expose
@safe_handler
def hygiene_save_checklist(payload=None):
    require_access("edit_hygiene")
    return domain_service(SERVICE).save_checklist(as_payload(payload))


@eel.expose
@safe_handler
def slhs_list(payload=None):
    require_session()
    return domain_service(SERVICE).list_slhs(as_payload(payload))


@eel.expose
@safe_handler
def incidents_create(payload=None):
    require_access("edit_hygiene")
    return domain_service(SERVICE).create_incident(as_payload(payload))


@eel.expose
@safe_handler
def food_waste_create(payload=None):
    require_access("edit_hygiene")
    return domain_service(SERVICE).create_food_waste(as_payload(payload))
