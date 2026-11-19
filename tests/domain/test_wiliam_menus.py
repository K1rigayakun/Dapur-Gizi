"""Unit tests for Menu & Nutrition Planning Domain Service (Module D)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Tests cover:
- Menu creation and strict field validations (min 5 char name, ISO date)
- Rejection of negative portions and costs
- Ingredient composition parsing and validation
- Seamless integration with NutritionService for auto-calculation
- Approval workflows (Draft -> Menunggu Persetujuan -> Disetujui / Perlu Revisi / Ditolak)
- Drag-and-drop cycle reordering without duplicates or omissions
- Update lifecycle and LookupError on missing ID
- Weekly filtering
- Purely offline execution using InMemoryMenuRepository
"""

import pytest

from backend.services.menus import (
    InMemoryMenuRepository,
    MenuService,
)
from backend.services.nutrition import (
    InMemoryFoodCompositionRepository,
    NutritionService,
)


@pytest.fixture
def repo() -> InMemoryMenuRepository:
    return InMemoryMenuRepository()


@pytest.fixture
def nutrition_service() -> NutritionService:
    food_repo = InMemoryFoodCompositionRepository()
    return NutritionService(food_composition_repository=food_repo)


@pytest.fixture
def service(repo: InMemoryMenuRepository, nutrition_service: NutritionService) -> MenuService:
    return MenuService(repository=repo, nutrition_service=nutrition_service)


def test_empty_menu_list(service: MenuService) -> None:
    res = service.list()
    assert res["items"] == []


def test_valid_menu_create(service: MenuService) -> None:
    payload = {
        "dayName": "Senin",
        "date": "2026-11-09",
        "weekLabel": "Minggu 46 (09–13 Nov 2026)",
        "name": "Nasi Putih, Ayam Bumbu Kuning Lengkuas & Sayur Bayam",
        "plannedPortions": 2850,
        "caloriesKcal": 650.0,
        "proteinGram": 29.5,
        "carbsGram": 83.0,
        "fatGram": 19.0,
        "costEstimatePerPortion": 11800,
        "ingredients": [
            {"name": "Beras medium", "amountGr": 150, "role": "Karbohidrat Utama"},
            {"name": "Ayam potong", "amountGr": 80, "role": "Protein Hewani"},
        ],
    }

    created = service.create(payload)
    assert created["id"].startswith("MNU-")
    assert created["name"] == payload["name"]
    assert created["status"] == "Draft"
    assert created["orderIndex"] == 1
    assert len(created["ingredients"]) == 2

    # Verify present in list
    items = service.list()["items"]
    assert len(items) == 1
    assert items[0]["name"] == payload["name"]


def test_auto_nutritional_calculation_on_create(service: MenuService) -> None:
    # When caloriesKcal is 0, nutrition_service should auto-calculate from ingredients
    payload = {
        "dayName": "Selasa",
        "date": "2026-11-10",
        "name": "Menu Seimbang Uji Otomatis TKPI",
        "plannedPortions": 2800,
        "caloriesKcal": 0,  # Trigger auto-calculation
        "proteinGram": 0,
        "ingredients": [
            {"name": "Beras medium", "amountGr": 150, "role": "Karbohidrat Utama"},
            {"name": "Daging ayam", "amountGr": 80, "role": "Protein Hewani"},
        ],
    }
    created = service.create(payload)
    assert created["caloriesKcal"] > 500
    assert created["proteinGram"] > 20


def test_invalid_menu_payloads(service: MenuService) -> None:
    # Empty payload
    with pytest.raises(ValueError, match="tidak boleh kosong"):
        service.create({})

    # Short name (<5 chars)
    with pytest.raises(ValueError, match="minimal 5 karakter"):
        service.create({"name": "Ayam", "date": "2026-11-09"})

    # Missing date
    with pytest.raises(ValueError, match="Tanggal layanan"):
        service.create({"name": "Nasi Putih Spesial Uji", "date": ""})

    # Bad date format
    with pytest.raises(ValueError, match="Format tanggal"):
        service.create({"name": "Nasi Putih Spesial Uji", "date": "09-11-2026"})

    # Negative portions
    with pytest.raises(ValueError, match="tidak boleh bernilai negatif"):
        service.create({
            "name": "Nasi Putih Spesial Uji",
            "date": "2026-11-09",
            "plannedPortions": -50,
        })

    # Negative nutrients
    with pytest.raises(ValueError, match="tidak boleh negatif"):
        service.create({
            "name": "Nasi Putih Spesial Uji",
            "date": "2026-11-09",
            "caloriesKcal": -100,
        })


