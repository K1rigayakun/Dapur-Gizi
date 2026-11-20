# Desain Database DapurGizi (Supabase PostgreSQL)

Dokumen ini adalah acuan skema final yang diimplementasikan pada
[`migrations/`](../migrations/). Nama berkas historis adalah
`database-design.md`; pada sistem berkas case-insensitive dokumen ini juga
dirujuk sebagai `docs/DATABASE-DESIGN.md`.

> **Status:** DDL sudah tersedia di `migrations/001_initial_schema.sql` dan
> `migrations/002_rls_policies.sql`. Belum dijalankan ke database production
> pada sesi ini. Seed DEMO terpisah dan dijaga guard.

---

## 1. Prinsip

1. Skema dibangun dari field yang benar-benar dipakai frontend
   (`INTEGRATION.md`, `web/js/services/mock-api.js`) dan kontrak service.
2. Batas API tetap **camelCase**; kolom database **snake_case**.
3. Setiap tabel: primary key, `created_at`, `updated_at` (bila mutable),
   constraint, index untuk kolom filter, dan RLS.
4. Data pribadi diminimalkan. NIK hanya ada di `beneficiaries` dan tidak
   pernah dilog penuh.
5. Data DEMO tidak pernah dianggap data operasional. Angka anggaran DEMO
   wajib `is_demo_config = true` dan memiliki `reference_source`.

## 2. Peta Entitas

| Tabel | Domain | PIC data | Keterangan |
| :--- | :--- | :--- | :--- |
| `app_users` | Profil & peran | Gabriel | 1:1 dengan `auth.users` |
| `app_settings` | Pengaturan unit | Gabriel | satu baris per unit |
| `budget_parameters` | Anggaran | Gabriel | satu baris aktif |
| `budget_parameter_history` | Audit anggaran | Gabriel | snapshot setiap perubahan |
| `beneficiaries` | Penerima manfaat | Wiliam | 6 kategori MBG |
| `food_compositions` | Referensi gizi | Wiliam | sumber & edisi wajib |
| `menus` | Menu harian | Wiliam | alur persetujuan |
| `menu_ingredients` | Bahan menu | Wiliam | opsional terhubung komposisi |
| `production_batches` | Produksi | Wiliam | target vs aktual, timeline JSONB |
| `distribution_routes` | Distribusi | Visel | status & berita acara terima |
| `hygiene_checklists` | Keamanan pangan | Visel | satu checklist per tanggal |
| `hygiene_items` | Keamanan pangan | Visel | item checklist |
| `slhs_certificates` | Keamanan pangan | Visel | nomor, penerbit, masa berlaku |
| `food_safety_incidents` | Keamanan pangan | Visel | insiden & tindakan |
| `food_waste_records` | Keamanan pangan | Visel | berat & penanganan |
| `notifications` | Notifikasi | Gabriel | bisa per pengguna/unit |
| `audit_logs` | Audit | Gabriel | append-only |

## 3. Ringkasan Kolom Penting

### `app_users`
`id uuid PK → auth.users`, `email`, `full_name`, `role` (4 peran),
`phone`, `unit_code`, `status` (`Aktif`/`Nonaktif`/`Menunggu Aktivasi`),
`last_login`, kolom audit.
Unique index pada `lower(email)`.

### `app_settings`
`unit_code` unik, `unit_name`, `head_name`, `city`,
`enable_sound_alerts`, `enable_desktop_toast`, `auto_refresh_interval_sec`
(5–3600), `default_shift_start`, kolom audit.

### `budget_parameters`
`config_label`, `reference_source`, `effective_date`,
`monthly_allocation_ceiling > 0`,
`standard_food_cost_ceiling_per_portion >= 0`,
`standard_operational_cost_ceiling_per_portion >= 0`,
`daily_facility_incentive_rate >= 0`,
`target_daily_portions_baseline`, `effective_service_days_in_month` (0–31),
`warning_threshold_percent` (0–100), `is_demo_config`, `is_active`.
Partial unique index memastikan hanya satu baris `is_active = true`.

### `budget_parameter_history`
`parameter_id`, `snapshot jsonb`, `config_label`, `reference_source`,
`effective_date`, `changed_by`, `changed_at`, `change_type`
(`create`/`update`/`activate`), `notes`.

### `beneficiaries`
`nik` unik dan opsional, format 10–16 digit; `full_name`; `category`
(`Siswa SD`, `Siswa SMP`, `Siswa SMA`, `Ibu Hamil`, `Ibu Menyusui`,
`Balita`); `institution`; `grade_or_group`; `status`; `notes`;
`registered_at`; `source_reference`; kolom audit.

### `menus` / `menu_ingredients`
`menus`: `week_label`, `day_name`, `menu_date`, `order_index`, `name`,
`target_category`, `planned_portions`, `calories_kcal`, `protein_gram`,
`carbs_gram`, `fat_gram`, `cost_estimate_per_portion`, `status`
(`Draft`/`Menunggu Persetujuan`/`Disetujui`/`Perlu Revisi`/`Ditolak`),
`reviewed_by`, `review_notes`.
`menu_ingredients`: `menu_id` (cascade), `food_composition_id` (set null),
`name`, `amount_gr`, `role`.

