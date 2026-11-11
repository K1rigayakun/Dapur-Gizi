# Panduan Kontribusi & Kolaborasi Tim DapurGizi

Dokumen ini mengatur pembagian tanggung jawab anggota tim, alur kerja GitHub, konvensi penamaan branch dan commit, serta checklist onboarding kolaborator untuk proyek **DapurGizi**.

---

## 1. Pembagian Tanggung Jawab Anggota Tim

Setiap anggota tim memiliki cakupan tanggung jawab utama yang tetap dan tidak boleh dialihkan secara sepihak:

| Anggota Tim | Tanggung Jawab Utama | Fokus Direktori & Modul |
|---|---|---|
| **Michael** | UI/UX dan Frontend | `web/` (Layout utama, Dashboard, Budget & Incentive UI, animasi Anime.js v4) |
| **Gabriel** | Backend, Eel, Supabase, Authentication, RLS, dan EXE Packaging | `main.py`, `backend/`, `sql/` (Koneksi Supabase, Auth, RLS, PyInstaller `.exe`) |
| **Wiliam** | Beneficiary dan Menu & Nutrition | Modul Penerima Manfaat (`beneficiaries`) dan Menu & Gizi (`menus`, `nutrition_standards`) |
| **Visel** | Distribution, Food Safety, dan Documentation | Modul Distribusi (`distributions`), Keamanan Pangan (`food_safety_logs`), dan Dokumentasi Proyek |

---

## 2. Alur Kerja Kolaborasi GitHub

Seluruh pengembangan fitur dan perbaikan bug wajib mengikuti alur standar berikut:

```text
Issue  -->  Branch  -->  Development  -->  Pull Request  -->  Review  -->  Merge
```

1. **Issue**: Buat atau pilih Issue di GitHub yang mendeskripsikan fitur atau perbaikan yang akan dikerjakan sesuai peran masing-masing.
2. **Branch**: Buat branch baru dari `main` yang selalu mutakhir (`git pull origin main`).
3. **Development**: Kerjakan kode pada branch tersebut dengan mematuhi [`docs/integration-contract.md`](integration-contract.md).
4. **Pull Request (PR)**: Push branch ke GitHub dan buka Pull Request ke branch `main`.
5. **Review**: Minimal satu rekan tim memeriksa kesesuaian kontrak JSON, ketiadaan konflik, dan keamanan file (`.env` tidak ikut ter-commit).
6. **Merge**: Gabungkan (*merge*) PR ke `main` setelah disetujui.

---

## 3. Konvensi Penamaan Branch

- **`main`**: Branch utama yang stabil. Dilarang melakukan push langsung ke `main` tanpa kesepakatan tim.
- **`feature/<feature-name>`**: Digunakan untuk pengembangan modul atau fitur baru.
  - Contoh (Michael): `feature/dashboard-ui`, `feature/budget-incentive-ui`
  - Contoh (Gabriel): `feature/supabase-auth`, `feature/pyinstaller-packaging`
  - Contoh (Wiliam): `feature/beneficiary-management`, `feature/menu-nutrition`
  - Contoh (Visel): `feature/distribution-tracking`, `feature/food-safety-checklist`
- **`fix/<bug-name>`**: Digunakan untuk perbaikan bug atau kendala integrasi.
  - Contoh: `fix/eel-response-handling`, `fix/rls-policy-read`

---

## 4. Konvensi Penamaan Commit

Gunakan awalan (*prefix*) yang jelas dan deskriptif:

- `feat: <deskripsi singkat>` — Menambahkan fitur atau modul baru.
- `fix: <deskripsi singkat>` — Memperbaiki bug atau error.
- `docs: <deskripsi singkat>` — Memperbarui dokumentasi proyek.
- `refactor: <deskripsi singkat>` — Merapikan struktur kode tanpa mengubah perilaku fitur.
- `test: <deskripsi singkat>` — Menambahkan atau memperbarui pengujian di `tests/`.
- `chore: <deskripsi singkat>` — Pembaruan konfigurasi proyek atau dependensi.

Contoh:
- `feat: add beneficiary registration handler and form`
- `docs: update integration contract examples`

---

## 5. Checklist Pull Request (PR)

Sebelum mengajukan Pull Request ke `main`, pastikan:
- [ ] Kode berjalan tanpa error pada Python 3.13 menggunakan `requirements.txt` proyek.
- [ ] Seluruh fungsi `@eel.expose` mengembalikan format `{ "success": bool, "data": ..., "error": ... }` melalui `create_response()`.
- [ ] Tidak ada file `.env`, kunci API Supabase, atau file konfigurasi pribadi yang ikut ter-stage (`git status`).
- [ ] Pengujian dasar (`pytest`) lulus tanpa kegagalan.

---

## 6. Checklist Onboarding Kolaborator GitHub

> **Penting**: Jangan menebak username GitHub anggota tim dan jangan mengubah izin repositori sebelum username dikonfirmasi langsung oleh pemilik akun.

Repositori: [https://github.com/K1rigayakun/Dapur-Gizi](https://github.com/K1rigayakun/Dapur-Gizi)

| Anggota Tim | Peran Modul | Konfirmasi Username GitHub | Undangan Dikirim | Undangan Diterima | Clone & Setup `.env` Lokal |
|---|---|---|---|---|---|
| **Gabriel** | Backend, Eel, Supabase, Auth, RLS, Packaging | [ ] Belum dikonfirmasi | [ ] | [ ] | [ ] |
| **Wiliam** | Beneficiary, Menu & Nutrition | [ ] Belum dikonfirmasi | [ ] | [ ] | [ ] |
| **Visel** | Distribution, Food Safety, Documentation | [ ] Belum dikonfirmasi | [ ] | [ ] | [ ] |
