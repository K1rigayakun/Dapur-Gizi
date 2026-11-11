# Desain Fondasi Database DapurGizi (Supabase PostgreSQL)

Dokumen ini merangkum rancangan entitas database untuk proyek **DapurGizi** berdasarkan catatan spesifikasi proyek yang telah ditetapkan tim.

> **Catatan Status**: Dokumen ini merupakan acuan desain fondasi. Skrip migrasi produksi (`.sql`) belum dibuat dan akan diimplementasikan oleh **Gabriel** bersama pemilik modul terkait pada direktori [`sql/`](../sql/).

---

## 1. Pemisahan Kebutuhan Terkonfirmasi vs Usulan Desain

Untuk menjaga akurasi pengembangan dan menghindari asumsi sepihak, rancangan dibagi menjadi dua kategori:

### A. Kebutuhan Terkonfirmasi (Confirmed Requirements)
Berdasarkan daftar fitur dan spesifikasi proyek DapurGizi:
1. **Platform Database**: PostgreSQL yang di-host pada **Supabase**.
2. **Otentikasi & Otorisasi**: Menggunakan **Supabase Auth** dengan pembatasan hak akses berbasis peran (*Role-Based Access Control*).
3. **Keamanan Baris Data**: Seluruh tabel wajib mengaktifkan **Row Level Security (RLS)** di Supabase (dikelola oleh Gabriel).
4. **Cakupan 8 Kelompok Entitas Domain**:
   - Profil & Peran Pengguna (`users` / `profiles`)
   - Penerima Manfaat (`beneficiaries`)
   - Menu Makanan (`menus`)
   - Standar Nilai Gizi (`nutrition_standards`)
   - Produksi Harian (`daily_productions`)
   - Anggaran & Insentif (`budgets` & `incentives`)
   - Distribusi Makanan (`distributions`)
   - Log Keamanan Pangan (`food_safety_logs`)

### B. Usulan Desain Teknis (Design Proposals — Menunggu Finalisasi DDL)
Hal-hal berikut merupakan usulan struktur teknis yang akan difinalisasi saat penulisan skrip SQL:
- Penamaan kolom fisik secara rinci, tipe data (`UUID`, `NUMERIC`, `TIMESTAMPTZ`), dan batasan kunci asing (*foreign key constraints*).
- Pemisahan atau penggabungan tabel `budgets` dan `incentives`.
- Rumus perhitungan nilai gizi dan insentif (tidak menggunakan rumus regulasi spekulatif; wajib merujuk pada ketentuan tugas praktikum yang disepakati tim).

---

## 2. Daftar Entitas yang Direncanakan

### 1. `profiles` (Login & Role Management — PIC: Gabriel)
- **Kebutuhan Terkonfirmasi**: Menyimpan profil akun petugas SPPG dan peran pengguna (Admin SPPG, Ahli Gizi, Koki/Produksi, Petugas Distribusi) yang terhubung dengan `auth.users` Supabase.
- **Usulan Atribut**: `id` (UUID, PK), `full_name`, `role`, `created_at`.

### 2. `beneficiaries` (Beneficiary Management — PIC: Wiliam)
- **Kebutuhan Terkonfirmasi**: Pendataan penerima manfaat program MBG yang mencakup identitas penerima, sekolah/lokasi, kelas/kelompok, serta catatan khusus atau alergi.
- **Usulan Atribut**: `id`, `full_name`, `school_name`, `class_group`, `allergy_notes`, `is_active`, `created_at`.

### 3. `menus` (Menu & Nutrition — PIC: Wiliam)
- **Kebutuhan Terkonfirmasi**: Pengelolaan rencana menu makanan harian/mingguan beserta informasi kandungan gizi dasar (kalori, protein, karbohidrat, mikronutrien).
- **Usulan Atribut**: `id`, `menu_name`, `menu_date`, `calories_kcal`, `protein_g`, `carbs_g`, `micronutrient_notes`, `created_at`.

### 4. `nutrition_standards` (Menu & Nutrition — PIC: Wiliam)
- **Kebutuhan Terkonfirmasi**: Tabel acuan standar kecukupan gizi untuk membandingkan kelayakan menu yang disusun.
- **Usulan Atribut**: `id`, `target_group`, `min_calories_kcal`, `min_protein_g`, `min_carbs_g`, `notes`.

### 5. `daily_productions` (Daily Production — PIC: Gabriel / Wiliam)
- **Kebutuhan Terkonfirmasi**: Pencatatan jadwal produksi harian di dapur SPPG, menu yang dimasak, jumlah porsi target, dan status persiapan bahan baku.
- **Usulan Atribut**: `id`, `production_date`, `menu_id` (FK), `planned_portions`, `actual_portions`, `status`, `created_at`.

### 6. `budgets` & `incentives` (Budget & Incentive Calculation — PIC: Michael & Gabriel)
- **Kebutuhan Terkonfirmasi**: Pencatatan rincian anggaran belanja bahan baku serta perhitungan insentif petugas operasional dapur SPPG.
- **Usulan Atribut**:
  - `budgets`: `id`, `period_date`, `ingredient_cost`, `operational_cost`, `notes`.
  - `incentives`: `id`, `period_date`, `staff_Or_role`, `amount`, `calculation_notes`.

### 7. `distributions` (Distribution — PIC: Visel)
- **Kebutuhan Terkonfirmasi**: Pelacakan alur pengiriman paket makanan dari dapur SPPG ke lokasi sekolah/penerima manfaat beserta status verifikasi serah terima.
- **Usulan Atribut**: `id`, `production_id` (FK), `destination_school`, `delivered_portions`, `recipient_pic`, `delivery_status`, `delivered_at`.

### 8. `food_safety_logs` (Food Safety — PIC: Visel)
- **Kebutuhan Terkonfirmasi**: Pencatatan checklist kendali mutu dan keamanan pangan (suhu makanan, waktu saji, status uji sampel, dan inspeksi kebersihan dapur).
- **Usulan Atribut**: `id`, `production_id` (FK), `temperature_celsius`, `serving_time`, `sample_test_passed`, `hygiene_notes`, `inspector_id` (FK), `checked_at`.

---

## 3. Prinsip Row Level Security (RLS)

1. Setiap tabel pada skema `public` wajib mengaktifkan RLS (`ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;`).
2. Kebijakan akses (*policy*) disesuaikan dengan peran pada tabel `profiles`:
   - **Admin SPPG**: Akses baca dan tulis penuh untuk pengelolaan operasional dan laporan.
   - **Ahli Gizi**: Akses pengelolaan pada `beneficiaries`, `menus`, dan `nutrition_standards`.
   - **Koki / Produksi**: Akses pembaruan pada `daily_productions`.
   - **Petugas Distribusi / QC**: Akses pencatatan pada `distributions` dan `food_safety_logs`.
