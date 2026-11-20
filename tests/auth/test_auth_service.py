"""Test service autentikasi dengan provider in-memory."""

from __future__ import annotations

import pytest

from backend.core.container import AppContainer


def login(container: AppContainer, email: str = "kepala@example.test", password: str = "secret123"):
    return container.auth.login({"email": email, "password": password, "remember": False})


def test_login_success_returns_safe_user(container):
    data = login(container)
    assert data["isDemo"] is False
    assert data["user"] == {
        "id": "user-kepala",
        "name": "Kepala Uji",
        "email": "kepala@example.test",
        "role": "Kepala SPPG",
        "unit": "TEST-01",
        "phone": "000",
    }
    assert "password" not in str(data).lower()
    assert "token" not in str(data).lower()
    assert container.sessions.current() is not None


def test_login_updates_last_login(container, repository):
    login(container)
    rows = repository.select("app_users", filters={"id": "user-kepala"})
    assert rows[0]["last_login"] is not None


def test_login_wrong_password(container):
    with pytest.raises(PermissionError):
        login(container, password="salah")


def test_login_inactive_account_rejected(container):
    with pytest.raises(PermissionError):
        login(container, email="nonaktif@example.test")


def test_login_requires_email_and_password(container):
    with pytest.raises(ValueError):
        container.auth.login({"email": "", "password": ""})
    with pytest.raises(ValueError):
        container.auth.login({"email": "kepala@example.test", "password": ""})


def test_get_session_without_login_is_none(container):
    assert container.auth.get_session() is None


def test_logout_clears_session(container):
    login(container)
    assert container.auth.logout() == {"loggedOut": True}
    assert container.auth.get_session() is None


def test_logout_is_idempotent(container):
    assert container.auth.logout() == {"loggedOut": True}


def test_reset_password_never_reveals_account_existence(container):
    known = container.auth.reset_password({"email": "kepala@example.test"})
    unknown = container.auth.reset_password({"email": "tidak-ada@example.test"})
    assert known == unknown
    assert "terdaftar" in known["message"]


def test_reset_password_requires_email(container):
    with pytest.raises(ValueError):
        container.auth.reset_password({"email": ""})


def test_change_password_requires_session(container):
    with pytest.raises(PermissionError):
        container.auth.change_password(
            {"currentPassword": "secret123", "newPassword": "baru12345"}
        )


def test_change_password_flow(container):
    login(container)
    result = container.auth.change_password(
        {"currentPassword": "secret123", "newPassword": "baru12345"}
    )
    assert result["updated"] is True
    assert "baru12345" not in result["message"]

    container.auth.logout()
    with pytest.raises(PermissionError):
        login(container, password="secret123")
    assert login(container, password="baru12345")["user"]["id"] == "user-kepala"


def test_change_password_validation(container):
    login(container)
    with pytest.raises(ValueError):
        container.auth.change_password(
            {"currentPassword": "secret123", "newPassword": "123"}
        )
    with pytest.raises(ValueError):
        container.auth.change_password(
            {"currentPassword": "secret123", "newPassword": "secret123"}
        )
    with pytest.raises(ValueError):
        container.auth.change_password(
            {"currentPassword": "", "newPassword": "baru12345"}
        )
