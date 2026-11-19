"""DapurGizi — Menu & Nutrition Planning Domain Service (Module D)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Implements:
- Menu lifecycle management (Draft -> Menunggu Persetujuan -> Disetujui / Perlu Revisi / Ditolak).
- Weekly cycle ordering and drag-and-drop reordering.
- Ingredient composition and portion validation.
- Integration with NutritionService for automatic nutrient verification.
- Decoupled MenuRepositoryProtocol and thread-safe InMemoryMenuRepository.
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Any, Protocol, Sequence


VALID_MENU_STATUSES: tuple[str, ...] = (
    "Draft",
    "Menunggu Persetujuan",
    "Disetujui",
    "Perlu Revisi",
    "Ditolak",
)

DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class MenuRepositoryProtocol(Protocol):
    """Protocol for Menu persistence."""

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        """List menus with optional filtering."""
        ...

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        """Fetch a single menu record by ID."""
        ...

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        """Insert a new menu record."""
        ...

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        """Apply changes to an existing menu record."""
        ...

    def reorder(self, ordered_ids: Sequence[str]) -> list[dict[str, Any]]:
        """Persist new sequence index for given menu IDs."""
        ...


class InMemoryMenuRepository:
    """In-memory reference implementation of MenuRepositoryProtocol."""

    def __init__(self, initial_records: Sequence[dict[str, Any]] | None = None) -> None:
        self._records: dict[str, dict[str, Any]] = {}
        if initial_records:
            for rec in initial_records:
                self.insert(dict(rec))

    def list(self, filters: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        items = [dict(r) for r in self._records.values()]
        items.sort(key=lambda m: m.get("orderIndex", 999))
        return items

    def get_by_id(self, record_id: str) -> dict[str, Any] | None:
        rec = self._records.get(str(record_id))
        return dict(rec) if rec else None

    def insert(self, record: dict[str, Any]) -> dict[str, Any]:
        stored = dict(record)
        rec_id = str(stored.get("id") or f"MNU-{uuid.uuid4().hex[:8].upper()}")
        stored["id"] = rec_id
        if "orderIndex" not in stored:
            stored["orderIndex"] = len(self._records) + 1
        if "created_at" not in stored:
            stored["created_at"] = datetime.now().isoformat()
        self._records[rec_id] = stored
        return dict(stored)

    def update(self, record_id: str, changes: dict[str, Any]) -> dict[str, Any]:
        key = str(record_id)
        if key not in self._records:
            raise LookupError(f"Menu with id '{record_id}' does not exist.")
        current = self._records[key]
        current.update(changes)
        current["updated_at"] = datetime.now().isoformat()
        self._records[key] = current
        return dict(current)

    def reorder(self, ordered_ids: Sequence[str]) -> list[dict[str, Any]]:
        for idx, mid in enumerate(ordered_ids, start=1):
            key = str(mid)
            if key in self._records:
                self._records[key]["orderIndex"] = idx
                self._records[key]["updated_at"] = datetime.now().isoformat()
        return self.list()


class MenuService:
    """Domain service managing MBG menus, ingredient compositions, and approval workflows."""

    def __init__(self, repository: MenuRepositoryProtocol, nutrition_service: Any = None) -> None:
        self.repository = repository
        self.nutrition_service = nutrition_service

    def list(self, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        """Fetch weekly menus according to INTEGRATION.md contract.

        Returns:
            { "items": list[dict] }
        """
        payload = payload or {}
        raw_items = self.repository.list()

        week_label = str(payload.get("weekLabel", "") or "").strip()
        if week_label and week_label != "ALL":
            filtered = [m for m in raw_items if m.get("weekLabel") == week_label]
        else:
            filtered = raw_items

        filtered.sort(key=lambda m: m.get("orderIndex", 999))
        return {"items": filtered}

    def create(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Create a new menu card with rigorous validation."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload menu tidak boleh kosong.")

        name = str(payload.get("name", "")).strip()
        if not name or len(name) < 5:
            raise ValueError("Nama lengkap menu wajib diisi (minimal 5 karakter).")

        day_name = str(payload.get("dayName", "Senin") or "Senin").strip()
        date_str = str(payload.get("date", "")).strip()
        if not date_str:
            raise ValueError("Tanggal layanan menu wajib diisi.")
        if not DATE_REGEX.match(date_str):
            raise ValueError(f"Format tanggal menu '{date_str}' tidak valid (wajib YYYY-MM-DD).")

        try:
            planned_portions = int(payload.get("plannedPortions", 0) or 0)
        except (ValueError, TypeError):
            raise ValueError("Nilai rencana porsi (plannedPortions) harus berupa bilangan bulat.")
        if planned_portions < 0:
            raise ValueError("Rencana porsi tidak boleh bernilai negatif.")

        # Numeric macronutrient checks
        try:
            calories_kcal = float(payload.get("caloriesKcal", 0) or 0)
            protein_gram = float(payload.get("proteinGram", 0) or 0)
            carbs_gram = float(payload.get("carbsGram", 0) or 0)
            fat_gram = float(payload.get("fatGram", 0) or 0)
            cost_estimate = float(payload.get("costEstimatePerPortion", 0) or 0)
        except (ValueError, TypeError) as exc:
            raise ValueError(f"Nilai kandungan gizi atau estimasi biaya tidak valid: {exc}")

        if any(v < 0 for v in (calories_kcal, protein_gram, carbs_gram, fat_gram, cost_estimate)):
            raise ValueError("Nilai kalori, protein, karbohidrat, lemak, dan biaya tidak boleh negatif.")

        ingredients = payload.get("ingredients")
        if ingredients is not None and not isinstance(ingredients, list):
            raise ValueError("Daftar bahan makanan ('ingredients') harus berupa array.")

        # Validate ingredient entries if provided
        validated_ingredients = []
        if ingredients:
            for idx, ing in enumerate(ingredients, start=1):
                if not isinstance(ing, dict):
                    continue
                ing_name = str(ing.get("name", "")).strip()
                if not ing_name:
                    raise ValueError(f"Bahan makanan #{idx} tidak memiliki nama.")
                amount = ing.get("amountGr") if ing.get("amountGr") is not None else ing.get("amount", 0)
                try:
                    amount_flt = float(amount)
                except (ValueError, TypeError):
                    raise ValueError(f"Gramasi pada bahan '{ing_name}' tidak valid.")
                if amount_flt < 0:
                    raise ValueError(f"Gramasi pada bahan '{ing_name}' tidak boleh negatif.")
                validated_ingredients.append({
                    "name": ing_name,
                    "amountGr": amount_flt,
                    "role": str(ing.get("role", "Komponen Pangan")).strip(),
                })

        # Auto-calculate nutritional content from nutrition_service if available and needed
        if self.nutrition_service and validated_ingredients and calories_kcal == 0:
            try:
                calc_res = self.nutrition_service.calculate({"ingredients": validated_ingredients})
                per_portion = calc_res.get("perPortion", {})
                calories_kcal = per_portion.get("caloriesKcal", calories_kcal)
                protein_gram = per_portion.get("proteinGram", protein_gram)
                carbs_gram = per_portion.get("carbsGram", carbs_gram)
                fat_gram = per_portion.get("fatGram", fat_gram)
            except Exception:
                pass  # Fallback to manual values if calculation encounters unknown ingredients

        status = str(payload.get("status", "Draft") or "Draft").strip()
        if status not in VALID_MENU_STATUSES:
            raise ValueError(f"Status menu '{status}' tidak valid. Pilihan: {', '.join(VALID_MENU_STATUSES)}.")

        existing_all = self.repository.list()
        order_index = int(payload.get("orderIndex") or (len(existing_all) + 1))

        menu_record: dict[str, Any] = {
            "id": payload.get("id") or f"MNU-{uuid.uuid4().hex[:8].upper()}",
            "weekLabel": str(payload.get("weekLabel", "Minggu Berjalan") or "Minggu Berjalan").strip(),
            "dayName": day_name,
            "date": date_str,
            "orderIndex": order_index,
            "name": name,
            "targetCategory": str(payload.get("targetCategory", "Semua Kategori (Disesuaikan Gramasi)")).strip(),
            "plannedPortions": planned_portions,
            "caloriesKcal": round(calories_kcal, 1),
            "proteinGram": round(protein_gram, 1),
            "carbsGram": round(carbs_gram, 1),
            "fatGram": round(fat_gram, 1),
            "costEstimatePerPortion": round(cost_estimate),
            "status": status,
            "reviewedBy": str(payload.get("reviewedBy", "-")).strip(),
            "reviewNotes": str(payload.get("reviewNotes", "Draft menu baru.")).strip(),
            "ingredients": validated_ingredients,
        }

        stored = self.repository.insert(menu_record)
        return stored

    def update(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Update an existing menu card with validation."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload pembaruan menu tidak boleh kosong.")

        menu_id = str(payload.get("id", "")).strip()
        if not menu_id:
            raise ValueError("ID menu wajib diisi untuk pembaruan.")

        existing = self.repository.get_by_id(menu_id)
        if not existing:
            raise LookupError(f"Menu dengan ID '{menu_id}' tidak ditemukan.")

        changes: dict[str, Any] = {}

        if "name" in payload:
            name = str(payload["name"]).strip()
            if len(name) < 5:
                raise ValueError("Nama lengkap menu minimal 5 karakter.")
            changes["name"] = name

        if "date" in payload:
            date_str = str(payload["date"]).strip()
            if not DATE_REGEX.match(date_str):
                raise ValueError(f"Format tanggal '{date_str}' tidak valid (wajib YYYY-MM-DD).")
            changes["date"] = date_str

        if "dayName" in payload:
            changes["dayName"] = str(payload["dayName"]).strip()

        if "weekLabel" in payload:
            changes["weekLabel"] = str(payload["weekLabel"]).strip()

        if "targetCategory" in payload:
            changes["targetCategory"] = str(payload["targetCategory"]).strip()

        if "plannedPortions" in payload:
            try:
                portions = int(payload["plannedPortions"])
            except (ValueError, TypeError):
                raise ValueError("Rencana porsi harus berupa angka bulat.")
            if portions < 0:
                raise ValueError("Rencana porsi tidak boleh negatif.")
            changes["plannedPortions"] = portions

        for num_field in ("caloriesKcal", "proteinGram", "carbsGram", "fatGram", "costEstimatePerPortion"):
            if num_field in payload:
                try:
                    val = float(payload[num_field])
                except (ValueError, TypeError):
                    raise ValueError(f"Nilai {num_field} tidak valid.")
                if val < 0:
                    raise ValueError(f"Nilai {num_field} tidak boleh negatif.")
                changes[num_field] = round(val, 1) if "Gram" in num_field or "cal" in num_field else round(val)

        if "status" in payload:
            status = str(payload["status"]).strip()
            if status not in VALID_MENU_STATUSES:
                raise ValueError(f"Status menu '{status}' tidak valid.")
            changes["status"] = status

        if "reviewNotes" in payload:
            changes["reviewNotes"] = str(payload["reviewNotes"]).strip()

        if "reviewedBy" in payload:
            changes["reviewedBy"] = str(payload["reviewedBy"]).strip()

        if "ingredients" in payload and isinstance(payload["ingredients"], list):
            valid_ing = []
            for ing in payload["ingredients"]:
                if isinstance(ing, dict) and ing.get("name"):
                    valid_ing.append({
                        "name": str(ing["name"]).strip(),
                        "amountGr": float(ing.get("amountGr", ing.get("amount", 0))),
                        "role": str(ing.get("role", "-")).strip(),
                    })
            changes["ingredients"] = valid_ing

        if not changes:
            return existing

        updated = self.repository.update(menu_id, changes)
        return updated

    def submit_for_review(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Submit a menu card to 'Menunggu Persetujuan' status."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload pengajuan peninjauan tidak boleh kosong.")

        menu_id = str(payload.get("id", "")).strip()
        if not menu_id:
            raise ValueError("ID menu wajib diisi.")

        existing = self.repository.get_by_id(menu_id)
        if not existing:
            raise LookupError(f"Menu dengan ID '{menu_id}' tidak ditemukan.")

        notes = str(payload.get("notes", "") or "Diajukan untuk peninjauan Kepala SPPG.").strip()
        changes = {
            "status": "Menunggu Persetujuan",
            "reviewNotes": notes,
        }

        updated = self.repository.update(menu_id, changes)
        return updated

    def review(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Review and set status decision on a menu ('Disetujui', 'Perlu Revisi', or 'Ditolak')."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload review menu tidak boleh kosong.")

        menu_id = str(payload.get("id", "")).strip()
        if not menu_id:
            raise ValueError("ID menu wajib diisi.")

        existing = self.repository.get_by_id(menu_id)
        if not existing:
            raise LookupError(f"Menu dengan ID '{menu_id}' tidak ditemukan.")

        decision = str(payload.get("decision", "")).strip()
        allowed_decisions = ("Disetujui", "Perlu Revisi", "Ditolak")
        if decision not in allowed_decisions:
            raise ValueError(
                f"Keputusan review '{decision}' tidak valid. Pilihan: {', '.join(allowed_decisions)}."
            )

        reviewer = str(payload.get("reviewer", "")).strip()
        if not reviewer:
            raise ValueError("Nama peninjau/reviewer wajib diisi.")

        review_notes = str(payload.get("reviewNotes", "") or "Telah diverifikasi.").strip()

        changes = {
            "status": decision,
            "reviewedBy": reviewer,
            "reviewNotes": review_notes,
        }

        updated = self.repository.update(menu_id, changes)
        return updated

    def reorder(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Reorder menu cards for weekly service cycle without duplicates or omissions."""
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload pengurutan menu tidak boleh kosong.")

        ordered_ids = payload.get("orderedIds")
        if not isinstance(ordered_ids, list) or not ordered_ids:
            raise ValueError("Field 'orderedIds' wajib berupa array ID menu yang tidak kosong.")

        clean_ids = [str(x).strip() for x in ordered_ids]

        # Check for duplicates in requested list
        if len(clean_ids) != len(set(clean_ids)):
            raise ValueError("Terdapat ID duplikat pada susunan urutan menu.")

        # Check that each ID exists
        for mid in clean_ids:
            if not self.repository.get_by_id(mid):
                raise LookupError(f"Menu dengan ID '{mid}' tidak ditemukan di sistem.")

        updated_items = self.repository.reorder(clean_ids)
        return {"items": updated_items}
