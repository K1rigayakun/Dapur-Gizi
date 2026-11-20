"""Pemeriksaan statis migrasi database dan aturan keamanan.

Test ini tidak menjalankan SQL ke database nyata. Ia memastikan artefak
migrasi memuat RLS untuk setiap tabel dan tidak memuat kredensial.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "migrations"


def _read(name: str) -> str:
    return (MIGRATIONS / name).read_text(encoding="utf-8")


def test_migration_files_exist():
    for name in ("001_initial_schema.sql", "002_rls_policies.sql", "003_seed_demo.sql"):
        assert (MIGRATIONS / name).is_file(), name


def test_every_table_has_rls_enabled():
    schema = _read("001_initial_schema.sql")
    rls = _read("002_rls_policies.sql")

    tables = set(
        re.findall(
            r"create table if not exists public\.([a-z_]+)\s*\(",
            schema,
            flags=re.IGNORECASE,
        )
    )
    assert tables, "Tidak ada tabel yang terdeteksi pada 001_initial_schema.sql"

    missing = [
        table
        for table in sorted(tables)
        if not re.search(
            rf"alter table public\.{table}\s+enable row level security",
            rls,
            flags=re.IGNORECASE,
        )
    ]
    assert not missing, f"Tabel tanpa RLS: {missing}"


def test_rls_declares_policies_for_sensitive_tables():
    rls = _read("002_rls_policies.sql")
    for table in ("app_users", "beneficiaries", "budget_parameters", "audit_logs"):
        assert re.search(rf"on public\.{table}\b", rls), table
    assert "has_app_role" in rls
    assert "security definer" in rls.lower()


def test_demo_seed_is_guarded_and_labelled():
    seed = _read("003_seed_demo.sql")
    assert "allow_demo_seed" in seed
    assert "DEMO-SEED" in seed
    assert "BUKAN ketentuan resmi" in seed
    # NIK pada seed harus fiktif, bukan angka realistis.
    assert "0000000000000001" in seed


def test_no_service_role_key_in_application_code():
    forbidden = "service_role"
    targets = [ROOT / "main.py"]
    targets += list((ROOT / "backend").rglob("*.py"))
    offenders = []
    for path in targets:
        if path.is_file() and forbidden in path.read_text(encoding="utf-8").lower():
            offenders.append(str(path.relative_to(ROOT)))
    assert not offenders, f"Referensi service_role ditemukan: {offenders}"


def test_env_example_has_no_secret_values():
    text = (ROOT / ".env.example").read_text(encoding="utf-8")
    assert "SUPABASE_URL" in text
    assert "SUPABASE_ANON_KEY" in text
    # Boleh menyebut larangan di komentar, tetapi tidak boleh ada assignment.
    assert not re.search(
        r"^\s*SUPABASE_SERVICE_ROLE_KEY\s*=", text, flags=re.IGNORECASE | re.MULTILINE
    )
    assert "your-supabase-anon-key-placeholder" in text
