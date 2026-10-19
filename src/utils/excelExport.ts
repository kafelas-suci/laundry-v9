import * as XLSX from 'xlsx';
import { Transaksi, Pengeluaran } from '../types';
import { formatReceiptDate } from './formatters';

export interface LaporanSummaryExportData {
  laundryName: string;
  periodeLabel: string;
  totalOmzet: number;
  totalUangMasuk: number;
  totalUangMasukTrx: number;
  totalPengeluaran: number;
  labaBersih: number;
  totalTrx: number;
  countLunas: number;
  countBelumLunas: number;
  uangMasukOrderBulanIni?: number;
  uangPelunasanBulanLalu?: number;
  totalPiutang?: number;
  pelunasanBulanLaluList?: {
    trx: Transaksi;
    pelunasan: number;
    waktuPelunasan: number;
  }[];
  comparison?: {
    prevPeriodeLabel: string;
    prevOmzet: number;
    prevUangMasuk: number;
    prevPengeluaran: number;
    prevLabaBersih: number;
    prevTrxCount: number;
    omzetGrowth: number;
    labaGrowth: number;
  };
  serviceList: [string, number][];
  customerList: [string, number][];
  expenseList: [string, number][];
  dailyRows: [string, { trxCount: number; masuk: number; keluar: number }][];
}

