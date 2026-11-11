# DapurGizi — Sistem Manajemen Operasional MBG Tingkat SPPG

**DapurGizi** adalah aplikasi desktop Windows berbasis Python **Eel** dan **Supabase PostgreSQL** untuk mendukung pengelolaan operasional harian Satuan Pelayanan Pemenuhan Gizi (SPPG) pada Program Makan Bergizi Gratis (MBG).

---

## 1. Teknologi Utama

- **Runtime & Backend**: Python 3.13, [Eel](https://github.com/python-eel/Eel) (`0.18.2`), `python-dotenv` (`1.2.2`)
- **Database & Autentikasi**: [Supabase](https://supabase.com/) PostgreSQL, Supabase Auth, Row Level Security (RLS), `supabase-py` (`2.30.0`)
- **Frontend Desktop**: HTML5, CSS3, Modern Vanilla JavaScript, Anime.js v4 (transisi & micro-interactions), Ikon SVG
- **Packaging & Pengujian**: PyInstaller (`6.22.2`) untuk distribusi `.exe`, `pytest` (`9.0.3`)

---

## 2. Struktur Direktori

```text
DapurGizi-Development/
├── backend/                  # Paket logika bisnis Python & handler Eel
│   ├── __init__.py           # Helper respons standar create_response()
│   └── README.md
├── web/                      # Aset antarmuka pengguna (HTML, CSS, JS, SVG)
│   ├── index.html            # Shell aplikasi utama
│   ├── css/
│   ├── js/
│   ├── assets/
│   └── README.md
├── sql/                      # Skrip DDL & migrasi database Supabase
│   └── README.md
├── tests/                    # Pengujian unit otomatis (pytest)
├── docs/                     # Dokumentasi teknis bersama tim
│   ├── architecture.md
│   ├── database-design.md
│   ├── integration-contract.md
│   └── contributing.md
├── testing/                  # Direktori tangkapan layar pengujian UI
│   └── screenshots/
├── .gitignore
├── .env.example              # Template konfigurasi environment (tanpa rahasia)
├── CONTRIBUTING.md           # Ringkasan panduan kolaborasi tim
├── requirements.txt          # Daftar dependensi Python terverifikasi
├── main.py                   # Entrypoint aplikasi desktop Eel
└── README.md
```

---

## 3. Panduan Menjalankan Proyek Secara Lokal

### A. Prasyarat
- Python 3.13+
- Browser berbasis Chromium (Google Chrome / Microsoft Edge) untuk jendela desktop Eel
- Git

### B. Instalasi Lingkungan Kerja
1. Clone repositori:
   ```powershell
   git clone https://github.com/K1rigayakun/Dapur-Gizi.git
   cd Dapur-Gizi
   ```
2. Buat dan aktifkan virtual environment lokal:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
3. Instal dependensi:
   ```powershell
   pip install -r requirements.txt
   ```
4. Salin `.env.example` menjadi `.env` dan isi nilai konfigurasi Supabase lokal:
   ```powershell
   Copy-Item .env.example .env
   ```

### C. Menjalankan Aplikasi & Pengujian
- Menjalankan shell aplikasi desktop:
  ```powershell
  python main.py
  ```
- Menjalankan pengujian otomatis:
  ```powershell
  pytest
  ```

---

## 4. Dokumentasi Teknis & Kontrak Kolaborasi

Seluruh anggota tim wajib membaca dokumen berikut sebelum mengembangkan fitur pada branch masing-masing:

1. [**Arsitektur Sistem (`docs/architecture.md`)**](docs/architecture.md)
2. [**Kontrak Integrasi Frontend-Backend (`docs/integration-contract.md`)**](docs/integration-contract.md)
3. [**Desain Fondasi Database (`docs/database-design.md`)**](docs/database-design.md)
4. [**Panduan Kontribusi & Alur GitHub (`docs/contributing.md`)**](docs/contributing.md)

---

## 5. Tim Pengembang & Pembagian Tanggung Jawab

| Anggota Tim | Tanggung Jawab Utama |
|---|---|
| **Michael** | UI/UX dan Frontend (`web/`, Dashboard, Budget & Incentive UI, Anime.js v4) |
| **Gabriel** | Backend Python, Eel, Supabase, Authentication, RLS, dan EXE Packaging |
| **Wiliam** | Modul Beneficiary Management serta Menu & Nutrition |
| **Visel** | Modul Distribution, Food Safety, dan Dokumentasi Proyek |
