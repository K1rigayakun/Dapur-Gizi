"""DapurGizi — Nutrition Domain Service (Module D)
PIC: Wiliam (Beneficiaries, Menu, Nutrition & Production Engineer)

Implements traceable nutritional calculations based on verified food composition
data (Tabel Komposisi Pangan Indonesia - TKPI / Kemenkes RI 2019).

Features:
- Rigorous nutrient calculation based on net edible portion (BDD - Bagian Dapat Dimakan %).
- Unit normalization (gram, gr, kg, mg, ons).
- Per-portion and batch-scaled macronutrient calculation.
- Source attribution (source name, version/year, food item reference code).
- Missing reference detection: strictly refuses to fabricate numbers for unverified ingredients.
- Decoupled FoodCompositionRepositoryProtocol for future expansion.
"""

from __future__ import annotations

import math
import re
from typing import Any, Protocol, Sequence


# Unit conversion factors to grams
UNIT_TO_GRAM_FACTORS: dict[str, float] = {
    "g": 1.0,
    "gr": 1.0,
    "gram": 1.0,
    "grams": 1.0,
    "kg": 1000.0,
    "kilogram": 1000.0,
    "mg": 0.001,
    "miligram": 0.001,
    "ons": 100.0,
}


COMMON_STOPWORDS: set[str] = {
    "segar", "tanpa", "lokal", "potong", "murni", "ras", "varietas", "giling",
    "medium", "putih", "merah", "kuning", "dan", "dengan", "di", "ke", "dari",
    "untuk", "yg", "yang", "mentah", "masak", "rebus", "goreng", "asli",
}


class FoodCompositionRepositoryProtocol(Protocol):
    """Protocol for accessing verified food composition datasets (e.g. TKPI Kemenkes)."""

    def get_by_code(self, code: str) -> dict[str, Any] | None:
        """Fetch food item by unique reference code."""
        ...

    def search_by_name(self, name: str) -> dict[str, Any] | None:
        """Find the closest verified food item by name or alias."""
        ...

    def list_all(self) -> list[dict[str, Any]]:
        """Return all verified food composition reference records."""
        ...


class InMemoryFoodCompositionRepository:
    """In-memory repository preloaded with verified Indonesian food composition data (TKPI 2019)."""

    def __init__(self, items: Sequence[dict[str, Any]] | None = None) -> None:
        self._by_code: dict[str, dict[str, Any]] = {}
        self._by_name: dict[str, dict[str, Any]] = {}

        if items is None:
            items = get_default_verified_tkpi_items()

        for it in items:
            self.add_item(it)

    def add_item(self, item: dict[str, Any]) -> None:
        rec = dict(item)
        code = str(rec["code"]).strip().upper()
        self._by_code[code] = rec

        # Register primary name and any aliases for robust matching
        name_clean = str(rec["name"]).strip().lower()
        self._by_name[name_clean] = rec

        for alias in rec.get("aliases", []):
            self._by_name[str(alias).strip().lower()] = rec

    def get_by_code(self, code: str) -> dict[str, Any] | None:
        rec = self._by_code.get(str(code).strip().upper())
        return dict(rec) if rec else None

    def search_by_name(self, name: str) -> dict[str, Any] | None:
        query = str(name).strip().lower()
        if not query:
            return None

        # 1. Exact match
        if query in self._by_name:
            return dict(self._by_name[query])

        # 2. Token-based overlap excluding stopwords
        q_tokens = {w for w in re.findall(r"[a-z0-9]+", query) if w not in COMMON_STOPWORDS and len(w) > 2}
        if not q_tokens:
            return None

        best_match = None
        max_overlap = 0
        for key, rec in self._by_name.items():
            k_tokens = {w for w in re.findall(r"[a-z0-9]+", key) if w not in COMMON_STOPWORDS and len(w) > 2}
            overlap = len(q_tokens & k_tokens)
            if overlap > max_overlap:
                max_overlap = overlap
                best_match = rec

        if max_overlap >= 1 and best_match:
            return dict(best_match)

        return None

    def list_all(self) -> list[dict[str, Any]]:
        return [dict(r) for r in self._by_code.values()]