export function exportLaporanToExcel(
  summary: LaporanSummaryExportData,
  transaksiList: Transaksi[],
  pengeluaranList: Pengeluaran[]
): string {
  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: RINGKASAN EKSEKUTIF
  const summaryRows: (string | number)[][] = [
    ['LAPORAN KEUANGAN & OPERASIONAL LAUNDRY'],
    ['Nama Toko / Outlet:', summary.laundryName || 'Kafelas Laundry'],
    ['Periode:', summary.periodeLabel || 'Semua Periode'],
    ['Tanggal Unduh:', new Date().toLocaleString('id-ID')],
    ['Cut-off Waktu Ganti Hari:', '00:00:00 Tengah Malam (Waktu Lokal Perangkat)'],
    [],
    ['RINGKASAN UTAMA KEUANGAN', 'NOMINAL (RP)', 'KETERANGAN'],
    ['Total Pendapatan (Omzet)', Number(summary.totalOmzet || 0), 'Nilai kotor seluruh order masuk periode ini'],
    ['Total Uang Masuk Kasir (Arus Kas Riil)', Number(summary.totalUangMasuk || 0), 'Uang fisik & transfer yang riil diterima di kasir'],
    ['  - Dari Order Masuk Periode Ini', Number(summary.uangMasukOrderBulanIni ?? summary.totalUangMasukTrx ?? 0), 'Pembayaran awal/lunas dari order periode berjalan'],
    ['  - Dari Pelunasan Order Bulan Lalu', Number(summary.uangPelunasanBulanLalu || 0), 'Pelunasan piutang/pengambilan dari order periode sebelumnya'],
    ['Piutang Berjalan (Belum Lunas)', Number(summary.totalPiutang || 0), 'Tagihan pelanggan yang belum dilunasi'],
    ['Total Pengeluaran Operasional', Number(summary.totalPengeluaran || 0), 'Biaya operasional, listrik, deterjen, dll'],
    ['Laba Bersih', Number(summary.labaBersih || 0), 'Uang Masuk Kasir - Total Pengeluaran'],
    [],
    ['STATISTIK TRANSAKSI', 'JUMLAH', 'STATUS'],
    ['Total Order Cucian Masuk', Number(summary.totalTrx || 0), 'Nota'],
    ['Transaksi Lunas', Number(summary.countLunas || 0), 'Order berstatus lunas'],
    ['Transaksi Belum Lunas', Number(summary.countBelumLunas || 0), 'Menunggu pelunasan / DP'],
    ['Pelunasan Lintas Bulan Diterima', Number(summary.pelunasanBulanLaluList?.length || 0), 'Nota bulan lalu yang dilunasi periode ini'],
  ];

  if (summary.comparison) {
    summaryRows.push(
      [],
      ['ANALISIS KOMPARASI DENGAN PERIODE LALU', `Periode: ${summary.comparison.prevPeriodeLabel}`],
      ['Indikator', 'Periode Lalu (Rp)', 'Periode Ini (Rp)', 'Pertumbuhan (%)'],
      [
        'Omzet Pendapatan',
        Number(summary.comparison.prevOmzet || 0),
        Number(summary.totalOmzet || 0),
        `${(summary.comparison.omzetGrowth || 0).toFixed(1)}%`,
      ],
      [
        'Uang Masuk Kasir',
        Number(summary.comparison.prevUangMasuk || 0),
        Number(summary.totalUangMasuk || 0),
        '-',
      ],
      [
        'Pengeluaran Operasional',
        Number(summary.comparison.prevPengeluaran || 0),
        Number(summary.totalPengeluaran || 0),
        '-',
      ],
      [
        'Laba Bersih Usaha',
        Number(summary.comparison.prevLabaBersih || 0),
        Number(summary.labaBersih || 0),
        `${(summary.comparison.labaGrowth || 0).toFixed(1)}%`,
      ],
      [
        'Jumlah Order Cucian',
        Number(summary.comparison.prevTrxCount || 0),
        Number(summary.totalTrx || 0),
        '-',
      ]
    );
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 22 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

  // 2. SHEET 2: DAFTAR TRANSAKSI CUCIAN
  const trxHeaders = [
    'No. Nota / ID',
    'Tanggal Masuk',
    'Nama Pelanggan',
    'No. Telepon / WA',
    'Layanan & Rincian Item',
    'Total Tagihan (Rp)',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Status Cucian',
  ];

  const trxData = (transaksiList || []).map((t) => {
    const itemsDesc = (t.items || [])
      .map((it) => `${it.namaLayanan || 'Layanan'} (${it.berat} ${it.satuan || 'Kg'})`)
      .join(', ');

    return [
      t.nomorTransaksi || t.id || '-',
      formatReceiptDate(t.tanggalMasuk),
      t.namaPelanggan || '-',
      t.nomorTelepon || '-',
      itemsDesc || '-',
      Number(t.totalHarga || 0),
      t.statusPembayaran === 'Lunas' ? 'LUNAS' : 'BELUM LUNAS',
      t.metodePembayaran || 'Tunai',
      t.status || 'Diterima',
    ];
  });

  const wsTrx = XLSX.utils.aoa_to_sheet([trxHeaders, ...trxData]);
  wsTrx['!cols'] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 16 },
    { wch: 40 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTrx, 'Data Transaksi Cucian');

  // SHEET KHUSUS: PELUNASAN ORDER BULAN LALU (Uang kas masuk periode ini dari order masa lalu)
  if (summary.pelunasanBulanLaluList && summary.pelunasanBulanLaluList.length > 0) {
    const pelunasanHeaders = [
      'No. Nota / ID',
      'Tanggal Order Masuk',
      'Tanggal Pelunasan / Ambil',
      'Nama Pelanggan',
      'No. Telepon',
      'Total Nota Asli (Rp)',
      'Pelunasan Diterima (Rp)',
      'Metode Pembayaran',
      'Catatan / Keterangan',
    ];

    const pelunasanData = summary.pelunasanBulanLaluList.map(({ trx, pelunasan, waktuPelunasan }) => [
      trx.nomorTransaksi || trx.id || '-',
      formatReceiptDate(trx.tanggalMasuk),
      formatReceiptDate(waktuPelunasan),
      trx.namaPelanggan || '-',
      trx.nomorTelepon || '-',
      Number(trx.totalHarga || 0),
      Number(pelunasan || 0),
      trx.metodePembayaran || 'Tunai',
      trx.catatan || (trx.isTransisi ? 'Transisi Nota Lama' : 'Pelunasan piutang bulan lalu'),
    ]);

    const wsPelunasan = XLSX.utils.aoa_to_sheet([pelunasanHeaders, ...pelunasanData]);
    wsPelunasan['!cols'] = [
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
      { wch: 22 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 18 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPelunasan, 'Pelunasan Bulan Lalu');
  }

  // 3. SHEET 3: DAFTAR PENGELUARAN OPERASIONAL
  const expHeaders = ['Tanggal', 'Keterangan / Deskripsi Biaya', 'Nominal Biaya (Rp)'];
  const expData = (pengeluaranList || []).map((p) => [
    formatReceiptDate(p.tanggal),
    p.keterangan || '-',
    Number(p.jumlah || 0),
  ]);

  const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expData]);
  wsExp['!cols'] = [{ wch: 20 }, { wch: 35 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsExp, 'Data Pengeluaran');

  // 4. SHEET 4: REKAP LAYANAN & PELANGGAN
  const serviceHeader = ['Nama Layanan Cucian', 'Total Volume (Kg / Satuan)'];
  const serviceData = (summary.serviceList || []).map(([name, weight]) => [
    name,
    Number((weight || 0).toFixed(1)),
  ]);

  const wsServices = XLSX.utils.aoa_to_sheet([serviceHeader, ...serviceData]);
  wsServices['!cols'] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsServices, 'Rekap Layanan');

  // 5. SHEET 5: REKAP HARIAN (DAILY BREAKDOWN)
  const dailyHeader = [
    'Tanggal',
    'Jumlah Transaksi',
    'Uang Masuk (Rp)',
    'Pengeluaran (Rp)',
    'Laba Bersih Harian (Rp)',
  ];
  const dailyData = (summary.dailyRows || []).map(([dateKey, row]) => {
    const masuk = Number(row?.masuk || 0);
    const keluar = Number(row?.keluar || 0);
    const laba = masuk - keluar;
    return [dateKey, row?.trxCount || 0, masuk, keluar, laba];
  });

  const wsDaily = XLSX.utils.aoa_to_sheet([dailyHeader, ...dailyData]);
  wsDaily['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Rekap Harian');

  // Simpan dan unduh berkas Excel .xlsx dengan multi-tier fallback
  const safeName = (summary.laundryName || 'Kafelas_Laundry').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePeriod = (summary.periodeLabel || 'Semua_Periode').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_${safeName}_${safePeriod}.xlsx`;

  try {
    XLSX.writeFile(wb, fileName);
  } catch (errWrite) {
    console.warn('XLSX.writeFile() gagal, mencoba fallback Blob buffer:', errWrite);
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1500);
    } catch (errBlob) {
      console.error('Semua metode download Excel gagal:', errBlob);
      throw errBlob;
    }
  }

  return fileName;
}
