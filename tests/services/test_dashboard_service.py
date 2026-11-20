"""Test agregasi dashboard dari database (bukan angka hardcode)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from backend.database.memory import InMemoryRepository
from backend.services.dashboard import DashboardService


@pytest.fixture
def service(repository) -> DashboardService:
    return DashboardService(repository, timezone_name="Asia/Jakarta")


def test_kpis_computed_from_data(service):
    summary = service.get_summary({"date": "2026-11-12"})
    kpis = summary["kpis"]
    assert kpis["totalPortionsToday"] == 300
    assert kpis["plannedPortionsToday"] == 400
    assert kpis["portionFulfillmentPct"] == 75.0
    assert kpis["activeBeneficiaries"] == 2
    assert kpis["totalRegisteredBeneficiaries"] == 3
    assert kpis["todayIncentive"] == 6_000_000
    assert kpis["isEffectiveServiceDay"] is True
    assert kpis["operationalCostPerPortion"] == 12_100
    assert kpis["costCeilingPerPortion"] == 12_100


def test_distribution_summary(service):
    summary = service.get_summary({"date": "2026-11-12"})
    assert summary["distributionSummary"] == {
        "totalRoutes": 2,
        "totalDispatched": 295,
        "totalReceived": 150,
        "completedRoutes": 1,
    }
    assert len(summary["weeklyDistribution"]) == 2


def test_budget_composition(service):
    composition = service.get_summary({"date": "2026-11-12"})["budgetComposition"]
    assert composition["foodSpent"] == 6_000_000
    assert composition["operationalSpent"] == 1_260_000
    assert composition["incentiveAccrued"] == 12_000_000
    assert composition["totalSpent"] == 19_260_000
    assert composition["monthlyCeiling"] == 1_150_000_000


def test_pending_approvals_and_progress(service):
    summary = service.get_summary({"date": "2026-11-12"})
    assert len(summary["pendingApprovals"]) == 1
    assert summary["pendingApprovals"][0]["status"] == "Menunggu Persetujuan"
    assert summary["operationalProgress"] == [
        {"time": "03:00 WIB", "stage": "Awal", "done": True}
    ]


def test_hygiene_status(service):
    hygiene = service.get_summary({"date": "2026-11-12"})["hygieneStatus"]
    assert hygiene["checkedCount"] == 1
    assert hygiene["totalCount"] == 2
    assert hygiene["scorePct"] == 50
    assert len(hygiene["warnings"]) == 1


def test_expiring_certificate_is_flagged(service, repository):
    soon = (date.today() + timedelta(days=3)).isoformat()
    repository.update("slhs_certificates", "s1", {"expiry_date": soon})
    hygiene = service.get_summary({"date": "2026-11-12"})["hygieneStatus"]
    assert len(hygiene["expiringCertificates"]) == 1


def test_recent_activities_come_from_notifications(service):
    activities = service.get_summary({"date": "2026-11-12"})["recentActivities"]
    assert len(activities) == 2
    assert activities[0]["action"] == "Notif 1"
    assert activities[0]["time"].endswith("WIB")


def test_empty_database_returns_zeroes_not_fabricated_data():
    service = DashboardService(InMemoryRepository(), timezone_name="Asia/Jakarta")
    summary = service.get_summary({"date": "2026-11-12"})
    assert summary["kpis"]["totalPortionsToday"] == 0
    assert summary["kpis"]["activeBeneficiaries"] == 0
    assert summary["productionTrend"] == []
    assert summary["pendingApprovals"] == []
    assert summary["recentActivities"] == []
    assert "sppgUnitName" not in summary["unitMeta"]


def test_falls_back_to_latest_production_when_date_missing(service):
    summary = service.get_summary({"date": "2030-01-01"})
    # Produksi terakhir (2026-11-12) dipakai; tanggal yang diminta tetap dilaporkan.
    assert summary["kpis"]["totalPortionsToday"] == 300
    assert summary["unitMeta"]["effectiveDate"] == "2030-01-01"


def test_unit_meta_from_settings(service):
    meta = service.get_summary({"date": "2026-11-12"})["unitMeta"]
    assert meta["unitName"] == "Unit Uji"
    assert meta["unitCode"] == "TEST-01"
