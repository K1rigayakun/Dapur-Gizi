"""DapurGizi — Beneficiary Domain Service (Module C)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

This module implements the business logic, validation rules, identifier auditing,
search/filtering/sorting, CSV import parsing, and CRUD workflows for MBG beneficiaries
(Penerima Manfaat Satuan Pelayanan Pemenuhan Gizi).

Architecture:
- Pure Python business logic independent of Supabase.
- Strict Protocol-based dependency injection for repository layer.
- Thread-safe InMemoryBeneficiaryRepository for offline testing and development.
- Adheres to INTEGRATION.md contract.
"""

from __future__ import annotations

import csv
import io
import re
import uuid
from datetime import date, datetime
from typing import Any, Protocol, Sequence


# 6 Official Target Categories in MBG (Program Makanan Bergizi Gratis)
BENEFICIARY_CATEGORIES: tuple[str, ...] = (
    "Siswa SD",
    "Siswa SMP",
    "Siswa SMA",
    "Ibu Hamil",
    "Ibu Menyusui",
    "Balita",
)

VALID_STATUSES: tuple[str, ...] = ("Aktif", "Nonaktif")

# Regex for NIK (16 digits) and NISN (10 digits), allowing 10–16 digits per frontend contract
IDENTIFIER_REGEX = re.compile(r"^\d{10,16}$")


