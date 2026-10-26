import {
  User,
  Laundry,
  Layanan,
  Transaksi,
  Pelanggan,
  Pengeluaran,
  JenisPengeluaran,
  JenisPemasukan,
  SettingsData,
  SubscriptionHistory,
} from '../types';

const STORAGE_KEY_PREFIX = 'laundry_suci_';

// Initial default settings matching SettingsManager.kt
export const defaultSettings: SettingsData = {
  appTitle: "Kafela's Laundry",
  printerName: 'RPP02N',
  headerStruk: "Kafela's Laundry",
  address: '',
  phoneNumber: '',
  footerStruk: 'Barang yang tidak diambil lebih dari 3 bulan akan disedekahkan.',
  chattyFooter: 'Terima kasih atas kepercayaan Anda!',
  useLogo: false,
  logoPath: null,
  logoSize: 'sedang',
  estimasiDisplayMode: 0, // 0 = per item, 1 = single line
  pengambilanTanpaSelesai: true,
  tampilkanTombolCetak: true,
  tampilkanRincianBayar: true,
  selesaikanSaatDitugaskan: true,
  poinSystemEnabled: false,
  rupiahPerPoin: 10,
  nilaiTukarPoin: 1,
  pemasukanManualEnabled: true,
  waNotificationEnabled: true,
  tampilkanTombolAmbilNotaLama: true,
  hitungKerjaStaf: true,
};

// Default Services matching SignUpActivity.kt
export const defaultLayananList: Layanan[] = [
  { id: 'lay-1', laundryId: 'lnd-1', nama: 'Cuci Setrika', harga: 7000, satuanHarga: 'Kg', durasi: '3 Hari', hitungBebanKerja: true, urutan: 0 },
  { id: 'lay-2', laundryId: 'lnd-1', nama: 'Cuci Kering Saja', harga: 5000, satuanHarga: 'Kg', durasi: '2 Hari', hitungBebanKerja: true, urutan: 1 },
  { id: 'lay-3', laundryId: 'lnd-1', nama: 'Setrika Saja', harga: 4000, satuanHarga: 'Kg', durasi: '1 Hari', hitungBebanKerja: true, urutan: 2 },
  { id: 'lay-4', laundryId: 'lnd-1', nama: 'Cuci Express (1 Hari)', harga: 10000, satuanHarga: 'Kg', durasi: '1 Hari', hitungBebanKerja: true, urutan: 3 },
  { id: 'lay-5', laundryId: 'lnd-1', nama: 'Cuci Karpet', harga: 15000, satuanHarga: 'Meter', durasi: '3 Hari', hitungBebanKerja: true, urutan: 4 },
  { id: 'lay-6', laundryId: 'lnd-1', nama: 'Cuci Bedcover', harga: 20000, satuanHarga: 'pcs', durasi: '3 Hari', hitungBebanKerja: true, urutan: 5 },
];

// Master Jenis Pengeluaran
export const defaultJenisPengeluaran: JenisPengeluaran[] = [
  { id: 'jp-1', nama: 'Deterjen & Parfum', harga: 85000, laundryId: 'lnd-1' },
  { id: 'jp-2', nama: 'Plastik', harga: 35000, laundryId: 'lnd-1' },
  { id: 'jp-3', nama: 'Gas', harga: 22000, laundryId: 'lnd-1' },
  { id: 'jp-4', nama: 'Listrik', harga: 100000, laundryId: 'lnd-1' },
];

// Master Jenis Pemasukan Manual
export const defaultJenisPemasukan: JenisPemasukan[] = [
  { id: 'jpm-3', nama: 'Tip Pelanggan', harga: 10000, laundryId: 'lnd-1' },
  { id: 'jpm-4', nama: 'Pelunasan Bon Kasbon', harga: 50000, laundryId: 'lnd-1' },
];

export const defaultOwnerUser: User = {
  uid: 'own-1',
  emailOrPhone: 'owner@laundry.com',
  displayName: "Kafela's Laundry",
  nomorTelepon: '081234567890',
  role: 'owner',
  laundryId: 'lnd-1',
  laundries: {
    'lnd-1': "Kafela's Laundry",
  },
  walletBalance: 0,
  subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  subscriptionType: 'premium',
  createdAt: Date.now(),
};

