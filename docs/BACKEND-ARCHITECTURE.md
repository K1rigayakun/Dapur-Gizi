# Arsitektur Backend DapurGizi

Dokumen ini menjelaskan backend Python/Eel yang menjadi penghubung antara
frontend `web/` (milik Michael) dan Supabase PostgreSQL.

> **Sumber kebenaran kontrak API:** `INTEGRATION.md`.
> **Kontrak kerja tim:** *Frozen Parallel Development Contract*.
> Frontend tidak diubah oleh backend.

---

## 1. Alur Permintaan

```text
web/js/services/api.js
   └─ await eel.<nama_fungsi>(payload)()      (WebSocket Eel)
        └─ backend/handlers/<modul>.py        (tipis: validasi, sesi, izin)
             └─ backend/core/container.py     (dependency injection)
                  ├─ backend/auth/*           (sesi, provider, RBAC)
                  ├─ backend/services/*       (aturan bisnis)
                  └─ backend/database/*       (repository / Supabase adapter)
                       └─ Supabase PostgREST  (RLS mengevaluasi auth.uid())
```

Handler **tidak boleh** berisi aturan bisnis. Handler hanya:

1. menormalkan payload (`dict`),
2. memastikan sesi aktif,
3. memeriksa izin peran,
4. memanggil service domain,
5. membungkus hasil/error menjadi amplop respons.

## 2. Struktur Direktori Backend

```text
backend/
├── __init__.py                 create_response()
├── core/
│   ├── config.py               Settings dari environment/.env
│   ├── container.py            AppContainer + ServiceRegistry (lazy)
│   ├── errors.py               ConfigError, DatabaseError, ServiceUnavailableError
│   ├── logging_setup.py        logging + penyamaran token/NIK/password
│   └── responses.py            safe_handler -> amplop {success,data,error}
├── auth/
│   ├── provider.py             SupabaseAuthProvider, InMemoryAuthProvider
│   ├── rbac.py                 peran & matriks izin
│   ├── service.py              login/logout/session/reset/change password
│   └── session.py              SessionStore di memori proses
├── database/
│   ├── client.py               create_supabase_client (anon key saja)
│   ├── mappers.py              konversi snake_case <-> camelCase
│   ├── memory.py               InMemoryRepository (unit test)
│   └── repository.py           Protocol Repository + SupabaseRepository
├── services/
│   ├── budget.py               Gabriel — anggaran & insentif (Decimal)
│   ├── dashboard.py            Gabriel — agregasi lintas domain
│   ├── identity.py             Gabriel — pengguna/notifikasi/pengaturan
│   ├── beneficiaries.py        Wiliam (belum ada di branch ini)
│   ├── menus.py                Wiliam (belum ada di branch ini)
│   ├── nutrition.py            Wiliam (belum ada di branch ini)
│   ├── production.py           Wiliam (belum ada di branch ini)
│   ├── distribution.py         Visel (belum ada di branch ini)
│   ├── food_safety.py          Visel (belum ada di branch ini)
│   └── reports.py              Visel (belum ada di branch ini)
└── handlers/
    ├── _deps.py                helper sesi/izin/service
    ├── auth.py, dashboard.py, beneficiaries.py, menus.py, production.py,
    ├── budget.py, distribution.py, food_safety.py, reports.py, users.py,
    └── notifications.py, settings.py, system.py
```

## 3. Kontrak Respons

Semua fungsi `@eel.expose` mengembalikan tepat tiga kunci:

```json
{ "success": true,  "data": {}, "error": null }
{ "success": false, "data": null, "error": "Pesan aman berbahasa Indonesia" }
```

`backend/core/responses.py::safe_handler` memetakan error:

| Exception | Respons |
| :--- | :--- |
| `ValueError` | pesan validasi apa adanya |
| `LookupError` | pesan "tidak ditemukan" dari service |
| `PermissionError` | pesan sesi/izin |
| `ServiceUnavailableError` | "Layanan domain ... belum tersedia" |
| `ConfigError` | "Konfigurasi server belum lengkap." + log |
| `DatabaseError` | "Gagal mengakses database..." + log |
| `Exception` lain | pesan generik + log (detail tidak bocor) |

