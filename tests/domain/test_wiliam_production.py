"""Unit tests for Daily Production Domain Service (Module E)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Tests cover:
- Batch creation and batch code uniqueness enforcement
- Date format validation (ISO YYYY-MM-DD)
- Non-negative quantity and financial constraints
- Planned vs Actual portion reconciliation and discrepancy tracking
- Quality Control (QC) consistency validation (qcPassed + rejected <= actual)
- Rejection of QC figures exceeding actual production
- Production lifecycle states ('Terjadwal' -> 'Sedang Berjalan' -> 'Selesai')
- Effective service day boolean auditing (supporting incentive calculations)
- Timeline stage updates
- Update collisions and LookupError on non-existent records
- Purely offline testing with InMemoryProductionRepository
"""

import pytest

from backend.services.production import (
    InMemoryProductionRepository,
    ProductionService,
    get_default_production_timeline,
)


@pytest.fixture
def repo() -> InMemoryProductionRepository:
    return InMemoryProductionRepository()


@pytest.fixture
def service(repo: InMemoryProductionRepository) -> ProductionService:
    return ProductionService(repository=repo)


def test_empty_production_list(service: ProductionService) -> None:
    res = service.list()
    assert res["items"] == []


def test_valid_production_create(service: ProductionService) -> None:
    payload = {
        "date": "2026-11-12",
        "dayLabel": "Kamis",
        "batchCode": "BATCH-MDN04-1112",
        "menuName": "Nasi Putih, Ayam Panggang Kecap Rempah & Sayur Kimlo",
        "plannedPortions": 2960,
        "actualPortions": 2945,
        "qcPassedPortions": 2940,
        "rejectedPortions": 5,
        "foodCostTotal": 28500000,
        "operationalCostTotal": 6050000,
        "isEffectiveServiceDay": True,
        "status": "Sedang Berjalan",
        "leadChef": "Chef Surya Darma",
        "notes": "5 porsi dikarantina akibat tutup ompreng tidak rapat.",
    }

    created = service.create(payload)
    assert created["id"].startswith("PRD-")
    assert created["batchCode"] == "BATCH-MDN04-1112"
    assert created["plannedPortions"] == 2960
    assert created["actualPortions"] == 2945
    assert created["qcPassedPortions"] == 2940
    assert created["rejectedPortions"] == 5
    assert created["discrepancyPortions"] == -15  # actual - planned = 2945 - 2960 = -15
    assert created["isEffectiveServiceDay"] is True
    assert len(created["timeline"]) == 5

    # Check presence in list
    items = service.list()["items"]
    assert len(items) == 1
    assert items[0]["batchCode"] == "BATCH-MDN04-1112"


def test_duplicate_batch_code_rejection(service: ProductionService) -> None:
    service.create({
        "date": "2026-11-12",
        "batchCode": "BATCH-UNIQUE-01",
        "menuName": "Menu Asli",
        "plannedPortions": 2000,
        "actualPortions": 2000,
    })

    with pytest.raises(ValueError, match="sudah pernah digunakan"):
        service.create({
            "date": "2026-11-13",
            "batchCode": "BATCH-UNIQUE-01",
            "menuName": "Menu Duplikat",
            "plannedPortions": 2000,
            "actualPortions": 2000,
        })


def test_invalid_production_payloads(service: ProductionService) -> None:
    # Empty payload
    with pytest.raises(ValueError, match="tidak boleh kosong"):
        service.create({})

    # Missing batchCode
    with pytest.raises(ValueError, match="batchCode"):
        service.create({
            "date": "2026-11-12",
            "menuName": "Nasi Ayam",
        })

    # Bad date format
    with pytest.raises(ValueError, match="Format tanggal|Tanggal produksi"):
        service.create({
            "date": "12/11/2026",
            "batchCode": "BATCH-001",
            "menuName": "Nasi Ayam",
        })

    # Missing menuName
    with pytest.raises(ValueError, match="Nama menu produksi"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-001",
            "menuName": "",
        })

    # Negative portions
    with pytest.raises(ValueError, match="tidak boleh negatif"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-001",
            "menuName": "Nasi Ayam",
            "plannedPortions": -10,
        })

    # Negative costs
    with pytest.raises(ValueError, match="tidak boleh bernilai negatif"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-001",
            "menuName": "Nasi Ayam",
            "foodCostTotal": -5000,
        })


