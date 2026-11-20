"""Pembungkus handler: ubah hasil/error menjadi amplop {success, data, error}."""

import functools
from typing import Any, Callable

from backend import create_response
from backend.core.errors import ConfigError
from backend.core.logging_setup import get_logger

log = get_logger()

GENERIC_ERROR = "Terjadi kesalahan pada server. Silakan coba lagi."


def _message(exc: Exception, default: str) -> str:
    return str(exc.args[0]) if exc.args else default


def safe_handler(func: Callable[..., Any]) -> Callable[..., dict[str, Any]]:
    @functools.wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> dict[str, Any]:
        try:
            return create_response(True, func(*args, **kwargs), None)
        except ValueError as exc:  # payload / aturan bisnis tidak valid
            return create_response(False, None, _message(exc, "Data yang dikirim tidak valid."))
        except LookupError as exc:  # data tidak ditemukan
            return create_response(False, None, _message(exc, "Data tidak ditemukan."))
        except PermissionError as exc:  # role tidak berwenang / sesi tidak sah
            return create_response(False, None, _message(exc, "Anda tidak memiliki akses."))
        except ConfigError as exc:
            log.error("ConfigError di %s: %s", func.__name__, exc)
            return create_response(False, None, "Konfigurasi server belum lengkap.")
        except Exception as exc:  # kegagalan tak terduga (mis. database)
            log.error("Gagal di %s: %s: %s", func.__name__, type(exc).__name__, exc)
            return create_response(False, None, GENERIC_ERROR)

    return wrapper