Tidak ada error yang diubah menjadi sukses. Tidak ada data palsu saat
database gagal.

## 4. Konfigurasi

Dibaca oleh `backend/core/config.py` dari `.env`/environment:

| Variabel | Default | Catatan |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | `development` / `test` / `production` |
| `APP_HOST`, `APP_PORT` | `localhost`, `8000` | jendela Eel |
| `APP_WINDOW_WIDTH/HEIGHT` | `1280`, `800` | jendela Eel |
| `APP_TIMEZONE` | `Asia/Jakarta` | tanggal operasional Indonesia |
| `SESSION_TTL_HOURS` | `8` | sesi normal |
| `REMEMBER_SESSION_TTL_HOURS` | `168` | "Ingat saya" |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | — | wajib untuk data nyata |

Placeholder `your-...` dari `.env.example` dianggap belum diisi.

**Larangan:** `SUPABASE_SERVICE_ROLE_KEY` tidak boleh ada di `.env` aplikasi,
frontend, maupun EXE. Test `tests/test_migrations.py` memeriksa larangan ini.

## 5. Autentikasi & Sesi

- `SupabaseAuthProvider` memakai `auth.sign_in_with_password` dengan **anon key**.
- Profil dan peran diambil dari tabel `public.app_users`, bukan dari klaim
  frontend atau `user_metadata`.
- Access token hanya disimpan di memori proses; frontend hanya menerima
  profil aman (`id, name, email, role, unit, phone`) dan `expiresAt`.
- `auth_get_session` mengabaikan payload browser dan membaca `SessionStore`.
- Logout menghapus sesi, memanggil `auth.sign_out()`, dan mencabut token
  PostgREST.
- Reset password selalu mengembalikan pesan generik agar keberadaan akun
  tidak bocor.
- Ubah kata sandi memvalidasi kata sandi lama dengan autentikasi ulang.

**Batasan yang disengaja:** satu sesi aktif per proses aplikasi desktop.
Bila suatu saat dibutuhkan multi-sesi, ubah `SessionStore` menjadi pemetaan
`session_id -> Session`.

## 6. RBAC

Matriks izin backend ada di `backend/auth/rbac.py` dan konsisten dengan
`web/js/utils/permissions.js` (keputusan desain proyek, bukan regulasi).

| Izin | Kepala | Gizi | Keuangan | Sanitasi |
| :--- | :---: | :---: | :---: | :---: |
| `manage_users`, `manage_settings` | ✓ | | | |
| `approve_menu`, `manage_menus` | ✓ | ✓ | | |
| `manage_beneficiaries` | ✓ | ✓ | | |
| `edit_production` | ✓ | ✓ | | ✓ |
| `configure_budget` | ✓ | | ✓ | |
| `manage_distribution`, `confirm_distribution` | ✓ | | | ✓ |
| `edit_hygiene` | ✓ | | | ✓ |
| `export_reports` | ✓ | ✓ | ✓ | ✓ |

Penyembunyian menu di frontend **bukan** pengaman; handler memeriksa izin dan
RLS database menegakkan aturan yang sama.

## 7. Kontrak Repository (untuk Wiliam & Visel)

`backend/database/repository.py::Repository` adalah satu-satunya akses
database. Service domain **tidak boleh** mengimpor Supabase.

| Method | Kegunaan |
| :--- | :--- |
| `select(table, filters=, order=, descending=, limit=, columns="*")` | baca banyak baris (equality filter) |
| `get(table, id)` | baca satu baris by PK |
| `insert(table, row)` | simpan satu baris |
| `insert_many(table, rows)` | impor massal |
| `update(table, id, patch)` | ubah sebagian kolom |
| `update_where(table, filters, patch)` | ubah banyak baris |
| `delete(table, id)` | hapus satu baris |
| `count(table, filters=)` | hitung baris |
| `rpc(name, params=)` | panggil fungsi PostgreSQL `SECURITY DEFINER` |
| `set_access_token(token)` | meneruskan JWT pengguna ke PostgREST |

