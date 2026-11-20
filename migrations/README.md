# Migrasi Database DapurGizi

Semua berkas di direktori ini adalah SQL untuk **Supabase PostgreSQL**.
Tidak ada migrasi yang dijalankan otomatis oleh aplikasi.

| Urutan | Berkas | Isi |
| :--- | :--- | :--- |
| 1 | `001_initial_schema.sql` | Tabel, constraint, index, trigger `updated_at` |
| 2 | `002_rls_policies.sql` | Helper peran, RLS untuk seluruh tabel, policy, audit trigger |
| 3 | `003_seed_demo.sql` | Seed data sintetis DEMO (opsional, dijaga guard) |

## Prasyarat

1. Project Supabase aktif dan skema `auth` tersedia (bawaan Supabase).
2. Ekstensi `pgcrypto` diizinkan (disediakan Supabase).
3. Role `authenticated` tersedia (bawaan Supabase).
4. Kredensial database/SQL editor dipegang operator — **bukan** disimpan di repo.

## Cara menjalankan (terkendali)

Jalankan berurutan melalui SQL editor Supabase atau `psql`:

```sql
-- 1
\i migrations/001_initial_schema.sql
-- 2
\i migrations/002_rls_policies.sql
```

Seed DEMO hanya untuk database pengembangan. Guard mencegah eksekusi tanpa
izin eksplisit:

```sql
set dapurgizi.allow_demo_seed = 'on';
\i migrations/003_seed_demo.sql
```

Di SQL editor yang tidak mendukung `SET` antar perintah, jalankan blok seed
dari sesi `psql` yang sama. Jangan menyalin isi seed ke production.

## Setelah migrasi

1. Buat pengguna Supabase Auth (lihat `docs/BACKEND-ARCHITECTURE.md`
   bagian *Provisioning pengguna*).
2. Isi `public.app_users` untuk setiap pengguna Auth: `id` (sama dengan
   `auth.users.id`), `email`, `full_name`, `role`, `status = 'Aktif'`.
3. Konfigurasi unit pada `public.app_settings`.
4. Konfigurasi parameter anggaran pada `public.budget_parameters` dengan
   `config_label`, `reference_source`, `effective_date`, dan `is_demo_config`
   yang jujur. Tanpa sumber resmi, gunakan `is_demo_config = true`.

## Rollback

Tidak ada rollback destruktif otomatis. Untuk lingkungan pengembangan,
urutan pembongkaran manual adalah kebalikan dari urutan pembuatan
(`audit_logs` → ... → `app_users`). Jangan menjalankan `DROP` pada database
production tanpa persetujuan dan backup.

## Aturan kontribusi migrasi

- Migrasi baru harus **aditif** dan diberi nomor urut berikutnya.
- Jangan mengubah migrasi yang sudah dijalankan di environment bersama.
- Setiap tabel baru wajib: primary key, `created_at`, `updated_at`,
  constraint yang jelas, index untuk kolom filter, dan RLS + policy.
- Jangan menambahkan seed otomatis ke migrasi skema.
