# Daftar Pustaka Pihak Ketiga & Lisensi (`DEPENDENCIES.md`)

Seluruh pustaka, ikon, dan aset font yang digunakan dalam paket frontend **DapurGizi** disimpan secara lokal di dalam direktori `web/` agar aplikasi dapat berjalan sepenuhnya secara *offline* dan dikemas menjadi berkas `.exe` mandiri menggunakan PyInstaller dan [Eel 0.18.2](https://pypi.org/project/Eel/).

## 1. Tabel Dependensi Lokal Frontend

| Nama Komponen / Pustaka | Versi | Lokasi Berkas Lokal | Sumber Resmi | Lisensi | Berkas Lisensi Lokal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Anime.js v4 Engine Bundle** | `v4.5.0` (Kompatibel API v4) | `web/vendor/anime/anime.esm.js`<br>`web/vendor/anime/anime.umd.js` | [juliangarnier/anime](https://github.com/juliangarnier/anime) & [Anime.js v4 Documentation](https://animejs.com/documentation/) | MIT License | `LICENSES/ANIMEJS-MIT.txt` |
| **Lucide Vector Icons** | `v1.8.0` (59 SVG Vektor) | `web/assets/icons/*.svg`<br>`web/assets/icons/lucide-sprite.svg`<br>`web/js/components/icon.js` | [Lucide License](https://lucide.dev/license) & [lucide-icons/lucide](https://github.com/lucide-icons/lucide/blob/main/LICENSE) | ISC License | `LICENSES/LUCIDE-ISC.txt` |
| **Tipografi UI Sans-Serif (`Plus Jakarta Sans` / Geometric Display WOFF2)** | `v1.0 / v4.0` | `web/assets/fonts/PlusJakartaSans-*.woff2` | [tokotype/PlusJakartaSans](https://github.com/tokotype/PlusJakartaSans) & [SIL OFL 1.1](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt) | SIL Open Font License 1.1 | `LICENSES/FONTS-OFL.txt` |
| **Python Eel Bridge (Runtime Target)** | `v0.18.2` | `/eel.js` (disajikan oleh Python Eel saat runtime; `web/eel.js` sebagai fallback statis) | [Eel 0.18.2 on PyPI](https://pypi.org/project/Eel/) | MIT License | Disediakan oleh paket Python `eel==0.18.2` |

## 2. Kebijakan Bebas CDN Eksternal

- **Tidak ada** pemanggilan `<link href="https://fonts.googleapis.com/...">` pada `web/index.html` maupun di dalam berkas CSS.
- **Tidak ada** pemanggilan `<script src="https://cdn.jsdelivr.net/...">` atau `unpkg.com`.
- Seluruh ikon dirender sebagai elemen `<svg>` vektor inline atau diambil dari berkas lokal `web/assets/icons/`.
