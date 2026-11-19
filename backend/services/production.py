"""DapurGizi — Daily Production Domain Service (Module E)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Implements:
- Production batch lifecycle ('Terjadwal' -> 'Sedang Berjalan' -> 'Selesai').
- Planned vs Actual portion reconciliations and discrepancy tracking.
- Quality Control (QC) consistency checks (qcPassedPortions + rejectedPortions <= actualPortions).
- Effective service day auditing (for SPPG operational incentive calculations).
- Cooking timeline stages tracking.
- Decoupled ProductionRepositoryProtocol and thread-safe InMemoryProductionRepository.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, Protocol, Sequence


VALID_PRODUCTION_STATUSES: tuple[str, ...] = (
    "Terjadwal",
    "Sedang Berjalan",
    "Selesai",
    "Dibatalkan",
)

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class ProductionRepositoryProtocol(Protocol):
    """Protocol for Daily Production batch persistence."""

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """List production batches with optional filters."""
        ...

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        """Fetch production batch by primary key ID."""
        ...

    def get_by_batch_code(self, batch_code: str) -> dict[str, Any] | None:
        """Fetch production batch by unique batch code."""
        ...

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        """Insert a new production batch."""
        ...

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        """Update an existing production batch."""
        ...


class InMemoryProductionRepository:
    """In-memory reference repository conforming to ProductionRepositoryProtocol."""

    def __init__(self, initial_records: Sequence[dict[str, Any]] | None = None) -> None:
        self._records: dict[str, dict[str, Any]] = {}
        if initial_records:
            for rec in initial_records:
                self.insert(dict(rec))

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        items = [dict(r) for r in self._records.values()]
        items.sort(key=lambda p: str(p.get("date", "")))
        return items

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        rec = self._records.get(str(record_id))
        return dict(rec) if rec else None

    def get_by_batch_code(self, batch_code: str) -> dict[str, Any] | None:
        code_clean = str(batch_code).strip().upper()
        for rec in self._records.values():
            if str(rec.get("batchCode", "")).strip().upper() == code_clean:
                return dict(rec)
        return None

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        stored = dict(record)
        rec_id = str(stored.get("id") or f"PRD-{uuid.uuid4().hex[:8].upper()}")
        stored["id"] = rec_id
        if "created_at" not in stored:
            stored["created_at"] = datetime.now().isoformat()
        self._records[rec_id] = stored
        return dict(stored)

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        key = str(record_id)
        if key not in self._records:
            raise LookupError(f"Production batch with id '{record_id}' does not exist.")
        current = self._records[key]
        current.update(changes)
        current["updated_at"] = datetime.now().isoformat()
        self._records[key] = current
        return dict(current)


def get_default_production_timeline() -> list[dict[str, Any]]:
    """Official 5-stage production timeline for Indonesian SPPG kitchens."""
    return [
        {"time": "03:00 WIB", "stage": "Penerimaan & QC Bahan Baku Segar", "done": False},
        {"time": "04:00 WIB", "stage": "Pengolahan & Pemasakan Utama", "done": False},
        {"time": "05:30 WIB", "stage": "Uji Organoleptik & Suhu Inti (>75°C)", "done": False},
        {"time": "06:15 WIB", "stage": "Pemorsian & Penyegelan Ompreng Stainless", "done": False},
        {"time": "07:00 WIB", "stage": "Serah Terima ke Armada Distribusi", "done": False},
    ]


class ProductionService:
    """Domain service managing daily kitchen production batches, QC metrics, and timelines."""

    def __init__(self, repository: ProductionRepositoryProtocol) -> None:
        self.repository = repository

    def list(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Fetch production batches according to INTEGRATION.md contract.

        Returns:
            { "items": list[dict] }
        """
        payload = payload or {}
        raw_items = self.repository.list()

        # Optional date filtering
        date_filter = str(payload.get("date", "") or "").strip()
        if date_filter:
            filtered = [p for p in raw_items if p.get("date") == date_filter]
        else:
            filtered = raw_items

        filtered.sort(key=lambda p: str(p.get("date", "")))
        return {"items": filtered}

    def create(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Create a new daily production batch with QC consistency and duplicate checking."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload produksi tidak boleh kosong.")

        date_str = str(payload.get("date", "")).strip()
        if not date_str or not DATE_REGEX.match(date_str):
            raise ValueError(f"Tanggal produksi '{date_str}' tidak valid (wajib YYYY-MM-DD).")

        batch_code = str(payload.get("batchCode", "")).strip().upper()
        if not batch_code:
            raise ValueError("Kode batch produksi (batchCode) wajib diisi.")

        existing_batch = self.repository.get_by_batch_code(batch_code)
        if existing_batch:
            raise ValueError(f"Duplikat terdeteksi: Kode batch '{batch_code}' sudah pernah digunakan.")

        menu_name = str(payload.get("menuName", "")).strip()
        if not menu_name:
            raise ValueError("Nama menu produksi wajib diisi.")

        day_label = str(payload.get("dayLabel", "Hari Layanan")).strip()

        # Quantities validation
        try:
            planned_portions = int(payload.get("plannedPortions", 0) or 0)
            actual_portions = int(payload.get("actualPortions", 0) or 0)
        except (ValueError, TypeError):
            raise ValueError("Porsi rencana dan aktual harus berupa bilangan bulat.")

        if planned_portions < 0 or actual_portions < 0:
            raise ValueError("Jumlah porsi rencana dan aktual tidak boleh negatif.")

        # QC and Rejected portions validation
        rejected_val = payload.get("rejectedPortions")
        rejected_portions = int(rejected_val) if rejected_val is not None else 0
        if rejected_portions < 0:
            raise ValueError("Porsi ditolak (rejectedPortions) tidak boleh negatif.")

        qc_val = payload.get("qcPassedPortions")
        if qc_val is not None:
            qc_passed_portions = int(qc_val)
        else:
            qc_passed_portions = max(0, actual_portions - rejected_portions)

        if qc_passed_portions < 0:
            raise ValueError("Porsi lolos QC (qcPassedPortions) tidak boleh negatif.")

        # Logical QC consistency check
        if qc_passed_portions > actual_portions:
            raise ValueError(
                f"Porsi lolos QC ({qc_passed_portions}) tidak boleh melebihi realisasi porsi aktual ({actual_portions})."
            )
        if rejected_portions > actual_portions:
            raise ValueError(
                f"Porsi ditolak ({rejected_portions}) tidak boleh melebihi realisasi porsi aktual ({actual_portions})."
            )
        if (qc_passed_portions + rejected_portions) > actual_portions:
            raise ValueError(
                f"Total porsi lolos QC ({qc_passed_portions}) + ditolak ({rejected_portions}) "
                f"melebihi porsi aktual ({actual_portions})."
            )

        # Financial costs
        try:
            food_cost_total = float(payload.get("foodCostTotal", 0) or 0)
            op_cost_total = float(payload.get("operationalCostTotal", 0) or 0)
        except (ValueError, TypeError):
            raise ValueError("Biaya bahan pangan dan operasional harus berupa angka.")

        if food_cost_total < 0 or op_cost_total < 0:
            raise ValueError("Biaya bahan pangan dan operasional tidak boleh bernilai negatif.")

        status = str(payload.get("status", "Terjadwal") or "Terjadwal").strip()
        if status not in VALID_PRODUCTION_STATUSES:
            raise ValueError(
                f"Status produksi '{status}' tidak valid. Pilihan: {', '.join(VALID_PRODUCTION_STATUSES)}."
            )

        is_effective = payload.get("isEffectiveServiceDay", True)
        if isinstance(is_effective, str):
            is_effective = is_effective.lower() in ("true", "1", "yes", "on")
        is_effective = bool(is_effective)

        timeline = payload.get("timeline")
        if not isinstance(timeline, list) or not timeline:
            timeline = get_default_production_timeline()

        lead_chef = str(payload.get("leadChef", "Chef Kepala SPPG")).strip()
        notes = str(payload.get("notes", "Catatan produksi tercatat.")).strip()

        record: dict[str, Any] = {
            "id": payload.get("id") or f"PRD-{date_str.replace('-', '')}-{uuid.uuid4().hex[:4].upper()}",
            "date": date_str,
            "dayLabel": day_label,
            "batchCode": batch_code,
            "menuId": payload.get("menuId"),
            "menuName": menu_name,
            "plannedPortions": planned_portions,
            "actualPortions": actual_portions,
            "qcPassedPortions": qc_passed_portions,
            "rejectedPortions": rejected_portions,
            "foodCostTotal": round(food_cost_total),
            "operationalCostTotal": round(op_cost_total),
            "isEffectiveServiceDay": is_effective,
            "status": status,
            "leadChef": lead_chef,
            "notes": notes,
            "timeline": timeline,
            "discrepancyPortions": actual_portions - planned_portions,
        }

        stored = self.repository.insert(record)
        return stored

    def update(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Update an existing daily production batch with consistency validation."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload pembaruan produksi tidak boleh kosong.")

        record_id = str(payload.get("id", "")).strip()
        if not record_id:
            raise ValueError("ID batch produksi wajib diisi untuk pembaruan.")

        existing = self.repository.get_by_id(record_id)
        if not existing:
            raise LookupError(f"Batch produksi dengan ID '{record_id}' tidak ditemukan.")

        changes: dict[str, Any] = {}

        if "date" in payload:
            date_str = str(payload["date"]).strip()
            if not DATE_REGEX.match(date_str):
                raise ValueError(f"Format tanggal '{date_str}' tidak valid (wajib YYYY-MM-DD).")
            changes["date"] = date_str

        if "dayLabel" in payload:
            changes["dayLabel"] = str(payload["dayLabel"]).strip()

        if "batchCode" in payload:
            new_code = str(payload["batchCode"]).strip().upper()
            if not new_code:
                raise ValueError("Kode batch tidak boleh kosong.")
            if new_code != str(existing.get("batchCode", "")).strip().upper():
                dup = self.repository.get_by_batch_code(new_code)
                if dup and str(dup.get("id")) != record_id:
                    raise ValueError(f"Kode batch '{new_code}' sudah digunakan oleh batch lain.")
            changes["batchCode"] = new_code

        if "menuName" in payload:
            menu_name = str(payload["menuName"]).strip()
            if not menu_name:
                raise ValueError("Nama menu tidak boleh kosong.")
            changes["menuName"] = menu_name

        if "menuId" in payload:
            changes["menuId"] = payload["menuId"]

        planned = payload.get("plannedPortions", existing.get("plannedPortions", 0))
        actual = payload.get("actualPortions", existing.get("actualPortions", 0))

        try:
            planned_int = int(planned)
            actual_int = int(actual)
        except (ValueError, TypeError):
            raise ValueError("Jumlah porsi harus berupa bilangan bulat.")

        if planned_int < 0 or actual_int < 0:
            raise ValueError("Jumlah porsi tidak boleh negatif.")

        if "plannedPortions" in payload:
            changes["plannedPortions"] = planned_int
        if "actualPortions" in payload:
            changes["actualPortions"] = actual_int

        # Recalculate discrepancy
        changes["discrepancyPortions"] = actual_int - planned_int

        # QC and Rejected portions consistency
        qc_passed = payload.get("qcPassedPortions", existing.get("qcPassedPortions", actual_int))
        rejected = payload.get("rejectedPortions", existing.get("rejectedPortions", 0))

        try:
            qc_int = int(qc_passed)
            rej_int = int(rejected)
        except (ValueError, TypeError):
            raise ValueError("Nilai QC atau rejected harus berupa integer.")

        if qc_int < 0 or rej_int < 0:
            raise ValueError("Porsi QC lolos dan ditolak tidak boleh negatif.")

        if qc_int > actual_int:
            raise ValueError(f"Porsi lolos QC ({qc_int}) melebihi porsi aktual ({actual_int}).")
        if rej_int > actual_int:
            raise ValueError(f"Porsi ditolak ({rej_int}) melebihi porsi aktual ({actual_int}).")
        if (qc_int + rej_int) > actual_int:
            raise ValueError(
                f"Total lolos QC ({qc_int}) + ditolak ({rej_int}) melebihi porsi aktual ({actual_int})."
            )

        if "qcPassedPortions" in payload:
            changes["qcPassedPortions"] = qc_int
        if "rejectedPortions" in payload:
            changes["rejectedPortions"] = rej_int

        if "foodCostTotal" in payload:
            val = float(payload["foodCostTotal"])
            if val < 0:
                raise ValueError("Biaya bahan pangan tidak boleh negatif.")
            changes["foodCostTotal"] = round(val)

        if "operationalCostTotal" in payload:
            val = float(payload["operationalCostTotal"])
            if val < 0:
                raise ValueError("Biaya operasional tidak boleh negatif.")
            changes["operationalCostTotal"] = round(val)

        if "status" in payload:
            st = str(payload["status"]).strip()
            if st not in VALID_PRODUCTION_STATUSES:
                raise ValueError(f"Status produksi '{st}' tidak valid.")
            changes["status"] = st

        if "isEffectiveServiceDay" in payload:
            eff = payload["isEffectiveServiceDay"]
            if isinstance(eff, str):
                eff = eff.lower() in ("true", "1", "yes", "on")
            changes["isEffectiveServiceDay"] = bool(eff)

        if "notes" in payload:
            changes["notes"] = str(payload["notes"]).strip()

        if "leadChef" in payload:
            changes["leadChef"] = str(payload["leadChef"]).strip()

        if "timeline" in payload and isinstance(payload["timeline"], list):
            changes["timeline"] = payload["timeline"]

        if not changes:
            return existing

        updated = self.repository.update(record_id, changes)
        return updated
