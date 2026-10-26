export type LaundryTier = 'newcomer' | 'premium';

export interface LaundrySubscriptionLimits {
  tier: LaundryTier;
  label: string;
  tagline: string;
  badgeText: string;
  priceMonthly: number;
  maxBranches: number;            // 1 Cabang utama (bisa tambah Rp 25.000/cabang)
  pricePerExtraBranch?: number;   // Rp 25.000 per cabang tambahan
  maxCashiers: number;            // Newcomer: 0, Premium: 1
  maxAdminPerOutlet: number;      // 1
  maxOwnerPerOutlet: number;      // 1
  maxCustomers: number;           // Newcomer: 50, Premium: 1000
  maxMonthlyTransactions: number; // Newcomer: 50, Premium: 300
  maxServices: number;            // Newcomer: 5, Premium: 50
  canAssignStaff: boolean;        // Newcomer: false, Premium: true
  canExportExcel: boolean;        // Newcomer: false, Premium: true
  canExportOfficialPdf: boolean;  // Newcomer: false, Premium: true
  canViewComparisonGrowth: boolean;// Newcomer: false, Premium: true
  canUseCustomLogoOnReceipt: boolean; // Newcomer: false, Premium: true
  canUseSignatureOnReceipt: boolean;  // Newcomer: false, Premium: true
  highlights: string[];
}

export const EXTRA_BRANCH_PRICE = 25000;
export const HARGA_Premium_BULANAN = 27000;
export const HARGA_PREMIUM_BULANAN = 27000;

export const LAUNDRY_TIER_CONFIG: Record<LaundryTier | 'Premium', LaundrySubscriptionLimits> = {
  newcomer: {
    tier: 'newcomer',
    label: 'Paket Newcomer',
    tagline: 'Gratis selamanya tanpa batas hari untuk operasional awal UMKM (kuota 50 nota/bulan)',
    badgeText: 'Paket Newcomer',
    priceMonthly: 0,
    maxBranches: 1,
    pricePerExtraBranch: 25000,
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
    canUseCustomLogoOnReceipt: true,
    canUseSignatureOnReceipt: false,
    highlights: [
      'Gratis Selamanya (Rp 0 Tanpa Batas Hari)',
      'Aktif Otomatis Saat Pertama Kali Mendaftar',
      '1 Cabang Outlet & 1 Owner (Tanpa Kasir)',
      'Maksimal 50 Data Pelanggan Tersimpan',
      'Maksimal 50 Nota Transaksi per Bulan',
      'Maksimal 5 Jenis Layanan Cucian',
      'Cetak Struk Thermal Standar & Bagikan WhatsApp',
      'Tingkatkan ke Paket Premium saat Kuota Tercapai',
    ],
  },
  premium: {
    tier: 'premium',
    label: 'Paket Premium',
    tagline: 'Solusi handal lengkap operasional kasir, staf & pembukuan laporan',
    badgeText: 'Paket Premium',
    priceMonthly: 27000,
    maxBranches: 1,
    pricePerExtraBranch: 25000,
    maxCashiers: 1,
    maxAdminPerOutlet: 1,
    maxOwnerPerOutlet: 1,
    maxCustomers: 1000,
    maxMonthlyTransactions: 400,
    maxServices: 50,
    canAssignStaff: true,
    canExportExcel: true,
    canExportOfficialPdf: true,
    canViewComparisonGrowth: true,
    canUseCustomLogoOnReceipt: true,
    canUseSignatureOnReceipt: true,
    highlights: [
      '1 Cabang Outlet Utama (Bisa Tambah Cabang Rp 25.000/cabang)',
      '1 Admin Kasir & 1 Owner per Outlet',
      'Hingga 1.000 Data Pelanggan',
      'Hingga 300 Nota Transaksi per Bulan',
      'Hingga 50 Jenis Layanan Cucian',
      'Penugasan Staf Pengerjaan Cucian (Cuci, Setrika, Packing)',
      'Ekspor Pembukuan Lengkap ke Excel Spreadsheet (.xlsx)',
      'Cetak Dokumen Laporan Keuangan Resmi A4 Siap Audit (.pdf)',
      'Grafik Analisis Komparasi Pertumbuhan Omzet & Laba (MoM & YoY)',
      'Kustomisasi Logo Toko & Tanda Tangan Resmi di Struk Thermal',
    ],
  },
  // Backward-compatible alias untuk akses berhuruf besar
  Premium: {
    tier: 'premium',
    label: 'Paket Premium',
    tagline: 'Solusi handal lengkap operasional kasir, staf & pembukuan laporan',
    badgeText: 'Paket Premium',
    priceMonthly: 27000,
    maxBranches: 1,
    pricePerExtraBranch: 25000,
    maxCashiers: 1,
    maxAdminPerOutlet: 1,
    maxOwnerPerOutlet: 1,
    maxCustomers: 1000,
    maxMonthlyTransactions: 400,
    maxServices: 50,
    canAssignStaff: true,
    canExportExcel: true,
    canExportOfficialPdf: true,
    canViewComparisonGrowth: true,
    canUseCustomLogoOnReceipt: true,
    canUseSignatureOnReceipt: true,
    highlights: [
      '1 Cabang Outlet Utama (Bisa Tambah Cabang Rp 25.000/cabang)',
      '1 Admin Kasir & 1 Owner per Outlet',
      'Hingga 1.000 Data Pelanggan',
      'Hingga 300 Nota Transaksi per Bulan',
      'Hingga 50 Jenis Layanan Cucian',
      'Penugasan Staf Pengerjaan Cucian (Cuci, Setrika, Packing)',
      'Ekspor Pembukuan Lengkap ke Excel Spreadsheet (.xlsx)',
      'Cetak Dokumen Laporan Keuangan Resmi A4 Siap Audit (.pdf)',
      'Grafik Analisis Komparasi Pertumbuhan Omzet & Laba (MoM & YoY)',
      'Kustomisasi Logo Toko & Tanda Tangan Resmi di Struk Thermal',
    ],
  },
};

