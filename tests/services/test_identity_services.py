"""Test service pengguna, notifikasi, dan pengaturan."""

from __future__ import annotations

import pytest

from backend.services.budget import BudgetService
from backend.services.identity import (
    NotificationsService,
    SettingsService,
    UsersService,
)


@pytest.fixture
def users(repository) -> UsersService:
    return UsersService(repository)


@pytest.fixture
def notifications(repository) -> NotificationsService:
    return NotificationsService(repository)


@pytest.fixture
def settings(repository) -> SettingsService:
    return SettingsService(repository, BudgetService(repository))


# -- pengguna ---------------------------------------------------------
def test_list_users_maps_camel_case(users):
    items = users.list()["items"]
    assert len(items) == 5
    kepala = next(item for item in items if item["id"] == "user-kepala")
    assert kepala["name"] == "Kepala Uji"
    assert kepala["unit"] == "TEST-01"
    assert "password" not in kepala


def test_create_user(users):
    created = users.create(
        {
            "name": "Pengguna Baru",
            "email": "baru@example.test",
            "role": "Pengawas Gizi",
            "phone": "0812",
            "status": "Aktif",
        },
        actor="user-kepala",
    )
    assert created["name"] == "Pengguna Baru"
    assert created["email"] == "baru@example.test"


def test_create_user_rejects_duplicate_email(users):
    with pytest.raises(ValueError):
        users.create(
            {
                "name": "Duplikat",
                "email": "KEPALA@example.test",
                "role": "Pengawas Gizi",
                "status": "Aktif",
            }
        )


def test_create_user_rejects_unknown_role(users):
    with pytest.raises(ValueError):
        users.create(
            {
                "name": "X",
                "email": "x@example.test",
                "role": "Super Admin",
                "status": "Aktif",
            }
        )


def test_create_user_rejects_invalid_email(users):
    with pytest.raises(ValueError):
        users.create(
            {
                "name": "X",
                "email": "bukan-email",
                "role": "Pengawas Gizi",
                "status": "Aktif",
            }
        )


def test_update_user_role_and_status(users):
    updated = users.update(
        {"id": "user-gizi", "role": "Pengawas Keuangan", "status": "Nonaktif"},
        actor="user-kepala",
    )
    assert updated["role"] == "Pengawas Keuangan"
    assert updated["status"] == "Nonaktif"


def test_update_user_rejects_email_change(users):
    with pytest.raises(ValueError):
        users.update({"id": "user-gizi", "email": "lain@example.test"})


def test_update_missing_user(users):
    with pytest.raises(LookupError):
        users.update({"id": "tidak-ada", "name": "X"})


def test_update_without_changes_rejected(users):
    with pytest.raises(ValueError):
        users.update({"id": "user-gizi"})


# -- notifikasi -------------------------------------------------------
def test_notifications_list_and_unread_count(notifications):
    result = notifications.list()
    assert len(result["items"]) == 2
    assert result["unreadCount"] == 1
    assert result["items"][0]["timestamp"] == "2026-11-12T07:24:00+07:00"


def test_mark_single_notification_read(notifications):
    result = notifications.mark_read({"id": "n1"})
    assert result["unreadCount"] == 0
    assert all(item["read"] for item in result["items"])


def test_mark_all_read(notifications):
    result = notifications.mark_read({"markAll": True})
    assert result["unreadCount"] == 0


def test_mark_unknown_notification(notifications):
    with pytest.raises(LookupError):
        notifications.mark_read({"id": "tidak-ada"})


def test_mark_without_id(notifications):
    with pytest.raises(ValueError):
        notifications.mark_read({})


# -- pengaturan -------------------------------------------------------
def test_settings_get(settings):
    result = settings.get()
    assert result["settings"]["unitName"] == "Unit Uji"
    assert result["budgetParameters"]["configLabel"].startswith("DEMO")


def test_settings_update_general(settings):
    result = settings.update(
        {"settings": {"unitName": "Unit Baru", "autoRefreshIntervalSec": 120}},
        actor="user-kepala",
    )
    assert result["settings"]["unitName"] == "Unit Baru"
    assert result["settings"]["autoRefreshIntervalSec"] == 120


def test_settings_update_rejects_invalid_boolean(settings):
    with pytest.raises(ValueError):
        settings.update({"settings": {"enableSoundAlerts": "ya"}})


def test_settings_update_rejects_out_of_range_interval(settings):
    with pytest.raises(ValueError):
        settings.update({"settings": {"autoRefreshIntervalSec": 1}})


def test_settings_update_budget_parameters(settings):
    result = settings.update(
        {"budgetParameters": {"standardFoodCostCeilingPerPortion": 9500}},
        actor="user-keuangan",
    )
    assert result["budgetParameters"]["standardFoodCostCeilingPerPortion"] == 9500


def test_settings_update_empty_payload(settings):
    with pytest.raises(ValueError):
        settings.update({})


def test_settings_missing_row():
    from backend.database.memory import InMemoryRepository

    repo = InMemoryRepository()
    service = SettingsService(repo, BudgetService(repo))
    with pytest.raises(LookupError):
        service.get()
