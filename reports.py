from __future__ import annotations
import csv
import io
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol


class ReportRepositoryProtocol(Protocol):
    def fetch_report_data(
        self,
        report_type: str,
        start_date: str,
        end_date: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]: ...


class InMemoryReportRepository:
    def __init__(self, dist_repo=None, safety_repo=None) -> None:
        self.dist_repo = dist_repo
        self.safety_repo = safety_repo

    def fetch_report_data(
        self,
        report_type: str,
        start_date: str,
        end_date: str,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        if report_type == "distribution" and self.dist_repo:
            rows = self.dist_repo.list()
            return [r for r in rows if start_date <= r["date"] <= end_date]

        if report_type == "food_safety" and self.safety_repo:
            rows = self.safety_repo.list_food_waste()
            return [r for r in rows if start_date <= r["date"] <= end_date]

        return []


class ReportService:
    REPORT_TITLES = {
        "distribution": "Laporan Operasional Distribusi MBG",
        "food_safety": "Laporan Keamanan Pangan & Limbah (Food Waste)",
    }

    def __init__(self, repository: ReportRepositoryProtocol) -> None:
        self.repository = repository

    def _validate_period(self, start_date: str, end_date: str) -> None:
        try:
            s_dt = datetime.strptime(start_date, "%Y-%m-%d")
            e_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Format tanggal laporan tidak valid (gunakan YYYY-MM-DD).")
        if s_dt > e_dt:
            raise ValueError("Tanggal awal tidak boleh lebih besar dari tanggal akhir.")

    def generate(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        report_type = payload.get("reportType") or "distribution"
        if report_type not in self.REPORT_TITLES:
            raise ValueError(f"Jenis laporan '{report_type}' tidak didukung.")

        start_date = (payload.get("startDate") or "").strip()
        end_date = (payload.get("endDate") or "").strip()
        self._validate_period(start_date, end_date)

        raw_records = self.repository.fetch_report_data(report_type, start_date, end_date)

        # Proteksi duplikasi record berdasarkan ID
        seen_ids = set()
        unique_records = []
        for rec in raw_records:
            rec_id = rec.get("id")
            if rec_id and rec_id in seen_ids:
                continue
            if rec_id:
                seen_ids.add(rec_id)
            unique_records.append(rec)

        if report_type == "distribution":
            headers = ["Kode Rute", "Tanggal", "Tujuan", "Porsi Kirim", "Porsi Terima", "Selisih", "Status"]
            rows = [
                [
                    r.get("routeCode", "-"),
                    r.get("date", "-"),
                    r.get("destinationName", "-"),
                    r.get("dispatchedPortions", 0),
                    r.get("receivedPortions") if r.get("receivedPortions") is not None else "-",
                    r.get("discrepancy", 0),
                    r.get("status", "-"),
                ]
                for r in unique_records
            ]
        else:
            headers = ["ID Log", "Tanggal", "Kategori Limbah", "Berat (Kg)", "Metode Penanganan", "Catatan"]
            rows = [
                [
                    r.get("id", "-"),
                    r.get("date", "-"),
                    r.get("category", "-"),
                    f"{float(r.get('weightKg', 0)):.2f}",
                    r.get("handlingMethod", "-"),
                    r.get("notes", "-"),
                ]
                for r in unique_records
            ]

        return {
            "reportType": report_type,
            "title": self.REPORT_TITLES[report_type],
            "period": f"{start_date} s/d {end_date}",
            "totalRecords": len(rows),
            "headers": headers,
            "rows": rows,
        }

    def export(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        report = self.generate(payload)
        output = io.StringIO()
        # UTF-8 BOM agar Excel membaca kolom dengan rapi
        output.write("\ufeff")
        writer = csv.writer(output)
        writer.writerow(report["headers"])
        writer.writerows(report["rows"])

        filename = f"laporan_{report['reportType']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return {
            "filename": filename,
            "mimeType": "text/csv;charset=utf-8",
            "content": output.getvalue(),
        }