"""Unit tests for Beneficiary Domain Service (Module C)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Tests cover:
- Valid creation and field formatting
- Invalid creation (empty name, short name, bad category, invalid institution)
- Identifier validation (10–16 digits, non-numeric rejection)
- Duplicate identifier rejection
- Update lifecycle and collision prevention
- Delete lifecycle and LookupError on missing ID
- Reactive search, filtering, and sorting
- CSV parsing, intra-batch duplicate detection, and bulk import
- Empty dataset states
- 100% offline using InMemoryBeneficiaryRepository (no Supabase network dependency)
- Uses purely synthetic dummy test data (no real personal data)
"""

import pytest

from backend.services.beneficiaries import (
    BENEFICIARY_CATEGORIES,
    BeneficiaryService,
    InMemoryBeneficiaryRepository,
    detect_identifier_type,
)


@pytest.fixture
def repo() -> InMemoryBeneficiaryRepository:
    return InMemoryBeneficiaryRepository()


@pytest.fixture
def service(repo: InMemoryBeneficiaryRepository) -> BeneficiaryService:
    return BeneficiaryService(repository=repo)


def test_empty_dataset(service: BeneficiaryService) -> None:
    res = service.list({})
    assert res["items"] == []
    assert res["totalCount"] == 0
    assert res["activeCount"] == 0


def test_valid_create(service: BeneficiaryService) -> None:
    payload = {
        "nik": "1271042105160099",
        "name": "Budi Pratama Test",
        "category": "Siswa SD",
        "institution": "SDN 01 Medan Test",
        "gradeOrGroup": "Kelas 4A",
        "status": "Aktif",
        "notes": "Tidak ada alergi",
    }
    created = service.create(payload)

    assert created["id"].startswith("BNF-")
    assert created["nik"] == "1271042105160099"
    assert created["name"] == "Budi Pratama Test"
    assert created["category"] == "Siswa SD"
    assert created["institution"] == "SDN 01 Medan Test"
    assert created["status"] == "Aktif"
    assert created["identifierType"] == "NIK"
    assert "registeredAt" in created

    # Verify presence in list
    listing = service.list()
    assert listing["totalCount"] == 1
    assert listing["activeCount"] == 1
    assert listing["items"][0]["name"] == "Budi Pratama Test"


def test_create_with_nisn_10_digits(service: BeneficiaryService) -> None:
    payload = {
        "nik": "0091234567",  # 10 digits NISN
        "name": "Siti Rahayu NISN",
        "category": "Siswa SMP",
        "institution": "SMPN 1 Medan Test",
        "gradeOrGroup": "Kelas 7B",
        "status": "Aktif",
    }
    created = service.create(payload)
    assert created["identifierType"] == "NISN"
    assert created["nik"] == "0091234567"


def test_invalid_create_payloads(service: BeneficiaryService) -> None:
    # Empty payload
    with pytest.raises(ValueError, match="tidak boleh kosong"):
        service.create({})

    # Missing NIK
    with pytest.raises(ValueError, match="Nomor identitas"):
        service.create({"name": "Test Person", "category": "Siswa SD", "institution": "SD Test"})

    # Non-digit NIK
    with pytest.raises(ValueError, match="tidak valid"):
        service.create({"nik": "ABC12345678901", "name": "Test Person", "category": "Siswa SD", "institution": "SD Test"})

    # Too short NIK (<10 digits)
    with pytest.raises(ValueError, match="tidak valid"):
        service.create({"nik": "12345", "name": "Test Person", "category": "Siswa SD", "institution": "SD Test"})

    # Too long NIK (>16 digits)
    with pytest.raises(ValueError, match="tidak valid"):
        service.create({"nik": "12345678901234567", "name": "Test Person", "category": "Siswa SD", "institution": "SD Test"})

    # Short name (<3 chars)
    with pytest.raises(ValueError, match="minimal 3 karakter"):
        service.create({"nik": "1271042105160001", "name": "Al", "category": "Siswa SD", "institution": "SD Test"})

    # Invalid Category
    with pytest.raises(ValueError, match="tidak valid"):
        service.create({
            "nik": "1271042105160001",
            "name": "Alex Pratama",
            "category": "Kategori Fiktif",
            "institution": "SD Test",
        })

    # Short institution (<3 chars)
    with pytest.raises(ValueError, match="minimal 3 karakter"):
        service.create({
            "nik": "1271042105160001",
            "name": "Alex Pratama",
            "category": "Siswa SD",
            "institution": "X",
        })


def test_duplicate_identifier(service: BeneficiaryService) -> None:
    payload1 = {
        "nik": "1271042105160001",
        "name": "Penerima Asli",
        "category": "Siswa SD",
        "institution": "SDN 01 Medan",
    }
    service.create(payload1)

    # Attempt second record with identical NIK
    payload2 = {
        "nik": "1271042105160001",
        "name": "Penerima Duplikat",
        "category": "Siswa SMP",
        "institution": "SMPN 01 Medan",
    }
    with pytest.raises(ValueError, match="Duplikat terdeteksi"):
        service.create(payload2)


def test_update_beneficiary(service: BeneficiaryService) -> None:
    created = service.create({
        "nik": "1271042105160001",
        "name": "Nama Awal",
        "category": "Siswa SD",
        "institution": "SD Awal",
        "status": "Aktif",
    })

    # Valid update
    updated = service.update({
        "id": created["id"],
        "name": "Nama Baru Lengkap",
        "institution": "SD Baru",
        "status": "Nonaktif",
    })
    assert updated["name"] == "Nama Baru Lengkap"
    assert updated["institution"] == "SD Baru"
    assert updated["status"] == "Nonaktif"

    # Update non-existent
    with pytest.raises(LookupError, match="tidak ditemukan"):
        service.update({"id": "BNF-GHOSTRUN", "name": "Ghost Name"})

    # Update with duplicate NIK belonging to another record
    service.create({
        "nik": "1271042105160002",
        "name": "Penerima Kedua",
        "category": "Siswa SMA",
        "institution": "SMAN 01",
    })

    with pytest.raises(ValueError, match="Duplikat terdeteksi"):
        service.update({"id": created["id"], "nik": "1271042105160002"})


