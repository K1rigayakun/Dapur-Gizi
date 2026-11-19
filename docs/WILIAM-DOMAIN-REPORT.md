# Laporan Implementasi Domain Services DapurGizi (`WILIAM-DOMAIN-REPORT.md`)
**Pemilik Modul (PIC)**: Wiliam — *Beneficiaries, Menu, Nutrition & Production Engineer*  
**Branch Git**: `feature/wiliam-domain-services`  
**Target Rilis**: DapurGizi Core v1.0.0 (FastAPI / Eel 0.18.2 / Supabase PostgreSQL)  
**Tanggal**: 19 November 2026  

---

## 1. Ringkasan Eksekutif

Sebagai Business Logic Engineer & Domain Specialist modul **Penerima Manfaat**, **Menu Makanan**, **Kalkulasi Nutrisi**, dan **Produksi Dapur**, Wiliam telah menyelesaikan seluruh implementasi teknis dan pengujian unit secara mandiri tanpa memblokir atau menunggu pekerjaan anggota tim lain (*Frozen Parallel Development Contract*).

Seluruh kode domain dibuat menggunakan Python 3.13 modern, memanfaatkan `typing.Protocol` untuk dependency injection, menyediakan in-memory repository mandiri untuk testing offline, dan menghasilkan output data yang 100% kompatibel dengan kontrak integrasi frontend (`INTEGRATION.md`).

---

## 2. Struktur File & Kepemilikan Kode

```
backend/
└── services/
    ├── __init__.py                # Ekspor modul & service class resmi
    ├── beneficiaries.py           # BeneficiaryService, InMemoryBeneficiaryRepository, CSV Parser
    ├── menus.py                   # MenuService, InMemoryMenuRepository, Approval Workflow
    ├── nutrition.py               # NutritionService, InMemoryFoodCompositionRepository (TKPI 2019)
    └── production.py              # ProductionService, InMemoryProductionRepository, QC Reconciler

tests/
└── domain/
    ├── __init__.py
    ├── test_wiliam_beneficiaries.py  # 12 unit tests (CRUD, filter, search, NIK/NISN, CSV)
    ├── test_wiliam_menus.py          # 9 unit tests (Create, validation, auto-gizi, approval, reorder)
    ├── test_wiliam_nutrition.py      # 8 unit tests (TKPI, BDD %, multi-unit, scaling, anti-fiktif)
    └── test_wiliam_production.py     # 8 unit tests (Batch, QC consistency, variance, timeline)

docs/
├── BENEFICIARIES-DATA-DICTIONARY.md # Kamus data & analisis identitas NIK vs NISN
├── NUTRITION-DATA-SOURCES.md        # Sumber acuan TKPI Kemenkes & rumus perhitungan
└── WILIAM-DOMAIN-REPORT.md          # Laporan komprehensif implementasi Wiliam
```

---

## 3. Detail Implementasi per Domain