/**
 * Normalisasi string tier menjadi 'newcomer' | 'premium'
 * Akun baru tanpa riwayat paket otomatis mendapatkan 'newcomer' (Starter)
 */
export function normalizeTier(rawTier?: string | null): LaundryTier {
  if (!rawTier) return 'newcomer';
  const clean = rawTier.toLowerCase().trim();
  if (
    clean === 'newcomer' ||
    clean === 'pemula' ||
    clean === 'gratis' ||
    clean === 'free' ||
    clean === 'trial' ||
    clean === 'starter'
  ) {
    return 'newcomer';
  }
  return 'premium';
}

/**
 * Paket Newcomer adalah paket starter otomatis hanya saat akun baru.
 * Pengguna yang sudah aktif di Paket Premium tidak dapat memilih atau kembali ke Newcomer.
 */
export function canDowngradeToNewcomer(): boolean {
  return false;
}

/**
 * Mengambil konfigurasi limit paket aktif
 */
export function getLaundryLimits(rawTier?: string | null): LaundrySubscriptionLimits {
  const tier = normalizeTier(rawTier);
  return LAUNDRY_TIER_CONFIG[tier] || LAUNDRY_TIER_CONFIG.premium;
}

/**
 * Pengecekan apakah user berstatus Pro (Deprecated / Dinonaktifkan)
 */
export function isProTier(_rawTier?: string | null): boolean {
  return false;
}

/**
 * Pengecekan apakah user berstatus Newcomer (Gratis)
 */
export function isNewcomerTier(rawTier?: string | null): boolean {
  return normalizeTier(rawTier) === 'newcomer';
}

/**
 * Cek apakah user boleh menambah cabang baru (bisa menambah dengan membayar Rp 25.000 per cabang)
 */
export function canAddBranch(
  currentBranchCount: number,
  rawTier?: string | null
): { allowed: boolean; requiresPayment?: boolean; cost?: number; reason?: string } {
  const limits = getLaundryLimits(rawTier);
  const requiresPayment = currentBranchCount >= limits.maxBranches;
  return {
    allowed: true,
    requiresPayment,
    cost: EXTRA_BRANCH_PRICE,
    reason: requiresPayment
      ? `Cabang tambahan diaktifkan dengan biaya Rp ${EXTRA_BRANCH_PRICE.toLocaleString('id-ID')} per cabang.`
      : undefined,
  };
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
      reason: 'Paket Newcomer (Gratis) hanya boleh 1 Owner dan tidak ada kasir. Tingkatkan ke Paket Premium untuk membuat akun kasir.',
    };
  }

  // Per-outlet cashiers count: 1 admin per outlet
  const branchCashiers = staffList.filter(
    (s) => s.laundryId === branchId && (s.role === 'admin' || s.role === 'karyawan')
  );
  if (branchCashiers.length >= limits.maxAdminPerOutlet) {
    return {
      allowed: false,
      reason: 'Cabang outlet ini sudah memiliki 1 admin kasir. Sistem membatasi 1 admin & 1 owner per outlet untuk keamanan operasional.',
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
        ? 'Batas maksimal 50 data pelanggan untuk Paket Newcomer (Gratis) telah tercapai. Tingkatkan ke Paket Premium untuk kapasitas hingga 1.000 pelanggan.'
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
        ? 'Paket Newcomer (Gratis) dibatasi maksimal 5 jenis layanan. Tingkatkan ke Paket Premium untuk kapasitas hingga 50 jenis layanan.'
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
      reason: limits.tier === 'newcomer'
        ? `Batas kuota 50 nota transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai. Tingkatkan ke Paket Premium untuk kuota hingga 400 transaksi/bulan!`
        : `Kuota ${limits.maxMonthlyTransactions} transaksi per bulan untuk ${limits.label} telah tercapai. Silakan perpanjang atau kelola langganan untuk melanjutkan pembuatan nota baru.`,
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
  Premium: {
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