### `production_batches`
`production_date`, `day_label`, `menu_id`, `menu_name`, `batch_code` unik,
`planned_portions`, `actual_portions`, `qc_passed_portions`,
`rejected_portions`, `food_cost_total`, `operational_cost_total`,
`is_effective_service_day`, `status`, `lead_chef`, `notes`,
`timeline jsonb`.

### `distribution_routes`
`route_code`, `distribution_date` (unik per rute+tanggal),
`destination_name/type`, `address`, `driver_name`, `departure_time`,
`eta_time`, `received_time`, `dispatched_portions`, `received_portions`
(`<= dispatched`), `status` (`Siap Kirim`/`Dalam Perjalanan`/`Diterima`/
`Gagal`), `receiver_name`, `notes`, `production_id`.

### Keamanan pangan
- `hygiene_checklists`: `checklist_date` unik, `inspector_name`,
  `score_percent`, `status`, `last_updated`.
- `hygiene_items`: `checklist_id`, `item_code` (unik per checklist),
  `area`, `parameter`, `checked`, `notes`.
- `slhs_certificates`: `certificate_number` unik, `document_name`,
  `issued_by`, `issue_date`, `expiry_date`, `status`, `source_reference`.
- `food_safety_incidents`: `incident_date`, `title`, `severity`, `location`,
  `reported_by`, `status`, `action_taken`.
- `food_waste_records`: `waste_date`, `category`, `weight_kg`,
  `percentage_of_batch` (0–100), `handling_method`, `notes`.

### `notifications`
`title`, `message`, `category`, `related_route`, `recipient_id`
(null = untuk unit), `unit_code`, `is_read`, `occurred_at`.

## 4. Index

Index dibuat untuk kolom yang dipakai filter/urut:

- `beneficiaries(status)`, `(category)`, `(institution)`
- `menus(menu_date)`, `(status)`, `(order_index)`
- `production_batches(production_date)`, `(status)`
- `distribution_routes(distribution_date, route_code)` unik, `(status)`
- `hygiene_items(checklist_id)`
- `slhs_certificates(expiry_date)`
- `food_safety_incidents(incident_date desc)`
- `food_waste_records(waste_date desc)`
- `notifications(occurred_at desc)`, partial index unread
- `budget_parameter_history(parameter_id, changed_at desc)`
- `audit_logs(occurred_at desc)`

## 5. RLS

Semua tabel mengaktifkan RLS. Peran dibaca dari `app_users` melalui
`public.has_app_role(text[])` (`SECURITY DEFINER`), sehingga klaim frontend
tidak dapat memalsukan peran.

| Tabel | Baca | Tulis |
| :--- | :--- | :--- |
| `app_users` | diri sendiri + Kepala | Kepala |
| `app_settings` | semua terautentikasi | Kepala |
| `budget_parameters`, `budget_parameter_history` | semua terautentikasi | Kepala, Keuangan |
| `beneficiaries` | semua terautentikasi | Kepala, Gizi |
| `menus`, `menu_ingredients`, `food_compositions` | semua terautentikasi | Kepala, Gizi |
| `production_batches` | semua terautentikasi | Kepala, Gizi, Sanitasi |
| `distribution_routes` | semua terautentikasi | Kepala, Sanitasi |
| `hygiene_*`, `slhs_*`, `incidents`, `food_waste` | semua terautentikasi | Kepala, Sanitasi |
| `notifications` | penerima/unit/Kepala | pengguna terkait; hapus Kepala |
| `audit_logs` | Kepala | trigger `SECURITY DEFINER` |

Catatan: Gizi dapat **membaca** penerima manfaat (kebutuhan menu & laporan)
tetapi hanya Kepala/Gizi yang boleh **menulis**.

## 6. Audit

- `created_at`, `updated_at`, `created_by`, `updated_by` tersedia pada tabel
  yang mutable. Trigger `set_updated_at` memperbarui `updated_at`.
- `source_reference` dipakai untuk menandai sumber data eksternal/seed.
- Perubahan `budget_parameters` menulis `budget_parameter_history` dan
  `audit_logs`.
- `audit_logs` tidak dapat ditulis langsung oleh pengguna terautentikasi.

## 7. Urutan Migrasi

1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_seed_demo.sql` (opsional, hanya setelah
   `set dapurgizi.allow_demo_seed = 'on'`)

Detail operasional ada di [`migrations/README.md`](../migrations/README.md).

## 8. Kewajiban Pemilik Domain

Wiliam dan Visel wajib memakai `Repository` (bukan Supabase client langsung),
membuat fake/in-memory repository, menulis unit test tanpa Supabase, dan
mendokumentasikan method repository tambahan bila diperlukan. Gabriel
menyediakan adapter Supabase, transaksi, handler, auth, dan RLS.
