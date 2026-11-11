# Arsitektur Sistem DapurGizi

Dokumen ini menjelaskan arsitektur teknis aplikasi **DapurGizi** (Sistem Manajemen Operasional Program Makan Bergizi Gratis / MBG tingkat Satuan Pelayanan Pemenuhan Gizi / SPPG).

---

## 1. Gambaran Umum Arsitektur

DapurGizi dibangun sebagai aplikasi desktop Windows mandiri (`.exe`) menggunakan pendekatan hibrida: antarmuka web modern yang dirender di dalam jendela desktop melalui **Python Eel**, dengan penyimpanan data terpusat pada **Supabase PostgreSQL**.

```text
+-------------------------------------------------------------------+
|               Aplikasi Desktop Windows (PyInstaller .exe)         |
|                                                                   |
|  +-------------------------------------------------------------+  |
|  |                  Lapisan Antarmuka (web/)                   |  |
|  |  - HTML5, CSS3, Vanilla JavaScript                          |  |
|  |  - Anime.js v4 (Transisi UI & Micro-interactions)           |  |
|  |  - Ikon SVG (Tanpa Emoji)                                   |  |
|  +------------------------------^------------------------------+  |
|                                 |                                 |
|                                 | Jembatan IPC Eel (WebSocket)    |
|                                 | Kontrak JSON:                   |
|                                 | { success, data, error }        |
|                                 v                                 |
|  +-------------------------------------------------------------+  |
|  |               Lapisan Backend Python (backend/)             |  |
|  |  - Fungsi Ter-expose (@eel.expose)                          |  |
|  |  - Validasi Input & Logika Domain                           |  |
|  |  - Supabase Python SDK & Manajemen Sesi                     |  |
|  |  - Isolasi Kredensial (.env via python-dotenv)              |  |
|  +------------------------------^------------------------------+  |
+---------------------------------|---------------------------------+
                                  | HTTPS / TLS
                                  v
           +---------------------------------------------+
           |            Supabase Cloud Backend           |
           |  - Database PostgreSQL                      |
           |  - Supabase Auth (Otentikasi Peran)         |
           |  - Row Level Security (RLS) Policies        |
           +---------------------------------------------+
```

---

## 2. Komponen & Batasan Lapisan

### A. Lapisan Frontend (`web/`)
- Bertanggung jawab penuh atas penyajian tampilan, validasi form sisi klien dasar, indikator status muat (*loading state*), dan animasi antarmuka menggunakan **Anime.js v4**.
- **Batasan Keamanan**: Frontend tidak pernah menginisialisasi koneksi langsung ke Supabase dan tidak menyimpan kunci API apa pun. Seluruh permintaan data dilakukan dengan memanggil fungsi Python melalui `window.eel.<nama_fungsi>()()`.

### B. Lapisan Backend Python (`main.py` & `backend/`)
- `main.py` berfungsi sebagai *entrypoint* yang memuat konfigurasi `.env`, menginisialisasi direktori `web/`, dan membuka jendela aplikasi.
- Paket `backend/` menampung logika bisnis, pemanggilan Supabase SDK, serta pembungkus respons standar `create_response(success, data, error)`.
- Menangani seluruh kesalahan (*exception handling*) agar error dari jaringan atau database tidak menghentikan proses Python.

### C. Lapisan Database (`sql/` & Supabase)
- Menyimpan seluruh data operasional SPPG di PostgreSQL yang dikelola melalui Supabase.
- Menerapkan *Row Level Security* (RLS) untuk membatasi akses baca/tulis sesuai peran pengguna.

---

## 3. Struktur Direktori Proyek

```text
DapurGizi-Development/
├── backend/                  # Modul logika bisnis Python & handler Eel
│   ├── __init__.py           # Helper kontrak respons create_response()
│   └── README.md
├── web/                      # Aset antarmuka pengguna (HTML, CSS, JS, SVG)
│   ├── index.html            # Shell utama aplikasi
│   ├── css/
│   ├── js/
│   ├── assets/
│   └── README.md
├── sql/                      # Dokumentasi & skrip DDL/migrasi database
│   └── README.md
├── tests/                    # Unit test & verifikasi kontrak otomatis (pytest)
├── docs/                     # Dokumentasi teknis bersama tim
│   ├── architecture.md
│   ├── database-design.md
│   ├── integration-contract.md
│   └── contributing.md
├── testing/                  # Direktori tangkapan layar pengujian UI
│   └── screenshots/
├── .gitignore                # Aturan pengecualian berkas Git
├── .env.example              # Template variabel lingkungan (tanpa rahasia)
├── requirements.txt          # Daftar dependensi Python terverifikasi
├── main.py                   # Entrypoint aplikasi desktop Eel
└── README.md                 # Ringkasan utama repositori
```

---

## 4. Kesiapan Pemaketan Desktop (PyInstaller)

Agar aplikasi dapat dijalankan sebagai berkas `.exe` mandiri tanpa instalasi Python terpisah:
1. Resolusi path direktori `web/` di [`main.py`](../main.py) menggunakan fungsi `get_resource_path()` yang mendukung atribut `sys._MEIPASS` milik PyInstaller.
2. Konfigurasi kompilasi dan artefak hasil build (`build/` dan `dist/`) dikecualikan dari repositori Git melalui [`.gitignore`](../.gitignore).
