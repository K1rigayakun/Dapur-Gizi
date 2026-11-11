# Daftar Periksa Fitur & Status Pengujian (`FEATURE-CHECKLIST.md`)

Dokumen ini mencatat status implementasi frontend, pengujian otomatis browser (Chromium 1440×900 & 1280×720), status integrasi backend Python [Eel 0.18.2](https://pypi.org/project/Eel/), serta batasan yang diketahui secara transparan.

**Keterangan Status**:
- **Implemented**: Telah diimplementasikan secara penuh pada kode sumber frontend (`web/`).
- **Tested**: Telah diverifikasi berjalan di browser Chromium tanpa error konsol.
- **Backend Pending**: Kontrak fungsi `@eel.expose` telah disiapkan di `js/services/api.js` dan didokumentasikan di `INTEGRATION.md`, menggunakan simulasi `mock-api.js` pada Mode Demo hingga modul Python selesai dibuat.
- **Known Limitation**: Catatan batasan teknis atau ruang lingkup proyek.

## 1. Status Modul Aplikasi (A – L)

| Modul & Fitur Spesifik | Implemented | Tested | Backend Pending | Known Limitation / Catatan Transparansi |
| :--- | :---: | :---: | :---: | :--- |
| **A. Autentikasi** — Layar Splash beranimasi Anime.js v4 | Ya | Ya | Tidak | Berjalan sekali per sesi pembukaan aplikasi. |
| **A. Autentikasi** — Login Email & Kata Sandi + Toggle Visibilitas | Ya | Ya | Ya (`auth_login`) | Dalam Mode Demo menggunakan akun simulasi lokal (`demo123`), bukan autentikasi Supabase langsung. |
| **A. Autentikasi** — Ingat Saya, Lupa Kata Sandi, Loading, Error & Sesi Habis | Ya | Ya | Ya (`auth_reset_password`) | Reset kata sandi mencatat permintaan simulasi pada Mode Demo. |
| **B. Beranda (Dashboard)** — 4 Kartu KPI Dinamis dari Data Layer | Ya | Ya | Ya (`dashboard_get_summary`) | Seluruh angka KPI dihitung dari data produksi, penerima manfaat, dan anggaran (tidak di-hardcode di UI). |
| **B. Beranda (Dashboard)** — Grafik Garis Produksi SVG, Komposisi Anggaran & Distribusi | Ya | Ya | Ya (`dashboard_get_summary`) | Grafik digambar menggunakan SVG lokal dan dianimasikan dengan [Anime.js v4](https://animejs.com/documentation/). |
| **B. Beranda (Dashboard)** — 5 State UI (Normal, Peringatan, Skeleton Loading, Kosong, Error) | Ya | Ya | Tidak | Dilengkapi tombol pengalih state di header Beranda untuk memudahkan pengujian. |
| **C. Penerima Manfaat** — CRUD Lengkap lintas 6 Kategori MBG | Ya | Ya | Ya (`beneficiaries_*`) | Mencakup Siswa SD, SMP, SMA, Ibu Hamil, Ibu Menyusui, dan Balita. |
| **C. Penerima Manfaat** — Pencarian, Filter Kategori/Status, Urutkan & Paginasi | Ya | Ya | Ya (`beneficiaries_list`) | Berfungsi penuh secara reaktif. |
| **C. Penerima Manfaat** — Impor CSV + Validasi Format NIK & Deteksi Duplikat | Ya | Ya | Ya (`beneficiaries_import`) | Memvalidasi NIK 10–16 digit, kategori MBG, dan menolak NIK duplikat sebelum impor. |
| **C. Penerima Manfaat** — Ekspor CSV Kompatibel Excel | Ya | Ya | Tidak | Menggunakan UTF-8 BOM sehingga langsung terbuka rapi di Microsoft Excel. |
| **D. Menu & Gizi** — Perencana Menu Mingguan, Kartu Harian & Drag-and-Drop | Ya | Ya | Ya (`menus_*`) | Kartu harian mendukung *drag-and-drop* pengurutan siklus via `createDraggable()`. |
| **D. Menu & Gizi** — Komposisi Bahan, Gramasi, Kalori/Protein & Alur Persetujuan | Ya | Ya | Ya (`menus_review`) | Menampilkan nilai kalkulasi gizi tanpa mengklaim batas ambang hukum yang tidak terverifikasi. |
| **E. Produksi Harian** — Kalender Batch, Hari Layanan Efektif & Linimasa Interaktif | Ya | Ya | Ya (`production_*`) | Tahapan linimasa dapat diklik untuk memperbarui progres pemasakan & pemorsian. |
| **E. Produksi Harian** — Peringatan Selisih Kuantitas Porsi Rencana vs Aktual | Ya | Ya | Ya (`production_update`) | Menampilkan banner peringatan otomatis apabila porsi aktual berbeda dari rencana. |
| **F. Anggaran & Insentif** — Ringkasan Keuangan, Belanja Pangan, Operasional & Insentif | Ya | Ya | Ya (`budget_get_summary`) | Seluruh nilai parameter finansial berlabel `DEMO` dan dapat dikonfigurasi. |
| **F. Anggaran & Insentif** — Kalkulator Biaya per Porsi & Simulasi Multi-Hari | Ya | Ya | Ya (`budget_calculate`) | Menghitung biaya unit gabungan dan memberi peringatan jika melebihi pagu parameter. |
| **G. Distribusi** — Jadwal Rute, Status Armada & Konfirmasi Berita Acara Terima | Ya | Ya | Ya (`distributions_*`) | Mendukung transisi status `Siap Kirim` → `Dalam Perjalanan` → `Diterima` beserta pencatatan selisih. |
| **H. Keamanan Pangan** — Checklist Higienitas Harian, SLHS, Insiden & Food Waste | Ya | Ya | Ya (`hygiene_*`, `slhs_list`) | Menampilkan pengingat masa berlaku sertifikat SLHS dan pencatatan kompos sisa pangan. |
| **I. Laporan & Ekspor** — 5 Jenis Laporan, Filter Tanggal, Ekspor CSV & Cetak PDF | Ya | Ya | Ya (`reports_generate`) | Ekspor menggunakan CSV kompatibel Excel dan cetak PDF melalui `@media print` (tidak menampilkan tombol XLSX palsu). |
| **J. Manajemen Pengguna** — CRUD Pengguna, 4 Peran SPPG, Ubah Sandi & Matriks RBAC | Ya | Ya | Ya (`users_*`) | Matriks hak akses peran didokumentasikan sebagai keputusan desain proyek yang dapat dikonfigurasi. |
| **K. Notifikasi** — Dropdown Topbar, Pusat Notifikasi, Tandai Dibaca & Navigasi Modul | Ya | Ya | Ya (`notifications_*`) | Lencana jumlah belum dibaca tersinkronisasi antara Topbar dan Bilah Sisi. |
| **L. Pengaturan** — Mode Terang/Gelap, Pengalih Mode Demo/Produksi Eel & Parameter | Ya | Ya | Ya (`settings_*`) | Preferensi tema dan mode disimpan di `localStorage`. |
