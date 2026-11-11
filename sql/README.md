# Direktori Skema & Migrasi SQL (`sql/`)

Direktori ini disiapkan untuk menyimpan skrip DDL PostgreSQL, kebijakan Row Level Security (RLS), serta data awal (*seed data*) untuk database Supabase **DapurGizi**.

## Penanggung Jawab Utama
- **Gabriel**: Penyusunan skrip migrasi tabel, relasi kunci asing (*foreign keys*), dan kebijakan keamanan RLS di Supabase.
- **Wiliam & Visel**: Memberikan spesifikasi kolom domain untuk modul Penerima Manfaat, Menu & Gizi, Distribusi, serta Keamanan Pangan.

## Status Saat Ini
- Skrip migrasi produksi belum dibuat pada tahap inisialisasi fondasi ini.
- Rancangan entitas dan pembagian antara kebutuhan terkonfirmasi vs usulan desain dapat dilihat pada [`docs/database-design.md`](../docs/database-design.md).
