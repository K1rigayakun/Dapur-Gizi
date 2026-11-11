/**
 * DapurGizi — Modular View Router (js/router.js)
 * Coordinates navigation across all 12 application modules with RBAC enforcement.
 */

import { store } from './state.js';
import { canAccessModule } from './utils/permissions.js';
import { showToast } from './components/toast.js';

import { renderDashboardPage } from './pages/dashboard.js';
import { renderBeneficiariesPage } from './pages/beneficiaries.js';
import { renderMenusPage } from './pages/menus.js';
import { renderProductionPage } from './pages/production.js';
import { renderBudgetPage } from './pages/budget.js';
import { renderDistributionPage } from './pages/distribution.js';
import { renderFoodSafetyPage } from './pages/food-safety.js';
import { renderReportsPage } from './pages/reports.js';
import { renderUsersPage } from './pages/users.js';
import { renderNotificationsPage } from './pages/notifications.js';
import { renderSettingsPage } from './pages/settings.js';

export const ROUTE_RENDERERS = {
  dashboard: renderDashboardPage,
  beneficiaries: renderBeneficiariesPage,
  menus: renderMenusPage,
  production: renderProductionPage,
  budget: renderBudgetPage,
  distribution: renderDistributionPage,
  'food-safety': renderFoodSafetyPage,
  reports: renderReportsPage,
  users: renderUsersPage,
  notifications: renderNotificationsPage,
  settings: renderSettingsPage
};

export async function navigateTo(routeId, contentMountEl, onRouteChanged) {
  if (!contentMountEl) return;
  const userRole = store.state.session?.user?.role || 'Kepala SPPG';

  if (!canAccessModule(userRole, routeId, store.state.roleMatrix)) {
    showToast({
      title: 'Akses Modul Dibatasi',
      message: `Peran "${userRole}" tidak memiliki izin mengakses modul tersebut.`,
      type: 'warning'
    });
    routeId = 'dashboard';
  }

  const renderer = ROUTE_RENDERERS[routeId] || renderDashboardPage;
  store.setRoute(routeId);

  if (typeof onRouteChanged === 'function') {
    onRouteChanged(routeId);
  }

  await renderer(contentMountEl, (nextRoute) => navigateTo(nextRoute, contentMountEl, onRouteChanged));
}
