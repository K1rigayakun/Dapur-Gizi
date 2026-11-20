"""Test perhitungan anggaran: presisi Decimal, validasi, dan audit riwayat."""

from __future__ import annotations

import pytest

from backend.services.budget import BudgetService


@pytest.fixture
def service(repository) -> BudgetService:
    return BudgetService(repository)


def test_get_parameters_camel_case(service):
    params = service.get_parameters()
    assert params["configLabel"].startswith("DEMO")
    assert params["monthlyAllocationCeiling"] == 1_150_000_000
    assert params["standardFoodCostCeilingPerPortion"] == 10_000
    assert params["isDemoConfig"] is True


def test_missing_parameters_raise_lookup_error():
    from backend.database.memory import InMemoryRepository

    with pytest.raises(LookupError):
        BudgetService(InMemoryRepository()).get_parameters()


def test_calculate_exact_values(service):
    result = service.calculate(
        {
            "servedPortions": 100,
            "daysCount": 2,
            "foodCostPerPortion": 10_000,
            "opCostPerPortion": 2_100,
            "isEffectiveServiceDay": True,
        }
    )
    assert result["foodTotal"] == 2_000_000
    assert result["opTotal"] == 420_000
    assert result["incentiveTotal"] == 12_000_000
    assert result["grandTotal"] == 14_420_000
    assert result["combinedUnitCost"] == 12_100
    assert result["ceilingUnitCost"] == 12_100
    assert result["overCeilingWarning"] is False


def test_calculate_uses_decimal_not_float(service):
    # 3333 * 3 = 9999 tepat; float dapat menghasilkan 9999.000000000002.
    result = service.calculate(
        {
            "servedPortions": 3,
            "daysCount": 1,
            "foodCostPerPortion": 3333,
            "opCostPerPortion": 0,
            "isEffectiveServiceDay": False,
        }
    )
    assert result["foodTotal"] == 9999
    assert result["incentiveTotal"] == 0
    assert result["grandTotal"] == 9999


def test_calculate_flags_over_ceiling(service):
    result = service.calculate(
        {
            "servedPortions": 10,
            "daysCount": 1,
            "foodCostPerPortion": 11_000,
            "opCostPerPortion": 2_100,
            "isEffectiveServiceDay": True,
        }
    )
    assert result["overCeilingWarning"] is True
    assert result["combinedUnitCost"] == 13_100


def test_calculate_defaults_from_configured_parameters(service):
    result = service.calculate({})
    assert result["portions"] == 300
    assert result["foodUnit"] == 10_000
    assert result["opUnit"] == 2_100
    assert result["effectiveDaysCount"] == 1
    assert result["isEffectiveDay"] is True


@pytest.mark.parametrize(
    "payload",
    [
        {"servedPortions": -1},
        {"daysCount": 0},
        {"foodCostPerPortion": -5},
        {"opCostPerPortion": "abc"},
        {"isEffectiveServiceDay": "ya"},
    ],
)
def test_calculate_rejects_invalid_payload(service, payload):
    with pytest.raises(ValueError):
        service.calculate(payload)


def test_summary_aggregates_all_production(service):
    result = service.get_summary()
    summary = result["summary"]
    assert summary["totalActualPortions"] == 600
    assert summary["totalPlannedPortions"] == 700
    assert summary["effectiveServiceDays"] == 2
    assert summary["foodExpenditure"] == 6_000_000
    assert summary["operationalExpenditure"] == 1_260_000
    assert summary["totalIncentive"] == 12_000_000
    assert summary["totalExpenditure"] == 19_260_000
    assert summary["avgFoodCostPerPortion"] == 10_000
    assert summary["avgOpCostPerPortion"] == 2_100
    assert summary["avgTotalUnitCost"] == 12_100
    assert summary["remainingMonthlyBudget"] == 1_150_000_000 - 19_260_000
    assert len(result["history"]) == 2


def test_summary_remaining_budget_never_negative(repository, service):
    repository.update(
        "budget_parameters",
        "param-test-1",
        {"monthly_allocation_ceiling": 1},
    )
    assert service.get_summary()["summary"]["remainingMonthlyBudget"] == 0


def test_update_parameters_requires_source_and_effective_date():
    from backend.database.memory import InMemoryRepository

    service = BudgetService(InMemoryRepository())
    with pytest.raises(ValueError):
        service.update_parameters({"configLabel": "Baru"})


def test_update_parameters_inherits_existing_source_and_date(service):
    updated = service.update_parameters({"standardFoodCostCeilingPerPortion": 12_000})
    assert updated["referenceSource"] == "DEMO-TEST: bukan ketentuan resmi"
    assert updated["effectiveDate"] == "2026-11-01"
    assert updated["standardFoodCostCeilingPerPortion"] == 12_000


def test_update_parameters_writes_history(service, repository):
    before = len(repository.rows("budget_parameter_history"))
    updated = service.update_parameters(
        {
            "configLabel": "Konfigurasi Baru",
            "referenceSource": "Sumber Uji",
            "effectiveDate": "2026-12-01",
            "standardFoodCostCeilingPerPortion": 11_000,
        },
        actor="user-kepala",
    )
    assert updated["configLabel"] == "Konfigurasi Baru"
    assert updated["referenceSource"] == "Sumber Uji"
    assert updated["effectiveDate"] == "2026-12-01"
    assert updated["standardFoodCostCeilingPerPortion"] == 11_000
    # Field lain tetap dari konfigurasi sebelumnya.
    assert updated["standardOperationalCostCeilingPerPortion"] == 2_100
    assert updated["isDemoConfig"] is True

    history = repository.rows("budget_parameter_history")
    assert len(history) == before + 1
    assert history[-1]["changed_by"] == "user-kepala"
    assert history[-1]["change_type"] == "update"


def test_update_parameters_rejects_invalid_numbers(service):
    with pytest.raises(ValueError):
        service.update_parameters(
            {
                "configLabel": "X",
                "referenceSource": "Y",
                "effectiveDate": "2026-12-01",
                "monthlyAllocationCeiling": 0,
            }
        )
    with pytest.raises(ValueError):
        service.update_parameters(
            {
                "configLabel": "X",
                "referenceSource": "Y",
                "effectiveDate": "bukan-tanggal",
            }
        )


def test_update_parameters_creates_when_absent():
    from backend.database.memory import InMemoryRepository

    repo = InMemoryRepository()
    service = BudgetService(repo)
    created = service.update_parameters(
        {
            "configLabel": "Baru",
            "referenceSource": "Sumber",
            "effectiveDate": "2026-12-01",
            "monthlyAllocationCeiling": 1_000_000,
            "standardFoodCostCeilingPerPortion": 9000,
            "standardOperationalCostCeilingPerPortion": 2000,
            "dailyFacilityIncentiveRate": 5_000_000,
        }
    )
    assert created["configLabel"] == "Baru"
    assert len(repo.rows("budget_parameter_history")) == 1