### A. Modul Penerima Manfaat (`backend/services/beneficiaries.py`)
- **Class**: `BeneficiaryService(repository)`
- **Method yang Disediakan**:
  - `list(payload)`: Pencarian reaktif, filter kategori (6 kategori MBG resmi), filter status (`Aktif`/`Nonaktif`), pengurutan multi-kolom (*asc*/*desc*), serta kalkulasi `totalCount` dan `activeCount`.
  - `create(payload)`: Validasi nama (min. 3 karakter), institusi, status, format NIK/NISN (10–16 digit), dan penolakan duplikasi NIK.
  - `update(payload)`: Pembaruan parsial dengan proteksi tabrakan NIK dengan data penerima lain.
  - `delete(payload)`: Penghapusan aman dan pengembalian detail tombstone `{ deletedId, name }`.
  - `import_records(payload)`: Impor batch dari array atau teks mentah CSV, validasi per baris, deteksi duplikat intra-batch dan database, serta pelaporan baris invalid.
- **Resolusi Domain NIK vs NISN**:
  Frontend menggunakan field `nik`. Wiliam mengakomodasi NISN (10 digit siswa) dan NIK (16 digit umum) dengan regex `^\d{10,16}$`, menetapkan metadata `identifierType` (`NIK` / `NISN` / `IDENTITAS_LAIN`), dan tetap menjaga kompatibilitas kontrak JSON tanpa *breaking changes*.

### B. Modul Siklus Menu & Persetujuan (`backend/services/menus.py`)
- **Class**: `MenuService(repository, nutrition_service=None)`
- **Method yang Disediakan**:
  - `list(payload)`: Daftar kartu menu mingguan tersortir berdasarkan `orderIndex` dan filter label minggu (`weekLabel`).
  - `create(payload)`: Validasi nama (min. 5 karakter), tanggal ISO, porsi dan biaya non-negatif, komposisi bahan pangan, serta auto-kalkulasi nutrisi jika `nutrition_service` diinjeksikan.
  - `update(payload)`: Pembaruan kartu menu, gramasi, dan estimasi biaya per porsi.
  - `submit_for_review(payload)`: Transisi status menu dari `Draft` / `Perlu Revisi` menjadi `Menunggu Persetujuan`.
  - `review(payload)`: Pencatatan keputusan peninjau gizi (`Disetujui`, `Perlu Revisi`, atau `Ditolak`) beserta nama reviewer dan catatan verifikasi.
  - `reorder(payload)`: Pengurutan ulang kartu siklus harian (kompatibel dengan drag-and-drop Anime.js v4) dengan validasi ketiadaan ID duplikat.

### C. Modul Kalkulasi Nutrisi Terverifikasi (`backend/services/nutrition.py`)
- **Class**: `NutritionService(food_composition_repository)`
- **Method yang Disediakan**:
  - `calculate(payload)`: Menghitung kandungan energi (kkal), protein (g), karbohidrat (g), lemak (g), bobot kotor, dan bobot bersih konsumsi per porsi serta per batch produksi.
- **Kebijakan & Keunggulan**:
  - Menggunakan acuan resmi **Tabel Komposisi Pangan Indonesia (TKPI)** Kemenkes RI 2019.
  - Memperhitungkan persentase **Bagian Dapat Dimakan (BDD %)** untuk setiap jenis bahan pangan segar.
  - Normalisasi satuan otomatis: gram (`g`/`gr`), kilogram (`kg`), miligram (`mg`), dan ons.
  - **Prinsip Anti-Fabrikasi**: Jika nama bahan masakan tidak ditemukan pada referensi resmi, sistem menetapkan `isVerified = False`, mencatatnya ke `unverifiedIngredients`, dan tidak mengarang angka nutrisi palsu.

### D. Modul Produksi Dapur Harian (`backend/services/production.py`)
- **Class**: `ProductionService(repository)`
- **Method yang Disediakan**:
  - `list(payload)`: Rekapitulasi batch produksi harian beserta filter tanggal.
  - `create(payload)`: Validasi keunikan kode batch (`batchCode`), format tanggal ISO, konsistensi porsi rencana vs realisasi aktual, status hari layanan efektif (`isEffectiveServiceDay`), dan inisialisasi linimasa 5 tahapan memasak dapur SPPG.
  - `update(payload)`: Pembaruan status batch (`Terjadwal` $\rightarrow$ `Sedang Berjalan` $\rightarrow$ `Selesai`), penyesuaian porsi riil, dan pembaruan checklist linimasa pemasakan.
- **Konsistensi Mutu (QC Reconciler)**:
  Sistem secara ketat memvalidasi bahwa porsi lolos QC (`qcPassedPortions`) dan porsi ditolak (`rejectedPortions`) tidak boleh bernilai negatif dan total keduanya tidak boleh melebihi porsi riil yang dimasak (`actualPortions`).

---

## 4. Hasil Pengujian Unit (Pytest)

Pengujian dijalankan pada lingkungan Python 3.13.2 tanpa koneksi internet atau Supabase eksternal (*100% Hermetic Unit Tests*):

```powershell
py -m pytest tests/
```

**Hasil Eksekusi**:
```
============================= test session starts =============================
platform win32 -- Python 3.13.2, pytest-9.2.0, pluggy-1.7.0
rootdir: D:\Projek E-App
plugins: anyio-4.8.0
collected 40 items

tests\domain\test_wiliam_beneficiaries.py ............                   [ 30%]
tests\domain\test_wiliam_menus.py .........                              [ 52%]
tests\domain\test_wiliam_nutrition.py ........                           [ 72%]
tests\domain\test_wiliam_production.py ........                          [ 92%]
tests\test_contract.py ...                                               [100%]

============================= 40 passed in 0.33s ==============================
```

Seluruh 40 skenario pengujian lulus (100% PASS).

---

## 5. Panduan Integrasi untuk Gabriel (Backend & Eel Wiring)

Gabriel dapat langsung mengimpor service domain Wiliam ke dalam handler `@eel.expose` (`backend/handlers.py` atau modul platform Gabriel).

### Contoh Penggunaan pada Handler Eel Gabriel:

```python
import eel
from backend import create_response
from backend.services import (
    BeneficiaryService,
    MenuService,
    NutritionService,
    ProductionService,
)

# 1. Instansiasi dengan Supabase Repository Adapter yang dibuat Gabriel
# (atau gunakan InMemoryRepository sementara sebelum Supabase aktif)
beneficiary_service = BeneficiaryService(repository=supabase_beneficiary_adapter)
nutrition_service = NutritionService(food_composition_repository=supabase_food_adapter)
menu_service = MenuService(repository=supabase_menu_adapter, nutrition_service=nutrition_service)
production_service = ProductionService(repository=supabase_production_adapter)

@eel.expose
def beneficiaries_list(payload=None):
    try:
        data = beneficiary_service.list(payload)
        return create_response(success=True, data=data)
    except Exception as exc:
        return create_response(success=False, error=str(exc))

@eel.expose
def beneficiaries_create(payload=None):
    try:
        data = beneficiary_service.create(payload)
        return create_response(success=True, data=data)
    except (ValueError, LookupError) as exc:
        return create_response(success=False, error=str(exc))

@eel.expose
def menus_create(payload=None):
    try:
        data = menu_service.create(payload)
        return create_response(success=True, data=data)
    except (ValueError, LookupError) as exc:
        return create_response(success=False, error=str(exc))

@eel.expose
def production_create(payload=None):
    try:
        data = production_service.create(payload)
        return create_response(success=True, data=data)
    except (ValueError, LookupError) as exc:
        return create_response(success=False, error=str(exc))
```

### Konvensi Eksepsi:
- `ValueError`: Kesalahan format payload, input tidak valid, atau pelanggaran aturan bisnis (kembalikan `create_response(False, error=str(exc))`).
- `LookupError`: Data dengan ID yang diminta tidak ditemukan di database.
- Eksepsi Database (mis. koneksi Supabase putus): Diteruskan atau ditangkap oleh adapter Gabriel untuk logging yang aman.

---

## 6. Batasan yang Diketahui (Known Limitations)

1. **Dataset Pangan Tambahan**: Sebanyak 18 item makanan pokok dan lauk khas Indonesia telah dimuat sebagai standar verifikasi awal TKPI 2019. Bahan bumbu spesifik minor (seperti rempah lengkuas atau daun salam) belum memiliki entri terpisah dan dianjurkan dimasukkan ke master tabel pangan jika dibutuhkan pelacakan mikronutrien mikrogram di masa mendatang.
2. **Koneksi Supabase Nyata**: Implementasi Wiliam 100% berbasis *dependency injection* dan *Protocol*. Pemetaan ke tabel PostgreSQL fisik Supabase menjadi tanggung jawab Gabriel sesuai *Frozen Parallel Development Contract*.

---

## 7. Status Checklist Akhir Wiliam

- [x] Beneficiaries service selesai (`backend/services/beneficiaries.py`).
- [x] CRUD penerima manfaat selesai & teruji.
- [x] CSV import & validasi duplikat selesai.
- [x] Menu service selesai (`backend/services/menus.py`).
- [x] Approval workflow (Draft, Menunggu, Disetujui, Revisi, Ditolak) selesai.
- [x] Reorder siklus harian selesai.
- [x] Nutrition calculator selesai (`backend/services/nutrition.py`).
- [x] Sumber nutrisi resmi (TKPI 2019) dan BDD % terdokumentasi.
- [x] Production service selesai (`backend/services/production.py`).
- [x] QC consistency & selisih porsi selesai.
- [x] Unit test lulus 100% (40/40 tests PASS).
- [x] Fake/in-memory repository mandiri tersedia untuk seluruh modul.
- [x] Tidak ada data pribadi (PII) nyata di repositori.
- [x] Dokumentasi lengkap tersedia untuk Gabriel & tim.
