# Sumber Data Komposisi Pangan & Metodologi Perhitungan Gizi (`NUTRITION-DATA-SOURCES.md`)
**Pemilik Modul (PIC)**: Wiliam — *Beneficiaries, Menu, Nutrition & Production Engineer*  
**Proyek**: DapurGizi — Sistem Informasi Manajemen Operasional SPPG (Program Makanan Bergizi Gratis)  
**Versi Dokumen**: 1.0.0 (November 2026)

---

## 1. Landasan & Kebijakan Anti-Fabrikasi Data Gizi

Sesuai dengan **Standar Data Tim DapurGizi**:
> *"Jangan mengarang nilai nutrisi dan standar gizi. Setiap data resmi harus mempunyai sumber yang bisa diperiksa. Data yang tidak tersedia harus ditampilkan sebagai belum tersedia, bukan dibuat-buat."*

Modul kalkulasi nutrisi (`backend/services/nutrition.py`) menerapkan prinsip kepatuhan berikut:
1. **Verifikasi Sumber Tunggal**: Seluruh nilai makronutrien (energi, protein, lemak, karbohidrat) dan BDD (*Bagian Dapat Dimakan*) mengacu pada referensi resmi **Tabel Komposisi Pangan Indonesia (TKPI)** yang diterbitkan oleh Kementerian Kesehatan Republik Indonesia (Kemenkes RI, Edisi 2019).
2. **Penolakan Fabrikasi**: Apabila suatu bahan masakan belum terdaftar pada basis data referensi, sistem menandai komposisi menu dengan flag `isVerified = False` dan mencatat nama bahan ke dalam daftar `unverifiedIngredients`, tanpa mengarang angka kalori fiktif.
3. **Audit Jejak**: Setiap bahan yang lolos verifikasi melampirkan metadata sumber (`sourceName`, `edition`, dan `code`).

---

## 2. Metodologi & Rumus Perhitungan Gizi

### A. Konversi Satuan ke Gram Dasar
Sistem menerima input gramasi dalam berbagai satuan operasional dapur dan menormalkannya ke satuan gram ($g$):
- $1\text{ kg} = 1.000\text{ g}$
- $1\text{ ons} = 100\text{ g}$
- $1\text{ g} = 1\text{ gr} = 1.0\text{ g}$
- $1\text{ mg} = 0,001\text{ g}$

### B. Faktor Bagian Dapat Dimakan (BDD / *Edible Portion*)
Tidak seluruh bobot kotor (*gross weight*) bahan pangan dapat dikonsumsi (misalnya kulit buah pisang, tulang ikan, atau cangkang telur). TKPI mendefinisikan persentase BDD ($0\% \text{ s.d. } 100\%$).

$$W_{\text{edible}} = W_{\text{gross}} \times \left( \frac{\text{BDD}}{100} \right)$$

### C. Kalkulasi Makronutrien per Porsi
Setiap item pada TKPI memiliki bobot basis acuan ($W_{\text{basis}}$, standar $100\text{ g}$). Nilai nutrisi dihitung dengan faktor skala:

$$\text{Skala} = \frac{W_{\text{edible}}}{W_{\text{basis}}}$$

$$\text{Energi (kkal)} = \text{Skala} \times \text{Energi}_{\text{basis}}$$

$$\text{Protein (g)} = \text{Skala} \times \text{Protein}_{\text{basis}}$$

$$\text{Lemak (g)} = \text{Skala} \times \text{Lemak}_{\text{basis}}$$

$$\text{Karbohidrat (g)} = \text{Skala} \times \text{Karbohidrat}_{\text{basis}}$$

### D. Skalasi Batch Produksi
Untuk kebutuhan belanja dapur dan batch masak besar ($N$ porsi):
$$\text{Nutrien}_{\text{batch}} = \text{Nutrien}_{\text{porsi}} \times N$$
$$\text{Bobot Total}_{\text{batch}} = W_{\text{gross, porsi}} \times N$$

---

## 3. Katalog Data Referensi Pangan Terverifikasi (TKPI 2019)

Katalog acuan yang dimuat secara bawaan pada `InMemoryFoodCompositionRepository`:

