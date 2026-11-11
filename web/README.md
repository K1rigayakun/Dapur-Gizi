# Direktori Frontend Web (`web/`)

Direktori ini menyimpan seluruh berkas antarmuka pengguna (HTML, CSS, JavaScript, dan aset visual) yang disajikan di dalam jendela desktop oleh Python Eel.

## Penanggung Jawab Utama
- **Michael**: Desain UI/UX, kerangka halaman utama, navigasi, Dashboard, Budget UI, serta integrasi animasi Anime.js v4.
- **Wiliam & Visel**: Berkolaborasi pada antarmuka form modul domain masing-masing.

## Struktur Subdirektori
- `index.html`: Shell utama aplikasi desktop.
- `css/`: Lembar gaya modular (`main.css`, komponen spesifik).
- `js/`: Logika interaksi frontend dan pemanggilan fungsi Python melalui `window.eel.<nama_fungsi>()()`.
- `assets/`: Ikon SVG dan aset gambar statis.

## Pedoman Antarmuka
1. Gunakan ikon berformat SVG (seperti Lucide SVG), bukan karakter emoji.
2. Seluruh komunikasi data ke database wajib melewati fungsi Eel yang diekspos oleh backend Python sesuai [`docs/integration-contract.md`](../docs/integration-contract.md).
3. Jangan menyimpan kunci rahasia atau memanggil endpoint Supabase secara langsung dari JavaScript.
