import {
  User,
  Laundry,
  Layanan,
  Transaksi,
  Pelanggan,
  Pengeluaran,
  ArusKas,
  SettingsData,
} from '../types';

export const demoOwnerUser: User = {
  uid: 'demo-owner-1',
  emailOrPhone: 'demo.owner@kafelas.com',
  displayName: 'Ibu Rahmawati (Owner)',
  nomorTelepon: '081234567890',
  role: 'owner',
  laundryId: 'demo-lnd-1',
  laundries: {
    'demo-lnd-1': 'Barokah Bersih Laundry (Pusat)',
    'demo-lnd-2': 'Barokah Express (Cabang Stasiun)',
  },
  walletBalance: 150000,
  subscriptionEndDate: Date.now() + 14 * 24 * 60 * 60 * 1000,
  subscriptionType: 'premium',
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
};

export const demoKasirUser: User = {
  uid: 'demo-kasir-1',
  emailOrPhone: 'kasir.budi@kafelas.com',
  displayName: 'Budi Santoso (Kasir)',
  nomorTelepon: '085712345678',
  role: 'admin',
  laundryId: 'demo-lnd-1',
  laundries: {
    'demo-lnd-1': 'Barokah Bersih Laundry (Pusat)',
  },
  walletBalance: 0,
  createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
};

export const demoLaundries: Laundry[] = [
  {
    id: 'demo-lnd-1',
    ownerId: 'demo-owner-1',
    namaLaundry: 'Barokah Bersih Laundry',
    alamat: 'Jl. Surya Kencana No. 45, Bandung',
    nomorTelepon: '0812-3456-7890',
  },
  {
    id: 'demo-lnd-2',
    ownerId: 'demo-owner-1',
    namaLaundry: 'Barokah Express (Cabang)',
    alamat: 'Ruko Metro Indah Blok B-12',
    nomorTelepon: '0813-9876-5432',
  },
];

export const demoSettings: SettingsData = {
  appTitle: 'Barokah Bersih Laundry',
  printerName: 'RPP02N',
  headerStruk: 'BAROKAH BERSIH LAUNDRY',
  address: 'Jl. Surya Kencana No. 45, Bandung',
  phoneNumber: '0812-3456-7890',
  footerStruk: 'Pakaian luntur/susut karena sifat bahan bukan tanggung jawab laundry. Barang tidak diambil >3 bulan disedekahkan.',
  chattyFooter: 'Terima kasih telah mempercayakan pakaian bersih & wangi kepada kami!',
  useLogo: true,
  logoPath: '/logo-kafela.png',
  logoSize: 'sedang',
  estimasiDisplayMode: 0,
  pengambilanTanpaSelesai: true,
  tampilkanTombolCetak: true,
  tampilkanRincianBayar: true,
  selesaikanSaatDitugaskan: false,
  poinSystemEnabled: false,
  rupiahPerPoin: 10,
  nilaiTukarPoin: 1,
  pemasukanManualEnabled: true,
  waNotificationEnabled: true,
  tampilkanTombolAmbilNotaLama: true,

};

export const demoLayananList: Layanan[] = [
  { id: 'dlay-1', laundryId: 'demo-lnd-1', nama: 'Cuci Setrika Reguler', harga: 7000, satuanHarga: 'Kg', durasi: '2 Hari', hitungBebanKerja: true, urutan: 0 },
  { id: 'dlay-2', laundryId: 'demo-lnd-1', nama: 'Cuci Kering Lipat', harga: 5000, satuanHarga: 'Kg', durasi: '1 Hari', hitungBebanKerja: true, urutan: 1 },
  { id: 'dlay-3', laundryId: 'demo-lnd-1', nama: 'Setrika Uap Saja', harga: 4000, satuanHarga: 'Kg', durasi: '1 Hari', hitungBebanKerja: true, urutan: 2 },
  { id: 'dlay-4', laundryId: 'demo-lnd-1', nama: 'Cuci Express (Kilat 4 Jam)', harga: 12000, satuanHarga: 'Kg', durasi: '4 Jam', hitungBebanKerja: true, urutan: 3 },
  { id: 'dlay-5', laundryId: 'demo-lnd-1', nama: 'Bed Cover King / Tebal', harga: 25000, satuanHarga: 'pcs', durasi: '2 Hari', hitungBebanKerja: true, urutan: 4 },
  { id: 'dlay-6', laundryId: 'demo-lnd-1', nama: 'Selimut Bulu Lembut', harga: 15000, satuanHarga: 'pcs', durasi: '2 Hari', hitungBebanKerja: true, urutan: 5 },
  { id: 'dlay-7', laundryId: 'demo-lnd-1', nama: 'Jas / Safari (Satuan)', harga: 30000, satuanHarga: 'pcs', durasi: '2 Hari', hitungBebanKerja: false, urutan: 6 },
  { id: 'dlay-8', laundryId: 'demo-lnd-1', nama: 'Karpet Tebal Permadani', harga: 15000, satuanHarga: 'Meter', durasi: '3 Hari', hitungBebanKerja: true, urutan: 7 },
];

