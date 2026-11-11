/**
 * DapurGizi — Reactive Application State Store
 * Manages session, theme, sidebar state, active route, backend mode, and role matrix.
 * File: js/state.js
 */

import { DEFAULT_ROLE_MATRIX, ROLES } from './utils/permissions.js';

const THEME_STORAGE_KEY = 'dapurgizi_theme_pref';
const SIDEBAR_STORAGE_KEY = 'dapurgizi_sidebar_collapsed';
const MODE_STORAGE_KEY = 'dapurgizi_backend_mode';
const RBAC_STORAGE_KEY = 'dapurgizi_rbac_matrix_demo';

function safeGetStorage(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch (_) {
    return fallback;
  }
}

function safeSetStorage(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (_) {
    // Ignore storage quota / sandbox restrictions
  }
}

function loadCustomRbac() {
  try {
    const raw = localStorage.getItem(RBAC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return structuredClone(DEFAULT_ROLE_MATRIX);
}

const listeners = new Set();

export const store = {
  state: {
    initialized: false,
    splashShown: false,
    theme: safeGetStorage(THEME_STORAGE_KEY, 'light'),
    sidebarCollapsed: safeGetStorage(SIDEBAR_STORAGE_KEY, 'false') === 'true',
    // backendMode: 'DEMO' | 'PRODUCTION'
    backendMode: safeGetStorage(MODE_STORAGE_KEY, 'DEMO'),
    eelConnected: false,
    currentRoute: 'dashboard',
    globalSearchQuery: '',
    session: null, // { user: { id, name, email, role, unit, avatar }, expiresAt, isDemo }
    sessionExpiredAlert: false,
    unreadNotificationCount: 0,
    notificationsDropdownOpen: false,
    dashboardSimState: 'normal', // 'normal' | 'loading' | 'empty' | 'warning' | 'error'
    selectedOperationDate: '2026-11-12',
    roleMatrix: loadCustomRbac()
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  notify(changedKey = '*') {
    listeners.forEach((fn) => {
      try {
        fn(this.state, changedKey);
      } catch (err) {
        console.error('[DapurGizi State Subscriber Error]', err);
      }
    });
  },

  setTheme(theme) {
    const next = theme === 'dark' ? 'dark' : 'light';
    this.state.theme = next;
    safeSetStorage(THEME_STORAGE_KEY, next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
    }
    this.notify('theme');
  },

  toggleTheme() {
    this.setTheme(this.state.theme === 'dark' ? 'light' : 'dark');
  },

  setSidebarCollapsed(collapsed) {
    this.state.sidebarCollapsed = Boolean(collapsed);
    safeSetStorage(SIDEBAR_STORAGE_KEY, String(this.state.sidebarCollapsed));
    this.notify('sidebarCollapsed');
  },

  toggleSidebar() {
    this.setSidebarCollapsed(!this.state.sidebarCollapsed);
  },

  setBackendMode(mode) {
    const valid = mode === 'PRODUCTION' ? 'PRODUCTION' : 'DEMO';
    this.state.backendMode = valid;
    safeSetStorage(MODE_STORAGE_KEY, valid);
    this.notify('backendMode');
  },

  setEelConnected(connected) {
    this.state.eelConnected = Boolean(connected);
    this.notify('eelConnected');
  },

  setSession(sessionData) {
    this.state.session = sessionData;
    this.state.sessionExpiredAlert = false;
    this.notify('session');
  },

  triggerSessionExpired() {
    this.state.session = null;
    this.state.sessionExpiredAlert = true;
    this.state.currentRoute = 'login';
    this.notify('sessionExpired');
  },

  setRoute(route) {
    this.state.currentRoute = route;
    this.state.notificationsDropdownOpen = false;
    this.notify('currentRoute');
  },

  setUnreadCount(count) {
    this.state.unreadNotificationCount = Math.max(0, Number(count) || 0);
    this.notify('unreadNotificationCount');
  },

  updateRoleMatrix(newMatrix) {
    this.state.roleMatrix = newMatrix;
    safeSetStorage(RBAC_STORAGE_KEY, JSON.stringify(newMatrix));
    this.notify('roleMatrix');
  },

  switchDemoRole(roleName) {
    if (!this.state.session || !Object.values(ROLES).includes(roleName)) return;
    this.state.session = {
      ...this.state.session,
      user: {
        ...this.state.session.user,
        role: roleName
      }
    };
    this.notify('session');
  }
};
