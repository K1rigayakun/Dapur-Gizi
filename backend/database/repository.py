"""Kontrak repository dan adapter Supabase.

Repository adalah satu-satunya pintu akses database untuk domain service.
Modul ini **tidak** berisi logika bisnis dan tidak mengetahui aturan domain.

Kontrak minimum yang dibutuhkan service domain (Wiliam & Visel):

``select(table, filters=..., order=..., descending=..., limit=..., columns="*")``
    Ambil banyak baris. ``filters`` berisi pasangan kolom -> nilai (equality).
    Mengembalikan ``list[dict]`` dengan nama kolom snake_case.

``get(table, record_id)``
    Ambil satu baris berdasarkan primary key ``id``; ``None`` bila tidak ada.

``insert(table, row)``
    Simpan satu baris; mengembalikan baris tersimpan (snake_case).

``insert_many(table, rows)``
    Simpan banyak baris sekaligus (dipakai impor penerima manfaat).

``update(table, record_id, patch)``
    Ubah sebagian kolom; mengembalikan baris terbaru.

``update_where(table, filters, patch)``
    Ubah banyak baris berdasarkan filter equality; mengembalikan baris terbaru.

``delete(table, record_id)``
    Hapus satu baris; ``True`` bila ada baris terhapus.

``count(table, filters=None)``
    Hitung baris tanpa menarik seluruh data.

``rpc(name, params=None)``
    Panggil fungsi PostgreSQL (SECURITY DEFINER) untuk operasi terkontrol.

Semua kegagalan driver dibungkus :class:`DatabaseError` agar handler tidak
pernah mengembalikan data palsu.
"""

from __future__ import annotations

from typing import Any, Mapping, Protocol, runtime_checkable

from backend.core.errors import DatabaseError
from backend.core.logging_setup import get_logger

log = get_logger()


@runtime_checkable
class Repository(Protocol):
    def select(
        self,
        table: str,
        *,
        filters: Mapping[str, Any] | None = None,
        order: str | None = None,
        descending: bool = False,
        limit: int | None = None,
        columns: str = "*",
    ) -> list[dict[str, Any]]: ...

    def get(self, table: str, record_id: Any) -> dict[str, Any] | None: ...

    def insert(self, table: str, row: Mapping[str, Any]) -> dict[str, Any]: ...

    def insert_many(
        self, table: str, rows: list[Mapping[str, Any]]
    ) -> list[dict[str, Any]]: ...

    def update(
        self, table: str, record_id: Any, patch: Mapping[str, Any]
    ) -> dict[str, Any] | None: ...

    def update_where(
        self, table: str, filters: Mapping[str, Any], patch: Mapping[str, Any]
    ) -> list[dict[str, Any]]: ...

    def delete(self, table: str, record_id: Any) -> bool: ...

    def count(
        self, table: str, filters: Mapping[str, Any] | None = None
    ) -> int: ...

    def rpc(self, name: str, params: Mapping[str, Any] | None = None) -> Any: ...

    def set_access_token(self, token: str | None) -> None: ...


def _apply_filters(query: Any, filters: Mapping[str, Any] | None) -> Any:
    for column, value in (filters or {}).items():
        if value is None:
            continue
        query = query.eq(column, value)
    return query


