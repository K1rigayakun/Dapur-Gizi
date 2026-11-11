# Spesifikasi Sistem Motion & Interaksi (`MOTION-SPECIFICATION.md`)

Sistem gerak (**Motion System**) pada **DapurGizi** dibangun menggunakan pustaka lokal [Anime.js v4](https://animejs.com/documentation/) (`web/vendor/anime/anime.esm.js` dan `web/vendor/anime/anime.umd.js`) tanpa menggunakan sintaks lawas v3 dan tanpa ketergantungan CDN eksternal.

## 1. Metode API Anime.js v4 yang Digunakan

Sesuai dokumentasi resmi [Module Imports Anime.js v4](https://animejs.com/documentation/getting-started/module-imports), modul `web/js/utils/motion.js` mengimpor dan menggunakan fungsi-fungsi berikut:
- `animate(targets, parameters)` — Menganimasikan properti CSS, transformasi individual (`translateX`, `translateY`, `scale`, `rotateX`, `rotateY`), variabel CSS (`--liquid-x`, `--liquid-y`), atribut SVG (`strokeDashoffset`), serta properti objek JavaScript murni.
- `createTimeline(parameters)` — Mengoordinasikan sekuens animasi bertahap ([Timeline Add Animations](https://animejs.com/documentation/timeline/add-animations)) pada layar Splash dan transisi antarhalaman.
- `stagger(value, parameters)` — Mendistribusikan jeda waktu (`delay`) secara berurutan pada elemen kartu dan baris ([Stagger Parameters](https://animejs.com/documentation/utilities/stagger/stagger-parameters/stagger-from)).
- `createSpring({ mass, stiffness, damping, velocity })` — Menghitung kurva fisika pegas harmonik teredam untuk pantulan tombol, pembukaan dialog modal, dan indikator navigasi.
- `createAnimatable(targets, parameters)` — Mengelola pembaruan properti berfrekuensi tinggi saat mengikuti pergerakan kursor (`pointermove`).
- `createDraggable(target, parameters)` — Menangani interaksi seret-dan-lepas (*drag-and-drop*) pada kartu perencanaan siklus menu mingguan dengan pengembalian pegas otomatis.
- `svg.createDrawable(selector)` — Menginisialisasi panjang garis `strokeDasharray` dan `strokeDashoffset` pada kurva grafik produksi dan tanda centang keberhasilan login.

## 2. Spesifikasi 7 Animasi Signature DapurGizi

| Kode | Nama Animasi Signature | Implementasi Teknis (`web/js/utils/motion.js`) | Durasi & Kurva Easing |
| :--- | :--- | :--- | :--- |
| **A** | **Liquid Highlight Button** | Saat `pointermove`, memperbarui koordinat cahaya radial (`--liquid-x`, `--liquid-y`); saat `pointerdown` menekan skala ke `0.96` (`150ms`), dan saat `pointerup` kembali ke `1.0` menggunakan `createSpring({ mass: 1, stiffness: 260, damping: 16 })`. | Hover: Reaktif instan; Press: `150ms` (`outQuad`); Release: `280ms` (`createSpring`) |
| **B** | **Magnetic Button** | Tombol primer terpilih (`.btn-magnetic`) mengikuti posisi kursor secara halus dalam batas aman `±5px` horizontal dan `±3.5px` vertikal melalui `createAnimatable()`. | `220ms` (`outQuart`), kembali ke `(0,0)` saat `pointerleave` (`260ms`) |
| **C** | **Sidebar Indicator** | Indikator pil aktif (`#sidebar-active-indicator`) meluncur mulus di antara item menu bilah sisi menggunakan `createAnimatable()` dengan pegas `createSpring({ mass: 1, stiffness: 220, damping: 20 })`. | `240–280ms` (`createSpring`) |
| **D** | **Glass Cards** | Kartu KPI (`.kpi-glass-card`) memiliki kemiringan 3D halus (`rotateX`, `rotateY` dibatasi `±2.5deg`) dan sorotan cahaya mengikuti kursor (`--card-glow-x`, `--card-glow-y`). | `240ms` (`outQuart`), reset `280ms` saat `pointerleave` |
| **E** | **Page Transitions** | Setiap perpindahan modul menjalankan `createTimeline()` yang memadukan `opacity: [0, 1]` dan `translateY: [14, 0]` dengan `delay: stagger(45, { start: 40 })`. | Header: `400ms`; Seksi bertahap: `460ms` (Total rentang `400–550ms`, `outQuart`) |
| **F** | **Modal Transitions** | Dialog modal dan drawer tumbuh secara alami dari arah posisi tombol pemicu (`triggerEl.getBoundingClientRect()`) dari `scale: [0.92, 1]` dan `opacity: [0, 1]`. | Buka: `320ms` (`createSpring`); Tutup: `240ms` (`inQuad`) (Rentang `250–400ms`) |
| **G** | **Data Animations** | 1) *KPI Count-Up*: `animate({ val: 0 }, { val: target, duration: 520, ease: 'outExpo' })`<br>2) *Chart Drawing*: `svg.createDrawable()` + `animate(paths, { strokeDashoffset: 0, duration: 520 })`<br>3) *Progress Fill*: `animate(bar, { width: ['0%', pct + '%'], duration: 500 })`<br>4) *Toast Entrance*: `280ms` (`createSpring`)<br>5) *Success Checkmark & Status Pulse*: `260–280ms` | Mikro-interaksi & Toast: `240–320ms`; Grafik & KPI: `500–540ms` |

## 3. Batas Performa & Kepatuhan Aksesibilitas (`prefers-reduced-motion`)

- Fungsi `prefersReducedMotion()` pada `web/js/utils/motion.js` memeriksa `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- Apabila pengguna mengaktifkan pengurangan gerak pada sistem operasi Windows, seluruh animasi perpindahan dilewati dan nilai akhir diterapkan secara instan tanpa membebani GPU.
- Tidak ada animasi latar belakang berulang tanpa henti yang menguras sumber daya CPU/GPU pada jendela Chromium Eel.
