"""Test sesi server-side."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from backend.auth.session import AuthUser, SessionStore


def _user() -> AuthUser:
    return AuthUser(
        id="u1", name="Uji", email="uji@example.test", role="Kepala SPPG"
    )


def test_session_starts_and_returns_api_shape():
    store = SessionStore(ttl_hours=8)
    session = store.start(_user(), access_token="token", remembered=False)
    assert store.current() is session
    payload = session.to_api()
    assert payload["user"]["id"] == "u1"
    assert payload["isDemo"] is False
    assert "access_token" not in payload
    assert "token" not in payload


def test_expired_session_is_rejected():
    store = SessionStore()
    store.start(
        _user(),
        expires_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    assert store.current() is None
    with pytest.raises(PermissionError):
        store.require()


def test_require_without_session_raises():
    with pytest.raises(PermissionError):
        SessionStore().require()


def test_clear_removes_session():
    store = SessionStore()
    store.start(_user())
    store.clear()
    assert store.current() is None


def test_remember_uses_longer_ttl():
    store = SessionStore(ttl_hours=8, remember_ttl_hours=168)
    short = store.start(_user(), remembered=False)
    short_delta = short.expires_at - datetime.now(timezone.utc)
    store.clear()
    long = store.start(_user(), remembered=True)
    long_delta = long.expires_at - datetime.now(timezone.utc)
    assert long_delta > short_delta
