"""Fixture bersama untuk unit test backend DapurGizi.

Test tidak pernah menyentuh Supabase. Repository in-memory dan provider
autentikasi palsu disuntikkan melalui container.
"""

from __future__ import annotations

from typing import Any

import pytest

from backend.auth.provider import InMemoryAuthProvider
from backend.core.config import load_settings
from backend.core.container import AppContainer, reset_container, set_container
from backend.database.memory import InMemoryRepository

BUDGET_PARAMETER_ID = "param-test-1"


def base_tables() -> dict[str, list[dict[str, Any]]]:
    return {
        "app_users": [
            {
                "id": "user-kepala",
                "email": "kepala@example.test",
                "full_name": "Kepala Uji",
                "role": "Kepala SPPG",
                "status": "Aktif",
                "phone": "000",
                "unit_code": "TEST-01",
                "last_login": None,
            },
            {
                "id": "user-gizi",
                "email": "gizi@example.test",
                "full_name": "Gizi Uji",
                "role": "Pengawas Gizi",
                "status": "Aktif",
                "phone": "001",
                "unit_code": "TEST-01",
                "last_login": None,
            },
            {
                "id": "user-keuangan",
                "email": "keuangan@example.test",
                "full_name": "Keuangan Uji",
                "role": "Pengawas Keuangan",
                "status": "Aktif",
                "phone": "002",
                "unit_code": "TEST-01",
                "last_login": None,
            },
            {
                "id": "user-sanitasi",
                "email": "sanitasi@example.test",
                "full_name": "Sanitasi Uji",
                "role": "Pengawas Sanitasi",
                "status": "Aktif",
                "phone": "003",
                "unit_code": "TEST-01",
                "last_login": None,
            },
            {
                "id": "user-nonaktif",
                "email": "nonaktif@example.test",
                "full_name": "Nonaktif Uji",
                "role": "Pengawas Gizi",
                "status": "Nonaktif",
                "phone": None,
                "unit_code": "TEST-01",
                "last_login": None,
            },
        ],
        "app_settings": [
            {
                "id": "settings-test-1",
                "unit_code": "TEST-01",
                "unit_name": "Unit Uji",
                "head_name": "Kepala Uji",
                "city": "Kota Uji",
                "enable_sound_alerts": True,
                "enable_desktop_toast": True,
                "auto_refresh_interval_sec": 60,
                "default_shift_start": "03:00 WIB",
            }
        ],
        "budget_parameters": [
            {
                "id": BUDGET_PARAMETER_ID,
                "config_label": "DEMO — Parameter Uji",
                "reference_source": "DEMO-TEST: bukan ketentuan resmi",
                "effective_date": "2026-11-01",
                "monthly_allocation_ceiling": 1_150_000_000,
                "standard_food_cost_ceiling_per_portion": 10_000,
                "standard_operational_cost_ceiling_per_portion": 2_100,
                "daily_facility_incentive_rate": 6_000_000,
                "target_daily_portions_baseline": 300,
                "effective_service_days_in_month": 22,
                "warning_threshold_percent": 92,
                "is_demo_config": True,
                "is_active": True,
            }
        ],
        "beneficiaries": [
            {"id": "b1", "full_name": "A", "category": "Siswa SD", "institution": "S1", "status": "Aktif"},
            {"id": "b2", "full_name": "B", "category": "Siswa SMP", "institution": "S1", "status": "Aktif"},
            {"id": "b3", "full_name": "C", "category": "Balita", "institution": "P1", "status": "Nonaktif"},
        ],
        "menus": [
            {"id": "m1", "menu_date": "2026-11-12", "day_name": "Rabu", "name": "Menu 1", "status": "Menunggu Persetujuan", "order_index": 1},
            {"id": "m2", "menu_date": "2026-11-11", "day_name": "Selasa", "name": "Menu 2", "status": "Disetujui", "order_index": 2},
        ],
        "production_batches": [
            {
                "id": "p1",
                "production_date": "2026-11-11",
                "day_label": "Selasa",
                "batch_code": "B-1",
                "menu_name": "Menu 2",
                "planned_portions": 300,
                "actual_portions": 300,
                "qc_passed_portions": 300,
                "food_cost_total": 3_000_000,
                "operational_cost_total": 630_000,
                "is_effective_service_day": True,
                "status": "Selesai",
                "timeline": [],
            },
            {
                "id": "p2",
                "production_date": "2026-11-12",
                "day_label": "Rabu",
                "batch_code": "B-2",
                "menu_name": "Menu 1",
                "planned_portions": 400,
                "actual_portions": 300,
                "qc_passed_portions": 300,
                "food_cost_total": 3_000_000,
                "operational_cost_total": 630_000,
                "is_effective_service_day": True,
                "status": "Sedang Berjalan",
                "timeline": [{"time": "03:00 WIB", "stage": "Awal", "done": True}],
            },
        ],
        "distribution_routes": [
            {
                "id": "d1",
                "route_code": "R-1",
                "distribution_date": "2026-11-12",
                "destination_name": "Sekolah 1",
                "dispatched_portions": 150,
                "received_portions": 150,
                "status": "Diterima",
                "eta_time": "07:15 WIB",
            },
            {
                "id": "d2",
                "route_code": "R-2",
                "distribution_date": "2026-11-12",
                "destination_name": "Sekolah 2",
                "dispatched_portions": 145,
                "received_portions": 0,
                "status": "Siap Kirim",
                "eta_time": "08:30 WIB",
            },
        ],
        "hygiene_checklists": [
            {"id": "h1", "checklist_date": "2026-11-12", "inspector_name": "Petugas", "score_percent": 50}
        ],
        "hygiene_items": [
            {"id": "hi1", "checklist_id": "h1", "item_code": "HYG-01", "area": "A", "parameter": "P1", "checked": True, "notes": ""},
            {"id": "hi2", "checklist_id": "h1", "item_code": "HYG-02", "area": "B", "parameter": "P2", "checked": False, "notes": "Belum"},
        ],
        "slhs_certificates": [
            {"id": "s1", "certificate_number": "C-1", "document_name": "Sertifikat", "issued_by": "X", "issue_date": "2026-01-01", "expiry_date": "2026-12-01", "status": "Aktif"}
        ],
        "notifications": [
            {"id": "n1", "title": "Notif 1", "message": "M1", "category": "Distribusi", "related_route": "distribution", "is_read": False, "occurred_at": "2026-11-12T07:24:00+07:00"},
            {"id": "n2", "title": "Notif 2", "message": "M2", "category": "Menu & Gizi", "related_route": "menus", "is_read": True, "occurred_at": "2026-11-12T04:55:00+07:00"},
        ],
    }


