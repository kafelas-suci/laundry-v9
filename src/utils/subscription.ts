export type LaundryTier = 'basic' | 'pro';

export interface LaundrySubscriptionLimits {
  tier: LaundryTier;
  label: string;
  tagline: string;
  badgeText: string;
  priceMonthly: number;
  maxBranches: number;            // Basic: 1, Pro: 3
  maxCashiers: number;            // Basic: 1, Pro: 3 (1 admin per outlet)
  maxAdminPerOutlet: number;      // 1 admin per outlet
  maxOwnerPerOutlet: number;      // 1 owner per outlet
  canAssignStaff: boolean;        // Basic: false, Pro: true
  canExportExcel: boolean;        // Basic: false, Pro: true
  canExportOfficialPdf: boolean;  // Basic: false, Pro: true
  canViewComparisonGrowth: boolean;// Basic: false, Pro: true
  canUseCustomLogoOnReceipt: boolean; // Basic: false, Pro: true
  canUseSignatureOnReceipt: boolean;  // Basic: false, Pro: true
  maxMonthlyTransactions: number; // Basic: 300, Pro: 1500 (anti-bot quota)
  highlights: string[];
}

export const LAUNDRY_TIER_CONFIG: Record<LaundryTier, LaundrySubscriptionLimits> = {
  basic: {
    tier: 'basic',
    label: 'Paket Basic',
    tagline: 'Solusi handal untuk 1 outlet laundry & operasional kasir mandiri',
    badgeText: 'Paket Basic',
    priceMonthly: 27000,
    maxBranches: 1,
    maxCashiers: 1,
    maxAdminPerOutlet: 1,
    maxOwnerPerOutlet: 1,
    canAssignStaff: false,
    canExportExcel: false,
    canExportOfficialPdf: false,
    canViewComparisonGrowth: false,
    canUseCustomLogoOnReceipt: false,
    canUseSignatureOnReceipt: false,
    maxMonthlyTransactions: 300,
    highlights: [
      '1 Cabang Outlet Utama',
      '1 Admin Kasir & 1 Owner per Outlet',
      'Input Transaksi Kiloan & Satuan Lengkap',
      'Cetak Struk Thermal Standar & Bagikan WhatsApp',
      'Pencatatan Buku Arus Kas Masuk & Keluar',
      'Kapasitas hingga 300 nota transaksi per bulan',
    ],
  },
  pro: {
    tier: 'pro',
    label: 'Paket Pro',
    tagline: 'Multi-cabang hingga 3 outlet, audit Excel/PDF & analitik omzet bisnis',
    badgeText: 'Paket Pro',
    priceMonthly: 57000,
    maxBranches: 3,
    maxCashiers: 3,
    maxAdminPerOutlet: 1,
    maxOwnerPerOutlet: 1,
    canAssignStaff: true,
    canExportExcel: true,
    canExportOfficialPdf: true,
    canViewComparisonGrowth: true,
    canUseCustomLogoOnReceipt: true,
    canUseSignatureOnReceipt: true,
    maxMonthlyTransactions: 1500,
    highlights: [
      'Dukungan Multi-Cabang (Hingga Maksimal 3 Cabang Outlet)',
      '1 Admin Kasir per Outlet (Maksimal 3 Admin untuk 3 Cabang)',
      'Penugasan Staf Pengerjaan Cucian (Cuci, Setrika, Packing)',
      'Ekspor Pembukuan Lengkap ke Excel Spreadsheet (.xlsx)',
      'Cetak Dokumen Laporan Keuangan Resmi A4 Siap Audit (.pdf)',
      'Grafik Analisis Komparasi Omzet & Laba (MoM & YoY)',
      'Kustomisasi Logo & Tanda Tangan Resmi di Struk Thermal',
      'Kapasitas hingga 1.500 nota transaksi per bulan',
    ],
  },
};

/**
 * Normalisasi string tier menjadi 'basic' | 'pro'
 */
export function normalizeTier(rawTier?: string | null): LaundryTier {
  if (!rawTier) return 'pro';
  const clean = rawTier.toLowerCase().trim();
  if (clean === 'basic' || clean === 'standar' || clean === 'gratis' || clean === 'free') {
    return 'basic';
  }
  return 'pro';
}