def test_qc_consistency_validation(service: ProductionService) -> None:
    # 1. qcPassedPortions exceeds actualPortions
    with pytest.raises(ValueError, match="melebihi realisasi porsi aktual"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-QC-01",
            "menuName": "Nasi Ayam",
            "plannedPortions": 2000,
            "actualPortions": 2000,
            "qcPassedPortions": 2050,  # Impossible: passed more than cooked!
        })

    # 2. rejectedPortions exceeds actualPortions
    with pytest.raises(ValueError, match="melebihi realisasi porsi aktual"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-QC-02",
            "menuName": "Nasi Ayam",
            "plannedPortions": 2000,
            "actualPortions": 2000,
            "rejectedPortions": 2100,
        })

    # 3. Sum of qcPassed and rejected exceeds actualPortions
    with pytest.raises(ValueError, match="melebihi porsi aktual"):
        service.create({
            "date": "2026-11-12",
            "batchCode": "BATCH-QC-03",
            "menuName": "Nasi Ayam",
            "plannedPortions": 2000,
            "actualPortions": 2000,
            "qcPassedPortions": 1900,
            "rejectedPortions": 150,  # 1900 + 150 = 2050 > 2000
        })


def test_production_update(service: ProductionService) -> None:
    created = service.create({
        "date": "2026-11-12",
        "batchCode": "BATCH-UPD-01",
        "menuName": "Menu Awal",
        "plannedPortions": 2500,
        "actualPortions": 2500,
        "status": "Sedang Berjalan",
    })

    # Update status to Selesai with adjusted actual portions and QC
    updated = service.update({
        "id": created["id"],
        "actualPortions": 2490,
        "qcPassedPortions": 2485,
        "rejectedPortions": 5,
        "status": "Selesai",
        "notes": "Produksi selesai tepat waktu.",
    })

    assert updated["status"] == "Selesai"
    assert updated["actualPortions"] == 2490
    assert updated["qcPassedPortions"] == 2485
    assert updated["discrepancyPortions"] == -10  # 2490 - 2500 = -10

    # Non-existent ID
    with pytest.raises(LookupError, match="tidak ditemukan"):
        service.update({"id": "PRD-NONEXISTENT", "status": "Selesai"})

    # Updating with batch code collision
    service.create({
        "date": "2026-11-13",
        "batchCode": "BATCH-UPD-02",
        "menuName": "Menu Lain",
        "plannedPortions": 2000,
        "actualPortions": 2000,
    })

    with pytest.raises(ValueError, match="sudah digunakan"):
        service.update({"id": created["id"], "batchCode": "BATCH-UPD-02"})


def test_timeline_updates(service: ProductionService) -> None:
    created = service.create({
        "date": "2026-11-12",
        "batchCode": "BATCH-TIME-01",
        "menuName": "Menu Timeline",
        "plannedPortions": 2000,
        "actualPortions": 2000,
    })

    custom_timeline = [
        {"time": "03:00 WIB", "stage": "Penerimaan & QC Bahan Baku Segar", "done": True},
        {"time": "04:00 WIB", "stage": "Pengolahan & Pemasakan Utama", "done": True},
        {"time": "05:30 WIB", "stage": "Uji Organoleptik & Suhu Inti (>75°C)", "done": True},
        {"time": "06:15 WIB", "stage": "Pemorsian & Penyegelan Ompreng Stainless", "done": True},
        {"time": "07:00 WIB", "stage": "Serah Terima ke Armada Distribusi", "done": True},
    ]

    updated = service.update({
        "id": created["id"],
        "timeline": custom_timeline,
        "status": "Selesai",
    })
    assert all(t["done"] for t in updated["timeline"])
    assert updated["status"] == "Selesai"


def test_production_date_filtering(service: ProductionService) -> None:
    service.create({
        "date": "2026-11-11",
        "batchCode": "BATCH-DAY-11",
        "menuName": "Menu 11",
        "plannedPortions": 2000,
        "actualPortions": 2000,
    })
    service.create({
        "date": "2026-11-12",
        "batchCode": "BATCH-DAY-12",
        "menuName": "Menu 12",
        "plannedPortions": 2000,
        "actualPortions": 2000,
    })

    res_11 = service.list({"date": "2026-11-11"})
    assert len(res_11["items"]) == 1
    assert res_11["items"][0]["batchCode"] == "BATCH-DAY-11"

    res_all = service.list()
    assert len(res_all["items"]) == 2
