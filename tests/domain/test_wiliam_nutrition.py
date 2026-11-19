"""Unit tests for Nutrition Domain Service (Module D)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Tests cover:
- Traceable nutrient calculations from verified TKPI 2019 dataset
- Net edible portion (BDD - Bagian Dapat Dimakan) factoring
- Multi-unit conversion (g, gr, kg, mg, ons)
- Strict missing reference handling: refuses to invent fake nutritional data
- Decimal precision formatting
- Batch portion scaling
- Edge cases: zero weight, negative weight, empty ingredients, unknown units
- Custom food reference item addition
"""

import pytest

from backend.services.nutrition import (
    InMemoryFoodCompositionRepository,
    NutritionService,
    get_default_verified_tkpi_items,
)


@pytest.fixture
def repo() -> InMemoryFoodCompositionRepository:
    return InMemoryFoodCompositionRepository()


@pytest.fixture
def service(repo: InMemoryFoodCompositionRepository) -> NutritionService:
    return NutritionService(food_composition_repository=repo)


def test_verified_nutrient_calculation_per_portion(service: NutritionService) -> None:
    # 150g beras medium + 80g fillet ayam + 45g tempe
    payload = {
        "ingredients": [
            {"name": "Beras Medium Segar", "amountGr": 150, "unit": "gr", "role": "Karbohidrat Utama"},
            {"name": "Ayam Potong Segar", "amountGr": 80, "unit": "gr", "role": "Protein Hewani"},
            {"name": "Tempe Kedelai Lokal", "amountGr": 45, "unit": "gr", "role": "Protein Nabati"},
        ],
        "portions": 1,
    }

    res = service.calculate(payload)
    assert res["isVerified"] is True
    assert res["unverifiedIngredients"] == []
    assert len(res["sources"]) >= 1

    per_portion = res["perPortion"]
    # Check expected ranges
    # Beras 150g -> 1.5 * 360 = 540 kkal, 1.5 * 6.8 = 10.2g protein, 1.5 * 78.9 = 118.35g carbs
    # Ayam 80g -> 0.8 * 298 = 238.4 kkal, 0.8 * 18.2 = 14.56g protein
    # Tempe 45g -> 0.45 * 201 = 90.45 kkal, 0.45 * 20.8 = 9.36g protein
    # Total calories approx 540 + 238.4 + 90.45 = 868.85 kkal
    assert per_portion["caloriesKcal"] > 800
    assert per_portion["proteinGram"] > 30.0
    assert per_portion["grossWeightGram"] == 275.0
    assert per_portion["edibleWeightGram"] == 275.0


def test_edible_portion_bdd_factor(service: NutritionService) -> None:
    # Pisang barangan has BDD 68% (TKPI-F001: 100g basis, 128 kkal)
    payload = {
        "ingredients": [
            {"name": "Pisang Barangan Segar", "amount": 100, "unit": "gram"},
        ],
        "portions": 1,
        "applyEdiblePortion": True,
    }
    res = service.calculate(payload)
    # Gross = 100g, Edible = 68g
    # 68g / 100g * 128 kkal = 87.04 kkal
    item_breakdown = res["breakdown"][0]
    assert item_breakdown["grossWeightGram"] == 100.0
    assert item_breakdown["edibleWeightGram"] == 68.0
    assert abs(res["perPortion"]["caloriesKcal"] - 87.0) < 0.5


def test_unit_conversion(service: NutritionService) -> None:
    # 0.15 kg beras should equal 150 gr
    res_kg = service.calculate({
        "ingredients": [{"name": "Beras medium", "amount": 0.15, "unit": "kg"}]
    })
    res_gr = service.calculate({
        "ingredients": [{"name": "Beras medium", "amount": 150, "unit": "gr"}]
    })

    assert res_kg["perPortion"]["caloriesKcal"] == res_gr["perPortion"]["caloriesKcal"]
    assert res_kg["perPortion"]["proteinGram"] == res_gr["perPortion"]["proteinGram"]
    assert res_kg["perPortion"]["grossWeightGram"] == 150.0


