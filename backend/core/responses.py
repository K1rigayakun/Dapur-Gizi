"""Pembungkus handler: ubah hasil/error menjadi amplop {success, data, error}."""

import functools
from typing import Any, Callable

from backend import create_response
from backend.core.errors import (
    ConfigError,
    DatabaseError,
    ServiceUnavailableError,
)
from backend.core.logging_setup import get_logger

log = get_logger()

GENERIC_ERROR = "Terjadi kesalahan pada server. Silakan coba lagi."
DATABASE_ERROR = "Gagal mengakses database. Silakan coba lagi atau hubungi administrator."


def _message(exc: Exception, default: str) -> str:
    return str(exc.args[0]) if exc.args else default


def safe_handler(func: Callable[..., Any]) -> Callable[..., dict[str, Any]]:
    """Ubah hasil fungsi menjadi amplop sukses; ubah error menjadi amplop gagal.

    Aturan penting (INTEGRATION.md + kontrak tim):
    - error tidak pernah diubah menjadi respons sukses;
    - detail teknis hanya masuk log, bukan ke pengguna;
    - data pribadi (NIK, token, password) disamarkan oleh logging filter.
    """

    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            return create_response(True, func(*args, **kwargs), None)
        except ValueError as exc:  # payload / aturan bisnis tidak valid
            return create_response(
                False, None, _message(exc, "Data yang dikirim tidak valid.")
            )
        except LookupError as exc:  # data tidak ditemukan
            return create_response(False, None, _message(exc, "Data tidak ditemukan."))
        except PermissionError as exc:  # role tidak berwenang / sesi tidak sah
            return create_response(False, None, _message(exc, "Anda tidak memiliki akses."))
        except ServiceUnavailableError as exc:
            # Pesan dibuat sendiri oleh backend sehingga aman ditampilkan.
            log.warning("Service belum tersedia di %s: %s", func.__name__, exc)
            return create_response(False, None, _message(exc, "Layanan belum tersedia."))
        except ConfigError as exc:
            log.error("ConfigError di %s: %s", func.__name__, exc)
            return create_response(False, None, "Konfigurasi server belum lengkap.")
        except DatabaseError as exc:
            log.error("DatabaseError di %s: %s", func.__name__, exc)
            return create_response(False, None, DATABASE_ERROR)
        except Exception as exc:  # kegagalan tak terduga
            log.error("Gagal di %s: %s: %s", func.__name__, type(exc).__name__, exc)
            return create_response(False, None, GENERIC_ERROR)

    return wrapper