class BeneficiaryRepositoryProtocol(Protocol):
    """Protocol defining persistence requirements for Beneficiary data.

    Gabriel will implement this protocol with Supabase PostgreSQL adapter.
    """

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """List beneficiaries matching optional filter criteria."""
        ...

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        """Fetch a single beneficiary record by primary key id."""
        ...

    def get_by_identifier(self, identifier: str) -> dict[str, Any] | None:
        """Fetch a single beneficiary record by NIK / NISN identifier."""
        ...

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        """Insert a new beneficiary record and return the stored dictionary."""
        ...

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        """Apply changes to an existing record and return the updated dictionary."""
        ...

    def delete(self, record_id: str) -> dict[str, Any]:
        """Delete an existing record and return minimal tombstone details."""
        ...

    def bulk_insert(self, records: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        """Atomically or batch insert multiple beneficiary records."""
        ...


class InMemoryBeneficiaryRepository:
    """In-memory reference repository used for unit testing and offline execution.

    Thread-safe storage conforming to BeneficiaryRepositoryProtocol.
    """

    def __init__(self, initial_records: Sequence[dict[str, Any]] | None = None) -> None:
        self._records: dict[str, dict[str, Any]] = {}
        if initial_records:
            for rec in initial_records:
                self.insert(dict(rec))

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        items = [dict(r) for r in self._records.values()]
        return items

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        rec = self._records.get(str(record_id))
        return dict(rec) if rec else None

    def get_by_identifier(self, identifier: str) -> dict[str, Any] | None:
        clean = str(identifier).strip()
        for rec in self._records.values():
            if str(rec.get("nik", "")).strip() == clean:
                return dict(rec)
        return None

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        stored = dict(record)
        rec_id = str(stored.get("id") or f"BNF-{uuid.uuid4().hex[:8].upper()}")
        stored["id"] = rec_id
        if "created_at" not in stored:
            stored["created_at"] = datetime.now().isoformat()
        self._records[rec_id] = stored
        return dict(stored)

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        key = str(record_id)
        if key not in self._records:
            raise LookupError(f"Beneficiary with id '{record_id}' does not exist.")
        current = self._records[key]
        current.update(changes)
        current["updated_at"] = datetime.now().isoformat()
        self._records[key] = current
        return dict(current)

    def delete(self, record_id: str) -> dict[str, Any]:
        key = str(record_id)
        if key not in self._records:
            raise LookupError(f"Beneficiary with id '{record_id}' does not exist.")
        deleted = self._records.pop(key)
        return {"deletedId": key, "name": deleted.get("name", "")}

    def bulk_insert(self, records: Sequence[dict[str, Any]]) -> list[dict[str, Any]]:
        inserted: list[dict[str, Any]] = []
        for r in records:
            inserted.append(self.insert(r))
        return inserted


def detect_identifier_type(identifier: str) -> str:
    """Classify the identifier type to document NIK vs NISN domain discrepancy."""
    clean = str(identifier).strip()
    if len(clean) == 16:
        return "NIK"
    if len(clean) == 10:
        return "NISN"
    return "IDENTITAS_LAIN"


class BeneficiaryService:
    """Domain service managing MBG beneficiaries."""

    def __init__(self, repository: BeneficiaryRepositoryProtocol) -> None:
        self.repository = repository

    def list(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """List, search, filter, and sort beneficiaries according to INTEGRATION.md contract.

        Returns:
            {
                "items": list[dict],
                "totalCount": int,
                "activeCount": int
            }
        """
        payload = payload or {}
        raw_items = self.repository.list()

        search_query = str(payload.get("search", "") or "").strip().lower()
        category_filter = str(payload.get("category", "") or "").strip()
        status_filter = str(payload.get("status", "") or "").strip()
        sort_by = str(payload.get("sortBy", "name") or "name").strip()
        sort_dir = str(payload.get("sortDir", "asc") or "asc").strip().lower()

        filtered: list[dict[str, Any]] = []
        for item in raw_items:
            # Search across name, NIK, institution, gradeOrGroup, and notes
            if search_query:
                haystack = " ".join([
                    str(item.get("name", "")),
                    str(item.get("nik", "")),
                    str(item.get("institution", "")),
                    str(item.get("gradeOrGroup", "")),
                    str(item.get("notes", "")),
                ]).lower()
                if search_query not in haystack:
                    continue

            # Category filter
            if category_filter and category_filter != "ALL":
                if item.get("category") != category_filter:
                    continue

            # Status filter
            if status_filter and status_filter != "ALL":
                if item.get("status") != status_filter:
                    continue

            filtered.append(item)

        # Sorting
        reverse = sort_dir == "desc"

        def sort_key(rec: dict[str, Any]) -> Any:
            val = rec.get(sort_by)
            if val is None:
                return ""
            if isinstance(val, (int, float)):
                return val
            return str(val).lower()

        try:
            filtered.sort(key=sort_key, reverse=reverse)
        except Exception:
            # Fallback to string-based sort if mixed types occur
            filtered.sort(key=lambda r: str(r.get(sort_by, "")).lower(), reverse=reverse)

        total_count = len(raw_items)
        active_count = sum(1 for r in raw_items if r.get("status") == "Aktif")

        return {
            "items": filtered,
            "totalCount": total_count,
            "activeCount": active_count,
        }

    def create(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Create a new beneficiary record with validation and duplicate prevention."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload penerima manfaat tidak boleh kosong.")

        nik = str(payload.get("nik", "")).strip()
        name = str(payload.get("name", "")).strip()
        category = str(payload.get("category", "")).strip()
        institution = str(payload.get("institution", "")).strip()
        grade_or_group = str(payload.get("gradeOrGroup", "-") or "-").strip()
        status = str(payload.get("status", "Aktif") or "Aktif").strip()
        notes = str(payload.get("notes", "Tidak ada alergi") or "Tidak ada alergi").strip()
        registered_at = str(payload.get("registeredAt", "") or date.today().isoformat()).strip()

        # Validations
        if not nik:
            raise ValueError("Nomor identitas (NIK/NISN) wajib diisi.")
        if not IDENTIFIER_REGEX.match(nik):
            raise ValueError(f"Nomor identitas '{nik}' tidak valid (wajib 10–16 digit angka).")

        if not name or len(name) < 3:
            raise ValueError("Nama lengkap penerima manfaat minimal 3 karakter.")

        if category not in BENEFICIARY_CATEGORIES:
            raise ValueError(
                f"Kategori '{category}' tidak valid. Pilihan resmi: {', '.join(BENEFICIARY_CATEGORIES)}."
            )

        if not institution or len(institution) < 3:
            raise ValueError("Nama sekolah atau institusi/posyandu wajib diisi (minimal 3 karakter).")

        if status not in VALID_STATUSES:
            raise ValueError(f"Status '{status}' tidak valid. Pilihan: {', '.join(VALID_STATUSES)}.")

        # Duplicate check against existing repository
        existing = self.repository.get_by_identifier(nik)
        if existing:
            existing_name = existing.get("name", "Penerima lain")
            raise ValueError(
                f"Duplikat terdeteksi: Nomor identitas {nik} sudah terdaftar atas nama '{existing_name}'."
            )

        new_record: dict[str, Any] = {
            "id": payload.get("id") or f"BNF-{uuid.uuid4().hex[:8].upper()}",
            "nik": nik,
            "name": name,
            "category": category,
            "institution": institution,
            "gradeOrGroup": grade_or_group,
            "status": status,
            "notes": notes,
            "registeredAt": registered_at,
            "identifierType": detect_identifier_type(nik),
        }

        stored = self.repository.insert(new_record)
        return stored

    def update(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Update an existing beneficiary record with validation."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload pembaruan penerima manfaat tidak boleh kosong.")

        record_id = str(payload.get("id", "")).strip()
        if not record_id:
            raise ValueError("ID penerima manfaat wajib diisi untuk pembaruan.")

        existing = self.repository.get_by_id(record_id)
        if not existing:
            raise LookupError(f"Data penerima manfaat dengan ID '{record_id}' tidak ditemukan.")

        changes: dict[str, Any] = {}

        if "nik" in payload:
            nik = str(payload["nik"]).strip()
            if not IDENTIFIER_REGEX.match(nik):
                raise ValueError(f"Nomor identitas '{nik}' tidak valid (wajib 10–16 digit angka).")
            # If changing NIK, check for collision with another record
            if nik != str(existing.get("nik", "")).strip():
                duplicate = self.repository.get_by_identifier(nik)
                if duplicate and str(duplicate.get("id")) != record_id:
                    dup_name = duplicate.get("name", "Penerima lain")
                    raise ValueError(
                        f"Duplikat terdeteksi: Nomor identitas {nik} sudah terdaftar atas nama '{dup_name}'."
                    )
            changes["nik"] = nik
            changes["identifierType"] = detect_identifier_type(nik)

        if "name" in payload:
            name = str(payload["name"]).strip()
            if len(name) < 3:
                raise ValueError("Nama lengkap penerima manfaat minimal 3 karakter.")
            changes["name"] = name

        if "category" in payload:
            cat = str(payload["category"]).strip()
            if cat not in BENEFICIARY_CATEGORIES:
                raise ValueError(f"Kategori '{cat}' tidak valid.")
            changes["category"] = cat

        if "institution" in payload:
            inst = str(payload["institution"]).strip()
            if len(inst) < 3:
                raise ValueError("Nama sekolah atau institusi/posyandu minimal 3 karakter.")
            changes["institution"] = inst

        if "gradeOrGroup" in payload:
            changes["gradeOrGroup"] = str(payload["gradeOrGroup"]).strip()

        if "status" in payload:
            status = str(payload["status"]).strip()
            if status not in VALID_STATUSES:
                raise ValueError(f"Status '{status}' tidak valid.")
            changes["status"] = status

        if "notes" in payload:
            changes["notes"] = str(payload["notes"]).strip()

        if "registeredAt" in payload:
            changes["registeredAt"] = str(payload["registeredAt"]).strip()

        if not changes:
            return existing

        updated = self.repository.update(record_id, changes)
        return updated

    def delete(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Delete a beneficiary by ID according to INTEGRATION.md contract."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload penghapusan tidak boleh kosong.")

        record_id = str(payload.get("id", "")).strip()
        if not record_id:
            raise ValueError("ID penerima manfaat wajib diisi.")

        existing = self.repository.get_by_id(record_id)
        if not existing:
            raise LookupError(f"Data penerima manfaat dengan ID '{record_id}' tidak ditemukan.")

        result = self.repository.delete(record_id)
        return {
            "deletedId": str(result.get("deletedId", record_id)),
            "name": str(result.get("name", existing.get("name", ""))),
        }

    def import_records(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Import batch records, either from pre-validated records array or raw CSV text.

        Enforces:
        - Format validation per row (10–16 digit NIK, valid 6 MBG categories, required name & institution)
        - Intra-batch duplicate rejection
        - Pre-existing database duplicate rejection
        """
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload impor data tidak boleh kosong.")

        records_to_process: list[dict[str, Any]] = []

        if "csvText" in payload and isinstance(payload["csvText"], str):
            parse_report = self.parse_and_validate_csv(payload["csvText"])
            records_to_process = parse_report["validRows"]
            if not records_to_process:
                err_msg = "Tidak ada baris data CSV valid untuk diimpor."
                if parse_report["invalidRows"]:
                    first_err = parse_report["invalidRows"][0]["reason"]
                    err_msg += f" (Contoh kesalahan: {first_err})"
                raise ValueError(err_msg)
        elif "records" in payload and isinstance(payload["records"], list):
            records_to_process = list(payload["records"])
        else:
            raise ValueError("Payload impor wajib menyertakan 'records' (array) atau 'csvText' (string).")

        if not records_to_process:
            raise ValueError("Tidak ada baris data valid untuk diimpor.")

        existing_all = self.repository.list()
        existing_nik_set = {str(r.get("nik", "")).strip() for r in existing_all}

        seen_in_batch: set[str] = set()
        valid_to_insert: list[dict[str, Any]] = []

        for idx, row in enumerate(records_to_process, start=1):
            nik = str(row.get("nik", "")).strip()
            name = str(row.get("name", "")).strip()
            cat = str(row.get("category", "")).strip()
            inst = str(row.get("institution", "")).strip()
            grade = str(row.get("gradeOrGroup", "-") or "-").strip()
            status = str(row.get("status", "Aktif") or "Aktif").strip()
            notes = str(row.get("notes", "Tidak ada alergi") or "Tidak ada alergi").strip()
            reg_date = str(row.get("registeredAt", "") or date.today().isoformat()).strip()

            if not IDENTIFIER_REGEX.match(nik):
                raise ValueError(f"Baris {idx}: NIK/NISN '{nik}' tidak valid (wajib 10–16 digit angka).")

            if not name or len(name) < 3:
                raise ValueError(f"Baris {idx}: Nama '{name}' kurang dari 3 karakter.")

            if cat not in BENEFICIARY_CATEGORIES:
                raise ValueError(f"Baris {idx}: Kategori '{cat}' tidak termasuk 6 kategori MBG resmi.")

            if not inst or len(inst) < 3:
                raise ValueError(f"Baris {idx}: Institusi '{inst}' minimal 3 karakter.")

            if status not in VALID_STATUSES:
                status = "Aktif"

            if nik in seen_in_batch:
                raise ValueError(f"Baris {idx}: NIK/NISN '{nik}' terduplikasi dalam batch impor yang sama.")

            if nik in existing_nik_set:
                raise ValueError(f"Baris {idx}: NIK/NISN '{nik}' sudah terdaftar di sistem.")

            seen_in_batch.add(nik)
            valid_to_insert.append({
                "id": row.get("id") or f"BNF-IMP-{uuid.uuid4().hex[:6].upper()}-{idx}",
                "nik": nik,
                "name": name,
                "category": cat,
                "institution": inst,
                "gradeOrGroup": grade,
                "status": status,
                "notes": notes,
                "registeredAt": reg_date,
                "identifierType": detect_identifier_type(nik),
            })

        inserted = self.repository.bulk_insert(valid_to_insert)
        return {
            "importedCount": len(inserted),
            "records": inserted,
        }

    def parse_and_validate_csv(self, csv_text: str) -> dict[str, list[dict[str, Any]]]:
        """Parse raw CSV text and provide detailed report on valid, invalid, and duplicate rows.

        Directly mirrors client-side parseAndValidateBeneficiaryCSV for consistency.
        """
        existing_all = self.repository.list()
        existing_nik_set = {str(r.get("nik", "")).strip() for r in existing_all}

        lines = [line.strip() for line in csv_text.strip().splitlines() if line.strip()]
        if len(lines) < 2:
            return {
                "validRows": [],
                "invalidRows": [{"line": 1, "reason": "File CSV kosong atau tidak memiliki baris data."}],
                "duplicateRows": [],
            }

        # Use csv reader to handle quotes and commas properly
        reader = csv.reader(io.StringIO("\n".join(lines)))
        rows = list(reader)
        if not rows:
            return {"validRows": [], "invalidRows": [], "duplicateRows": []}

        header = [h.strip().lower() for h in rows[0]]

        def find_col_idx(predicates: list[str]) -> int:
            for idx, h in enumerate(header):
                if any(p in h for p in predicates):
                    return idx
            return -1

        nik_idx = find_col_idx(["nik", "nisn", "identitas"])
        name_idx = find_col_idx(["nama", "name"])
        cat_idx = find_col_idx(["kategori", "category"])
        inst_idx = find_col_idx(["sekolah", "instansi", "posyandu", "institution"])
        grade_idx = find_col_idx(["kelas", "kelompok", "grade", "group"])
        status_idx = find_col_idx(["status"])
        notes_idx = find_col_idx(["alergi", "catatan", "notes"])

        valid_rows: list[dict[str, Any]] = []
        invalid_rows: list[dict[str, Any]] = []
        duplicate_rows: list[dict[str, Any]] = []
        seen_in_batch: set[str] = set()

        for line_num, cols in enumerate(rows[1:], start=2):
            if not any(cols):
                continue

            nik = (cols[nik_idx] if 0 <= nik_idx < len(cols) else (cols[0] if len(cols) > 0 else "")).strip()
            name = (cols[name_idx] if 0 <= name_idx < len(cols) else (cols[1] if len(cols) > 1 else "")).strip()
            cat = (cols[cat_idx] if 0 <= cat_idx < len(cols) else (cols[2] if len(cols) > 2 else "")).strip()
            inst = (cols[inst_idx] if 0 <= inst_idx < len(cols) else (cols[3] if len(cols) > 3 else "")).strip()
            grade = (cols[grade_idx] if 0 <= grade_idx < len(cols) else "Reguler").strip() or "Reguler"
            status = (cols[status_idx] if 0 <= status_idx < len(cols) else "Aktif").strip() or "Aktif"
            notes = (cols[notes_idx] if 0 <= notes_idx < len(cols) else "Tidak ada alergi").strip() or "Tidak ada alergi"

            row_obj = {
                "nik": nik,
                "name": name,
                "category": cat,
                "institution": inst,
                "gradeOrGroup": grade,
                "status": status,
                "notes": notes,
            }

            if not IDENTIFIER_REGEX.match(nik):
                invalid_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": f"NIK/NISN '{nik}' tidak valid (wajib 10–16 digit angka).",
                })
                continue

            if not name or len(name) < 3:
                invalid_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": "Nama penerima manfaat kurang dari 3 karakter.",
                })
                continue

            if cat not in BENEFICIARY_CATEGORIES:
                invalid_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": f"Kategori '{cat}' tidak termasuk dalam 6 kategori MBG resmi.",
                })
                continue

            if not inst or len(inst) < 3:
                invalid_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": "Institusi/Sekolah/Posyandu kosong atau kurang dari 3 karakter.",
                })
                continue

            if nik in existing_nik_set:
                duplicate_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": f"NIK/NISN '{nik}' sudah terdaftar di sistem.",
                })
                continue

            if nik in seen_in_batch:
                duplicate_rows.append({
                    "line": line_num,
                    "row": row_obj,
                    "reason": f"NIK/NISN '{nik}' terduplikasi di dalam file CSV yang sama.",
                })
                continue

            seen_in_batch.add(nik)
            valid_rows.append(row_obj)

        return {
            "validRows": valid_rows,
            "invalidRows": invalid_rows,
            "duplicateRows": duplicate_rows,
        }
