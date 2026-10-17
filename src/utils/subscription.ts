export type LaundryTier = 'newcomer' | 'basic' | 'pro';

export interface LaundrySubscriptionLimits {
  tier: LaundryTier;
  label: string;
  tagline: string;
  badgeText: string;
  priceMonthly: number;
  maxBranches: number;            // Newcomer: 1, Basic: 1, Pro: 3
  maxCashiers: number;            // Newcomer: 0, Basic: 1, Pro: 3
  maxAdminPerOutlet: number;      // Newcomer: 0, Basic: 1, Pro: 1
  maxOwnerPerOutlet: number;      // 1
  maxCustomers: number;           // Newcomer: 50, Basic: 500, Pro: 5000
  maxMonthlyTransactions: number; // Newcomer: 50, Basic: 300, Pro: 1500
  maxServices: number;            // Newcomer: 5, Basic: 30, Pro: 100
  canAssignStaff: boolean;        // Newcomer: false, Basic: false, Pro: true
  canExportExcel: boolean;        // Newcomer: false, Basic: false, Pro: true
  canExportOfficialPdf: boolean;  // Newcomer: false, Basic: false, Pro: true
  canViewComparisonGrowth: boolean;// Newcomer: false, Basic: false, Pro: true
  canUseCustomLogoOnReceipt: boolean; // Newcomer: false, Basic: false, Pro: true
  canUseSignatureOnReceipt: boolean;  // Newcomer: false, Basic: false, Pro: true
  highlights: string[];
}

export const LAUNDRY_TIER_CONFIG: Record<LaundryTier, LaundrySubscriptionLimits> = {
  newcomer: {
    tier: 'newcomer',
    label: 'Paket Newcomer',
    tagline: 'Mulai usaha laundry gratis tanpa biaya langganan bulanan',
    badgeText: 'Paket Newcomer (Gratis)',
    priceMonthly: 0,
    maxBranches: 1,
    maxCashiers: 0,
    maxAdminPerOutlet: 0,
    maxOwnerPerOutlet: 1,
    maxCustomers: 50,
    maxMonthlyTransactions: 50,
    maxServices: 5,
    canAssignStaff: false,
    canExportExcel: false,
    canExportOfficialPdf: false,
    canViewComparisonGrowth: false,
    canUseCustomLogoOnReceipt: false,
    canUseSignatureOnReceipt: false,
    highlights: [
      'Gratis Selamanya (Rp 0)',
      '1 Cabang Outlet & 1 Owner (Tidak Ada Kasir)',
      'Maksimal 50 Data Pelanggan',
      'Maksimal 50 Nota Transaksi per Bulan',
      'Maksimal 5 Jenis Layanan Cucian',
      'Cetak Struk Thermal Standar & Bagikan WhatsApp',
      'Pencatatan Buku Kas Pemasukan & Pengeluaran',
      'Fitur Staf & Laporan Pro Terkunci',
    ],
  },
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
    maxCustomers: 500,
    maxMonthlyTransactions: 300,
    maxServices: 30,
    canAssignStaff: false,
    canExportExcel: false,
    canExportOfficialPdf: false,
    canViewComparisonGrowth: false,
    canUseCustomLogoOnReceipt: false,
    canUseSignatureOnReceipt: false,
    highlights: [
      '1 Cabang Outlet Utama',
      '1 Admin Kasir & 1 Owner per Outlet',
      'Hingga 500 Data Pelanggan',
      'Hingga 300 Nota Transaksi per Bulan',
      'Hingga 30 Jenis Layanan Cucian',
      'Cetak Struk Thermal Standar & Bagikan WhatsApp',
      'Pencatatan Buku Arus Kas Masuk & Keluar',
      'Fitur Staf & Laporan Pro Terkunci',
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
    maxCustomers: 5000,
    maxMonthlyTransactions: 1500,
    maxServices: 100,
    canAssignStaff: true,
    canExportExcel: true,
    canExportOfficialPdf: true,
    canViewComparisonGrowth: true,
    canUseCustomLogoOnReceipt: true,
    canUseSignatureOnReceipt: true,
    highlights: [
      'Dukungan Multi-Cabang (Hingga Maksimal 3 Cabang Outlet)',
      '1 Admin Kasir per Outlet (Maksimal 3 Admin untuk 3 Cabang)',
      'Pelanggan & Layanan Kapasitas Besar',
      'Kapasitas hingga 1.500 nota transaksi per bulan',
      'Penugasan Staf Pengerjaan Cucian (Cuci, Setrika, Packing)',
      'Ekspor Pembukuan Lengkap ke Excel Spreadsheet (.xlsx)',
      'Cetak Dokumen Laporan Keuangan Resmi A4 Siap Audit (.pdf)',
      'Grafik Analisis Komparasi Omzet & Laba (MoM & YoY)',
      'Kustomisasi Logo & Tanda Tangan Resmi di Struk Thermal',
    ],
  },
};