Baris dikembalikan dengan **nama kolom snake_case**. Service wajib memetakan
ke camelCase pada batas API (lihat `backend/services/_mapping.py`).

Service dimuat secara lazy oleh `ServiceRegistry`. Selama modul domain belum
digabung, handler tetap terdaftar dan mengembalikan:

```json
{ "success": false, "data": null,
  "error": "Layanan domain 'beneficiaries' belum tersedia pada backend Python. ..." }
```

Tidak ada duplikasi logika domain Wiliam/Visel di handler.

## 8. Database & RLS

Ringkasan lengkap ada di `docs/database-design.md`. Prinsip:

- RLS aktif pada **semua** tabel `public`.
- Peran dievaluasi melalui `public.has_app_role(text[])` (`SECURITY DEFINER`)
  yang membaca `public.app_users` untuk `auth.uid()`.
- Tabel sensitif (`beneficiaries`) dapat dibaca pengguna terautentikasi untuk
  kebutuhan dashboard/report, tetapi hanya Kepala/Gizi yang boleh menulis.
- `budget_parameters` dapat dibaca semua peran (dashboard), ditulis hanya
  Kepala/Keuangan; setiap perubahan dicatat di `budget_parameter_history`
  dan `audit_logs`.
- `audit_logs` hanya dapat dibaca Kepala dan ditulis melalui trigger
  `SECURITY DEFINER`.

## 9. Aturan Uang & Tanggal

- Semua nominal dihitung dengan `Decimal`, dibulatkan sekali ke rupiah
  (half-up). Tidak ada aritmetika float untuk uang.
- Parameter anggaran wajib memiliki `configLabel`, `referenceSource`, dan
  `effectiveDate`. Angka DEMO wajib `isDemoConfig = true`.
- Tanggal operasional memakai zona `APP_TIMEZONE` (default `Asia/Jakarta`).
- Data DEMO dari `mock-api.js` **tidak** dipindahkan ke database production.

## 10. Logging & Privasi

`backend/core/logging_setup.py` menyamarkan:

- token JWT (`eyJ...`),
- `password|token|secret|api_key=...`,
- deret 10–16 digit (NIK/NISN).

Log tidak pernah memuat password, token, atau NIK lengkap. Data pribadi
tidak dikembalikan lebih dari yang dibutuhkan UI.

## 11. Provisioning Pengguna

Membuat kredensial Supabase Auth membutuhkan hak administratif yang tidak
boleh ikut ke EXE. Alur yang disarankan:

1. Operator membuat pengguna melalui Supabase Dashboard / Admin API
   (di luar aplikasi, memakai service role di lingkungan aman).
2. Operator mengisi baris `public.app_users` dengan `id` yang sama dengan
   `auth.users.id`, `role`, `unit_code`, dan `status = 'Aktif'`.
3. `users_create` di aplikasi hanya membuat/memperbarui profil dan
   menandai status `Menunggu Aktivasi` bila kredensial belum ada.

Batasan ini dicatat sebagai *known limitation* pada laporan backend.

## 12. Pengujian

```bash
python -m pytest -q
```

Test tidak membutuhkan Supabase: repository in-memory dan provider auth palsu
disuntikkan lewat `AppContainer`. Integration test ke Supabase hanya boleh
dinyatakan lulus bila benar-benar dijalankan terhadap project uji.

## 13. Paket Desktop

`DapurGizi.spec` menyiapkan PyInstaller dengan aset `web/` dan tanpa `.env`.
Status: **belum diverifikasi dengan build penuh**. Jangan mengklaim
production-ready sebelum build, login, dan seluruh halaman diuji terhadap
Supabase uji.
