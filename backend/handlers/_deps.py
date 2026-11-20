"""Dependency bersama untuk handler Eel."""

from __future__ import annotations

from typing import Any

from backend.auth.rbac import require_permission
from backend.auth.session import Session
from backend.core.container import AppContainer, get_container


def container() -> AppContainer:
    return get_container()


def as_payload(payload: Any | None) -> dict[str, Any]:
    """Normalisasi payload Eel: ``None`` menjadi ``{}``.

    Payload non-objek ditolak dengan ``ValueError`` agar handler tidak
    memproses tipe data yang tidak diharapkan.
    """
    if payload is None:
        return {}
    if not isinstance(payload, dict):
        raise ValueError("Payload harus berupa objek JSON.")
    return payload


def require_session() -> Session:
    return container().sessions.require()


def require_access(permission: str) -> Session:
    session = require_session()
    require_permission(session.user.role, permission)
    return session


def domain_service(name: str) -> Any:
    return container().services.get(name)