| Kode Pangan | Nama Bahan Pangan Acuan | Kategori Pangan | Basis Acuan | BDD (%) | Energi (kkal) | Protein (g) | Lemak (g) | Karbohidrat (g) | Sumber Resmi |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `TKPI-A001` | Beras giling varietas medium | Makanan Pokok / Serealia | 100 g | 100% | 360,0 | 6,8 | 0,7 | 78,9 | Kemenkes RI 2019 |
| `TKPI-B001` | Daging ayam ras fillet segar | Lauk Hewani (Unggas) | 100 g | 100% | 298,0 | 18,2 | 25,0 | 0,0 | Kemenkes RI 2019 |
| `TKPI-B002` | Telur ayam ras segar | Lauk Hewani (Telur) | 100 g | 90% | 154,0 | 12,4 | 10,8 | 0,7 | Kemenkes RI 2019 |
| `TKPI-B003` | Daging sapi segar has dalam | Lauk Hewani (Daging Merah) | 100 g | 100% | 201,0 | 18,8 | 14,0 | 0,0 | Kemenkes RI 2019 |
| `TKPI-C001` | Ikan kembung segar | Lauk Hewani (Ikan Laut) | 100 g | 80% | 112,0 | 21,4 | 2,3 | 0,0 | Kemenkes RI 2019 |
| `TKPI-C002` | Ikan patin / dori fillet segar | Lauk Hewani (Ikan Tawar/Fillet) | 100 g | 100% | 97,0 | 16,0 | 3,0 | 0,0 | Kemenkes RI 2019 |
| `TKPI-D001` | Tahu kedelai segar | Lauk Nabati (Olahan Kedelai) | 100 g | 100% | 80,0 | 10,9 | 4,7 | 0,8 | Kemenkes RI 2019 |
| `TKPI-D002` | Tempe kedelai murni fermentasi | Lauk Nabati (Fermentasi Kedelai) | 100 g | 100% | 201,0 | 20,8 | 8,8 | 13,5 | Kemenkes RI 2019 |
| `TKPI-E001` | Wortel segar | Sayuran Segar | 100 g | 88% | 36,0 | 1,0 | 0,6 | 7,9 | Kemenkes RI 2019 |
| `TKPI-E002` | Brokoli segar | Sayuran Segar | 100 g | 75% | 34,0 | 2,8 | 0,4 | 6,6 | Kemenkes RI 2019 |
| `TKPI-E003` | Bayam segar | Sayuran Daun Hijau | 100 g | 71% | 16,0 | 0,9 | 0,4 | 2,9 | Kemenkes RI 2019 |
| `TKPI-E004` | Labu siam segar | Sayuran Buah | 100 g | 83% | 26,0 | 0,6 | 0,1 | 6,7 | Kemenkes RI 2019 |
| `TKPI-F001` | Pisang barangan segar | Buah Segar | 100 g | 68% | 128,0 | 1,2 | 0,2 | 31,8 | Kemenkes RI 2019 |
| `TKPI-F002` | Pepaya kalifornia segar | Buah Segar | 100 g | 75% | 46,0 | 0,5 | 0,1 | 12,2 | Kemenkes RI 2019 |
| `TKPI-F003` | Semangka merah segar | Buah Segar | 100 g | 46% | 28,0 | 0,5 | 0,2 | 6,9 | Kemenkes RI 2019 |
| `TKPI-F004` | Melon hijau segar | Buah Segar | 100 g | 70% | 37,0 | 0,6 | 0,1 | 8,2 | Kemenkes RI 2019 |
| `TKPI-F005` | Jeruk manis berastagi segar | Buah Segar | 100 g | 72% | 45,0 | 0,9 | 0,2 | 11,2 | Kemenkes RI 2019 |
| `TKPI-G001` | Minyak kelapa sawit murni | Minyak & Lemak Nabati | 100 g | 100% | 884,0 | 0,0 | 100,0 | 0,0 | Kemenkes RI 2019 |

---

## 4. Ekstensi Dataset & Integrasi Masa Depan

Repositori didesain menggunakan interface `FoodCompositionRepositoryProtocol`:
```python
class FoodCompositionRepositoryProtocol(Protocol):
    def get_by_code(self, code: str) -> dict[str, Any] | None: ...
    def search_by_name(self, name: str) -> dict[str, Any] | None: ...
    def list_all(self) -> list[dict[str, Any]]: ...
```

Hal ini memungkinkan Gabriel atau tim basis data untuk menghubungkan tabel PostgreSQL Supabase (`nutrition_standards` / `food_compositions`) tanpa perlu mengubah sedikit pun logika kalkulasi matematika di dalam `NutritionService`.
