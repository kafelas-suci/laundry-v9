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
  address: 'Jl. Utama, Bandung',
  phoneNumber: '0812-3456-7890',
  footerStruk: 'Barang yang tidak diambil lebih dari 3 bulan akan disedekahkan.',
  chattyFooter: 'Terima kasih atas kepercayaan Anda!',
  useLogo: true,
  logoPath: '/logo-kafela.png',
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
  { id: 'lay-7', laundryId: 'lnd-1', nama: 'Cuci Selimut', harga: 10000, satuanHarga: 'pcs', durasi: '2 Hari', hitungBebanKerja: true, urutan: 6 },
  { id: 'lay-8', laundryId: 'lnd-1', nama: 'Cuci Boneka', harga: 15000, satuanHarga: 'pcs', durasi: '3 Hari', hitungBebanKerja: true, urutan: 7 },
  { id: 'lay-9', laundryId: 'lnd-1', nama: 'Cuci Jas / Blazer', harga: 25000, satuanHarga: 'pcs', durasi: '2 Hari', hitungBebanKerja: false, urutan: 8 },
  { id: 'lay-10', laundryId: 'lnd-1', nama: 'Stroller Bayi', harga: 75000, satuanHarga: 'pcs', durasi: '3 Hari', hitungBebanKerja: false, urutan: 9 },
];

// Master Jenis Pengeluaran
export const defaultJenisPengeluaran: JenisPengeluaran[] = [
  { id: 'jp-1', nama: 'Deterjen & Parfum Laundry', harga: 85000, laundryId: 'lnd-1' },
  { id: 'jp-2', nama: 'Plastik Packing & Kresek', harga: 35000, laundryId: 'lnd-1' },
  { id: 'jp-3', nama: 'Gas LPG 3kg Operasional', harga: 22000, laundryId: 'lnd-1' },
  { id: 'jp-4', nama: 'Listrik & Token PLN', harga: 100000, laundryId: 'lnd-1' },
  { id: 'jp-5', nama: 'Air Bersih / PDAM', harga: 75000, laundryId: 'lnd-1' },
  { id: 'jp-6', nama: 'Uang Makan Karyawan', harga: 25000, laundryId: 'lnd-1' },
];

// Master Jenis Pemasukan Manual
export const defaultJenisPemasukan: JenisPemasukan[] = [
  { id: 'jpm-1', nama: 'Setoran Tambah Modal Kas', harga: 200000, laundryId: 'lnd-1' },
  { id: 'jpm-2', nama: 'Penjualan Botol Parfum Retail', harga: 30000, laundryId: 'lnd-1' },
  { id: 'jpm-3', nama: 'Tip Pelanggan', harga: 10000, laundryId: 'lnd-1' },
  { id: 'jpm-4', nama: 'Pelunasan Bon Kasbon', harga: 50000, laundryId: 'lnd-1' },
];

// Initial Staff Users
export const defaultStaffList: User[] = [
  {
    uid: 'stf-1',
    emailOrPhone: 'iqbal@app.app',
    displayName: 'Iqbal Pratama',
    role: 'karyawan',
    laundryId: 'lnd-1',
    laundries: { 'lnd-1': 'Cabang Utama Melati' },
    walletBalance: 0,
  },
  {
    uid: 'stf-2',
    emailOrPhone: 'siti@app.app',
    displayName: 'Siti Rahma',
    role: 'karyawan',
    laundryId: 'lnd-1',
    laundries: { 'lnd-1': 'Cabang Utama Melati' },
    walletBalance: 0,
  },
  {
    uid: 'stf-3',
    emailOrPhone: 'budi@app.app',
    displayName: 'Budi Santoso',
    role: 'admin',
    laundryId: 'lnd-1',
    laundries: { 'lnd-1': 'Cabang Utama Melati' },
    walletBalance: 0,
  },
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
    namaLaundry: "Kafela's Laundry",
    alamat: 'Jl. Utama, Bandung',
    nomorTelepon: '081234567890',
  },
];

