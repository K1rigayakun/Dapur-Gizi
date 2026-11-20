"""Service anggaran & insentif (milik Gabriel — TASK 5).

Aturan penting:
- Semua nominal uang dihitung dengan :class:`decimal.Decimal`, tidak pernah
  dengan float mentah. Pembulatan dilakukan sekali di akhir (half-up ke rupiah).
- Parameter anggaran berasal dari tabel ``budget_parameters``. Tidak ada nilai
  bawaan yang dipalsukan: bila belum dikonfigurasi, service melempar
  ``LookupError`` dan handler mengembalikan amplop gagal.
- Setiap perubahan parameter dicatat pada ``budget_parameter_history`` beserta
  sumber referensi, tanggal berlaku, dan pencatat perubahan.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Mapping

from backend.database.repository import Repository

PARAM_FIELDS: dict[str, str] = {
    "configLabel": "config_label",
    "referenceSource": "reference_source",
    "effectiveDate": "effective_date",
    "monthlyAllocationCeiling": "monthly_allocation_ceiling",
    "standardFoodCostCeilingPerPortion": "standard_food_cost_ceiling_per_portion",
    "standardOperationalCostCeilingPerPortion": (
        "standard_operational_cost_ceiling_per_portion"
    ),
    "dailyFacilityIncentiveRate": "daily_facility_incentive_rate",
    "targetDailyPortionsBaseline": "target_daily_portions_baseline",
    "effectiveServiceDaysInMonth": "effective_service_days_in_month",
    "warningThresholdPercent": "warning_threshold_percent",
    "isDemoConfig": "is_demo_config",
}

NUMERIC_FIELDS = {
    "monthlyAllocationCeiling",
    "standardFoodCostCeilingPerPortion",
    "standardOperationalCostCeilingPerPortion",
    "dailyFacilityIncentiveRate",
    "targetDailyPortionsBaseline",
    "effectiveServiceDaysInMonth",
    "warningThresholdPercent",
}

TEXT_FIELDS = {"configLabel", "referenceSource"}

REQUIRED_ON_CREATE = {"configLabel", "referenceSource", "effectiveDate"}

ONE = Decimal("1")


def _to_decimal(value: Any, field: str) -> Decimal:
    if isinstance(value, bool) or value is None:
        raise ValueError(f"Nilai '{field}' harus berupa angka.")
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError) as exc:
        raise ValueError(f"Nilai '{field}' harus berupa angka yang valid.") from exc
    if not result.is_finite():
        raise ValueError(f"Nilai '{field}' tidak boleh NaN atau tak hingga.")
    return result


def _non_negative(value: Any, field: str) -> Decimal:
    result = _to_decimal(value, field)
    if result < 0:
        raise ValueError(f"Nilai '{field}' tidak boleh negatif.")
    return result


def _rupiah(value: Decimal) -> int:
    return int(value.quantize(ONE, rounding=ROUND_HALF_UP))


def _iso_date(value: Any, field: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise ValueError(f"'{field}' wajib diisi.")
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError as exc:
        raise ValueError(f"'{field}' harus berformat YYYY-MM-DD.") from exc


def _param_to_api(row: Mapping[str, Any]) -> dict[str, Any]:
    api: dict[str, Any] = {}
    for api_key, column in PARAM_FIELDS.items():
        if column not in row:
            continue
        value = row[column]
        if api_key in NUMERIC_FIELDS and value is not None:
            number = Decimal(str(value))
            # Nilai porsi/ambang batas adalah bilangan bulat; nominal uang
            # dapat berupa desimal pada konfigurasi.
            if api_key in {
                "targetDailyPortionsBaseline",
                "effectiveServiceDaysInMonth",
                "warningThresholdPercent",
            }:
                value = int(number)
            else:
                value = _rupiah(number)
        api[api_key] = value
    return api


class BudgetService:
    def __init__(self, repository: Repository) -> None:
        self._repository = repository

    # -- konfigurasi ---------------------------------------------------
    def _active_row(self) -> dict[str, Any] | None:
        rows = self._repository.select(
            "budget_parameters",
            filters={"is_active": True},
            order="effective_date",
            descending=True,
            limit=1,
        )
        return rows[0] if rows else None

    def get_parameters(self) -> dict[str, Any]:
        row = self._active_row()
        if row is None:
            raise LookupError(
                "Parameter anggaran belum dikonfigurasi. Jalankan migrasi/seed "
                "parameter dengan sumber dan tanggal berlaku yang sah."
            )
        return _param_to_api(row)

    def update_parameters(
        self, payload: dict[str, Any], actor: str | None = None
    ) -> dict[str, Any]:
        if not isinstance(payload, Mapping):
            raise ValueError("Payload parameter anggaran tidak valid.")

        current_row = self._active_row()
        current_api = _param_to_api(current_row) if current_row else {}

        merged: dict[str, Any] = dict(current_api)
        for api_key in PARAM_FIELDS:
            if api_key in payload:
                merged[api_key] = payload[api_key]

        # Field wajib tidak boleh kosong, bahkan pada update parsial.
        for required in REQUIRED_ON_CREATE:
            if not str(merged.get(required) or "").strip():
                raise ValueError(
                    f"'{required}' wajib diisi: parameter anggaran harus memiliki "
                    "sumber/acuan dan tanggal berlaku yang jelas."
                )

        cleaned: dict[str, Any] = {}
        cleaned["config_label"] = str(merged["configLabel"]).strip()
        cleaned["reference_source"] = str(merged["referenceSource"]).strip()
        cleaned["effective_date"] = _iso_date(merged["effectiveDate"], "effectiveDate")

        for api_key in (
            "monthlyAllocationCeiling",
            "standardFoodCostCeilingPerPortion",
            "standardOperationalCostCeilingPerPortion",
            "dailyFacilityIncentiveRate",
        ):
            if api_key not in merged or merged[api_key] is None:
                raise ValueError(f"'{api_key}' wajib diisi.")
            # Simpan rupiah sebagai bilangan bulat agar tidak ada kehilangan
            # presisi JSON float saat menulis ke kolom NUMERIC.
            cleaned[PARAM_FIELDS[api_key]] = int(
                _non_negative(merged[api_key], api_key).quantize(ONE)
            )

        ceiling = Decimal(str(cleaned["monthly_allocation_ceiling"]))
        if ceiling <= 0:
            raise ValueError("'monthlyAllocationCeiling' harus lebih besar dari nol.")

        if "targetDailyPortionsBaseline" in merged and merged[
            "targetDailyPortionsBaseline"
        ] is not None:
            baseline = _non_negative(
                merged["targetDailyPortionsBaseline"], "targetDailyPortionsBaseline"
            )
            cleaned["target_daily_portions_baseline"] = int(baseline)

        if "effectiveServiceDaysInMonth" in merged and merged[
            "effectiveServiceDaysInMonth"
        ] is not None:
            days = _non_negative(
                merged["effectiveServiceDaysInMonth"], "effectiveServiceDaysInMonth"
            )
            if days > 31:
                raise ValueError("'effectiveServiceDaysInMonth' maksimal 31 hari.")
            cleaned["effective_service_days_in_month"] = int(days)

        if "warningThresholdPercent" in merged and merged[
            "warningThresholdPercent"
        ] is not None:
            threshold = _non_negative(
                merged["warningThresholdPercent"], "warningThresholdPercent"
            )
            if threshold > 100:
                raise ValueError("'warningThresholdPercent' harus 0–100.")
            cleaned["warning_threshold_percent"] = int(threshold)

        cleaned["is_demo_config"] = bool(merged.get("isDemoConfig", True))
        cleaned["is_active"] = True
        if actor:
            cleaned["updated_by"] = actor

        if current_row is None:
            cleaned["created_by"] = actor
            saved = self._repository.insert("budget_parameters", cleaned)
            change_type = "create"
            snapshot = {}
        else:
            snapshot = {
                key: (str(value) if isinstance(value, Decimal) else value)
                for key, value in current_row.items()
            }
            saved = self._repository.update(
                "budget_parameters", current_row["id"], cleaned
            ) or {**current_row, **cleaned}
            change_type = "update"

        self._repository.insert(
            "budget_parameter_history",
            {
                "parameter_id": saved.get("id"),
                "snapshot": snapshot,
                "config_label": cleaned["config_label"],
                "reference_source": cleaned["reference_source"],
                "effective_date": cleaned["effective_date"],
                "changed_by": actor,
                "change_type": change_type,
            },
        )
        return _param_to_api(saved)

    # -- ringkasan & kalkulator ---------------------------------------
    def get_summary(self) -> dict[str, Any]:
        parameters = self.get_parameters()
        productions = self._repository.select(
            "production_batches", order="production_date"
        )

        total_actual = 0
        total_planned = 0
        effective_days = 0
        food_expenditure = Decimal("0")
        operational_expenditure = Decimal("0")
        history: list[dict[str, Any]] = []

        incentive_rate = Decimal(str(parameters.get("dailyFacilityIncentiveRate") or 0))

        for batch in productions:
            actual = int(batch.get("actual_portions") or 0)
            planned = int(batch.get("planned_portions") or 0)
            food = _to_decimal(batch.get("food_cost_total") or 0, "foodCostTotal")
            operational = _to_decimal(
                batch.get("operational_cost_total") or 0, "operationalCostTotal"
            )
            is_effective = bool(batch.get("is_effective_service_day"))
            incentive = incentive_rate if is_effective else Decimal("0")

            total_actual += actual
            total_planned += planned
            effective_days += 1 if is_effective else 0
            food_expenditure += food
            operational_expenditure += operational

            per_portion = (
                _rupiah((food + operational) / Decimal(actual)) if actual > 0 else 0
            )
            history.append(
                {
                    "id": batch.get("id"),
                    "date": batch.get("production_date"),
                    "dayLabel": batch.get("day_label"),
                    "batchCode": batch.get("batch_code"),
                    "isEffectiveServiceDay": is_effective,
                    "actualPortions": actual,
                    "foodCostTotal": _rupiah(food),
                    "operationalCostTotal": _rupiah(operational),
                    "incentive": _rupiah(incentive),
                    "totalDay": _rupiah(food + operational + incentive),
                    "perPortion": per_portion,
                }
            )

        total_incentive = incentive_rate * effective_days
        total_expenditure = food_expenditure + operational_expenditure + total_incentive
        monthly_ceiling = Decimal(str(parameters.get("monthlyAllocationCeiling") or 0))

        avg_food = (
            _rupiah(food_expenditure / Decimal(total_actual)) if total_actual else 0
        )
        avg_op = (
            _rupiah(operational_expenditure / Decimal(total_actual))
            if total_actual
            else 0
        )

        return {
            "parameters": parameters,
            "summary": {
                "totalActualPortions": total_actual,
                "totalPlannedPortions": total_planned,
                "effectiveServiceDays": effective_days,
                "foodExpenditure": _rupiah(food_expenditure),
                "operationalExpenditure": _rupiah(operational_expenditure),
                "totalIncentive": _rupiah(total_incentive),
                "totalExpenditure": _rupiah(total_expenditure),
                "avgFoodCostPerPortion": avg_food,
                "avgOpCostPerPortion": avg_op,
                "avgTotalUnitCost": avg_food + avg_op,
                "remainingMonthlyBudget": _rupiah(
                    max(Decimal("0"), monthly_ceiling - total_expenditure)
                ),
            },
            "history": history,
        }

    def calculate(self, payload: dict[str, Any]) -> dict[str, Any]:
        parameters = self.get_parameters()

        raw_portions = payload.get("servedPortions")
        if raw_portions is None:
            raw_portions = parameters.get("targetDailyPortionsBaseline") or 0
        portions_dec = _non_negative(raw_portions, "servedPortions")
        portions = int(portions_dec)
        if Decimal(portions) != portions_dec:
            raise ValueError("'servedPortions' harus berupa bilangan bulat.")

        raw_days = payload.get("daysCount", 1)
        days_dec = _non_negative(raw_days, "daysCount")
        days = int(days_dec)
        if Decimal(days) != days_dec:
            raise ValueError("'daysCount' harus berupa bilangan bulat.")
        if days < 1:
            raise ValueError("'daysCount' minimal 1 hari.")

        food_unit = _non_negative(
            payload.get("foodCostPerPortion")
            if payload.get("foodCostPerPortion") is not None
            else parameters.get("standardFoodCostCeilingPerPortion") or 0,
            "foodCostPerPortion",
        )
        op_unit = _non_negative(
            payload.get("opCostPerPortion")
            if payload.get("opCostPerPortion") is not None
            else parameters.get("standardOperationalCostCeilingPerPortion") or 0,
            "opCostPerPortion",
        )
        is_effective = payload.get("isEffectiveServiceDay", True)
        if not isinstance(is_effective, bool):
            raise ValueError("'isEffectiveServiceDay' harus berupa boolean.")
        is_effective_day = bool(is_effective)

        food_total = Decimal(portions) * food_unit * Decimal(days)
        op_total = Decimal(portions) * op_unit * Decimal(days)
        incentive_rate = Decimal(str(parameters.get("dailyFacilityIncentiveRate") or 0))
        incentive_total = incentive_rate * Decimal(days) if is_effective_day else Decimal("0")
        grand_total = food_total + op_total + incentive_total

        combined_unit = food_unit + op_unit
        ceiling_unit = Decimal(
            str(parameters.get("standardFoodCostCeilingPerPortion") or 0)
        ) + Decimal(str(parameters.get("standardOperationalCostCeilingPerPortion") or 0))

        return {
            "portions": portions,
            "effectiveDaysCount": days,
            "isEffectiveDay": is_effective_day,
            "foodUnit": _rupiah(food_unit),
            "opUnit": _rupiah(op_unit),
            "combinedUnitCost": _rupiah(combined_unit),
            "ceilingUnitCost": _rupiah(ceiling_unit),
            "overCeilingWarning": combined_unit > ceiling_unit,
            "foodTotal": _rupiah(food_total),
            "opTotal": _rupiah(op_total),
            "incentiveTotal": _rupiah(incentive_total),
            "grandTotal": _rupiah(grand_total),
        }
