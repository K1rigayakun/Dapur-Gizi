# Kamus Data Penerima Manfaat MBG (`BENEFICIARIES-DATA-DICTIONARY.md`)
**Pemilik Modul (PIC)**: Wiliam — *Beneficiaries, Menu, Nutrition & Production Engineer*  
**Proyek**: DapurGizi — Sistem Informasi Manajemen Operasional SPPG (Program Makanan Bergizi Gratis)  
**Versi Dokumen**: 1.0.0 (November 2026)

---

## 1. Ringkasan & Ruang Lingkup

Dokumen ini mendefinisikan kamus data, tipe data, aturan validasi, spesifikasi impor CSV, serta analisis ketidaksesuaian domain identitas (*NIK vs NISN*) untuk entitas **Penerima Manfaat** (`beneficiaries`).

Modul ini melayani 6 kategori sasaran resmi Program Makanan Bergizi Gratis (MBG):
1. **Siswa SD** (Sekolah Dasar / MI)
2. **Siswa SMP** (Sekolah Menengah Pertama / MTs)
3. **Siswa SMA** (Sekolah Menengah Atas / SMK / MA)
4. **Ibu Hamil** (Trimester 1, 2, dan 3)
5. **Ibu Menyusui** (Bayi 0–6 bulan ASI Eksklusif dan 7–24 bulan)
6. **Balita** (Anak usia 6–59 bulan)

---

## 2. Analisis Ketidaksesuaian Domain: NIK vs NISN

### A. Masalah di Lapangan
Pada antarmuka frontend (`web/js/pages/beneficiaries.js` dan `INTEGRATION.md`), field nomor identitas didefinisikan menggunakan key `nik`. Namun pada formulir input dan label tabel, teks antarmuka menampilkan label gabungan **`NIK / NISN (10–16 Digit Angka)`**.
- **NIK (Nomor Induk Kependudukan)**: Diterbitkan oleh Disdukcapil Kemendagri, berformat **tepat 16 digit angka**, berlaku bagi seluruh WNI termasuk Ibu Hamil, Ibu Menyusui, dan Balita.
- **NISN (Nomor Induk Siswa Nasional)**: Diterbitkan oleh Kemendikbudristek/Kemenag, berformat **tepat 10 digit angka**, berlaku khusus bagi peserta didik jenjang SD, SMP, dan SMA.

### B. Resolusi & Solusi Kompatibilitas yang Diterapkan Wiliam
1. **Kompatibilitas Penuh API Frontend**: Field input dan output utama tetap menggunakan key `nik` bertipe `string` sehingga kode JavaScript Michael tidak mengalami *breaking change*.
2. **Validasi Regex Fleksibel**: Sistem memvalidasi bahwa nilai identitas harus berupa 10 hingga 16 digit angka (`^\d{10,16}$`).
3. **Deteksi Otomatis Sub-Tipe (`identifierType`)**:
   - Panjang 16 digit $\rightarrow$ Diklasifikasikan sebagai `NIK`.
   - Panjang 10 digit $\rightarrow$ Diklasifikasikan sebagai `NISN`.
   - Panjang 11–15 digit $\rightarrow$ Diklasifikasikan sebagai `IDENTITAS_LAIN` (misalnya nomor registrasi posyandu sementara).
4. **Pencegahan Duplikasi Multi-Tipe**: Pencegahan duplikasi berlaku pada nilai identitas unik di tingkat sistem untuk mencegah pendaftaran ganda penerima manfaat.

---

## 3. Kamus Data Atribut Penerima Manfaat