@pytest.fixture(autouse=True)
def _reset_container():
    reset_container()
    yield
    reset_container()


@pytest.fixture
def settings():
    return load_settings({"APP_ENV": "test"})


@pytest.fixture
def repository() -> InMemoryRepository:
    return InMemoryRepository(base_tables())


@pytest.fixture
def auth_provider() -> InMemoryAuthProvider:
    provider = InMemoryAuthProvider()
    provider.add_user(
        "kepala@example.test", "secret123", id="user-kepala",
        full_name="Kepala Uji", role="Kepala SPPG", unit_code="TEST-01",
        phone="000", status="Aktif",
    )
    provider.add_user(
        "gizi@example.test", "secret123", id="user-gizi",
        full_name="Gizi Uji", role="Pengawas Gizi", unit_code="TEST-01", status="Aktif",
    )
    provider.add_user(
        "keuangan@example.test", "secret123", id="user-keuangan",
        full_name="Keuangan Uji", role="Pengawas Keuangan", unit_code="TEST-01", status="Aktif",
    )
    provider.add_user(
        "sanitasi@example.test", "secret123", id="user-sanitasi",
        full_name="Sanitasi Uji", role="Pengawas Sanitasi", unit_code="TEST-01", status="Aktif",
    )
    provider.add_user(
        "nonaktif@example.test", "secret123", id="user-nonaktif",
        full_name="Nonaktif Uji", role="Pengawas Gizi", unit_code="TEST-01", status="Nonaktif",
    )
    return provider


@pytest.fixture
def container(settings, repository, auth_provider) -> AppContainer:
    instance = AppContainer(
        settings, repository=repository, auth_provider=auth_provider
    )
    set_container(instance)
    return instance


def login(container: AppContainer, email: str = "kepala@example.test", password: str = "secret123"):
    return container.auth.login({"email": email, "password": password, "remember": False})
