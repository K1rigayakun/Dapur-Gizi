"""Test kontrak repository in-memory (cermin adapter Supabase)."""

from __future__ import annotations

from backend.database.memory import InMemoryRepository
from backend.database.repository import Repository


def test_in_memory_repository_satisfies_protocol():
    assert isinstance(InMemoryRepository(), Repository)


def test_insert_assigns_id_and_timestamps():
    repo = InMemoryRepository()
    row = repo.insert("items", {"name": "satu"})
    assert row["id"]
    assert row["created_at"] == row["updated_at"]
    assert repo.count("items") == 1


def test_select_filters_and_ordering():
    repo = InMemoryRepository()
    repo.insert_many(
        "items",
        [
            {"name": "b", "active": True, "order": 2},
            {"name": "a", "active": True, "order": 1},
            {"name": "c", "active": False, "order": 3},
        ],
    )
    active = repo.select("items", filters={"active": True})
    assert {row["name"] for row in active} == {"a", "b"}
    ordered = repo.select("items", order="order", limit=2)
    assert [row["name"] for row in ordered] == ["a", "b"]


def test_get_update_and_delete():
    repo = InMemoryRepository()
    created = repo.insert("items", {"name": "awal"})
    assert repo.get("items", created["id"])["name"] == "awal"

    updated = repo.update("items", created["id"], {"name": "baru"})
    assert updated["name"] == "baru"

    assert repo.delete("items", created["id"]) is True
    assert repo.get("items", created["id"]) is None
    assert repo.delete("items", created["id"]) is False


def test_update_where():
    repo = InMemoryRepository()
    repo.insert_many(
        "notifications",
        [{"is_read": False}, {"is_read": False}, {"is_read": True}],
    )
    changed = repo.update_where("notifications", {"is_read": False}, {"is_read": True})
    assert len(changed) == 2
    assert all(row["is_read"] for row in repo.rows("notifications"))


def test_missing_update_returns_none():
    repo = InMemoryRepository()
    assert repo.update("items", "tidak-ada", {"x": 1}) is None


def test_seed_rows_are_copied():
    source = [{"id": "x", "value": 1}]
    repo = InMemoryRepository({"items": source})
    source[0]["value"] = 99
    assert repo.get("items", "x")["value"] == 1
