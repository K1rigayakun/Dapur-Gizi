"""DapurGizi Services Package.
Exposes domain services and repository protocols.
"""

from backend.services.beneficiaries import (
    BENEFICIARY_CATEGORIES,
    VALID_STATUSES,
    BeneficiaryRepositoryProtocol,
    BeneficiaryService,
    InMemoryBeneficiaryRepository,
    detect_identifier_type,
)
from backend.services.menus import (
    VALID_MENU_STATUSES,
    InMemoryMenuRepository,
    MenuRepositoryProtocol,
    MenuService,
)
from backend.services.nutrition import (
    FoodCompositionRepositoryProtocol,
    InMemoryFoodCompositionRepository,
    NutritionService,
    get_default_verified_tkpi_items,
)
from backend.services.production import (
    VALID_PRODUCTION_STATUSES,
    InMemoryProductionRepository,
    ProductionRepositoryProtocol,
    ProductionService,
    get_default_production_timeline,
)

__all__ = [
    "BENEFICIARY_CATEGORIES",
    "VALID_STATUSES",
    "BeneficiaryRepositoryProtocol",
    "BeneficiaryService",
    "InMemoryBeneficiaryRepository",
    "detect_identifier_type",
    "VALID_MENU_STATUSES",
    "MenuRepositoryProtocol",
    "MenuService",
    "InMemoryMenuRepository",
    "FoodCompositionRepositoryProtocol",
    "NutritionService",
    "InMemoryFoodCompositionRepository",
    "get_default_verified_tkpi_items",
    "VALID_PRODUCTION_STATUSES",
    "ProductionRepositoryProtocol",
    "ProductionService",
    "InMemoryProductionRepository",
    "get_default_production_timeline",
]
