"""Handler menu & gizi (INTEGRATION.md — Grup D).

Logika domain berada pada ``backend/services/menus.py`` (Wiliam).
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access, require_session

SERVICE = "menus"


@eel.expose
@safe_handler
def menus_list(payload=None):
    require_session()
    return domain_service(SERVICE).list(as_payload(payload))


@eel.expose
@safe_handler
def menus_create(payload=None):
    require_access("manage_menus")
    return domain_service(SERVICE).create(as_payload(payload))


@eel.expose
@safe_handler
def menus_update(payload=None):
    require_access("manage_menus")
    return domain_service(SERVICE).update(as_payload(payload))


@eel.expose
@safe_handler
def menus_submit_for_review(payload=None):
    require_access("manage_menus")
    return domain_service(SERVICE).submit_for_review(as_payload(payload))


@eel.expose
@safe_handler
def menus_review(payload=None):
    require_access("approve_menu")
    return domain_service(SERVICE).review(as_payload(payload))


@eel.expose
@safe_handler
def menus_reorder(payload=None):
    require_access("manage_menus")
    return domain_service(SERVICE).reorder(as_payload(payload))
