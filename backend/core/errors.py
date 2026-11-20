"""Kesalahan khusus DapurGizi.

Konvensi (lihat FROZEN PARALLEL DEVELOPMENT CONTRACT bagian 4):

- ``ValueError``       -> payload / aturan bisnis tidak valid.
- ``LookupError``      -> data tidak ditemukan.
- ``PermissionError``  -> sesi tidak sah atau peran tidak berwenang.
- ``ConfigError``      -> konfigurasi server (mis. kredensial) belum lengkap.
- ``ServiceUnavailableError`` -> service domain belum tersedia (menunggu merge PR).
- ``DatabaseError``    -> kegagalan persistence; tidak boleh diganti data palsu.
"""


class ConfigError(Exception):
    """Konfigurasi aplikasi (misalnya kredensial Supabase) tidak lengkap."""


class ServiceUnavailableError(RuntimeError):
    """Service domain belum tersedia pada proses ini.

    Dipakai selama pengembangan paralel ketika modul milik anggota lain
    (``backend/services/beneficiaries.py`` dan seterusnya) belum digabung.
    Handler tetap terdaftar dan mengembalikan amplop gagal yang jujur,
    bukan data rekaan.
    """


class DatabaseError(RuntimeError):
    """Kegagalan pada lapisan database.

    Pesan teknis asli disimpan pada ``__cause__`` agar dapat dicatat ke log,
    sedangkan pengguna hanya menerima pesan umum yang aman.
    """
