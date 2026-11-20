"""Handler laporan & ekspor (INTEGRATION.md — Grup I).

Logika domain berada pada ``backend/services/reports.py`` (Visel).
"""

from __future__ import annotations

import eel

from backend.core.responses import safe_handler
from backend.handlers._deps import as_payload, domain_service, require_access

SERVICE = "reports"


@eel.expose
@safe_handler
def reports_generate(payload=None):
    require_access("export_reports")
    return domain_service(SERVICE).generate(as_payload(payload))


@eel.expose
@safe_handler
def reports_export(payload=None):
    require_access("export_reports")
    return domain_service(SERVICE).export(as_payload(payload))