// Default Customers
export const defaultPelangganList: Pelanggan[] = [
  {
    id: 'pel-1',
    laundryId: 'lnd-1',
    nama: 'Bapak Hendra',
    nomorTelepon: '628122334455',
    alamat: 'Jl. Mawar No. 12',
    alamatLengkap: 'Komplek Mawar Indah Blok B2 No. 12',
    catatani: 'Pewangi ekstra wangi, jangan dijemur terik',
    poin: 2500,
  },
  {
    id: 'pel-2',
    laundryId: 'lnd-1',
    nama: 'Ibu Rina Sasmita',
    nomorTelepon: '6285890261536',
    alamat: 'Jl. Melati IV / 8',
    alamatLengkap: 'Perumahan Griya Melati Asri No. 8',
    catatani: 'Pisahkan pakaian warna putih',
    poin: 4200,
  },
  {
    id: 'pel-3',
    laundryId: 'lnd-1',
    nama: 'Kak Dimas Pratama',
    nomorTelepon: '628781234567',
    alamat: 'Kost Melati Kamar 4',
    alamatLengkap: 'Jl. Tubagus Ismail 7 Kost Melati No. 4',
    catatani: 'Lipat rapi masuk kantong plastik kecil',
    poin: 1100,
  },
  {
    id: 'pel-4',
    laundryId: 'lnd-1',
    nama: 'Ibu Hj. Faridah',
    nomorTelepon: '628198765432',
    alamat: 'Jl. Riau No. 88',
    alamatLengkap: 'Jl. LLRE Martadinata No. 88 Bandung',
    catatani: 'Langganan karpet & bedcover masjid',
    poin: 8500,
  },
];

// Helper to seed initial sample transactions
export function getInitialTransactions(): Transaksi[] {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const twoHours = 2 * 60 * 60 * 1000;

  return [
    {
      id: 'trx-1',
      laundryId: 'lnd-1',
      nomorTransaksi: '051026/1',
      namaPelanggan: 'Bapak Hendra',
      namaPelanggan_lowercase: 'bapak hendra',
      nomorTelepon: '628122334455',
      alamat: 'Jl. Mawar No. 12',
      totalHarga: 35000,
      jumlahDp: 35000,
      tanggalMasuk: now - twoHours * 3,
      tanggalSelesai: now + oneDay,
      status: 'Selesai',
      statusPembayaran: 'Lunas',
      catatan: 'Pewangi lavender, lipatan rapi',
      metodePembayaran: 'Tunai',
      dikerjakanOleh: 'Iqbal',
      tanggalStatusSelesai: now - twoHours,
      items: [
        {
          itemId: 1,
          laundryId: 'lnd-1',
          transaksiId: 'trx-1',
          namaLayanan: 'Cuci Setrika',
          berat: 5,
          hargaPerKg: 7000,
          hargaSatuan: 7000,
          satuan: 'Kg',
          subtotal: 35000,
        },
      ],
    },
    {
      id: 'trx-2',
      laundryId: 'lnd-1',
      nomorTransaksi: '051026/2',
      namaPelanggan: 'Ibu Rina Sasmita',
      namaPelanggan_lowercase: 'ibu rina sasmita',
      nomorTelepon: '6285890261536',
      alamat: 'Jl. Melati IV / 8',
      totalHarga: 48000,
      jumlahDp: 20000,
      tanggalMasuk: now - twoHours * 2,
      tanggalSelesai: now + oneDay * 2,
      status: 'Proses',
      statusPembayaran: 'Belum Lunas',
      catatan: 'Pisahkan baju bayi',
      metodePembayaran: 'Non-Tunai',
      metodePembayaranDetail: 'QRIS',
      dikerjakanOleh: 'Siti',
      items: [
        {
          itemId: 1,
          laundryId: 'lnd-1',
          transaksiId: 'trx-2',
          namaLayanan: 'Cuci Setrika',
          berat: 4,
          hargaPerKg: 7000,
          hargaSatuan: 7000,
          satuan: 'Kg',
          subtotal: 28000,
        },
        {
          itemId: 2,
          laundryId: 'lnd-1',
          transaksiId: 'trx-2',
          namaLayanan: 'Cuci Bedcover',
          berat: 1,
          hargaPerKg: 20000,
          hargaSatuan: 20000,
          satuan: 'pcs',
          subtotal: 20000,
        },
      ],
    },
    {
      id: 'trx-3',
      laundryId: 'lnd-1',
      nomorTransaksi: '051026/3',
      namaPelanggan: 'Kak Dimas Pratama',
      namaPelanggan_lowercase: 'kak dimas pratama',
      nomorTelepon: '628781234567',
      alamat: 'Kost Melati',
      totalHarga: 21000,
      jumlahDp: 0,
      tanggalMasuk: now - twoHours,
      tanggalSelesai: now + oneDay,
      status: 'Diterima',
      statusPembayaran: 'Belum Lunas',
      catatan: 'Express jika bisa',
      metodePembayaran: 'Tunai',
      items: [
        {
          itemId: 1,
          laundryId: 'lnd-1',
          transaksiId: 'trx-3',
          namaLayanan: 'Cuci Setrika',
          berat: 3,
          hargaPerKg: 7000,
          hargaSatuan: 7000,
          satuan: 'Kg',
          subtotal: 21000,
        },
      ],
    },
    {
      id: 'trx-4',
      laundryId: 'lnd-1',
      nomorTransaksi: '041026/1',
      namaPelanggan: 'Ibu Hj. Faridah',
      namaPelanggan_lowercase: 'ibu hj. faridah',
      nomorTelepon: '628198765432',
      alamat: 'Jl. Riau No. 88',
      totalHarga: 60000,
      jumlahDp: 60000,
      tanggalMasuk: now - oneDay,
      tanggalSelesai: now,
      status: 'Diambil',
      statusPembayaran: 'Lunas',
      tanggalPengambilan: now - twoHours * 4,
      catatan: 'Sudah diambil sopir',
      metodePembayaran: 'Non-Tunai',
      metodePembayaranDetail: 'BCA',
      dikerjakanOleh: 'Iqbal',
      tanggalStatusSelesai: now - twoHours * 6,
      items: [
        {
          itemId: 1,
          laundryId: 'lnd-1',
          transaksiId: 'trx-4',
          namaLayanan: 'Cuci Karpet',
          berat: 4,
          hargaPerKg: 15000,
          hargaSatuan: 15000,
          satuan: 'Meter',
          subtotal: 60000,
        },
      ],
    },
  ];
}