def test_menu_update(service: MenuService) -> None:
    created = service.create({
        "name": "Menu Awal Sebelum Diubah",
        "date": "2026-11-09",
        "dayName": "Senin",
        "plannedPortions": 2000,
    })

    updated = service.update({
        "id": created["id"],
        "name": "Menu Setelah Diubah Lengkap",
        "plannedPortions": 2500,
    })
    assert updated["name"] == "Menu Setelah Diubah Lengkap"
    assert updated["plannedPortions"] == 2500

    # Non-existent ID
    with pytest.raises(LookupError, match="tidak ditemukan"):
        service.update({"id": "MNU-NONEXISTENT", "name": "Valid Name"})


def test_submit_for_review(service: MenuService) -> None:
    created = service.create({
        "name": "Menu Baru Menunggu Review",
        "date": "2026-11-09",
        "dayName": "Senin",
    })
    assert created["status"] == "Draft"

    submitted = service.submit_for_review({
        "id": created["id"],
        "notes": "Mohon verifikasi gramasi protein hewani.",
    })
    assert submitted["status"] == "Menunggu Persetujuan"
    assert submitted["reviewNotes"] == "Mohon verifikasi gramasi protein hewani."


def test_menu_review_decisions(service: MenuService) -> None:
    menu = service.create({
        "name": "Menu Evaluasi Gizi dan Mutu",
        "date": "2026-11-09",
        "dayName": "Senin",
    })

    # 1. Approve
    approved = service.review({
        "id": menu["id"],
        "decision": "Disetujui",
        "reviewer": "Dr. Hendra Wijaya, M.Gz",
        "reviewNotes": "Komposisi gizi sesuai standar MBG.",
    })
    assert approved["status"] == "Disetujui"
    assert approved["reviewedBy"] == "Dr. Hendra Wijaya, M.Gz"

    # 2. Request Revision
    revised = service.review({
        "id": menu["id"],
        "decision": "Perlu Revisi",
        "reviewer": "Dr. Hendra Wijaya, M.Gz",
        "reviewNotes": "Tingkatkan porsi sayur berserat.",
    })
    assert revised["status"] == "Perlu Revisi"

    # 3. Reject
    rejected = service.review({
        "id": menu["id"],
        "decision": "Ditolak",
        "reviewer": "Dr. Hendra Wijaya, M.Gz",
        "reviewNotes": "Bahan baku langka di pasar lokal.",
    })
    assert rejected["status"] == "Ditolak"

    # Invalid decision
    with pytest.raises(ValueError, match="tidak valid"):
        service.review({
            "id": menu["id"],
            "decision": "Status Ngawur",
            "reviewer": "Dr. Hendra",
        })


def test_menu_reorder(service: MenuService) -> None:
    m1 = service.create({"name": "Menu Hari Pertama", "date": "2026-11-09", "dayName": "Senin"})
    m2 = service.create({"name": "Menu Hari Kedua", "date": "2026-11-10", "dayName": "Selasa"})
    m3 = service.create({"name": "Menu Hari Ketiga", "date": "2026-11-11", "dayName": "Rabu"})

    # Reorder m3, m1, m2
    reordered_res = service.reorder({"orderedIds": [m3["id"], m1["id"], m2["id"]]})
    items = reordered_res["items"]

    assert items[0]["id"] == m3["id"]
    assert items[0]["orderIndex"] == 1
    assert items[1]["id"] == m1["id"]
    assert items[1]["orderIndex"] == 2
    assert items[2]["id"] == m2["id"]
    assert items[2]["orderIndex"] == 3

    # Duplicate IDs in reorder request
    with pytest.raises(ValueError, match="duplikat"):
        service.reorder({"orderedIds": [m1["id"], m1["id"], m2["id"]]})

    # Missing ID in reorder request
    with pytest.raises(LookupError, match="tidak ditemukan"):
        service.reorder({"orderedIds": [m1["id"], "MNU-GHOST"]})


def test_week_label_filtering(service: MenuService) -> None:
    service.create({
        "name": "Menu Minggu 46 Layanan",
        "date": "2026-11-09",
        "weekLabel": "Minggu 46",
    })
    service.create({
        "name": "Menu Minggu 47 Layanan",
        "date": "2026-11-16",
        "weekLabel": "Minggu 47",
    })

    w46 = service.list({"weekLabel": "Minggu 46"})
    assert len(w46["items"]) == 1
    assert w46["items"][0]["weekLabel"] == "Minggu 46"

    all_items = service.list({"weekLabel": "ALL"})
    assert len(all_items["items"]) == 2