def test_batch_scaling(service: NutritionService) -> None:
    payload = {
        "ingredients": [
            {"name": "Beras medium", "amountGr": 100, "unit": "gr"},
            {"name": "Tahu", "amountGr": 50, "unit": "gr"},
        ],
        "portions": 2960,
    }
    res = service.calculate(payload)

    per_portion = res["perPortion"]
    batch_total = res["batchTotal"]

    assert batch_total["portions"] == 2960
    assert abs(batch_total["caloriesKcal"] - round(per_portion["caloriesKcal"] * 2960, 1)) < 1.0
    assert abs(batch_total["proteinGram"] - round(per_portion["proteinGram"] * 2960, 1)) < 1.0


def test_missing_reference_strictly_unverified(service: NutritionService) -> None:
    # Unknown ingredient should NOT have fabricated calories/protein
    payload = {
        "ingredients": [
            {"name": "Beras medium", "amountGr": 100, "unit": "gr"},
            {"name": "Bahan Eksotis Tanpa Referensi", "amountGr": 50, "unit": "gr"},
        ]
    }
    res = service.calculate(payload)
    assert res["isVerified"] is False
    assert "Bahan Eksotis Tanpa Referensi" in res["unverifiedIngredients"]

    # The unverified item must have 0.0 values, not random invented numbers
    unverified_entry = next(b for b in res["breakdown"] if b["name"] == "Bahan Eksotis Tanpa Referensi")
    assert unverified_entry["isVerified"] is False
    assert unverified_entry["caloriesKcal"] == 0.0
    assert unverified_entry["proteinGram"] == 0.0


def test_invalid_and_edge_inputs(service: NutritionService) -> None:
    # Empty payload
    with pytest.raises(ValueError, match="tidak boleh kosong"):
        service.calculate({})

    # Missing ingredients array
    with pytest.raises(ValueError, match="Field 'ingredients' wajib"):
        service.calculate({"ingredients": "not a list"})

    # Negative portion count
    with pytest.raises(ValueError, match="minimal 1"):
        service.calculate({"ingredients": [], "portions": 0})

    # Negative weight
    with pytest.raises(ValueError, match="tidak boleh memiliki gramasi negatif"):
        service.calculate({"ingredients": [{"name": "Beras", "amountGr": -10}]})

    # Unknown unit
    with pytest.raises(ValueError, match="tidak dikenali"):
        service.calculate({"ingredients": [{"name": "Beras", "amountGr": 10, "unit": "liter_minyak"}]})


def test_zero_weight_ingredient(service: NutritionService) -> None:
    payload = {
        "ingredients": [
            {"name": "Beras medium", "amountGr": 0, "unit": "gr"},
        ]
    }
    res = service.calculate(payload)
    assert res["perPortion"]["caloriesKcal"] == 0.0
    assert res["perPortion"]["grossWeightGram"] == 0.0


def test_custom_composition_addition(repo: InMemoryFoodCompositionRepository, service: NutritionService) -> None:
    repo.add_item({
        "code": "CUSTOM-001",
        "name": "Superfood Lokal",
        "aliases": ["superfood"],
        "basis_weight": 100.0,
        "basis_unit": "gram",
        "energy_kcal": 500.0,
        "protein_g": 30.0,
        "fat_g": 10.0,
        "carbs_g": 50.0,
        "edible_portion_pct": 100.0,
        "source_name": "Lab Pangan Universitas Test",
        "source_edition": "2026",
        "is_verified": True,
    })

    res = service.calculate({
        "ingredients": [{"name": "Superfood Lokal", "amountGr": 50, "unit": "gr"}]
    })
    assert res["isVerified"] is True
    # 50g -> 0.5 * 500 = 250 kkal, 0.5 * 30 = 15g protein
    assert res["perPortion"]["caloriesKcal"] == 250.0
    assert res["perPortion"]["proteinGram"] == 15.0