// Initial Sample Pengeluaran
export function getInitialPengeluaran(): Pengeluaran[] {
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;
  return [
    {
      id: 'pg-1',
      laundryId: 'lnd-1',
      tanggal: now - twoHours * 5,
      keterangan: 'Gas LPG 3kg Operasional',
      jumlah: 22000,
    },
    {
      id: 'pg-2',
      laundryId: 'lnd-1',
      tanggal: now - twoHours * 2,
      keterangan: 'Plastik Packing & Kresek',
      jumlah: 35000,
    },
  ];
}

export function getInitialSubscriptionHistory(): SubscriptionHistory[] {
  const now = Date.now();
  return [
    {
      id: 'sub-1',
      ownerId: 'own-1',
      purchaseDate: now - 30 * 24 * 60 * 60 * 1000,
      packageName: 'Premium Bulanan (2 Cabang)',
      cost: 47000,
      durationDays: 30,
      newExpiryDate: now + 28 * 24 * 60 * 60 * 1000,
      laundries: ['lnd-1', 'lnd-2'],
    },
  ];
}

// LocalStorage Helper wrapper
export class StorageService {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PREFIX + key);
      return data ? (JSON.parse(data) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn('Storage set error (mungkin kuota localStorage penuh):', e);
      // Jika key adalah transaksi dan memori penuh, simpan subset 60 transaksi terbaru saja di localStorage
      if (key === 'transaksi' && Array.isArray(value)) {
        try {
          const trimmed = (value as any[]).slice(0, 60);
          localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(trimmed));
        } catch {
          // Abaikan jika masih penuh, data utama tetap aman di IndexedDB
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
      localStorage.setItem(STORAGE_KEY_PREFIX + 'initialized_v2', 'true');
    } catch (e) {
      console.error('Clear dummy error:', e);
    }
  }

  static initData() {
    // If not initialized or previously had old dummy data, start fresh
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + 'initialized_v2')) {
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
      StorageService.set('initialized_v2', true);
    }
  }
}
