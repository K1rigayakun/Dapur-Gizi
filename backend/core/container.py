"""Injection container dan registri service domain.

Container memisahkan pembuatan dependency (config, klien Supabase, sesi,
repository, service) dari handler Eel. Test dapat menyuntikkan repository
in-memory dan provider autentikasi palsu tanpa menyentuh Supabase.
"""

from __future__ import annotations

import importlib
import threading
from typing import Any, Callable

from backend.auth.provider import AuthProvider
from backend.auth.service import AuthService
from backend.auth.session import SessionStore
from backend.core.config import Settings, load_settings
from backend.core.errors import ServiceUnavailableError
from backend.database.repository import Repository

# Kontrak service domain (FROZEN PARALLEL DEVELOPMENT CONTRACT bagian 1).
# Format: nama_domain -> (modul, nama_kelas, {argumen_konstruktor: sumber})
# sumber "repository" berarti objek repository; selain itu nama service domain.
DOMAIN_SERVICES: dict[str, tuple[str, str, dict[str, str]]] = {
    "beneficiaries": (
        "backend.services.beneficiaries",
        "BeneficiaryService",
        {"repository": "repository"},
    ),
    "nutrition": (
        "backend.services.nutrition",
        "NutritionService",
        {"food_composition_repository": "repository"},
    ),
    "menus": (
        "backend.services.menus",
        "MenuService",
        {"repository": "repository", "nutrition_service": "nutrition"},
    ),
    "production": (
        "backend.services.production",
        "ProductionService",
        {"repository": "repository"},
    ),
    "distribution": (
        "backend.services.distribution",
        "DistributionService",
        {"repository": "repository"},
    ),
    "food_safety": (
        "backend.services.food_safety",
        "FoodSafetyService",
        {"repository": "repository"},
    ),
    "reports": (
        "backend.services.reports",
        "ReportService",
        {"repository": "repository"},
    ),
}


class ServiceRegistry:
    """Muat service domain secara lazy agar PR paralel dapat digabung kapan saja."""

    def __init__(self, container: "AppContainer") -> None:
        self._container = container
        self._cache: dict[str, Any] = {}
        self._lock = threading.RLock()
        self._resolving: set[str] = set()

    def get(self, name: str) -> Any:
        with self._lock:
            if name in self._cache:
                return self._cache[name]
            if name in self._resolving:
                raise ServiceUnavailableError(
                    f"Dependensi melingkar terdeteksi pada service '{name}'."
                )
            spec = DOMAIN_SERVICES.get(name)
            if spec is None:
                raise ServiceUnavailableError(f"Service domain '{name}' tidak dikenal.")

            module_path, class_name, dependencies = spec
            try:
                module = importlib.import_module(module_path)
                service_class = getattr(module, class_name)
            except (ImportError, AttributeError) as exc:
                raise ServiceUnavailableError(
                    f"Layanan domain '{name}' belum tersedia pada backend Python. "
                    "Modul ini menunggu penggabungan Pull Request pemilik domain."
                ) from exc

            self._resolving.add(name)
            try:
                kwargs: dict[str, Any] = {}
                for arg_name, source in dependencies.items():
                    if source == "repository":
                        kwargs[arg_name] = self._container.repository
                    else:
                        kwargs[arg_name] = self.get(source)
                instance = service_class(**kwargs)
            finally:
                self._resolving.discard(name)

            self._cache[name] = instance
            return instance

    def available(self, name: str) -> bool:
        try:
            self.get(name)
            return True
        except ServiceUnavailableError:
            return False

    def override(self, name: str, instance: Any) -> None:
        """Suntikkan instance service (dipakai test handler)."""
        with self._lock:
            self._cache[name] = instance


class AppContainer:
    """Komposisi dependency aplikasi."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        repository: Repository | None = None,
        auth_provider: AuthProvider | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        self.sessions = SessionStore(
            ttl_hours=self.settings.session_ttl_hours,
            remember_ttl_hours=self.settings.remember_session_ttl_hours,
        )
        self._repository = repository
        self._auth_provider = auth_provider
        self._client: Any = None
        self._auth_service: AuthService | None = None
        self._budget: Any = None
        self._dashboard: Any = None
        self._users: Any = None
        self._notifications: Any = None
        self._settings_service: Any = None
        self.services = ServiceRegistry(self)

    # -- infrastruktur -------------------------------------------------
    def client(self) -> Any:
        if self._client is None:
            from backend.database.client import create_supabase_client

            self._client = create_supabase_client(self.settings)
        return self._client

    @property
    def repository(self) -> Repository:
        if self._repository is None:
            from backend.database.repository import SupabaseRepository

            self._repository = SupabaseRepository(self.client())
        return self._repository

    @property
    def auth_provider(self) -> AuthProvider:
        if self._auth_provider is None:
            from backend.auth.provider import SupabaseAuthProvider

            def load_profile(
                user_id: str, access_token: str | None = None
            ) -> dict[str, Any] | None:
                if access_token:
                    self.repository.set_access_token(access_token)
                return self.repository.get("app_users", user_id)

            self._auth_provider = SupabaseAuthProvider(self.client(), load_profile)
        return self._auth_provider

    # -- service milik Gabriel ----------------------------------------
    @property
    def auth(self) -> AuthService:
        if self._auth_service is None:
            self._auth_service = AuthService(
                self.auth_provider, self.sessions, self.repository
            )
        return self._auth_service

    @property
    def budget(self) -> Any:
        if self._budget is None:
            from backend.services.budget import BudgetService

            self._budget = BudgetService(self.repository)
        return self._budget

    @property
    def dashboard(self) -> Any:
        if self._dashboard is None:
            from backend.services.dashboard import DashboardService

            self._dashboard = DashboardService(
                self.repository, timezone_name=self.settings.timezone
            )
        return self._dashboard

    @property
    def users(self) -> Any:
        if self._users is None:
            from backend.services.identity import UsersService

            self._users = UsersService(self.repository)
        return self._users

    @property
    def notifications(self) -> Any:
        if self._notifications is None:
            from backend.services.identity import NotificationsService

            self._notifications = NotificationsService(self.repository)
        return self._notifications

    @property
    def settings_service(self) -> Any:
        if self._settings_service is None:
            from backend.services.identity import SettingsService

            self._settings_service = SettingsService(self.repository, self.budget)
        return self._settings_service


_container_lock = threading.RLock()
_container: AppContainer | None = None


def get_container() -> AppContainer:
    global _container
    with _container_lock:
        if _container is None:
            _container = AppContainer()
        return _container


def set_container(container: AppContainer | None) -> None:
    """Suntikkan container (dipakai test)."""
    global _container
    with _container_lock:
        _container = container


def reset_container() -> None:
    set_container(None)