/**
 * Normalisasi string tier menjadi 'newcomer' | 'basic' | 'pro'
 */
export function normalizeTier(rawTier?: string | null): LaundryTier {
  if (!rawTier) return 'basic';
  const clean = rawTier.toLowerCase().trim();
  if (
    clean === 'newcomer' ||
    clean === 'pemula' ||
    clean === 'gratis' ||
    clean === 'free' ||
    clean === 'trial'
  ) {
    return 'newcomer';
  }
  if (clean === 'basic' || clean === 'standar') {
    return 'basic';
  }
  if (clean === 'pro' || clean === 'premium' || clean === 'ultimate') {
    return 'pro';
  }
  return 'newcomer';
}

/**
 * Mengambil konfigurasi limit paket aktif
 */
export function getLaundryLimits(rawTier?: string | null): LaundrySubscriptionLimits {
  const tier = normalizeTier(rawTier);
  return LAUNDRY_TIER_CONFIG[tier] || LAUNDRY_TIER_CONFIG.basic;
}

/**
 * Pengecekan apakah user berstatus Pro
 */
export function isProTier(rawTier?: string | null): boolean {
  return normalizeTier(rawTier) === 'pro';
}

/**
 * Pengecekan apakah user berstatus Newcomer (Gratis)
 */
export function isNewcomerTier(rawTier?: string | null): boolean {
  return normalizeTier(rawTier) === 'newcomer';
}

/**
 * Cek apakah user boleh menambah cabang baru
 */
export function canAddBranch(currentBranchCount: number, rawTier?: string | null): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  if (limits.tier === 'newcomer' && currentBranchCount >= 1) {
    return {
      allowed: false,
      reason: 'Paket Newcomer dibatasi maksimal 1 cabang outlet. Tingkatkan ke Paket Pro untuk mengelola hingga 3 cabang.',
    };
  }
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
 * Cek apakah outlet tertentu boleh menambah admin/kasir
 */
export function canAddCashierToBranch(
  branchId: string,
  staffList: { laundryId?: string | null; role: string }[],
  rawTier?: string | null
): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);

  if (limits.tier === 'newcomer' || limits.maxCashiers <= 0) {
    return {
      allowed: false,
      reason: 'Paket Newcomer (Gratis) hanya boleh 1 Owner dan tidak ada kasir. Operasional dikelola langsung oleh Owner. Tingkatkan ke Paket Basic atau Pro untuk membuat akun kasir.',
    };
  }
  
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

/**
 * Cek apakah boleh menambah pelanggan baru
 */
export function canAddCustomer(currentCustomerCount: number, rawTier?: string | null): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  if (currentCustomerCount >= limits.maxCustomers) {
    return {
      allowed: false,
      reason: limits.tier === 'newcomer'
        ? 'Batas maksimal 50 data pelanggan untuk Paket Newcomer (Gratis) telah tercapai. Tingkatkan ke Paket Basic atau Pro untuk menambah lebih banyak pelanggan.'
        : `Batas maksimal ${limits.maxCustomers} pelanggan telah tercapai untuk ${limits.label}.`,
    };
  }
  return { allowed: true };
}

/**
 * Cek apakah boleh menambah layanan baru
 */
export function canAddService(currentServiceCount: number, rawTier?: string | null): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  if (currentServiceCount >= limits.maxServices) {
    return {
      allowed: false,
      reason: limits.tier === 'newcomer'
        ? 'Paket Newcomer (Gratis) dibatasi maksimal 5 jenis layanan. Tingkatkan ke Paket Basic atau Pro untuk menambah jenis layanan lainnya.'
        : `Batas maksimal ${limits.maxServices} layanan telah tercapai untuk ${limits.label}.`,
    };
  }
  return { allowed: true };
}

/**
 * Cek apakah boleh membuat transaksi baru di bulan ini
 */
export function canAddMonthlyTransaction(monthlyTransactionCount: number, rawTier?: string | null): { allowed: boolean; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  if (monthlyTransactionCount >= limits.maxMonthlyTransactions) {
    return {
      allowed: false,
      reason: `Kuota ${limits.maxMonthlyTransactions} transaksi per bulan untuk ${limits.label} telah tercapai. Tingkatkan paket langganan untuk melanjutkan pembuatan nota baru.`,
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