/**
 * Mengambil konfigurasi limit paket aktif
 */
export function getLaundryLimits(rawTier?: string | null): LaundrySubscriptionLimits {
  const tier = normalizeTier(rawTier);
  return LAUNDRY_TIER_CONFIG[tier] || LAUNDRY_TIER_CONFIG.pro;
}

/**
 * Pengecekan apakah user berstatus Pro
 */
export function isProTier(rawTier?: string | null): boolean {
  return normalizeTier(rawTier) === 'pro';
}

/**
 * Cek apakah user boleh menambah cabang baru
 */
export function canAddBranch(currentBranchCount: number, rawTier?: string | null): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  if (limits.tier === 'basic' && currentBranchCount >= 1) {
    return {
      allowed: false,
      reason: 'Paket Basic dibatasi maksimal 1 cabang outlet. Tingkatkan ke Paket Pro untuk mengelola hingga 3 cabang.',
    };
  }
  if (currentBranchCount >= limits.maxBranches) {
    return {
      allowed: false,
      reason: `Maksimal kuota ${limits.maxBranches} cabang outlet telah tercapai untuk Paket Pro (kebijakan keamanan & anti-bot).`,
    };
  }
  return { allowed: true };
}

/**
 * Cek apakah outlet tertentu boleh menambah admin/kasir (aturan: 1 admin per outlet)
 */
export function canAddCashierToBranch(
  branchId: string,
  staffList: { laundryId?: string | null; role: string }[],
  rawTier?: string | null
): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  
  // Total cashiers count
  const totalCashiers = staffList.filter((s) => s.role === 'admin' || s.role === 'karyawan').length;
  if (limits.tier === 'basic' && totalCashiers >= 1) {
    return {
      allowed: false,
      reason: 'Paket Basic dibatasi maksimal 1 akun kasir. Tingkatkan ke Paket Pro untuk menambah cabang dan kasir.',
    };
  }

  if (totalCashiers >= limits.maxCashiers) {
    return {
      allowed: false,
      reason: `Batas kuota total ${limits.maxCashiers} admin telah tercapai (1 admin per outlet untuk maksimal 3 cabang).`,
    };
  }

  // Per-outlet cashiers count
  const branchCashiers = staffList.filter(
    (s) => s.laundryId === branchId && (s.role === 'admin' || s.role === 'karyawan')
  );
  if (branchCashiers.length >= limits.maxAdminPerOutlet) {
    return {
      allowed: false,
      reason: 'Cabang outlet ini sudah memiliki 1 admin kasir. Sistem membatasi 1 admin & 1 owner per outlet untuk keamanan dan proteksi bot.',
    };
  }

  return { allowed: true };
}

// Backward-compatible stubs for previous photo-studio interfaces if referenced
export type SubscriptionLimits = {
  maxSchedulesPerMonth: number;
  maxAdmins: number;
  maxCrew: number;
  canAccessWebsiteSettings: boolean;
  canAccessBookingLink: boolean;
  canManageTeam: boolean;
  canChangeTheme: boolean;
  maxWebsites: number;
  maxDailyActions: number;
  maxDailyVisits: number;
};

export const SUBSCRIPTION_CONFIG: Record<string, SubscriptionLimits> = {
  standar: {
    maxSchedulesPerMonth: 100,
    maxAdmins: 1,
    maxCrew: 0,
    canAccessWebsiteSettings: false,
    canAccessBookingLink: false,
    canManageTeam: false,
    canChangeTheme: false,
    maxWebsites: 0,
    maxDailyActions: 0,
    maxDailyVisits: 10,
  },
  pro: {
    maxSchedulesPerMonth: 500,
    maxAdmins: 3,
    maxCrew: 0,
    canAccessWebsiteSettings: true,
    canAccessBookingLink: true,
    canManageTeam: true,
    canChangeTheme: true,
    maxWebsites: 1,
    maxDailyActions: 5,
    maxDailyVisits: 50,
  },
};

export const getLimits = (tier: string): SubscriptionLimits => {
  const normalizedTier = tier.toLowerCase();
  return SUBSCRIPTION_CONFIG[normalizedTier] || SUBSCRIPTION_CONFIG.standar;
};
