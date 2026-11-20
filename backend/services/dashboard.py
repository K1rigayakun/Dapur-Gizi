"""Service dashboard lintas domain (milik Gabriel — TASK 6).

Semua KPI dihitung dari database. Tidak ada angka yang di-hardcode dan tidak
ada aktivitas rekaan: ``recentActivities`` berasal dari notifikasi nyata.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from backend.database.repository import Repository
from backend.services._mapping import (
    DISTRIBUTION_FIELDS,
    MENU_FIELDS,
    NOTIFICATION_FIELDS,
    PRODUCTION_FIELDS,
    map_row,
    map_rows,
    settings_to_api,
)

PENDING_MENU_STATUSES = {"Menunggu Persetujuan", "Perlu Revisi"}
CERTIFICATE_WARNING_DAYS = 30


def _decimal(value: Any) -> Decimal:
    if value is None or isinstance(value, bool):
        return Decimal("0")
    try:
        return Decimal(str(value))
    except Exception:  # noqa: BLE001 - data numerik tidak valid dianggap nol
        return Decimal("0")


def _rupiah(value: Decimal) -> int:
    from decimal import ROUND_HALF_UP

    return int(value.quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class DashboardService:
    def __init__(self, repository: Repository, timezone_name: str = "Asia/Jakarta") -> None:
        self._repository = repository
        self._tz = ZoneInfo(timezone_name)

    # -- bantuan -------------------------------------------------------
    def _today(self) -> str:
        return datetime.now(self._tz).date().isoformat()

    def _settings_row(self) -> dict[str, Any] | None:
        rows = self._repository.select("app_settings", limit=1)
        return rows[0] if rows else None

    def _parameters(self) -> dict[str, Any] | None:
        rows = self._repository.select(
            "budget_parameters",
            filters={"is_active": True},
            order="effective_date",
            descending=True,
            limit=1,
        )
        return rows[0] if rows else None

    def _format_time(self, value: Any) -> str:
        if not value:
            return "-"
        try:
            if isinstance(value, datetime):
                moment = value
            else:
                moment = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            if moment.tzinfo is None:
                moment = moment.replace(tzinfo=timezone.utc)
            return moment.astimezone(self._tz).strftime("%H:%M WIB")
        except (ValueError, TypeError):
            return "-"

    # -- ringkasan -----------------------------------------------------
    def get_summary(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        payload = payload or {}
        requested_date = str(payload.get("date") or "").strip() or self._today()

        productions = self._repository.select(
            "production_batches", order="production_date"
        )
        beneficiaries = self._repository.select("beneficiaries")
        menus = self._repository.select("menus", order="order_index")
        distributions = self._repository.select(
            "distribution_routes", order="route_code"
        )
        parameters = self._parameters()
        settings = self._settings_row()

        today_prod = next(
            (p for p in productions if p.get("production_date") == requested_date),
            None,
        )
        if today_prod is None and productions:
            today_prod = productions[-1]

        active_count = sum(
            1 for b in beneficiaries if str(b.get("status")) == "Aktif"
        )
        total_registered = len(beneficiaries)

        actual = int(today_prod.get("actual_portions") or 0) if today_prod else 0
        planned = int(today_prod.get("planned_portions") or 0) if today_prod else 0
        is_effective = bool(today_prod.get("is_effective_service_day")) if today_prod else False

        food_cost = _decimal(today_prod.get("food_cost_total")) if today_prod else Decimal("0")
        op_cost = _decimal(today_prod.get("operational_cost_total")) if today_prod else Decimal("0")
        incentive_rate = _decimal((parameters or {}).get("daily_facility_incentive_rate"))
        today_incentive = incentive_rate if is_effective else Decimal("0")
        op_per_portion = (
            _rupiah((food_cost + op_cost) / Decimal(actual)) if actual > 0 else 0
        )

        ceiling_per_portion = _rupiah(
            _decimal((parameters or {}).get("standard_food_cost_ceiling_per_portion"))
            + _decimal(
                (parameters or {}).get("standard_operational_cost_ceiling_per_portion")
            )
        )

        today_distributions = [
            d for d in distributions if d.get("distribution_date") == requested_date
        ]
        total_dispatched = sum(
            int(d.get("dispatched_portions") or 0) for d in today_distributions
        )
        total_received = sum(
            int(d.get("received_portions") or 0) for d in today_distributions
        )

        food_spent = sum((_decimal(p.get("food_cost_total")) for p in productions), Decimal("0"))
        op_spent = sum(
            (_decimal(p.get("operational_cost_total")) for p in productions), Decimal("0")
        )
        effective_days = sum(
            1 for p in productions if p.get("is_effective_service_day")
        )
        incentive_accrued = incentive_rate * Decimal(effective_days)

        checklist = None
        checklist_rows = self._repository.select(
            "hygiene_checklists", order="checklist_date", descending=True, limit=1
        )
        if checklist_rows:
            checklist = checklist_rows[0]
        items = (
            self._repository.select(
                "hygiene_items", filters={"checklist_id": checklist["id"]}
            )
            if checklist
            else []
        )
        checked = sum(1 for item in items if item.get("checked"))
        warnings = [item for item in items if not item.get("checked")]

        certificates = self._repository.select("slhs_certificates", order="expiry_date")
        expiry_limit = date.today() + timedelta(days=CERTIFICATE_WARNING_DAYS)
        expiring = []
        for certificate in certificates:
            status = str(certificate.get("status") or "Aktif")
            expiry_raw = certificate.get("expiry_date")
            try:
                expiry = date.fromisoformat(str(expiry_raw))
            except (ValueError, TypeError):
                expiry = None
            if status != "Aktif" or (expiry and expiry <= expiry_limit):
                expiring.append(certificate)

        pending_menus = [
            map_row(menu, MENU_FIELDS)
            for menu in menus
            if str(menu.get("status")) in PENDING_MENU_STATUSES
        ]

        notifications = self._repository.select(
            "notifications", order="occurred_at", descending=True, limit=5
        )
        recent_activities = [
            {
                "id": notification.get("id"),
                "time": self._format_time(notification.get("occurred_at")),
                "actor": notification.get("category") or "Sistem",
                "action": notification.get("title") or notification.get("message") or "",
                "type": _activity_type(notification.get("category")),
            }
            for notification in notifications
        ]

        production_trend = [
            {
                "date": p.get("production_date"),
                "dayLabel": p.get("day_label"),
                "planned": int(p.get("planned_portions") or 0),
                "actual": int(p.get("actual_portions") or 0),
                "qcPassed": int(p.get("qc_passed_portions") or 0),
            }
            for p in productions
        ]

        monthly_ceiling = _decimal((parameters or {}).get("monthly_allocation_ceiling"))
        total_spent = food_spent + op_spent + incentive_accrued

        return {
            "unitMeta": settings_to_api(settings) | {"effectiveDate": requested_date},
            "kpis": {
                "totalPortionsToday": actual,
                "plannedPortionsToday": planned,
                "portionFulfillmentPct": (
                    round((actual / planned) * 100, 1) if planned > 0 else 0
                ),
                "activeBeneficiaries": active_count,
                "totalRegisteredBeneficiaries": total_registered,
                "todayIncentive": _rupiah(today_incentive),
                "isEffectiveServiceDay": is_effective,
                "operationalCostPerPortion": op_per_portion,
                "costCeilingPerPortion": ceiling_per_portion,
            },
            "productionTrend": production_trend,
            "weeklyDistribution": [
                {
                    "id": d.get("id"),
                    "routeCode": d.get("route_code"),
                    "destinationName": d.get("destination_name"),
                    "dispatchedPortions": int(d.get("dispatched_portions") or 0),
                    "receivedPortions": int(d.get("received_portions") or 0),
                    "status": d.get("status"),
                    "etaTime": d.get("eta_time"),
                }
                for d in today_distributions
            ],
            "distributionSummary": {
                "totalRoutes": len(today_distributions),
                "totalDispatched": total_dispatched,
                "totalReceived": total_received,
                "completedRoutes": sum(
                    1 for d in today_distributions if d.get("status") == "Diterima"
                ),
            },
            "budgetComposition": {
                "foodSpent": _rupiah(food_spent),
                "operationalSpent": _rupiah(op_spent),
                "incentiveAccrued": _rupiah(incentive_accrued),
                "totalSpent": _rupiah(total_spent),
                "monthlyCeiling": _rupiah(monthly_ceiling),
            },
            "operationalProgress": list((today_prod or {}).get("timeline") or []),
            "pendingApprovals": pending_menus,
            "hygieneStatus": {
                "checkedCount": checked,
                "totalCount": len(items),
                "scorePct": round((checked / len(items)) * 100) if items else 100,
                "warnings": [
                    {
                        "id": item.get("item_code"),
                        "area": item.get("area"),
                        "parameter": item.get("parameter"),
                        "checked": bool(item.get("checked")),
                        "notes": item.get("notes"),
                    }
                    for item in warnings
                ],
                "expiringCertificates": [
                    {
                        "id": certificate.get("id"),
                        "certificateNumber": certificate.get("certificate_number"),
                        "documentName": certificate.get("document_name"),
                        "issuedBy": certificate.get("issued_by"),
                        "issueDate": certificate.get("issue_date"),
                        "expiryDate": certificate.get("expiry_date"),
                        "status": certificate.get("status"),
                    }
                    for certificate in expiring
                ],
            },
            "recentActivities": recent_activities,
        }


def _activity_type(category: Any) -> str:
    text = str(category or "").lower()
    if "distribusi" in text:
        return "success"
    if "menu" in text or "gizi" in text:
        return "warning"
    if "keamanan" in text or "sanitasi" in text:
        return "danger"
    return "info"
