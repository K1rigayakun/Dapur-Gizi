"""Test adapter Supabase tanpa koneksi jaringan (fake client)."""

from __future__ import annotations

import pytest

from backend.core.errors import DatabaseError
from backend.database.repository import SupabaseRepository


class FakeResponse:
    def __init__(self, data=None, count=None):
        self.data = data if data is not None else []
        self.count = count


class FakeQuery:
    def __init__(self, table: str, result):
        self.table = table
        self._result = result
        self.operations: list[tuple] = []

    def select(self, columns="*", count=None):
        self.operations.append(("select", columns, count))
        return self

    def insert(self, rows):
        self.operations.append(("insert", rows))
        return self

    def update(self, patch):
        self.operations.append(("update", patch))
        return self

    def delete(self):
        self.operations.append(("delete",))
        return self

    def eq(self, column, value):
        self.operations.append(("eq", column, value))
        return self

    def order(self, column, desc=False):
        self.operations.append(("order", column, desc))
        return self

    def limit(self, count):
        self.operations.append(("limit", count))
        return self

    def execute(self):
        return self._result


class FakePostgrest:
    def __init__(self):
        self.headers: dict[str, str] = {}

    def auth(self, token):  # meniru perilaku postgrest-py
        if not token:
            raise ValueError("token kosong tidak diterima")
        self.headers["Authorization"] = f"Bearer {token}"
        return self


class FakeClient:
    def __init__(self, result=None):
        self.postgrest = FakePostgrest()
        self.result = result if result is not None else FakeResponse(data=[])
        self.queries: list[FakeQuery] = []

    def table(self, name):
        query = FakeQuery(name, self.result)
        self.queries.append(query)
        return query


def test_select_builds_filters_order_and_limit():
    client = FakeClient(FakeResponse(data=[{"id": "1"}]))
    repo = SupabaseRepository(client)
    rows = repo.select(
        "beneficiaries", filters={"status": "Aktif"}, order="full_name", limit=5
    )
    assert rows == [{"id": "1"}]
    operations = client.queries[0].operations
    assert ("eq", "status", "Aktif") in operations
    assert ("order", "full_name", False) in operations
    assert ("limit", 5) in operations


def test_select_ignores_none_filters():
    client = FakeClient(FakeResponse(data=[]))
    SupabaseRepository(client).select("menus", filters={"status": None})
    assert not any(op[0] == "eq" for op in client.queries[0].operations)


def test_insert_returns_row():
    client = FakeClient(FakeResponse(data=[{"id": "new"}]))
    assert SupabaseRepository(client).insert("menus", {"name": "X"}) == {"id": "new"}


def test_insert_empty_response_raises_database_error():
    client = FakeClient(FakeResponse(data=[]))
    with pytest.raises(DatabaseError):
        SupabaseRepository(client).insert("menus", {"name": "X"})


def test_update_missing_row_returns_none():
    client = FakeClient(FakeResponse(data=[]))
    assert SupabaseRepository(client).update("menus", "x", {"name": "Y"}) is None


def test_delete_returns_boolean():
    client = FakeClient(FakeResponse(data=[{"id": "x"}]))
    assert SupabaseRepository(client).delete("menus", "x") is True


def test_count_uses_exact_count():
    client = FakeClient(FakeResponse(data=[], count=42))
    assert SupabaseRepository(client).count("beneficiaries") == 42


def test_set_access_token_sets_header():
    client = FakeClient()
    SupabaseRepository(client).set_access_token("jwt-abc")
    assert client.postgrest.headers["Authorization"] == "Bearer jwt-abc"


def test_clear_access_token_removes_header_without_error():
    client = FakeClient()
    client.postgrest.headers["Authorization"] = "Bearer jwt-abc"
    SupabaseRepository(client).set_access_token(None)
    assert "Authorization" not in client.postgrest.headers


def test_driver_exception_wrapped_as_database_error():
    class ExplodingClient(FakeClient):
        def table(self, name):
            raise RuntimeError("jaringan putus")

    with pytest.raises(DatabaseError):
        SupabaseRepository(ExplodingClient()).select("menus")
