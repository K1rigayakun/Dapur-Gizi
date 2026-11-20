"""Test kontrak handler Eel: registrasi, amplop, sesi, izin, dan integrasi service."""

from __future__ import annotations

import eel
import pytest

from backend.handlers import register_all

EXPECTED_FUNCTIONS = {
    # A. Auth
    "auth_login",
    "auth_logout",
    "auth_get_session",
    "auth_reset_password",
    # B. Dashboard
    "dashboard_get_summary",
    # C. Beneficiaries
    "beneficiaries_list",
    "beneficiaries_create",
    "beneficiaries_update",
    "beneficiaries_delete",
    "beneficiaries_import",
    # D. Menus
    "menus_list",
    "menus_create",
    "menus_update",
    "menus_submit_for_review",
    "menus_review",
    "menus_reorder",
    # E. Production
    "production_list",
    "production_create",
    "production_update",
    # F. Budget
    "budget_get_summary",
    "budget_calculate",
    "budget_get_parameters",
    "budget_update_parameters",
    # G. Distribution
    "distributions_list",
    "distributions_create",
    "distributions_update",
    "distributions_confirm_receipt",
    # H. Food safety
    "hygiene_get_checklist",
    "hygiene_save_checklist",
    "slhs_list",
    "incidents_create",
    "food_waste_create",
    # I. Reports
    "reports_generate",
    "reports_export",
    # J. Users
    "users_list",
    "users_create",
    "users_update",
    "users_change_password",
    # K. Notifications
    "notifications_list",
    "notifications_mark_read",
    # L. Settings
    "settings_get",
    "settings_update",
}


@pytest.fixture(autouse=True)
def _registered():
    register_all()


def _call(name: str, payload=None):
    return eel._exposed_functions[name](payload)


def _login(container, email="kepala@example.test", password="secret123"):
    return container.auth.login({"email": email, "password": password, "remember": False})


def test_all_contract_functions_registered():
    registered = set(eel._exposed_functions)
    missing = EXPECTED_FUNCTIONS - registered
    assert not missing, f"Fungsi belum terdaftar: {sorted(missing)}"


def test_every_handler_returns_valid_envelope(container):
    for name in sorted(EXPECTED_FUNCTIONS):
        result = _call(name, {})
        assert isinstance(result, dict), name
        assert set(result) == {"success", "data", "error"}, name
        assert isinstance(result["success"], bool), name
        assert result["data"] is None or isinstance(result["data"], (dict, list)), name
        assert result["error"] is None or isinstance(result["error"], str), name


def test_protected_handler_requires_session(container):
    result = _call("beneficiaries_list", {})
    assert result["success"] is False
    assert "Sesi" in result["error"]


def test_login_handler_success(container):
    result = _call(
        "auth_login",
        {"email": "kepala@example.test", "password": "secret123", "remember": False},
    )
    assert result["success"] is True
    assert result["data"]["user"]["role"] == "Kepala SPPG"


def test_session_handler_reflects_server_state(container):
    assert _call("auth_get_session", {})["data"] is None
    _login(container)
    data = _call("auth_get_session", {})["data"]
    assert data["user"]["id"] == "user-kepala"


def test_session_is_not_trusted_from_payload(container):
    # Payload berisi data user palsu harus diabaikan.
    result = _call("auth_get_session", {"user": {"id": "palsu", "role": "Kepala SPPG"}})
    assert result["data"] is None


def test_domain_service_pending_returns_honest_error(container):
    _login(container)
    result = _call("beneficiaries_list", {})
    assert result["success"] is False
    assert "belum tersedia" in result["error"]
    assert result["data"] is None


def test_handler_passes_payload_to_domain_service(container):
    _login(container)

    class FakeBeneficiaries:
        def list(self, payload):
            return {"items": [], "received": payload}

    container.services.override("beneficiaries", FakeBeneficiaries())
    result = _call("beneficiaries_list", {"search": "ani"})
    assert result["success"] is True
    assert result["data"]["received"] == {"search": "ani"}


def test_domain_service_value_error_maps_to_envelope(container):
    _login(container)

    class FailingMenus:
        def create(self, payload):
            raise ValueError("Nama menu wajib diisi.")

    container.services.override("menus", FailingMenus())
    result = _call("menus_create", {})
    assert result["success"] is False
    assert result["error"] == "Nama menu wajib diisi."


def test_budget_handlers_work_end_to_end(container):
    _login(container)
    summary = _call("budget_get_summary", {})
    assert summary["success"] is True
    assert summary["data"]["summary"]["totalActualPortions"] == 600

    params = _call("budget_get_parameters", {})
    assert params["data"]["monthlyAllocationCeiling"] == 1_150_000_000

    calc = _call("budget_calculate", {"servedPortions": 10, "daysCount": 1})
    assert calc["success"] is True
    assert calc["data"]["foodTotal"] == 100_000


def test_budget_update_requires_permission(container):
    _login(container, email="gizi@example.test")
    result = _call("budget_update_parameters", {"standardFoodCostCeilingPerPortion": 9000})
    assert result["success"] is False
    assert "izin" in result["error"]


def test_finance_role_can_update_budget(container):
    _login(container, email="keuangan@example.test")
    result = _call("budget_update_parameters", {"standardFoodCostCeilingPerPortion": 9000})
    assert result["success"] is True
    assert result["data"]["standardFoodCostCeilingPerPortion"] == 9000


def test_users_list_requires_kepala(container):
    _login(container, email="gizi@example.test")
    assert _call("users_list", {})["success"] is False

    _login(container, email="kepala@example.test")
    result = _call("users_list", {})
    assert result["success"] is True
    assert len(result["data"]["items"]) == 5


def test_hygiene_write_requires_sanitation_role(container):
    _login(container, email="gizi@example.test")
    denied = _call("hygiene_save_checklist", {"itemId": "x", "checked": True})
    assert denied["success"] is False
    assert "izin" in denied["error"]

    _login(container, email="sanitasi@example.test")
    allowed = _call("hygiene_save_checklist", {"itemId": "x", "checked": True})
    # Lolos RBAC; service Visel belum tersedia pada branch ini.
    assert allowed["success"] is False
    assert "belum tersedia" in allowed["error"]


def test_settings_update_permission_per_section(container):
    _login(container, email="keuangan@example.test")

    denied = _call("settings_update", {"settings": {"unitName": "X"}})
    assert denied["success"] is False
    assert "izin" in denied["error"]

    allowed = _call(
        "settings_update", {"budgetParameters": {"warningThresholdPercent": 90}}
    )
    assert allowed["success"] is True
    assert allowed["data"]["budgetParameters"]["warningThresholdPercent"] == 90


def test_dashboard_handler_returns_computed_data(container):
    _login(container)
    result = _call("dashboard_get_summary", {"date": "2026-11-12"})
    assert result["success"] is True
    assert result["data"]["kpis"]["totalPortionsToday"] == 300


def test_notifications_handlers(container):
    _login(container)
    listing = _call("notifications_list", {})
    assert listing["data"]["unreadCount"] == 1
    marked = _call("notifications_mark_read", {"markAll": True})
    assert marked["data"]["unreadCount"] == 0


def test_users_change_password_handles_self_service(container):
    _login(container, email="gizi@example.test")
    result = _call(
        "users_change_password",
        {"currentPassword": "secret123", "newPassword": "gizi12345"},
    )
    assert result["success"] is True
    assert result["data"]["updated"] is True