export const demoPelangganList: Pelanggan[] = [
  { id: 'dpel-1', laundryId: 'demo-lnd-1', nama: 'Ibu Ratna Kumala', nomorTelepon: '081234567801', alamat: 'Perum Kencana Asri Blok C-10', poin: 0 },
  { id: 'dpel-2', laundryId: 'demo-lnd-1', nama: 'Pak Hendra Wijaya', nomorTelepon: '085798765402', alamat: 'Jl. Anggrek No. 22', poin: 0 },
  { id: 'dpel-3', laundryId: 'demo-lnd-1', nama: 'Kak Dimas Pratama', nomorTelepon: '087811223303', alamat: 'Kost Melati Kamar 07', poin: 0 },
  { id: 'dpel-4', laundryId: 'demo-lnd-1', nama: 'Ibu Hj. Faridah', nomorTelepon: '081987654304', alamat: 'Jl. Riau No. 88', poin: 0 },
  { id: 'dpel-5', laundryId: 'demo-lnd-1', nama: 'Dokter Anisa S.', nomorTelepon: '081322334405', alamat: 'Klinik Sehat Bandung', poin: 0 },
];

export function getDemoTransaksiList(): Transaksi[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  return [
    {
      id: 'dtrx-1',
      laundryId: 'demo-lnd-1',
      nomorTransaksi: '01/KFLS',
      namaPelanggan: 'Ibu Ratna Kumala',
      namaPelanggan_lowercase: 'ibu ratna kumala',
      nomorTelepon: '081234567801',
      alamat: 'Perum Kencana Asri Blok C-10',
      totalHarga: 28000,
      jumlahDp: 0,
      tanggalMasuk: now - 3 * hour,
      tanggalSelesai: now + 1.5 * day,
      status: 'Diterima',
      statusPembayaran: 'Belum Lunas',
      metodePembayaran: 'Tunai',
      catatan: 'Pisahkan kemeja putih',
      items: [
        {
          itemId: 1,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-1',
          namaLayanan: 'Cuci Setrika Reguler',
          berat: 4,
          hargaPerKg: 7000,
          hargaSatuan: 7000,
          satuan: 'Kg',
          subtotal: 28000,
        },
      ],
    },
    {
      id: 'dtrx-2',
      laundryId: 'demo-lnd-1',
      nomorTransaksi: '02/KFLS',
      namaPelanggan: 'Pak Hendra Wijaya',
      namaPelanggan_lowercase: 'pak hendra wijaya',
      nomorTelepon: '085798765402',
      alamat: 'Jl. Anggrek No. 22',
      totalHarga: 36000,
      jumlahDp: 20000,
      tanggalMasuk: now - 5 * hour,
      tanggalSelesai: now + 4 * hour,
      status: 'Proses',
      statusPembayaran: 'Belum Lunas',
      metodePembayaran: 'Non-Tunai',
      metodePembayaranDetail: 'QRIS',
      dikerjakanOleh: 'Budi Santoso',
      catatan: 'Wangi lavender kuat',
      items: [
        {
          itemId: 1,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-2',
          namaLayanan: 'Cuci Express (Kilat 4 Jam)',
          berat: 3,
          hargaPerKg: 12000,
          hargaSatuan: 12000,
          satuan: 'Kg',
          subtotal: 36000,
        },
      ],
    },
    {
      id: 'dtrx-3',
      laundryId: 'demo-lnd-1',
      nomorTransaksi: '03/KFLS',
      namaPelanggan: 'Kak Dimas Pratama',
      namaPelanggan_lowercase: 'kak dimas pratama',
      nomorTelepon: '087811223303',
      alamat: 'Kost Melati Kamar 07',
      totalHarga: 50000,
      jumlahDp: 50000,
      tanggalMasuk: now - 1 * day,
      tanggalSelesai: now - 2 * hour,
      tanggalStatusSelesai: now - 1 * hour,
      status: 'Selesai',
      statusPembayaran: 'Lunas',
      metodePembayaran: 'Non-Tunai',
      metodePembayaranDetail: 'Transfer BCA',
      dikerjakanOleh: 'Siti Rahma',
      catatan: 'Siap diambil sore ini',
      items: [
        {
          itemId: 1,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-3',
          namaLayanan: 'Bed Cover King / Tebal',
          berat: 2,
          hargaPerKg: 25000,
          hargaSatuan: 25000,
          satuan: 'pcs',
          subtotal: 50000,
        },
      ],
    },
    {
      id: 'dtrx-4',
      laundryId: 'demo-lnd-1',
      nomorTransaksi: '04/KFLS',
      namaPelanggan: 'Dokter Anisa S.',
      namaPelanggan_lowercase: 'dokter anisa s.',
      nomorTelepon: '081322334405',
      alamat: 'Klinik Sehat Bandung',
      totalHarga: 45000,
      jumlahDp: 45000,
      tanggalMasuk: now - 2 * hour,
      tanggalSelesai: now + 2 * day,
      status: 'Diterima',
      statusPembayaran: 'Lunas',
      metodePembayaran: 'Non-Tunai',
      metodePembayaranDetail: 'QRIS',
      catatan: 'Jas lab + kemeja dinas',
      items: [
        {
          itemId: 1,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-4',
          namaLayanan: 'Jas / Safari (Satuan)',
          berat: 1,
          hargaPerKg: 30000,
          hargaSatuan: 30000,
          satuan: 'pcs',
          subtotal: 30000,
        },
        {
          itemId: 2,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-4',
          namaLayanan: 'Selimut Bulu Lembut',
          berat: 1,
          hargaPerKg: 15000,
          hargaSatuan: 15000,
          satuan: 'pcs',
          subtotal: 15000,
        },
      ],
    },
    {
      id: 'dtrx-5',
      laundryId: 'demo-lnd-1',
      nomorTransaksi: '05/KFLS',
      namaPelanggan: 'Ibu Hj. Faridah',
      namaPelanggan_lowercase: 'ibu hj. faridah',
      nomorTelepon: '081987654304',
      alamat: 'Jl. Riau No. 88',
      totalHarga: 60000,
      jumlahDp: 60000,
      tanggalMasuk: now - 1.5 * day,
      tanggalSelesai: now - 4 * hour,
      status: 'Diambil',
      statusPembayaran: 'Lunas',
      tanggalPengambilan: now - 2 * hour,
      metodePembayaran: 'Tunai',
      dikerjakanOleh: 'Iqbal Pratama',
      catatan: 'Sudah diantar kurir ke rumah',
      items: [
        {
          itemId: 1,
          laundryId: 'demo-lnd-1',
          transaksiId: 'dtrx-5',
          namaLayanan: 'Karpet Tebal Permadani',
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

export function getDemoPengeluaranList(): Pengeluaran[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      id: 'dpg-1',
      laundryId: 'demo-lnd-1',
      tanggal: now - 4 * hour,
      keterangan: 'Refill Parfum Laundry Sakura 5L',
      jumlah: 85000,
    },
    {
      id: 'dpg-2',
      laundryId: 'demo-lnd-1',
      tanggal: now - 2 * hour,
      keterangan: 'Plastik Jinjing & Sealer 3 Roll',
      jumlah: 32000,
    },
  ];
}

export function getDemoManualCashLogs(): ArusKas[] {
  const now = Date.now();
  const hour = 60 * 60 * 1000;

  return [
    {
      timestamp: now - 6 * hour,
      keterangan: 'Tambah Modal Awal Kasir Pagi',
      jumlahMasuk: 100000,
      jumlahKeluar: 0,
      metodePembayaran: 'Tunai',
    },
    {
      timestamp: now - 1 * hour,
      keterangan: 'Penjualan Parfum Botol 250ml',
      jumlahMasuk: 30000,
      jumlahKeluar: 0,
      metodePembayaran: 'Tunai',
    },
  ];
}