def test_delete_beneficiary(service: BeneficiaryService) -> None:
    created = service.create({
        "nik": "1271042105160001",
        "name": "Akan Dihapus",
        "category": "Balita",
        "institution": "Posyandu Mawar",
    })

    del_res = service.delete({"id": created["id"]})
    assert del_res["deletedId"] == created["id"]
    assert del_res["name"] == "Akan Dihapus"

    # Verify removed
    assert service.list()["totalCount"] == 0

    # Delete non-existent
    with pytest.raises(LookupError, match="tidak ditemukan"):
        service.delete({"id": created["id"]})


def test_search_and_filtering(service: BeneficiaryService) -> None:
    service.create({
        "nik": "1271042105160001",
        "name": "Zahra Ramadhani",
        "category": "Siswa SD",
        "institution": "SDN Medan Baru",
        "status": "Aktif",
    })
    service.create({
        "nik": "1271042105160002",
        "name": "Rafaizan Alfarizqi",
        "category": "Balita",
        "institution": "Posyandu Anggrek",
        "status": "Aktif",
    })
    service.create({
        "nik": "1271042105160003",
        "name": "Dewi Sartika",
        "category": "Ibu Hamil",
        "institution": "Posyandu Melati",
        "status": "Nonaktif",
    })

    # Search by name
    res_search = service.list({"search": "zahra"})
    assert len(res_search["items"]) == 1
    assert res_search["items"][0]["name"] == "Zahra Ramadhani"

    # Search by institution
    res_inst = service.list({"search": "Melati"})
    assert len(res_inst["items"]) == 1
    assert res_inst["items"][0]["name"] == "Dewi Sartika"

    # Category filter
    res_cat = service.list({"category": "Balita"})
    assert len(res_cat["items"]) == 1
    assert res_cat["items"][0]["category"] == "Balita"

    # Status filter
    res_stat = service.list({"status": "Nonaktif"})
    assert len(res_stat["items"]) == 1
    assert res_stat["items"][0]["name"] == "Dewi Sartika"

    # Sort descending by name
    res_sort = service.list({"sortBy": "name", "sortDir": "desc"})
    names = [r["name"] for r in res_sort["items"]]
    assert names == ["Zahra Ramadhani", "Rafaizan Alfarizqi", "Dewi Sartika"]


def test_csv_parsing_and_import(service: BeneficiaryService) -> None:
    csv_content = """NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan
1271042809160021,Zahra Putri Ramadhani,Siswa SD,SDN 060812 Medan Baru,Aktif,Tidak ada alergi
1271041502230022,Rafaizan Alfarizqi,Balita,Posyandu Anggrek Bulan II,Aktif,Bubur saring halus
"""
    # Validation report check
    report = service.parse_and_validate_csv(csv_content)
    assert len(report["validRows"]) == 2
    assert len(report["invalidRows"]) == 0
    assert len(report["duplicateRows"]) == 0

    # Execute import
    imp_res = service.import_records({"csvText": csv_content})
    assert imp_res["importedCount"] == 2
    assert len(imp_res["records"]) == 2

    # Verify presence in database
    list_res = service.list()
    assert list_res["totalCount"] == 2


def test_csv_duplicate_rejection(service: BeneficiaryService) -> None:
    # First record already exists
    service.create({
        "nik": "1271042809160021",
        "name": "Zahra Eksis",
        "category": "Siswa SD",
        "institution": "SDN Medan",
    })

    # CSV with 1 duplicate of existing, and 1 intra-batch duplicate
    csv_duplicate = """NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan
1271042809160021,Zahra Dari CSV,Siswa SD,SDN Baru,Aktif,-
1271041502230099,Budi Satu,Siswa SMP,SMPN 01,Aktif,-
1271041502230099,Budi Dua (Intra-batch duplicate),Siswa SMP,SMPN 01,Aktif,-
"""
    report = service.parse_and_validate_csv(csv_duplicate)
    assert len(report["validRows"]) == 1
    assert len(report["duplicateRows"]) == 2

    # Attempting to import records array containing duplicate NIK against DB
    with pytest.raises(ValueError, match="sudah terdaftar"):
        service.import_records({
            "records": [
                {"nik": "1271042809160021", "name": "Baru", "category": "Siswa SD", "institution": "SD Baru"}
            ]
        })


def test_csv_invalid_format_rows(service: BeneficiaryService) -> None:
    bad_csv = """NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan
INVALID_NIK,Nama Valid,Siswa SD,SDN 01,Aktif,-
1271042809160055,Al,Siswa SD,SDN 01,Aktif,-
1271042809160056,Nama Lengkap,Kategori Ngawur,SDN 01,Aktif,-
1271042809160057,Nama Lengkap,Siswa SD,,Aktif,-
"""
    report = service.parse_and_validate_csv(bad_csv)
    assert len(report["validRows"]) == 0
    assert len(report["invalidRows"]) == 4


def test_detect_identifier_type() -> None:
    assert detect_identifier_type("1271042105160001") == "NIK"
    assert detect_identifier_type("0091234567") == "NISN"
    assert detect_identifier_type("123456789012") == "IDENTITAS_LAIN"
