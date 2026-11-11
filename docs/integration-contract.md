# Kontrak Integrasi Frontend & Backend (Eel IPC Contract)

Dokumen ini menetapkan aturan komunikasi antara antarmuka JavaScript (`web/`) dan backend Python (`backend/`) melalui **Python Eel**. Seluruh empat anggota tim wajib mengikuti kontrak ini agar modul frontend dan backend dapat digabungkan tanpa konflik.

---

## 1. Format Respons Standar

Setiap fungsi Python yang dipanggil oleh JavaScript **wajib** mengembalikan objek dictionary dengan tiga kunci tetap berikut:

```json
{
  "success": true,
  "data": null,
  "error": null
}
```

### Aturan Nilai:
- **`success`** (`boolean`):
  - Bernilai `true` jika operasi berhasil dijalankan.
  - Bernilai `false` jika terjadi kesalahan validasi, autentikasi, atau kegagalan database.
- **`data`** (`object | array | primitive | null`):
  - Berisi muatan hasil operasi ketika `success` bernilai `true`.
  - Bernilai `null` ketika `success` bernilai `false` atau operasi tidak mengembalikan data.
- **`error`** (`string | null`):
  - Bernilai `null` ketika `success` bernilai `true`.
  - Berisi pesan kesalahan singkat yang jelas dalam Bahasa Indonesia ketika `success` bernilai `false`.

---

## 2. Cara Python Mengembalikan Hasil ke JavaScript

Di sisi Python, gunakan fungsi pembantu `create_response()` dari [`backend/__init__.py`](../backend/__init__.py) agar struktur respons selalu konsisten:

```python
import eel
from backend import create_response


@eel.expose
def example_action(payload: dict) -> dict:
    try:
        if not payload.get("name"):
            return create_response(
                success=False,
                data=None,
                error="Nama wajib diisi.",
            )

        # Proses logika bisnis / query Supabase di sini
        result = {"id": 1, "name": payload["name"]}

        return create_response(
            success=True,
            data=result,
            error=None,
        )
    except Exception as exc:
        return create_response(
            success=False,
            data=None,
            error=f"Terjadi kesalahan server: {exc}",
        )
```

---

## 3. Cara JavaScript Memanggil Python Melalui Eel

Di sisi JavaScript, pemanggilan fungsi Eel bersifat asinkron (*Promise-based*) dan memerlukan dua pasang tanda kurung `eel.nama_fungsi(argumen)()`:

- Kurung pertama `(argumen)` mengirim parameter ke Python.
- Kurung kedua `()` mengeksekusi panggilan dan mengembalikan `Promise`.

```javascript
async function handleFormSubmit(payload) {
    setLoadingState(true);

    try {
        const response = await window.eel.example_action(payload)();

        if (response.success) {
            renderData(response.data);
        } else {
            showErrorMessage(response.error);
        }
    } catch (networkError) {
        showErrorMessage("Gagal terhubung ke proses backend aplikasi.");
        console.error(networkError);
    } finally {
        setLoadingState(false);
    }
}
```

---

## 4. Penanganan Kesalahan (Error Handling)

1. **Di Sisi Python (Backend)**:
   - Jangan biarkan *unhandled exception* keluar dari fungsi `@eel.expose`.
   - Bungkus operasi eksternal (seperti query Supabase) di dalam blok `try...except` dan kembalikan `create_response(success=False, data=None, error=...)`.
2. **Di Sisi JavaScript (Frontend)**:
   - Selalu periksa `if (response && response.success)` sebelum membaca `response.data`.
   - Gunakan blok `try...catch` pada `await window.eel...` untuk mengantisipasi kegagalan koneksi WebSocket lokal.

---

## 5. Pengelolaan Status Muat (Loading States)

Karena operasi ke Supabase melalui Python membutuhkan waktu jaringan:
1. Nonaktifkan tombol kirim (*submit button*) dan tampilkan indikator muat sebelum memanggil `await window.eel.<fungsi>()()`.
2. Pulihkan kondisi tombol di dalam blok `finally` agar antarmuka tidak terkunci apabila terjadi error.
3. Transisi indikator muat dapat menggunakan animasi ringan **Anime.js v4** yang dikelola di lapisan frontend.

---

## 6. Konvensi Penamaan (Naming Conventions)

| Komponen | Konvensi | Contoh |
|---|---|---|
| Fungsi Python (`@eel.expose`) | `snake_case` dengan awalan kata kerja | `get_app_status`, `list_beneficiaries` |
| Kunci JSON pada `data` | `snake_case` (selaras dengan kolom DB) | `full_name`, `school_name`, `created_at` |
| Fungsi & Variabel JavaScript | `camelCase` | `checkBackendStatus`, `isLoading` |
| Kelas CSS | `kebab-case` | `.status-badge`, `.shell-card` |

---

## 7. Batasan Modul Antar Anggota Tim (Module Boundaries)

Agar pekerjaan keempat anggota tim tidak saling menimpa:

1. **Michael (Frontend & UI)**:
   - Mengelola struktur HTML, CSS, navigasi, komponen visual, animasi Anime.js v4, tampilan Dashboard, dan tampilan Budget/Insentif di dalam `web/`.
2. **Gabriel (Backend Core, Auth, Supabase & Packaging)**:
   - Mengelola koneksi klien Supabase, autentikasi pengguna, kebijakan RLS, registrasi Eel di `main.py`, dan konfigurasi PyInstaller.
3. **Wiliam (Beneficiary & Menu/Nutrition)**:
   - Mengembangkan logika domain dan integrasi form untuk modul **Penerima Manfaat** serta **Menu & Gizi** mengikuti format `create_response()`.
4. **Visel (Distribution & Food Safety)**:
   - Mengembangkan logika domain dan integrasi form untuk modul **Distribusi** serta **Keamanan Pangan** mengikuti format `create_response()`.
