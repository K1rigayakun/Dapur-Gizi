from __future__ import annotations
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Protocol
import uuid


class FoodSafetyRepositoryProtocol(Protocol):
    def get_checklist(self, date: str) -> Optional[Dict[str, Any]]: ...
    def save_checklist(self, date: str, payload: Dict[str, Any]) -> Dict[str, Any]: ...
    def list_slhs(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]: ...
    def insert_incident(self, record: Dict[str, Any]) -> Dict[str, Any]: ...
    def list_incidents(self) -> List[Dict[str, Any]]: ...
    def insert_food_waste(self, record: Dict[str, Any]) -> Dict[str, Any]: ...
    def list_food_waste(self) -> List[Dict[str, Any]]: ...


class InMemoryFoodSafetyRepository:
    def __init__(self) -> None:
        self._checklists: Dict[str, Dict[str, Any]] = {}
        self._slhs: List[Dict[str, Any]] = [
            {
                "id": "slhs-001",
                "certificateNumber": "443.5/SLHS-SPPG/2026/014",
                "issuer": "Dinas Kesehatan Kota Medan",
                "issueDate": "2026-01-15",
                "expiryDate": "2027-01-15",
                "verificationStatus": "Terverifikasi",
                "documentRef": "ARSIP-DINKES-2026-014.pdf",
            }
        ]
        self._incidents: List[Dict[str, Any]] = []
        self._food_waste: List[Dict[str, Any]] = []

    def get_checklist(self, date: str) -> Optional[Dict[str, Any]]:
        return self._checklists.get(date)

    def save_checklist(self, date: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        self._checklists[date] = payload
        return payload

    def list_slhs(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return list(self._slhs)

    def insert_incident(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self._incidents.append(record)
        return record

    def list_incidents(self) -> List[Dict[str, Any]]:
        return list(self._incidents)

    def insert_food_waste(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self._food_waste.append(record)
        return record

    def list_food_waste(self) -> List[Dict[str, Any]]:
        return list(self._food_waste)


class FoodSafetyService:
    DEFAULT_ITEMS = [
        {"id": "chk-1", "label": "Suhu penyimpanan bahan baku sesuai standar (< 5°C)", "checked": False},
        {"id": "chk-2", "label": "Sanitasi peralatan masak dan meja persiapan", "checked": False},
        {"id": "chk-3", "label": "Petugas dapur menggunakan APD lengkap (masker, sarung tangan, penutup kepala)", "checked": False},
        {"id": "chk-4", "label": "Sampel makanan (food bank) disimpan untuk uji 2x24 jam", "checked": False},
    ]

    def __init__(self, repository: FoodSafetyRepositoryProtocol) -> None:
        self.repository = repository

    def get_checklist(self, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        date_str = (payload or {}).get("date") or datetime.now().strftime("%Y-%m-%d")
        existing = self.repository.get_checklist(date_str)
        if existing:
            return existing
        return {
            "date": date_str,
            "inspectorName": "",
            "checkedAt": None,
            "items": [dict(item) for item in self.DEFAULT_ITEMS],
            "notes": "",
            "status": "Belum Diperiksa",
        }

    def save_checklist(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        date_str = (payload.get("date") or "").strip()
        if not date_str:
            raise ValueError("Tanggal pemeriksaan wajib diisi.")

        inspector = (payload.get("inspectorName") or "").strip()
        if not inspector:
            raise ValueError("Identitas pemeriksa wajib diisi.")

        items = payload.get("items")
        if not items or not isinstance(items, list):
            raise ValueError("Item checklist tidak boleh kosong.")

        all_checked = all(bool(item.get("checked")) for item in items)
        record = {
            "date": date_str,
            "inspectorName": inspector,
            "checkedAt": datetime.now().isoformat(timespec="seconds"),
            "items": items,
            "notes": payload.get("notes") or "",
            "status": "Lulus Inspeksi" if all_checked else "Perlu Tindak Lanjut",
        }
        return self.repository.save_checklist(date_str, record)

    def list_slhs(self, payload: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        records = self.repository.list_slhs(payload or {})
        for rec in records:
            if not rec.get("certificateNumber") or not rec.get("documentRef"):
                rec["verificationStatus"] = "Belum Terverifikasi"
        return records

    def create_incident(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        title = (payload.get("title") or "").strip()
        location = (payload.get("location") or "").strip()
        severity = (payload.get("severity") or "").strip()
        action_taken = (payload.get("actionTaken") or "").strip()

        if not all([title, location, severity, action_taken]):
            raise ValueError("Judul, lokasi, tingkat keparahan, dan tindakan wajib diisi.")

        record = {
            "id": f"inc-{uuid.uuid4().hex[:6]}",
            "title": title,
            "location": location,
            "severity": severity,
            "actionTaken": action_taken,
            "incidentTime": payload.get("incidentTime") or datetime.now().isoformat(timespec="seconds"),
            "followUpStatus": payload.get("followUpStatus") or "Ditangani",
        }
        return self.repository.insert_incident(record)

    def create_food_waste(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        date_str = (payload.get("date") or datetime.now().strftime("%Y-%m-%d")).strip()
        category = (payload.get("category") or "").strip()
        if not category:
            raise ValueError("Kategori limbah pangan wajib diisi.")

        try:
            weight = Decimal(str(payload.get("weightKg", "-1")))
        except InvalidOperation:
            raise ValueError("Berat limbah harus berupa angka desimal yang valid.")

        if weight <= Decimal("0"):
            raise ValueError("Berat limbah pangan harus lebih besar dari 0 kg.")

        record = {
            "id": f"fw-{uuid.uuid4().hex[:6]}",
            "date": date_str,
            "category": category,
            "weightKg": float(weight),
            "handlingMethod": payload.get("handlingMethod") or "Pemilahan Organik Internal",
            "notes": payload.get("notes") or "",
        }
        return self.repository.insert_food_waste(record)