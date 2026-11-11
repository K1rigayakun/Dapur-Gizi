# Direktori Backend (`backend/`)

Direktori ini menyimpan seluruh logika bisnis sisi server Python, jembatan komunikasi Eel (`@eel.expose`), serta koneksi ke Supabase PostgreSQL.

## Penanggung Jawab Utama
- **Gabriel**: Arsitektur backend Python, integrasi Eel, Supabase client, autentikasi, kebijakan RLS, dan packaging executable.
- **Wiliam & Visel**: Berkolaborasi pada fungsi handler domain spesifik sesuai kontrak integrasi.

## Aturan Modul Backend
1. Semua fungsi yang dipanggil dari JavaScript wajib menggunakan decorator `@eel.expose` dan mengembalikan struktur respons standar melalui fungsi `create_response()` di [`backend/__init__.py`](__init__.py):
   ```json
   {
     "success": true,
     "data": null,
     "error": null
   }
   ```
2. Kredensial Supabase (`SUPABASE_URL` dan `SUPABASE_ANON_KEY`) wajib dibaca dari variabel lingkungan (`.env`) menggunakan `python-dotenv` dan tidak boleh ditulis langsung (*hardcoded*) di dalam kode sumber.
3. Tangani seluruh eksepsi (`try...except`) di lapisan Python agar kegagalan database atau jaringan dikembalikan sebagai `{ "success": false, "data": null, "error": "Pesan kesalahan" }` tanpa menghentikan proses aplikasi.
