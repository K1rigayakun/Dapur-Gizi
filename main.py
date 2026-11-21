import os
import traceback
from typing import Any, Callable, Dict, Optional
import eel

from backend.services.distribution import DistributionService, InMemoryDistributionRepository
from backend.services.food_safety import FoodSafetyService, InMemoryFoodSafetyRepository
from backend.services.reports import ReportService, InMemoryReportRepository

# Inisialisasi Repository & Service khusus Domain Visel
dist_repo = InMemoryDistributionRepository()
safety_repo = InMemoryFoodSafetyRepository()
report_repo = InMemoryReportRepository(dist_repo=dist_repo, safety_repo=safety_repo)

distribution_service = DistributionService(dist_repo)
food_safety_service = FoodSafetyService(safety_repo)
report_service = ReportService(report_repo)


def _envelope(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> Dict[str, Any]:
    try:
        result = fn(*args, **kwargs)
        return {"success": True, "data": result, "error": None}
    except (ValueError, LookupError) as exc:
        return {"success": False, "data": None, "error": str(exc)}
    except Exception:
        traceback.print_exc()
        return {"success": False, "data": None, "error": "Terjadi kesalahan internal pada server operasional."}


# --- EEL EXPOSE: DISTRIBUTION ---
@eel.expose
def distributions_list(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return _envelope(distribution_service.list, payload)


@eel.expose
def distributions_create(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(distribution_service.create, payload)


@eel.expose
def distributions_update(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(distribution_service.update, payload)


@eel.expose
def distributions_confirm_receipt(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(distribution_service.confirm_receipt, payload)


# --- EEL EXPOSE: FOOD SAFETY ---
@eel.expose
def hygiene_get_checklist(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return _envelope(food_safety_service.get_checklist, payload)


@eel.expose
def hygiene_save_checklist(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(food_safety_service.save_checklist, payload)


@eel.expose
def slhs_list(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return _envelope(food_safety_service.list_slhs, payload)


@eel.expose
def incidents_create(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(food_safety_service.create_incident, payload)


@eel.expose
def food_waste_create(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(food_safety_service.create_food_waste, payload)


# --- EEL EXPOSE: REPORTS ---
@eel.expose
def reports_generate(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(report_service.generate, payload)


@eel.expose
def reports_export(payload: Dict[str, Any]) -> Dict[str, Any]:
    return _envelope(report_service.export, payload)


if __name__ == "__main__":
    web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
    eel.init(web_dir)
    print("Menjalankan DapurGizi (Modul Operasional Visel) di http://localhost:8080 ...")
    eel.start("index.html", size=(1280, 820), port=8080)