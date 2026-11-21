from __future__ import annotations
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol
import uuid


class DistributionRepositoryProtocol(Protocol):
    def list(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]: ...
    def get_by_id(self, record_id: str) -> Optional[Dict[str, Any]]: ...
    def insert(self, record: Dict[str, Any]) -> Dict[str, Any]: ...
    def update(self, record_id: str, changes: Dict[str, Any]) -> Dict[str, Any]: ...
    def get_production_batch(self, batch_id: str) -> Optional[Dict[str, Any]]: ...
    def get_destination(self, destination_id: str) -> Optional[Dict[str, Any]]: ...


class InMemoryDistributionRepository:
    def __init__(self) -> None:
        self._records: Dict[str, Dict[str, Any]] = {
            "dist-001": {
                "id": "dist-001",
                "routeCode": "RT-01",
                "date": "2026-11-21",
                "destinationId": "dest-01",
                "destinationName": "SDN 01 Medan Baru",
                "destinationType": "Sekolah Dasar",
                "address": "Jl. Pendidikan No. 12, Medan",
                "driverName": "Budi Santoso",
                "departureTime": "07:30",
                "etaTime": "08:15",
                "dispatchedPortions": 250,
                "receivedPortions": None,
                "receivedTime": None,
                "receiverName": None,
                "discrepancy": 0,
                "status": "Dalam Perjalanan",
                "notes": "Pengiriman pagi gelombang 1",
                "statusHistory": [
                    {"status": "Siap Kirim", "timestamp": "2026-11-21T07:00:00"},
                    {"status": "Dalam Perjalanan", "timestamp": "2026-11-21T07:30:00"},
                ],
            }
        }
        self._batches: Dict[str, Dict[str, Any]] = {
            "batch-001": {"id": "batch-001", "portions": 500}
        }
        self._destinations: Dict[str, Dict[str, Any]] = {
            "dest-01": {
                "id": "dest-01",
                "name": "SDN 01 Medan Baru",
                "type": "Sekolah Dasar",
                "address": "Jl. Pendidikan No. 12, Medan",
            },
            "dest-02": {
                "id": "dest-02",
                "name": "Posyandu Melati II",
                "type": "Posyandu",
                "address": "Jl. Melati No. 45, Medan",
            },
        }

    def list(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        items = list(self._records.values())
        if filters and filters.get("status"):
            items = [i for i in items if i["status"] == filters["status"]]
        return items

    def get_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        return self._records.get(record_id)

    def insert(self, record: Dict[str, Any]) -> Dict[str, Any]:
        self._records[record["id"]] = record
        return record

    def update(self, record_id: str, changes: Dict[str, Any]) -> Dict[str, Any]:
        if record_id not in self._records:
            raise LookupError(f"Distribusi {record_id} tidak ditemukan.")
        self._records[record_id].update(changes)
        return self._records[record_id]

    def get_production_batch(self, batch_id: str) -> Optional[Dict[str, Any]]:
        return self._batches.get(batch_id)

    def get_destination(self, destination_id: str) -> Optional[Dict[str, Any]]:
        return self._destinations.get(destination_id)


class DistributionService:
    VALID_STATUSES = ["Siap Kirim", "Dalam Perjalanan", "Diterima"]

    def __init__(self, repository: DistributionRepositoryProtocol) -> None:
        self.repository = repository

    def list(self, payload: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        return self.repository.list(payload or {})

    def create(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        dest_name = (payload.get("destinationName") or "").strip()
        if not dest_name:
            raise ValueError("Tujuan distribusi wajib diisi.")

        date_str = (payload.get("date") or "").strip()
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Format tanggal tidak valid (gunakan YYYY-MM-DD).")

        portions = int(payload.get("dispatchedPortions", -1))
        if portions <= 0:
            raise ValueError("Jumlah porsi dikirim harus lebih dari 0.")

        batch_id = payload.get("batchId")
        if batch_id and not self.repository.get_production_batch(batch_id):
            raise LookupError("Batch produksi tidak ditemukan.")

        now_iso = datetime.now().isoformat(timespec="seconds")
        record = {
            "id": f"dist-{uuid.uuid4().hex[:6]}",
            "routeCode": payload.get("routeCode") or f"RT-{uuid.uuid4().hex[:3].upper()}",
            "date": date_str,
            "destinationId": payload.get("destinationId"),
            "destinationName": dest_name,
            "destinationType": payload.get("destinationType") or "Sekolah",
            "address": payload.get("address") or "-",
            "driverName": payload.get("driverName") or "Belum ditugaskan",
            "departureTime": payload.get("departureTime") or "-",
            "etaTime": payload.get("etaTime") or "-",
            "dispatchedPortions": portions,
            "receivedPortions": None,
            "receivedTime": None,
            "receiverName": None,
            "discrepancy": 0,
            "status": "Siap Kirim",
            "notes": payload.get("notes") or "",
            "statusHistory": [{"status": "Siap Kirim", "timestamp": now_iso}],
        }
        return self.repository.insert(record)

    def update(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        record_id = payload.get("id")
        existing = self.repository.get_by_id(record_id or "")
        if not existing:
            raise LookupError("Data distribusi tidak ditemukan.")

        new_status = payload.get("status")
        if new_status and new_status != existing["status"]:
            if new_status not in self.VALID_STATUSES:
                raise ValueError("Status distribusi tidak valid.")
            if existing["status"] == "Diterima":
                raise ValueError("Distribusi yang sudah diterima tidak dapat diubah statusnya.")
            if existing["status"] == "Siap Kirim" and new_status == "Diterima":
                raise ValueError("Status harus melalui 'Dalam Perjalanan' sebelum 'Diterima'.")

            history = list(existing.get("statusHistory", []))
            history.append({"status": new_status, "timestamp": datetime.now().isoformat(timespec="seconds")})
            payload["statusHistory"] = history

        if "dispatchedPortions" in payload:
            if int(payload["dispatchedPortions"]) <= 0:
                raise ValueError("Jumlah porsi tidak boleh negatif atau nol.")

        return self.repository.update(record_id, payload)

    def confirm_receipt(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        record_id = payload.get("id")
        existing = self.repository.get_by_id(record_id or "")
        if not existing:
            raise LookupError("Data distribusi tidak ditemukan.")

        if existing["status"] != "Dalam Perjalanan":
            raise ValueError("Konfirmasi penerimaan hanya dapat dilakukan saat status 'Dalam Perjalanan'.")

        received_portions = int(payload.get("receivedPortions", -1))
        if received_portions < 0:
            raise ValueError("Jumlah porsi diterima tidak boleh negatif.")

        receiver_name = (payload.get("receiverName") or "").strip()
        if not receiver_name:
            raise ValueError("Nama penerima wajib diisi.")

        received_time = (payload.get("receivedTime") or "").strip()
        if not received_time:
            raise ValueError("Waktu serah terima wajib diisi.")

        discrepancy = received_portions - int(existing["dispatchedPortions"])
        history = list(existing.get("statusHistory", []))
        history.append({"status": "Diterima", "timestamp": datetime.now().isoformat(timespec="seconds")})

        notes = payload.get("notes") or existing.get("notes") or ""
        if discrepancy != 0:
            notes = f"{notes} [Selisih Porsi: {discrepancy:+d}]".strip()

        changes = {
            "receivedPortions": received_portions,
            "receivedTime": received_time,
            "receiverName": receiver_name,
            "discrepancy": discrepancy,
            "status": "Diterima",
            "notes": notes,
            "statusHistory": history,
        }
        return self.repository.update(record_id, changes)