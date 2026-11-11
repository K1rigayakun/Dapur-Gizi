# Contributing to DapurGizi

Panduan lengkap kolaborasi, pembagian tanggung jawab anggota tim, konvensi penamaan branch/commit, serta alur kerja Pull Request tersedia di [`docs/contributing.md`](docs/contributing.md).

## Ringkasan Cepat

### 1. Pembagian Peran Tim
- **Michael**: UI/UX dan Frontend (`web/`, Dashboard, Budget UI, Anime.js v4).
- **Gabriel**: Backend, Eel, Supabase, Authentication, RLS, dan EXE Packaging (`main.py`, `backend/`, `sql/`).
- **Wiliam**: Beneficiary Management dan Menu & Nutrition.
- **Visel**: Distribution, Food Safety, dan Documentation.

### 2. Konvensi Branch & Alur Kerja
- Branch utama: `main`
- Branch fitur: `feature/<feature-name>`
- Branch perbaikan: `fix/<bug-name>`
- Alur kerja: `Issue → Branch → Development → Pull Request → Review → Merge`

### 3. Kontrak Integrasi Wajib
Seluruh fungsi Python yang dipanggil oleh JavaScript melalui Eel wajib mengikuti standar respons JSON yang didefinisikan pada [`docs/integration-contract.md`](docs/integration-contract.md):

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

### 4. Keamanan Kredensial
- Salin `.env.example` menjadi `.env` untuk konfigurasi lokal.
- **Dilarang keras** melakukan commit file `.env`, kunci API Supabase, atau direktori instruksi pribadi (`.agents/`).