def get_default_verified_tkpi_items() -> list[dict[str, Any]]:
    """Official baseline dataset from Tabel Komposisi Pangan Indonesia (TKPI) Kemenkes RI 2019."""
    return [
        {
            "code": "TKPI-A001",
            "name": "Beras giling medium",
            "aliases": ["beras medium", "beras", "nasi", "nasi putih", "beras medium segar"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 360.0,
            "protein_g": 6.8,
            "fat_g": 0.7,
            "carbs_g": 78.9,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-B001",
            "name": "Daging ayam ras fillet segar",
            "aliases": ["daging ayam", "ayam potong", "ayam", "ayam potong segar", "dada ayam", "fillet ayam"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 298.0,
            "protein_g": 18.2,
            "fat_g": 25.0,
            "carbs_g": 0.0,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-B002",
            "name": "Telur ayam ras segar",
            "aliases": ["telur ayam", "telur", "telur rebus", "telur ayam negeri", "telur ceplok"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 154.0,
            "protein_g": 12.4,
            "fat_g": 10.8,
            "carbs_g": 0.7,
            "edible_portion_pct": 90.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-B003",
            "name": "Daging sapi segar has dalam",
            "aliases": ["daging sapi", "daging sapi segar", "daging sapi has dalam", "semur sapi"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 201.0,
            "protein_g": 18.8,
            "fat_g": 14.0,
            "carbs_g": 0.0,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-C001",
            "name": "Ikan kembung segar",
            "aliases": ["ikan kembung", "ikan kembung segar fillet", "pesmol kembung"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 112.0,
            "protein_g": 21.4,
            "fat_g": 2.3,
            "carbs_g": 0.0,
            "edible_portion_pct": 80.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-C002",
            "name": "Ikan patin / dori fillet segar",
            "aliases": ["ikan dori", "fillet ikan dori tanpa duri", "ikan patin", "fillet dori"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 97.0,
            "protein_g": 16.0,
            "fat_g": 3.0,
            "carbs_g": 0.0,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-D001",
            "name": "Tahu kedelai segar",
            "aliases": ["tahu", "tahu putih", "tahu kedelai", "perkedel tahu"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 80.0,
            "protein_g": 10.9,
            "fat_g": 4.7,
            "carbs_g": 0.8,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-D002",
            "name": "Tempe kedelai murni",
            "aliases": ["tempe", "tempe kedelai", "tempe kedelai lokal", "tempe orek", "orek tempe"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 201.0,
            "protein_g": 20.8,
            "fat_g": 8.8,
            "carbs_g": 13.5,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-E001",
            "name": "Wortel segar",
            "aliases": ["wortel", "wortel segar"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 36.0,
            "protein_g": 1.0,
            "fat_g": 0.6,
            "carbs_g": 7.9,
            "edible_portion_pct": 88.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-E002",
            "name": "Brokoli segar",
            "aliases": ["brokoli", "brokoli segar"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 34.0,
            "protein_g": 2.8,
            "fat_g": 0.4,
            "carbs_g": 6.6,
            "edible_portion_pct": 75.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-E003",
            "name": "Bayam segar",
            "aliases": ["bayam", "sayur bayam", "sayur bening bayam jagung"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 16.0,
            "protein_g": 0.9,
            "fat_g": 0.4,
            "carbs_g": 2.9,
            "edible_portion_pct": 71.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-E004",
            "name": "Labu siam segar",
            "aliases": ["labu siam", "labu siam & kacang panjang", "sayur lodeh"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 26.0,
            "protein_g": 0.6,
            "fat_g": 0.1,
            "carbs_g": 6.7,
            "edible_portion_pct": 83.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-F001",
            "name": "Pisang barangan segar",
            "aliases": ["pisang barangan", "pisang", "pisang segar"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 128.0,
            "protein_g": 1.2,
            "fat_g": 0.2,
            "carbs_g": 31.8,
            "edible_portion_pct": 68.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-F002",
            "name": "Pepaya kalifornia segar",
            "aliases": ["pepaya", "pepaya kalifornia", "pepaya kalifornia potong"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 46.0,
            "protein_g": 0.5,
            "fat_g": 0.1,
            "carbs_g": 12.2,
            "edible_portion_pct": 75.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-F003",
            "name": "Semangka merah segar",
            "aliases": ["semangka", "semangka merah", "semangka merah tanpa biji"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 28.0,
            "protein_g": 0.5,
            "fat_g": 0.2,
            "carbs_g": 6.9,
            "edible_portion_pct": 46.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-F004",
            "name": "Melon hijau segar",
            "aliases": ["melon", "melon hijau", "melon hijau segar"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 37.0,
            "protein_g": 0.6,
            "fat_g": 0.1,
            "carbs_g": 8.2,
            "edible_portion_pct": 70.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-F005",
            "name": "Jeruk manis berastagi segar",
            "aliases": ["jeruk", "jeruk manis", "jeruk manis berastagi"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 45.0,
            "protein_g": 0.9,
            "fat_g": 0.2,
            "carbs_g": 11.2,
            "edible_portion_pct": 72.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
        {
            "code": "TKPI-G001",
            "name": "Minyak kelapa sawit",
            "aliases": ["minyak goreng", "minyak kelapa sawit", "minyak sawit", "minyak"],
            "basis_weight": 100.0,
            "basis_unit": "gram",
            "energy_kcal": 884.0,
            "protein_g": 0.0,
            "fat_g": 100.0,
            "carbs_g": 0.0,
            "edible_portion_pct": 100.0,
            "source_name": "Tabel Komposisi Pangan Indonesia (TKPI)",
            "source_edition": "Kemenkes RI 2019",
            "is_verified": True,
        },
    ]


class NutritionService:
    """Calculates macro-nutritional content based on verified composition tables."""

    def __init__(self, food_composition_repository: FoodCompositionRepositoryProtocol) -> None:
        self.repo = food_composition_repository

    def calculate(self, payload: dict[str, Any] | None) -> dict[str, Any]:
        """Calculate nutritional breakdown and totals from an ingredients payload.

        Payload structure:
        {
            "ingredients": [
                {
                    "name": str,
                    "amountGr": float | int,    # or "amount": float, "unit": str
                    "unit": str (default "gr"),
                    "code": str (optional),
                    "role": str (optional)
                }
            ],
            "portions": int (optional, default 1),
            "applyEdiblePortion": bool (optional, default True)
        }

        Returns:
            {
                "perPortion": {
                    "caloriesKcal": float,
                    "proteinGram": float,
                    "carbsGram": float,
                    "fatGram": float,
                    "grossWeightGram": float,
                    "edibleWeightGram": float
                },
                "batchTotal": {
                    "portions": int,
                    "caloriesKcal": float,
                    "proteinGram": float,
                    "carbsGram": float,
                    "fatGram": float,
                    "totalWeightGram": float
                },
                "breakdown": list[dict],
                "isVerified": bool,
                "unverifiedIngredients": list[str],
                "sources": list[dict]
            }
        """
        if not payload or not isinstance(payload, dict):
            raise ValueError("Payload perhitungan nutrisi tidak boleh kosong.")

        ingredients = payload.get("ingredients")
        if not isinstance(ingredients, list):
            raise ValueError("Field 'ingredients' wajib berupa array/list bahan makanan.")

        if "portions" in payload:
            try:
                portions = int(payload["portions"])
            except (ValueError, TypeError):
                raise ValueError("Jumlah porsi (portions) harus berupa bilangan bulat.")
        else:
            portions = 1

        if portions < 1:
            raise ValueError("Jumlah porsi (portions) minimal 1.")

        apply_bdd = bool(payload.get("applyEdiblePortion", True))

        per_portion_cal = 0.0
        per_portion_pro = 0.0
        per_portion_car = 0.0
        per_portion_fat = 0.0
        per_portion_gross = 0.0
        per_portion_edible = 0.0

        breakdown: list[dict[str, Any]] = []
        unverified: list[str] = []
        sources_seen: dict[str, dict[str, str]] = {}
        all_verified = True

        for idx, ing in enumerate(ingredients, start=1):
            if not isinstance(ing, dict):
                continue

            raw_name = str(ing.get("name", "")).strip()
            if not raw_name:
                raise ValueError(f"Bahan #{idx} tidak memiliki nama.")

            # Determine input amount and unit
            amount_val = ing.get("amountGr")
            if amount_val is None:
                amount_val = ing.get("amount")
            if amount_val is None:
                raise ValueError(f"Bahan '{raw_name}' tidak memiliki nilai gramasi/jumlah.")

            try:
                amount_float = float(amount_val)
            except (ValueError, TypeError):
                raise ValueError(f"Bahan '{raw_name}' memiliki nilai gramasi tidak valid: {amount_val}")

            if amount_float < 0:
                raise ValueError(f"Bahan '{raw_name}' tidak boleh memiliki gramasi negatif.")

            unit_str = str(ing.get("unit", "gr")).strip().lower()
            if unit_str not in UNIT_TO_GRAM_FACTORS:
                raise ValueError(
                    f"Satuan '{unit_str}' pada '{raw_name}' tidak dikenali. Satuan didukung: {', '.join(UNIT_TO_GRAM_FACTORS.keys())}."
                )

            factor = UNIT_TO_GRAM_FACTORS[unit_str]
            gross_grams = amount_float * factor

            # Look up food composition
            comp = None
            if ing.get("code"):
                comp = self.repo.get_by_code(str(ing["code"]))
            if not comp:
                comp = self.repo.search_by_name(raw_name)

            if not comp:
                # Strictly unverified item: do not invent fake nutritional values
                all_verified = False
                unverified.append(raw_name)
                per_portion_gross += gross_grams
                per_portion_edible += gross_grams
                breakdown.append({
                    "name": raw_name,
                    "code": None,
                    "role": ing.get("role", "-"),
                    "grossWeightGram": round(gross_grams, 2),
                    "edibleWeightGram": round(gross_grams, 2),
                    "caloriesKcal": 0.0,
                    "proteinGram": 0.0,
                    "carbsGram": 0.0,
                    "fatGram": 0.0,
                    "isVerified": False,
                    "source": "TIDAK DITEMUKAN / BELUM TERVERIFIKASI",
                    "note": "Nutrisi tidak dikarang; membutuhkan referensi pangan resmi.",
                })
                continue

            # Verified food composition calculation
            basis_w = float(comp.get("basis_weight", 100.0))
            if basis_w <= 0:
                basis_w = 100.0

            bdd = float(comp.get("edible_portion_pct", 100.0))
            if apply_bdd:
                edible_grams = gross_grams * (bdd / 100.0)
            else:
                edible_grams = gross_grams

            scale = edible_grams / basis_w
            item_cal = scale * float(comp.get("energy_kcal", 0.0))
            item_pro = scale * float(comp.get("protein_g", 0.0))
            item_car = scale * float(comp.get("carbs_g", 0.0))
            item_fat = scale * float(comp.get("fat_g", 0.0))

            per_portion_cal += item_cal
            per_portion_pro += item_pro
            per_portion_car += item_car
            per_portion_fat += item_fat
            per_portion_gross += gross_grams
            per_portion_edible += edible_grams

            src_key = f"{comp.get('source_name')} - {comp.get('source_edition')}"
            sources_seen[src_key] = {
                "sourceName": str(comp.get("source_name", "TKPI")),
                "edition": str(comp.get("source_edition", "2019")),
                "code": str(comp.get("code", "")),
            }

            breakdown.append({
                "name": raw_name,
                "matchedName": comp.get("name"),
                "code": comp.get("code"),
                "role": ing.get("role", "-"),
                "grossWeightGram": round(gross_grams, 2),
                "edibleWeightGram": round(edible_grams, 2),
                "bddPct": bdd,
                "caloriesKcal": round(item_cal, 2),
                "proteinGram": round(item_pro, 2),
                "carbsGram": round(item_car, 2),
                "fatGram": round(item_fat, 2),
                "isVerified": True,
                "source": src_key,
            })

        # Summary figures with clean decimal precision
        per_portion_summary = {
            "caloriesKcal": round(per_portion_cal, 1),
            "proteinGram": round(per_portion_pro, 1),
            "carbsGram": round(per_portion_car, 1),
            "fatGram": round(per_portion_fat, 1),
            "grossWeightGram": round(per_portion_gross, 1),
            "edibleWeightGram": round(per_portion_edible, 1),
        }

        batch_summary = {
            "portions": portions,
            "caloriesKcal": round(per_portion_summary["caloriesKcal"] * portions, 1),
            "proteinGram": round(per_portion_summary["proteinGram"] * portions, 1),
            "carbsGram": round(per_portion_summary["carbsGram"] * portions, 1),
            "fatGram": round(per_portion_summary["fatGram"] * portions, 1),
            "totalWeightGram": round(per_portion_summary["grossWeightGram"] * portions, 1),
        }

        return {
            "perPortion": per_portion_summary,
            "batchTotal": batch_summary,
            "breakdown": breakdown,
            "isVerified": all_verified and len(ingredients) > 0,
            "unverifiedIngredients": unverified,
            "sources": list(sources_seen.values()),
        }
