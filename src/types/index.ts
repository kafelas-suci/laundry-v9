export interface User {
  uid: string;
  emailOrPhone: string;
  username?: string;
  nomorTelepon?: string | null;
  role: 'owner' | 'admin' | 'karyawan';
  displayName: string;
  gajiTerakhir?: number | null;
  tanggalGajian?: number | null;
  bayarGajiOtomatis?: boolean;
  laundryId: string;
  laundries: Record<string, string>; // { [laundryId]: namaLaundry }
  walletBalance: number;
  subscriptionEndDate?: number | null;
  subscriptionType?: string | null;
  createdAt?: number | null;
  isOwnerAdmin?: boolean;
}

export interface Laundry {
  id: string;
  ownerId: string;
  namaLaundry: string;
  alamat?: string | null;
  nomorTelepon?: string | null;
}

export interface Layanan {
  id: string;
  userId?: string;
  laundryId: string;
  nama: string;
  harga: number;
  satuanHarga: string; // "Kg" | "Meter" | "pcs" | "Satuan"
  durasi: string; // e.g. "3 Hari", "1 Hari", "2 Jam"
  satuanDurasi?: string;
  hitungBebanKerja: boolean;
  urutan: number;
}

export interface LayananItem {
  itemId?: number;
  laundryId?: string;
  transaksiId?: string;
  namaLayanan: string;
  berat: number;
  hargaPerKg: number;
  hargaSatuan: number;
  satuan: string;
  subtotal: number;
}

export interface Transaksi {
  id: string;
  userId?: string;
  laundryId: string;
  nomorTransaksi?: string | null;
  namaPelanggan: string;
  namaPelanggan_lowercase?: string;
  nomorTelepon?: string | null;
  alamat?: string | null;
  totalHarga: number;
  jumlahDp: number;
  tanggalMasuk: number;
  tanggalSelesai?: number | null;
  status: 'Diterima' | 'Proses' | 'Selesai' | 'Diambil';
  statusPembayaran: 'Lunas' | 'Belum Lunas';
  tanggalPengambilan?: number | null;
  catatan?: string | null;
  metodePembayaran?: string | null; // "Tunai" | "Non-Tunai"
  metodePembayaranDetail?: string | null; // "QRIS" | "BCA" | "BRI" | "Mandiri" | "Lainnya"
  dikerjakanOleh?: string | null;
  tanggalDitugaskan?: number | null;
  tanggalStatusSelesai?: number | null;
  terakhirDieditPada?: number | null;
  isTransisi?: boolean;
  noNotaLama?: string;
  items: LayananItem[];
}

export interface TransaksiWithLayanan {
  transaksi: Transaksi;
  layananItems: LayananItem[];
}

export interface Pelanggan {
  id: string;
  userId?: string;
  laundryId: string;
  nama: string;
  nomorTelepon?: string | null;
  alamat?: string | null;
  alamatLengkap?: string | null;
  catatani?: string | null;
  poin: number;
}

export interface Pengeluaran {
  id: string;
  userId?: string;
  laundryId: string;
  tanggal: number;
  keterangan: string;
  jumlah: number;
}

export interface JenisPengeluaran {
  id: string;
  nama: string;
  harga: number;
  userId?: string;
  laundryId: string;
}

export interface JenisPemasukan {
  id: string;
  nama: string;
  harga: number;
  userId?: string;
  laundryId: string;
}

export interface SubscriptionHistory {
  id: string;
  ownerId: string;
  purchaseDate: number;
  packageName: string;
  cost: number;
  durationDays: number;
  newExpiryDate: number;
  laundries: string[];
}

export interface ArusKas {
  timestamp: number;
  keterangan: string;
  jumlahMasuk: number;
  jumlahKeluar: number;
  metodePembayaran?: string | null;
  infoLog?: string | null;
  logType?: 'MASUK' | 'DIAMBIL' | 'BIAYA' | 'KAS' | string | null;
  badgeText?: string | null;
  transaksiId?: string | null;
}

export interface DailySummary {
  id: string;
  transaksiMasuk: number;
  transaksiDiambil: number;
  totalPendapatan: number;
  transaksiSelesai: number;
  totalUangMasuk: number;
  totalPengeluaran: number;
  lastUpdated: number;
}

export interface SettingsData {
  appTitle: string;
  printerName: string;
  headerStruk: string;
  address: string;
  phoneNumber: string;
  footerStruk: string;
  chattyFooter: string;
  useLogo: boolean;
  logoPath: string | null;
  logoSize?: 'kecil' | 'sedang' | 'besar';
  estimasiDisplayMode: number; // 0 = per item, 1 = single line
  pengambilanTanpaSelesai: boolean;
  tampilkanTombolCetak: boolean;
  tampilkanRincianBayar: boolean;
  selesaikanSaatDitugaskan: boolean;
  poinSystemEnabled: boolean;
  rupiahPerPoin: number;
  nilaiTukarPoin: number;
  pemasukanManualEnabled: boolean;
  waNotificationEnabled: boolean;
  tampilkanTombolAmbilNotaLama?: boolean;
  hitungKerjaStaf?: boolean;
}

export interface OperationalStaff {
  id: string;
  laundryId: string;
  nama: string;
}