| Nama Kolom / Field | Tipe Data Python | Tipe Data PostgreSQL | Wajib? | Nilai Bawaan | Deskripsi & Batasan Validasi |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | `str` | `VARCHAR(64)` / `UUID` | Ya | Auto-generated | Kunci primer unik (format internal: `BNF-XXXXXXXX` atau `BNF-IMP-XXXX`). |
| `nik` | `str` | `VARCHAR(16)` | Ya | - | Nomor identitas unik penerima manfaat (10–16 digit angka). Tidak boleh duplikat. |
| `name` | `str` | `VARCHAR(255)` | Ya | - | Nama lengkap penerima manfaat. Minimal 3 karakter, tanpa karakter kontrol terlarang. |
| `category` | `str` | `VARCHAR(50)` | Ya | - | Kategori sasaran MBG. Wajib salah satu dari 6 kategori resmi. |
| `institution` | `str` | `VARCHAR(255)` | Ya | - | Nama sekolah, posyandu, atau fasilitas mitra layanan (minimal 3 karakter). |
| `gradeOrGroup` | `str` | `VARCHAR(100)` | Tidak | `"-"` | Rombel/kelas sekolah (mis. `Kelas 4A`), trimester ibu hamil, atau usia balita. |
| `status` | `str` | `VARCHAR(20)` | Ya | `"Aktif"` | Status kepesertaan. Pilihan: `"Aktif"` atau `"Nonaktif"`. |
| `notes` | `str` | `TEXT` | Tidak | `"Tidak ada alergi"` | Catatan kebutuhan khusus, diet rendah garam, tekstur saring, atau alergi bahan pangan. |
| `registeredAt` | `str` | `DATE` | Ya | Tanggal hari ini | Tanggal pencatatan registrasi dalam format ISO 8601 (`YYYY-MM-DD`). |
| `identifierType` | `str` | `VARCHAR(20)` | Tidak | `"NIK"` | Metadata klasifikasi identitas (`"NIK"`, `"NISN"`, `"IDENTITAS_LAIN"`). |
| `created_at` | `str` | `TIMESTAMPTZ` | Otomatis | `NOW()` | Timestamp pencatatan record pertama kali. |
| `updated_at` | `str` | `TIMESTAMPTZ` | Otomatis | `NOW()` | Timestamp perubahan data terakhir. |

---

## 4. Format Impor & Ekspor CSV

### A. Header Kolom Standar CSV
File CSV dapat menggunakan urutan kolom berikut dengan pemisah koma (`,`) atau titik koma (`;`):
```csv
NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan
```

Sistem `BeneficiaryService.parse_and_validate_csv()` mendukung pencocokan header yang fleksibel:
- Kolom NIK: `nik`, `nisn`, `identitas`
- Kolom Nama: `nama`, `name`
- Kolom Kategori: `kategori`, `category`
- Kolom Institusi: `sekolah`, `instansi`, `posyandu`, `institution`
- Kolom Status: `status`
- Kolom Catatan: `alergi`, `catatan`, `notes`

### B. Contoh Data CSV Valid (Sintetis)
```csv
NIK,Nama,Kategori,Sekolah_Posyandu,Status,Catatan
1271042809160021,Zahra Putri Ramadhani,Siswa SD,SDN 060812 Medan Baru,Aktif,Tidak ada alergi
1271041502230022,Rafaizan Alfarizqi,Balita,Posyandu Anggrek Bulan II,Aktif,Bubur saring halus
0091234567,Ahmad Fauzan Syahputra,Siswa SMP,SMP Negeri 1 Medan,Aktif,Alergi kacang tanah
```

---

## 5. Kebijakan Keamanan & Privasi Data Pribadi (Data Protection)

Sesuai dengan **Aturan Kerja Tim DapurGizi**:
1. **Tidak Ada NIK/Data Asli di Repositori**: Seluruh data testing dan fixture menggunakan identitas sintetis acak. Dilarang memasukkan NIK atau nomor identitas warga nyata ke repositori publik.
2. **Minimisasi Log**: Log aplikasi Python tidak boleh mencetak NIK utuh secara terbuka (*masking* dianjurkan jika logging dilakukan pada layer HTTP/Eel).
3. **Audit Jejak Perubahan**: Modifikasi data penerima manfaat mencatat timestamp `updated_at`.
