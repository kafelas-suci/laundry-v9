import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, DollarSign, Activity, FileText, CheckCircle2, PackageCheck, AlertCircle } from 'lucide-react';
import { Transaksi, Pengeluaran, ArusKas } from '../types';
import { formatRupiah, formatShortTime, formatDateIndo } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';

interface BukuKasViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  manualCashLogs: ArusKas[];
  activeLaundryId: string;
  onOpenDetailTransaksi: (transaksiId: string) => void;
}

export type LedgerFilter = 'semua' | 'masuk' | 'diambil' | 'biaya' | 'ada_uang';

export const BukuKasView: React.FC<BukuKasViewProps> = ({
  onBack,
  transaksiList,
  pengeluaranList,
  manualCashLogs,
  activeLaundryId,
  onOpenDetailTransaksi,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<LedgerFilter>('semua');
  const [monthArchive, setMonthArchive] = useState<Transaksi[]>([]);

  useEffect(() => {
    let isMounted = true;
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    FirebaseSyncService.fetchArsipBulan(activeLaundryId, year, month)
      .then((list) => {
        if (isMounted) setMonthArchive(list);
      })
      .catch(console.warn);
    return () => {
      isMounted = false;
    };
  }, [activeLaundryId, selectedDate]);

  const startOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [selectedDate]);

  const endOfDay = useMemo(() => {
    const d = new Date(selectedDate);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, [selectedDate]);

  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  // Compile unified Cash Book & Activity entries for the selected day
  const { arusKasItems, totals } = useMemo(() => {
    const items: ArusKas[] = [];
    let totalMasuk = 0;
    let totalKeluar = 0;
    let totalPiutang = 0;
    let countMasuk = 0;
    let countDiambil = 0;
    let countKeluar = 0;

    const map = new Map<string, Transaksi>();
    transaksiList.forEach((t) => map.set(t.id, t));
    monthArchive.forEach((t) => map.set(t.id, t));
    const branchTrx = Array.from(map.values()).filter((t) => t.laundryId === activeLaundryId);

    // 1. Transactions entered on this day (Uang masuk riil HANYA dari DP / bayar lunas saat daftar)
    branchTrx.forEach((trx) => {
      if (trx.tanggalMasuk >= startOfDay && trx.tanggalMasuk <= endOfDay) {
        countMasuk++;
        const dp = trx.jumlahDp || 0;
        const total = trx.totalHarga || 0;
        const sisa = Math.max(0, total - dp);

        // Piutang bertambah hanya jika saat ini statusnya belum lunas
        if (trx.statusPembayaran !== 'Lunas') {
          totalPiutang += sisa;
        }

        // Uang masuk riil saat pendaftaran HANYALAH DP (atau lunas di awal jika DP >= total)
        const bayarAwal = Math.min(total, dp);

        if (bayarAwal >= total && total > 0) {
          // Lunas langsung di awal saat baju masuk
          totalMasuk += bayarAwal;
          items.push({
            timestamp: trx.tanggalMasuk,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Lunas di Awal`,
            jumlahMasuk: bayarAwal,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'MASUK',
            badgeText: '📥 MASUK • LUNAS DI AWAL',
            infoLog: trx.nomorTransaksi || undefined,
          });
        } else if (bayarAwal > 0) {
          // Hanya bayar DP di awal saat baju masuk
          totalMasuk += bayarAwal;
          items.push({
            timestamp: trx.tanggalMasuk,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • DP Rp ${bayarAwal.toLocaleString('id-ID')}`,
            jumlahMasuk: bayarAwal,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'MASUK',
            badgeText: '📥 MASUK • DP AWAL',
            infoLog: trx.nomorTransaksi || undefined,
          });
        } else {
          // Belum bayar sama sekali saat masuk (DP = 0).
          // UANG MASUK TETAP RP 0 WALAUPUN NANTI DI KEMUDIAN HARI SUDAH LUNAS SAAT DIAMBIL!
          items.push({
            timestamp: trx.tanggalMasuk,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Bayar Nanti (Tagihan: Rp ${total.toLocaleString('id-ID')})`,
            jumlahMasuk: 0,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'MASUK',
            badgeText: '📥 MASUK • BELUM BAYAR (RP 0)',
            infoLog: trx.nomorTransaksi || undefined,
          });
        }
      }

      // 2. Transactions collected on this day (Uang masuk riil HANYA dari pelunasan sisa)
      if (
        trx.tanggalPengambilan &&
        trx.tanggalPengambilan >= startOfDay &&
        trx.tanggalPengambilan <= endOfDay
      ) {
        countDiambil++;
        const dp = trx.jumlahDp || 0;
        const total = trx.totalHarga || 0;
        // Pelunasan saat diambil HANYA jika status saat ini Lunas dan total > dp
        const pelunasan = trx.statusPembayaran === 'Lunas' ? Math.max(0, total - dp) : 0;

        if (pelunasan > 0) {
          // Pelanggan membayar sisa tagihan saat mengambil cucian
          totalMasuk += pelunasan;
          items.push({
            timestamp: trx.tanggalPengambilan,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Pelunasan Sisa`,
            jumlahMasuk: pelunasan,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'DIAMBIL',
            badgeText: '📦 DIAMBIL • PELUNASAN',
            infoLog: trx.nomorTransaksi || undefined,
          });
        } else if (trx.statusPembayaran === 'Lunas') {
          // Sudah lunas di awal saat masuk, uang masuk saat diambil = 0 (TIDAK DOBEL!)
          items.push({
            timestamp: trx.tanggalPengambilan,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Sudah Lunas di Awal`,
            jumlahMasuk: 0,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'DIAMBIL',
            badgeText: '📦 DIAMBIL • SUDAH LUNAS (RP 0)',
            infoLog: trx.nomorTransaksi || undefined,
          });
        } else {
          // Diambil tapi belum lunas (kasbon/diambil dulu)
          items.push({
            timestamp: trx.tanggalPengambilan,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Diambil Belum Lunas`,
            jumlahMasuk: 0,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran,
            transaksiId: trx.id,
            logType: 'DIAMBIL',
            badgeText: '📦 DIAMBIL • BELUM LUNAS (RP 0)',
            infoLog: trx.nomorTransaksi || undefined,
          });
        }
      }
    });

    // 3. Operational expenses on this day
    pengeluaranList
      .filter((p) => p.laundryId === activeLaundryId && p.tanggal >= startOfDay && p.tanggal <= endOfDay)
      .forEach((p) => {
        countKeluar++;
        totalKeluar += p.jumlah;
        items.push({
          timestamp: p.tanggal,
          keterangan: p.keterangan,
          jumlahMasuk: 0,
          jumlahKeluar: p.jumlah,
          logType: 'BIAYA',
        });
      });

    // 4. Manual cash logs (from catat kas)
    manualCashLogs
      .filter((m) => m.timestamp >= startOfDay && m.timestamp <= endOfDay)
      .forEach((m) => {
        totalMasuk += m.jumlahMasuk;
        totalKeluar += m.jumlahKeluar;
        items.push({
          ...m,
          logType: 'KAS',
        });
      });

    // Sort by timestamp descending (newest on top)
    items.sort((a, b) => b.timestamp - a.timestamp);

    return {
      arusKasItems: items,
      totals: {
        totalMasuk,
        totalKeluar,
        labaBersih: totalMasuk - totalKeluar,
        totalPiutang,
        countMasuk,
        countDiambil,
        countKeluar,
      },
    };
  }, [transaksiList, pengeluaranList, manualCashLogs, activeLaundryId, startOfDay, endOfDay]);

  // Unified Filter handling
  const displayedRows = useMemo(() => {
    switch (filterType) {
      case 'masuk':
        return arusKasItems.filter((i) => i.logType === 'MASUK');
      case 'diambil':
        return arusKasItems.filter((i) => i.logType === 'DIAMBIL');
      case 'biaya':
        return arusKasItems.filter((i) => i.logType === 'BIAYA');
      case 'ada_uang':
        return arusKasItems.filter((i) => i.jumlahMasuk > 0 || i.jumlahKeluar > 0);
      default:
        return arusKasItems;
    }
  }, [arusKasItems, filterType]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="font-bold text-base tracking-wide leading-tight">Buku Kas & Aktivitas Harian</h1>
          <p className="text-[10px] text-white/80">Pencatatan kas dan riwayat serah-terima cucian terpadu</p>
        </div>
      </header>

      {/* Date Navigation Bar */}
      <div className="bg-[#800000] text-white px-4 pb-3 flex items-center justify-between">
        <button onClick={handlePrevDay} className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-wide">
            {formatDateIndo(selectedDate.getTime())}
          </span>
        </div>
        <button onClick={handleNextDay} className="p-1.5 rounded-full hover:bg-white/15 transition cursor-pointer">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        {/* Financial Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3">
          {/* Mini counts */}
          <div className="flex justify-around text-center text-xs text-slate-600 border-b border-slate-100 pb-2">
            <div>
              <span className="text-slate-400 block text-[10px]">📥 Cucian Masuk</span>
              <strong className="text-slate-800 font-bold">{totals.countMasuk} Nota</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">📦 Cucian Diambil</span>
              <strong className="text-slate-800 font-bold">{totals.countDiambil} Nota</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">💸 Biaya Operasional</span>
              <strong className="text-slate-800 font-bold">{totals.countKeluar} Catatan</strong>
            </div>
          </div>

          {/* 4 Financial Metric Columns */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800">
              <span className="block text-[10px] text-emerald-600 font-semibold">Kas Masuk</span>
              <span className="text-xs font-black">{formatRupiah(totals.totalMasuk).replace('Rp ', '')}</span>
            </div>
            <div className="p-2 rounded-xl bg-red-50 text-red-800">
              <span className="block text-[10px] text-red-600 font-semibold">Kas Keluar</span>
              <span className="text-xs font-black">{formatRupiah(totals.totalKeluar).replace('Rp ', '')}</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-800">
              <span className="block text-[10px] text-slate-500 font-semibold">Laba Bersih</span>
              <span className={`text-xs font-black ${totals.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {formatRupiah(totals.labaBersih).replace('Rp ', '')}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
              <span className="block text-[10px] text-amber-600 font-semibold">Sisa Piutang</span>
              <span className="text-xs font-black">{formatRupiah(totals.totalPiutang).replace('Rp ', '')}</span>
            </div>
          </div>
        </div>

        {/* Filter Pills: Terpadu & Fleksibel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterType('semua')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer ${
              filterType === 'semua'
                ? 'bg-[#800000] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Semua ({arusKasItems.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('masuk')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'masuk'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📥 Masuk</span>
            <span className="text-[10px] opacity-80">({totals.countMasuk})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('diambil')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'diambil'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📦 Diambil</span>
            <span className="text-[10px] opacity-80">({totals.countDiambil})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('biaya')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'biaya'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>💸 Biaya</span>
            <span className="text-[10px] opacity-80">({totals.countKeluar})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('ada_uang')}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
              filterType === 'ada_uang'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>💰 Ada Uang Kas Saja</span>
          </button>
        </div>

<div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
  {/* Header Row */}
  <div className="bg-slate-100 px-2 py-1.5 text-[11px] font-bold text-slate-600 flex justify-between items-center border-b border-slate-200">
    <span className="w-8 shrink-0">Jam</span>
    <span className="flex-1 px-2">Aktivitas & Rincian Pesanan</span>
    <span className="w-14 text-right shrink-0">Nominal</span>
  </div>

  {/* Rows */}
  <div className="divide-y divide-slate-100 text-xs">
    {displayedRows.length === 0 ? (
      <div className="p-6 text-center text-slate-400 italic">
        Tidak ada aktivitas atau kas tercatat pada tanggal dan filter ini.
      </div>
    ) : (
      displayedRows.map((row, idx) => {
        const isMasuk = row.logType === 'MASUK';
        const isDiambil = row.logType === 'DIAMBIL';
        const isBiaya = row.logType === 'BIAYA';
        const isZeroPay = row.jumlahMasuk === 0 && row.jumlahKeluar === 0;

        const hasKeluar = row.jumlahKeluar > 0;
        const hasMasuk = row.jumlahMasuk > 0;

        return (
          <div
            key={idx}
            onClick={() => row.transaksiId && onOpenDetailTransaksi(row.transaksiId)}
            className={`py-2 px-2 flex items-center justify-between hover:bg-slate-50 transition ${
              row.transaksiId ? 'cursor-pointer' : ''
            }`}
          >
            {/* Waktu / Jam (Diperkecil lebar w-8) */}
            <div className="w-8 font-mono text-[10px] text-slate-400 shrink-0 font-medium leading-tight">
              {formatShortTime(row.timestamp)}
            </div>

            {/* Keterangan & Badge Status (Diperbesar maksimal di tengah dengan flex-1) */}
            <div className="flex-1 px-2 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1 flex-wrap">
                {row.badgeText && (
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-black tracking-tight shrink-0 ${
                      isMasuk
                        ? row.jumlahMasuk > 0
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                        : isDiambil
                        ? row.jumlahMasuk > 0
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                        : isBiaya
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {row.badgeText}
                  </span>
                )}

                {row.metodePembayaran === 'Non-Tunai' && (
                  <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200 px-1 rounded font-bold">
                    QRIS/Transfer
                  </span>
                )}
              </div>

              <div className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-snug">
                {row.keterangan}
              </div>

         
            </div>

            {/* Nominal (Diperkecil w-14 agar kolom tengah semakin luas) */}
            <div className="w-14 text-right font-black shrink-0 text-[11px]">
              {hasKeluar ? (
                <span className="text-rose-600">
                  -{formatRupiah(row.jumlahKeluar).replace('Rp ', '')}
                </span>
              ) : hasMasuk ? (
                <span className="text-emerald-600">
                  +{formatRupiah(row.jumlahMasuk).replace('Rp ', '')}
                </span>
              ) : isZeroPay || isMasuk || isDiambil ? (
                <span className="text-slate-400 font-medium text-[10px]">Rp 0</span>
              ) : (
                <span className="text-slate-300">-</span>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
</div>
      </main>
    </div>
  );
};
