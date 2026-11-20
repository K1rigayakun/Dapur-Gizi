"""Handler penerima manfaat (INTEGRATION.md — Grup C).

Logika domain berada pada ``backend/services/beneficiaries.py`` (Wiliam).
Handler hanya memvalidasi bentuk payload, sesi, izin, dan amplop respons.
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access, require_session

SERVICE = "beneficiaries"


@eel.expose
@safe_handler
def beneficiaries_list(payload=None):
    require_session()
    return domain_service(SERVICE).list(as_payload(payload))


@eel.expose
@safe_handler
def beneficiaries_create(payload=None):
    require_access("manage_beneficiaries")
    return domain_service(SERVICE).create(as_payload(payload))


@eel.expose
@safe_handler
def beneficiaries_update(payload=None):
    require_access("manage_beneficiaries")
    return domain_service(SERVICE).update(as_payload(payload))


@eel.expose
@safe_handler
def beneficiaries_delete(payload=None):
    require_access("manage_beneficiaries")
    return domain_service(SERVICE).delete(as_payload(payload))


@eel.expose
@safe_handler
def beneficiaries_import(payload=None):
    require_access("manage_beneficiaries")
    return domain_service(SERVICE).import_records(as_payload(payload))