class SupabaseRepository:
    """Adapter Supabase PostgREST yang mengikuti kontrak :class:`Repository`.

    Token akses pengguna diteruskan ke PostgREST agar Row Level Security
    mengevaluasi ``auth.uid()`` dan peran pengguna yang sebenarnya.
    """

    def __init__(self, client: Any) -> None:
        self._client = client

    # -- keamanan sesi -------------------------------------------------
    def set_access_token(self, token: str | None) -> None:
        try:
            if token:
                self._client.postgrest.auth(token)
            else:
                # postgrest-py tidak menerima token None; hapus header langsung.
                headers = getattr(self._client.postgrest, "headers", None)
                if isinstance(headers, dict):
                    headers.pop("Authorization", None)
        except Exception as exc:
            if token:
                raise DatabaseError(
                    "Gagal menerapkan token sesi ke klien database."
                ) from exc
            # Pencabutan token bersifat best-effort agar logout tetap berhasil.
            log.warning("Gagal mencabut token PostgREST: %s", type(exc).__name__)

    # -- baca ----------------------------------------------------------
    def select(
        self,
        table: str,
        *,
        filters: Mapping[str, Any] | None = None,
        order: str | None = None,
        descending: bool = False,
        limit: int | None = None,
        columns: str = "*",
    ) -> list[dict[str, Any]]:
        try:
            query = _apply_filters(self._client.table(table).select(columns), filters)
            if order:
                query = query.order(order, desc=descending)
            if limit is not None:
                query = query.limit(limit)
            response = query.execute()
            return list(response.data or [])
        except DatabaseError:
            raise
        except Exception as exc:
            log.error("select(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal membaca tabel {table}.") from exc

    def get(self, table: str, record_id: Any) -> dict[str, Any] | None:
        rows = self.select(table, filters={"id": record_id}, limit=1)
        return rows[0] if rows else None

    def count(
        self, table: str, filters: Mapping[str, Any] | None = None
    ) -> int:
        try:
            query = _apply_filters(
                self._client.table(table).select("id", count="exact"), filters
            )
            response = query.limit(1).execute()
            if getattr(response, "count", None) is not None:
                return int(response.count)
            return len(response.data or [])
        except Exception as exc:
            log.error("count(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal menghitung baris tabel {table}.") from exc

    # -- tulis ---------------------------------------------------------
    def insert(self, table: str, row: Mapping[str, Any]) -> dict[str, Any]:
        try:
            response = self._client.table(table).insert(dict(row)).execute()
            data = list(response.data or [])
            if not data:
                raise DatabaseError(
                    f"Insert ke {table} tidak mengembalikan baris (kemungkinan ditolak RLS)."
                )
            return data[0]
        except DatabaseError:
            raise
        except Exception as exc:
            log.error("insert(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal menyimpan data ke tabel {table}.") from exc

    def insert_many(
        self, table: str, rows: list[Mapping[str, Any]]
    ) -> list[dict[str, Any]]:
        if not rows:
            return []
        try:
            response = self._client.table(table).insert([dict(r) for r in rows]).execute()
            return list(response.data or [])
        except Exception as exc:
            log.error("insert_many(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal menyimpan banyak data ke tabel {table}.") from exc

    def update(
        self, table: str, record_id: Any, patch: Mapping[str, Any]
    ) -> dict[str, Any] | None:
        try:
            response = (
                self._client.table(table)
                .update(dict(patch))
                .eq("id", record_id)
                .execute()
            )
            data = list(response.data or [])
            return data[0] if data else None
        except Exception as exc:
            log.error("update(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal memperbarui tabel {table}.") from exc

    def update_where(
        self, table: str, filters: Mapping[str, Any], patch: Mapping[str, Any]
    ) -> list[dict[str, Any]]:
        try:
            query = _apply_filters(
                self._client.table(table).update(dict(patch)), filters
            )
            response = query.execute()
            return list(response.data or [])
        except Exception as exc:
            log.error("update_where(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal memperbarui tabel {table}.") from exc

    def delete(self, table: str, record_id: Any) -> bool:
        try:
            response = (
                self._client.table(table).delete().eq("id", record_id).execute()
            )
            return bool(response.data)
        except Exception as exc:
            log.error("delete(%s) gagal: %s", table, type(exc).__name__)
            raise DatabaseError(f"Gagal menghapus data dari tabel {table}.") from exc

    def rpc(self, name: str, params: Mapping[str, Any] | None = None) -> Any:
        try:
            response = self._client.rpc(name, dict(params or {})).execute()
            return response.data
        except Exception as exc:
            log.error("rpc(%s) gagal: %s", name, type(exc).__name__)
            raise DatabaseError(f"Gagal menjalankan fungsi database {name}.") from exc
