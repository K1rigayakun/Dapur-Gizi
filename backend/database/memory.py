"""Repository in-memory untuk unit test dan pengembangan lokal.

Repository ini **bukan** sumber data demo untuk production. Ia hanya dipakai
oleh test suite dan oleh ``APP_ENV=test`` yang dikonfigurasi eksplisit.
Tidak ada data yang dipalsukan pada mode development/production: bila
Supabase belum dikonfigurasi, handler mengembalikan error konfigurasi.
"""

from __future__ import annotations

import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Mapping

from backend.database.repository import Repository


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class InMemoryRepository:
    """Implementasi :class:`Repository` berbasis dict di memori."""

    def __init__(self, tables: Mapping[str, list[dict[str, Any]]] | None = None) -> None:
        self._lock = threading.RLock()
        self._tables: dict[str, list[dict[str, Any]]] = {
            name: [dict(row) for row in rows]
            for name, rows in (tables or {}).items()
        }

    # -- bantuan -------------------------------------------------------
    def seed(self, table: str, rows: list[Mapping[str, Any]]) -> None:
        with self._lock:
            self._tables.setdefault(table, []).extend(dict(row) for row in rows)

    def rows(self, table: str) -> list[dict[str, Any]]:
        with self._lock:
            return [dict(row) for row in self._tables.get(table, [])]

    def clear(self) -> None:
        with self._lock:
            self._tables.clear()

    def set_access_token(self, token: str | None) -> None:  # noqa: ARG002
        return None

    # -- baca ----------------------------------------------------------
    def select(
        self,
        table: str,
        *,
        filters: Mapping[str, Any] | None = None,
        order: str | None = None,
        descending: bool = False,
        limit: int | None = None,
        columns: str = "*",  # noqa: ARG002
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = [dict(row) for row in self._tables.get(table, [])]
        if filters:
            rows = [
                row
                for row in rows
                if all(
                    row.get(column) == value
                    for column, value in filters.items()
                    if value is not None
                )
            ]
        if order:
            rows.sort(
                key=lambda row: (row.get(order) is None, row.get(order)),
                reverse=descending,
            )
        if limit is not None:
            rows = rows[:limit]
        return rows

    def get(self, table: str, record_id: Any) -> dict[str, Any] | None:
        rows = self.select(table, filters={"id": record_id})
        return rows[0] if rows else None

    def count(
        self, table: str, filters: Mapping[str, Any] | None = None
    ) -> int:
        return len(self.select(table, filters=filters))

    # -- tulis ---------------------------------------------------------
    def insert(self, table: str, row: Mapping[str, Any]) -> dict[str, Any]:
        with self._lock:
            record = dict(row)
            record.setdefault("id", str(uuid.uuid4()))
            record.setdefault("created_at", _now_iso())
            record.setdefault("updated_at", record["created_at"])
            self._tables.setdefault(table, []).append(record)
            return dict(record)

    def insert_many(
        self, table: str, rows: list[Mapping[str, Any]]
    ) -> list[dict[str, Any]]:
        return [self.insert(table, row) for row in rows]

    def update(
        self, table: str, record_id: Any, patch: Mapping[str, Any]
    ) -> dict[str, Any] | None:
        with self._lock:
            for record in self._tables.get(table, []):
                if record.get("id") == record_id:
                    record.update(dict(patch))
                    record["updated_at"] = _now_iso()
                    return dict(record)
        return None

    def update_where(
        self, table: str, filters: Mapping[str, Any], patch: Mapping[str, Any]
    ) -> list[dict[str, Any]]:
        with self._lock:
            changed = []
            for record in self._tables.get(table, []):
                if all(
                    record.get(column) == value
                    for column, value in filters.items()
                    if value is not None
                ):
                    record.update(dict(patch))
                    record["updated_at"] = _now_iso()
                    changed.append(dict(record))
            return changed

    def delete(self, table: str, record_id: Any) -> bool:
        with self._lock:
            rows = self._tables.get(table, [])
            for index, record in enumerate(rows):
                if record.get("id") == record_id:
                    rows.pop(index)
                    return True
            return False

    def rpc(self, name: str, params: Mapping[str, Any] | None = None) -> Any:
        raise NotImplementedError(
            f"RPC '{name}' tidak tersedia pada InMemoryRepository; gunakan fake service."
        )


# Pastikan memenuhi Protocol saat diimpor.
assert isinstance(InMemoryRepository(), Repository)
