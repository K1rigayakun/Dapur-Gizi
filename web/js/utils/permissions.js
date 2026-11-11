/**
 * DapurGizi Configurable Role-Based Access Control (RBAC)
 *
 * NOTE (Project Design Decision):
 * The role permissions matrix below is an operational software design decision
 * for the DapurGizi university project and is configurable via the Settings / Users module.
 * It is NOT hardcoded as an official government regulation.
 */

export const ROLES = {
  KEPALA_SPPG: 'Kepala SPPG',
  PENGAWAS_GIZI: 'Pengawas Gizi',
  PENGAWAS_KEUANGAN: 'Pengawas Keuangan',
  PENGAWAS_SANITASI: 'Pengawas Sanitasi'
};

export const DEFAULT_ROLE_MATRIX = {
  [ROLES.KEPALA_SPPG]: {
    label: 'Kepala SPPG',
    badgeColor: 'emerald',
    description: 'Otoritas penuh operasional SPPG, persetujuan akhir menu, anggaran, distribusi, dan manajemen pengguna.',
    modules: [
      'dashboard',
      'beneficiaries',
      'menus',
      'production',
      'budget',
      'distribution',
      'food-safety',
      'reports',
      'users',
      'notifications',
      'settings'
    ],
    actions: {
      canApproveMenu: true,
      canConfigureBudget: true,
      canManageUsers: true,
      canEditProduction: true,
      canEditHygiene: true,
      canConfirmDistribution: true
    }
  },
  [ROLES.PENGAWAS_GIZI]: {
    label: 'Pengawas Gizi',
    badgeColor: 'teal',
    description: 'Perencanaan siklus menu mingguan, komposisi bahan, kalkulasi gizi, data penerima manfaat, dan pemantauan produksi.',
    modules: [
      'dashboard',
      'beneficiaries',
      'menus',
      'production',
      'distribution',
      'food-safety',
      'reports',
      'notifications',
      'settings'
    ],
    actions: {
      canApproveMenu: true,
      canConfigureBudget: false,
      canManageUsers: false,
      canEditProduction: true,
      canEditHygiene: false,
      canConfirmDistribution: false
    }
  },
  [ROLES.PENGAWAS_KEUANGAN]: {
    label: 'Pengawas Keuangan',
    badgeColor: 'amber',
    description: 'Pengelolaan anggaran bahan pangan & operasional, kalkulator biaya per porsi, insentif fasilitas, dan laporan keuangan.',
    modules: [
      'dashboard',
      'beneficiaries',
      'production',
      'budget',
      'distribution',
      'reports',
      'notifications',
      'settings'
    ],
    actions: {
      canApproveMenu: false,
      canConfigureBudget: true,
      canManageUsers: false,
      canEditProduction: false,
      canEditHygiene: false,
      canConfirmDistribution: false
    }
  },
  [ROLES.PENGAWAS_SANITASI]: {
    label: 'Pengawas Sanitasi',
    badgeColor: 'blue',
    description: 'Inspeksi daftar periksa higienitas harian, manajemen sertifikat SLHS, pelaporan insiden pangan, dan pencatatan food waste.',
    modules: [
      'dashboard',
      'menus',
      'production',
      'distribution',
      'food-safety',
      'reports',
      'notifications',
      'settings'
    ],
    actions: {
      canApproveMenu: false,
      canConfigureBudget: false,
      canManageUsers: false,
      canEditProduction: true,
      canEditHygiene: true,
      canConfirmDistribution: true
    }
  }
};

export function canAccessModule(role, moduleId, customMatrix = null) {
  const matrix = customMatrix || DEFAULT_ROLE_MATRIX;
  const roleConfig = matrix[role] || matrix[ROLES.KEPALA_SPPG];
  return roleConfig.modules.includes(moduleId);
}

export function canPerformAction(role, actionKey, customMatrix = null) {
  const matrix = customMatrix || DEFAULT_ROLE_MATRIX;
  const roleConfig = matrix[role] || matrix[ROLES.KEPALA_SPPG];
  return Boolean(roleConfig.actions && roleConfig.actions[actionKey]);
}
