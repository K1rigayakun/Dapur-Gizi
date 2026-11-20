"""Pemetaan baris database (snake_case) ke bentuk API frontend (camelCase).

Pemetaan dibuat eksplisit per entitas agar perubahan skema tidak diam-diam
mengubah kontrak frontend.
"""

from __future__ import annotations

from typing import Any, Mapping

SETTINGS_FIELDS = {
    "unitName": "unit_name",
    "unitCode": "unit_code",
    "headName": "head_name",
    "city": "city",
    "enableSoundAlerts": "enable_sound_alerts",
    "enableDesktopToast": "enable_desktop_toast",
    "autoRefreshIntervalSec": "auto_refresh_interval_sec",
    "defaultShiftStart": "default_shift_start",
}

MENU_FIELDS = {
    "id": "id",
    "weekLabel": "week_label",
    "dayName": "day_name",
    "date": "menu_date",
    "orderIndex": "order_index",
    "name": "name",
    "targetCategory": "target_category",
    "plannedPortions": "planned_portions",
    "caloriesKcal": "calories_kcal",
    "proteinGram": "protein_gram",
    "carbsGram": "carbs_gram",
    "fatGram": "fat_gram",
    "costEstimatePerPortion": "cost_estimate_per_portion",
    "status": "status",
    "reviewedBy": "reviewed_by",
    "reviewNotes": "review_notes",
}

NOTIFICATION_FIELDS = {
    "id": "id",
    "title": "title",
    "message": "message",
    "category": "category",
    "relatedRoute": "related_route",
    "timestamp": "occurred_at",
    "read": "is_read",
}

PRODUCTION_FIELDS = {
    "id": "id",
    "date": "production_date",
    "dayLabel": "day_label",
    "menuId": "menu_id",
    "menuName": "menu_name",
    "batchCode": "batch_code",
    "plannedPortions": "planned_portions",
    "actualPortions": "actual_portions",
    "qcPassedPortions": "qc_passed_portions",
    "rejectedPortions": "rejected_portions",
    "foodCostTotal": "food_cost_total",
    "operationalCostTotal": "operational_cost_total",
    "isEffectiveServiceDay": "is_effective_service_day",
    "status": "status",
    "leadChef": "lead_chef",
    "notes": "notes",
    "timeline": "timeline",
}

DISTRIBUTION_FIELDS = {
    "id": "id",
    "date": "distribution_date",
    "routeCode": "route_code",
    "destinationName": "destination_name",
    "destinationType": "destination_type",
    "address": "address",
    "driverName": "driver_name",
    "departureTime": "departure_time",
    "etaTime": "eta_time",
    "receivedTime": "received_time",
    "dispatchedPortions": "dispatched_portions",
    "receivedPortions": "received_portions",
    "status": "status",
    "receiverName": "receiver_name",
    "notes": "notes",
}


def map_row(row: Mapping[str, Any], fields: Mapping[str, str]) -> dict[str, Any]:
    """Petakan kolom yang ada saja; kolom hilang tidak diisi nilai rekaan."""
    return {api: row[column] for api, column in fields.items() if column in row}


def map_rows(
    rows: list[Mapping[str, Any]], fields: Mapping[str, str]
) -> list[dict[str, Any]]:
    return [map_row(row, fields) for row in rows]


def settings_to_api(row: Mapping[str, Any] | None) -> dict[str, Any]:
    return map_row(row, SETTINGS_FIELDS) if row else {}