export const defaultLaundries: Laundry[] = [
  {
    id: 'lnd-1',
    ownerId: 'own-1',
    namaLaundry: "-",
    alamat: '-',
    nomorTelepon: '-',
  },
];

// Default Customers (Empty as requested)
export const defaultPelangganList: Pelanggan[] = [];

// Helper to seed initial sample transactions (Empty as requested)
export function getInitialTransactions(): Transaksi[] {
  return [];
}

// Initial Sample Pengeluaran (Empty as requested)
export function getInitialPengeluaran(): Pengeluaran[] {
  return [];
}

export function getInitialSubscriptionHistory(): SubscriptionHistory[] {
  return [];
}

// LocalStorage Helper wrapper
export class StorageService {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      if (!data) return defaultValue;
      const parsed = JSON.parse(data);

      if (key === 'laundries' && Array.isArray(parsed)) {
        return parsed.map((l: any) => {
          let name = l?.namaLaundry;
          while (typeof name === 'object' && name !== null) {
            name = name.namaLaundry || name.name || "Kafela's Laundry";
          }
          return {
            ...l,
            namaLaundry: typeof name === 'string' && name.trim() ? name : "Kafela's Laundry",
            alamat: typeof l?.alamat === 'string' ? l.alamat : '',
            nomorTelepon: typeof l?.nomorTelepon === 'string' ? l.nomorTelepon : '',
          };
        }) as T;
      }

      if (key === 'active_user' && parsed && typeof parsed === 'object') {
        let name = (parsed as any).displayName;
        while (typeof name === 'object' && name !== null) {
          name = name.namaLaundry || name.displayName || name.name || 'Owner';
        }
        return {
          ...parsed,
          displayName: typeof name === 'string' && name.trim() ? name : 'Owner',
        } as T;
      }

      if (key === 'settings' && parsed && typeof parsed === 'object') {
        let header = (parsed as any).headerStruk;
        while (typeof header === 'object' && header !== null) {
          header = header.namaLaundry || header.headerStruk || "Kafela's Laundry";
        }
        const hasCustomized = Boolean(localStorage.getItem(STORAGE_KEY_PREFIX + 'has_customized_settings'));
        const rawLogoPath = typeof (parsed as any).logoPath === 'string' ? (parsed as any).logoPath.trim() : null;
        const cleanLogoPath =
          !hasCustomized && rawLogoPath === '/logo-kafela.png' ? null : (rawLogoPath || null);
        return {
          ...parsed,
          headerStruk: typeof header === 'string' && header.trim() ? header : "Kafela's Laundry",
          logoPath: cleanLogoPath,
          useLogo: Boolean((parsed as any).useLogo && cleanLogoPath),
        } as T;
      }

      return parsed as T;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set error (mungkin kuota localStorage penuh):', e);
      if (key === 'transaksi' && Array.isArray(value)) {
        try {
          const trimmed = (value as any[]).slice(0, 60);
          localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(trimmed));
        } catch {
          // Abaikan jika masih penuh
        }
      }
    }
  }

  static clearAllDummyData() {
    try {
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'transaksi');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'pelanggan');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'pengeluaran');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'staff');
      localStorage.removeItem(STORAGE_KEY_PREFIX + 'manual_cash_logs');
      localStorage.setItem(STORAGE_KEY_PREFIX + 'transaksi', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'pelanggan', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'pengeluaran', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'staff', JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'laundries', JSON.stringify(defaultLaundries));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'settings', JSON.stringify(defaultSettings));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'initialized_v3', 'true');
    } catch (e) {
      console.error('Clear dummy error:', e);
    }
  }

  static initData() {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'initialized_v3')) {
      StorageService.set('settings', defaultSettings);
      StorageService.set('layanan', defaultLayananList);
      StorageService.set('jenis_pengeluaran', defaultJenisPengeluaran);
      StorageService.set('jenis_pemasukan', defaultJenisPemasukan);
      StorageService.set('pelanggan', []);
      StorageService.set('staff', []);
      StorageService.set('owner', defaultOwnerUser);
      StorageService.set('laundries', defaultLaundries);
      StorageService.set('current_laundry_id', 'lnd-1');
      StorageService.set('transaksi', []);
      StorageService.set('pengeluaran', []);
      StorageService.set('manual_cash_logs', []);
      StorageService.set('subscription_history', []);
      StorageService.set('initialized_v3', true);
    }
  }
}
