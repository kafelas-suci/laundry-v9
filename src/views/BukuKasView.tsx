import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Shirt,
  Calendar,
  HelpCircle,
  X,
  CreditCard,
  Banknote,
  Search,
  Package,
  CheckCircle2,
  AlertCircle,
  Coins,
  Clock,
} from 'lucide-react';
import { Transaksi, Pengeluaran, ArusKas } from '../types';
import { formatRupiah, formatShortTime, formatDateIndo, formatTanggalIndo, formatLocalDateKey } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';

interface BukuKasViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  manualCashLogs: ArusKas[];
  activeLaundryId: string;
  onOpenDetailTransaksi: (transaksiId: string) => void;
}

export type CashTabType = 'uang' | 'logistik';
export type CashFilterType = 'semua' | 'masuk' | 'keluar' | 'tunai' | 'nontunai';
export type LogisticFilterType = 'semua' | 'masuk' | 'diambil' | 'belum_lunas';

export const BukuKasView: React.FC<BukuKasViewProps> = ({
  onBack,
  transaksiList,
  pengeluaranList,
  manualCashLogs,
  activeLaundryId,
  onOpenDetailTransaksi,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<CashTabType>('uang');
  const [cashFilter, setCashFilter] = useState<CashFilterType>('semua');
  const [logisticFilter, setLogisticFilter] = useState<LogisticFilterType>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [monthArchive, setMonthArchive] = useState<Transaksi[]>([]);

  // Muat arsip bulan terpilih dari IndexedDB lokal
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

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleOpenDatePicker = () => {
    if (dateInputRef.current) {
      try {
        if ('showPicker' in HTMLInputElement.prototype && typeof dateInputRef.current.showPicker === 'function') {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.click();
      }
    }
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const parts = val.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const newDate = new Date(year, month, day, 12, 0, 0);
        setSelectedDate(newDate);
      }
    }
  };

  const isSelectedDateToday = useMemo(() => {
    const today = new Date();
    return (
      today.getDate() === selectedDate.getDate() &&
      today.getMonth() === selectedDate.getMonth() &&
      today.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate]);

  // Hitung kompilasi Arus Kas Riil & Logistik Serah Terima
  const {
    cashEntries,
    logisticEntries,
    totals,
  } = useMemo(() => {
    const cashList: ArusKas[] = [];
    const logList: (ArusKas & { transaksi?: Transaksi })[] = [];

    let totalMasuk = 0;
    let totalMasukTunai = 0;
    let totalMasukNonTunai = 0;

    let totalKeluar = 0;
    let totalPiutang = 0;

    let countBajuMasuk = 0;
    let countBajuDiambil = 0;

    const map = new Map<string, Transaksi>();
    transaksiList.forEach((t) => map.set(t.id, t));
    monthArchive.forEach((t) => map.set(t.id, t));
    const branchTrx = Array.from(map.values()).filter((t) => t.laundryId === activeLaundryId);

    // 1. Evaluasi Cucian yang Masuk di Hari Terpilih
    branchTrx.forEach((trx) => {
      const isTransitionTrx = Boolean(
        trx.isTransisi ||
        trx.id?.startsWith('trx-transisi-') ||
        trx.nomorTransaksi?.startsWith('TRANSISI-')
      );

      // Transaksi dari form transisi nota lama TIDAK dicatat sebagai baju masuk,
      // melainkan hanya sebagai baju keluar/diambil saat diserahkan
      if (!isTransitionTrx && trx.tanggalMasuk >= startOfDay && trx.tanggalMasuk <= endOfDay) {
        countBajuMasuk++;
        const dp = trx.jumlahDp || 0;
        const total = trx.totalHarga || 0;
        const sisa = Math.max(0, total - dp);
        const isNonTunai = trx.metodePembayaran === 'Non-Tunai';

        if (trx.statusPembayaran !== 'Lunas') {
          totalPiutang += sisa;
        }

        // Pembayaran riil saat baju masuk
        const bayarAwal = Math.min(total, dp);

        if (bayarAwal > 0) {
          totalMasuk += bayarAwal;
          if (isNonTunai) {
            totalMasukNonTunai += bayarAwal;
          } else {
            totalMasukTunai += bayarAwal;
          }

          const isLunasAwal = bayarAwal >= total;
          cashList.push({
            timestamp: trx.tanggalMasuk,
            keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'})`,
            jumlahMasuk: bayarAwal,
            jumlahKeluar: 0,
            metodePembayaran: trx.metodePembayaran || 'Tunai',
            transaksiId: trx.id,
            logType: 'MASUK',
            badgeText: isLunasAwal ? 'Lunas' : 'DP',
          });
        }

        // Catat ke Log Logistik Cucian Masuk
        logList.push({
          timestamp: trx.tanggalMasuk,
          keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Masuk`,
          jumlahMasuk: bayarAwal,
          jumlahKeluar: 0,
          metodePembayaran: trx.metodePembayaran,
          transaksiId: trx.id,
          logType: 'MASUK',
          badgeText: bayarAwal >= total ? 'LUNAS' : bayarAwal > 0 ? `DP ${formatRupiah(bayarAwal)}` : 'BAYAR NANTI',
          transaksi: trx,
        });
      }

      // Jika transaksi transisi belum lunas dan diserahkan hari ini, catat sisa piutangnya
      if (isTransitionTrx && trx.statusPembayaran !== 'Lunas') {
        const waktuAmbil = trx.tanggalPengambilan || trx.tanggalMasuk;
        if (waktuAmbil >= startOfDay && waktuAmbil <= endOfDay) {
          const sisaTransisi = Math.max(0, trx.totalHarga - (trx.jumlahDp || 0));
          totalPiutang += sisaTransisi;
        }
      }

      // 2. Evaluasi Pelunasan Kas di Hari Terpilih (baik saat diambil atau pelunasan sisa)
      const dp = Math.max(0, trx.jumlahDp || 0);
      const total = Math.max(0, trx.totalHarga || 0);
      const bayarAwal = Math.min(total, dp);
      const sisa = Math.max(0, total - bayarAwal);
      const waktuPelunasan = trx.tanggalPelunasan || trx.tanggalPengambilan;
      const isLunasHariIni = trx.statusPembayaran === 'Lunas' && waktuPelunasan && waktuPelunasan >= startOfDay && waktuPelunasan <= endOfDay;
      const isNonTunai = trx.metodePembayaran === 'Non-Tunai';

      if (isLunasHariIni && sisa > 0) {
        totalMasuk += sisa;
        if (isNonTunai) {
          totalMasukNonTunai += sisa;
        } else {
          totalMasukTunai += sisa;
        }

        const isOrderBedaHari = trx.tanggalMasuk < startOfDay;
        cashList.push({
          timestamp: waktuPelunasan,
          keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) `,
          jumlahMasuk: sisa,
          jumlahKeluar: 0,
          metodePembayaran: trx.metodePembayaran || 'Tunai',
          transaksiId: trx.id,
          logType: 'MASUK',
          badgeText: isOrderBedaHari ? 'Pelunasan' : 'Pelunasan',
        });
      }

      // 3. Evaluasi Logistik Cucian yang Diambil di Hari Terpilih
      if (
        trx.tanggalPengambilan &&
        trx.tanggalPengambilan >= startOfDay &&
        trx.tanggalPengambilan <= endOfDay
      ) {
        countBajuDiambil++;
        const pelunasanDiambil = trx.statusPembayaran === 'Lunas' ? sisa : 0;
        logList.push({
          timestamp: trx.tanggalPengambilan,
          keterangan: `${trx.namaPelanggan} (${trx.nomorTransaksi || '-'}) • Diambil`,
          jumlahMasuk: pelunasanDiambil,
          jumlahKeluar: 0,
          metodePembayaran: trx.metodePembayaran,
          transaksiId: trx.id,
          logType: 'DIAMBIL',
          badgeText: pelunasanDiambil > 0 ? `LUNAS (${formatRupiah(pelunasanDiambil)})` : 'SUDAH LUNAS',
          transaksi: trx,
        });
      }
    });

    // 3. Biaya Operasional / Pengeluaran Hari Terpilih
    pengeluaranList
      .filter((p) => p.laundryId === activeLaundryId && p.tanggal >= startOfDay && p.tanggal <= endOfDay)
      .forEach((p) => {
        totalKeluar += p.jumlah;
        cashList.push({
          timestamp: p.tanggal,
          keterangan: p.keterangan || 'Biaya Operasional Toko',
          jumlahMasuk: 0,
          jumlahKeluar: p.jumlah,
          metodePembayaran: 'Tunai',
          logType: 'BIAYA',
          badgeText: '',
        });
      });

    // 4. Catatan Kas Manual (dari fitur Atur Kas)
    manualCashLogs
      .filter((m) => m.timestamp >= startOfDay && m.timestamp <= endOfDay)
      .forEach((m) => {
        if (m.jumlahMasuk > 0) {
          totalMasuk += m.jumlahMasuk;
          totalMasukTunai += m.jumlahMasuk;
          cashList.push({
            ...m,
            badgeText: 'KAS MASUK MANUAL',
            logType: 'MASUK',
          });
        }
        if (m.jumlahKeluar > 0) {
          totalKeluar += m.jumlahKeluar;
          cashList.push({
            ...m,
            badgeText: 'KAS KELUAR MANUAL',
            logType: 'BIAYA',
          });
        }
      });

    // Urutkan berdasarkan waktu transaksi terbaru di atas
    cashList.sort((a, b) => b.timestamp - a.timestamp);
    logList.sort((a, b) => b.timestamp - a.timestamp);

    const selisihKas = totalMasuk - totalKeluar;
    const perkiraanUangLaci = Math.max(0, totalMasukTunai - totalKeluar);

    return {
      cashEntries: cashList,
      logisticEntries: logList,
      totals: {
        totalMasuk,
        totalMasukTunai,
        totalMasukNonTunai,
        totalKeluar,
        selisihKas,
        perkiraanUangLaci,
        totalPiutang,
        countBajuMasuk,
        countBajuDiambil,
        countCashRows: cashList.length,
      },
    };
  }, [transaksiList, pengeluaranList, manualCashLogs, activeLaundryId, startOfDay, endOfDay]);

  // Filter Baris Kas Riil
  const displayedCashRows = useMemo(() => {
    return cashEntries.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKet = row.keterangan.toLowerCase().includes(q);
        const matchNominal = (row.jumlahMasuk || row.jumlahKeluar).toString().includes(q);
        if (!matchKet && !matchNominal) return false;
      }

      if (cashFilter === 'masuk') return row.jumlahMasuk > 0;
      if (cashFilter === 'keluar') return row.jumlahKeluar > 0;
      if (cashFilter === 'tunai') return row.metodePembayaran !== 'Non-Tunai';
      if (cashFilter === 'nontunai') return row.metodePembayaran === 'Non-Tunai';
      return true;
    });
  }, [cashEntries, cashFilter, searchQuery]);

  // Filter Baris Log Logistik
  const displayedLogisticRows = useMemo(() => {
    return logisticEntries.filter((row) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchKet = row.keterangan.toLowerCase().includes(q);
        if (!matchKet) return false;
      }

      if (logisticFilter === 'masuk') return row.logType === 'MASUK';
      if (logisticFilter === 'diambil') return row.logType === 'DIAMBIL';
      if (logisticFilter === 'belum_lunas') {
        return row.transaksi && row.transaksi.statusPembayaran !== 'Lunas';
      }
      return true;
    });
  }, [logisticEntries, logisticFilter, searchQuery]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-8 selection:bg-[#800000] selection:text-white">
      {/* 1. APP BAR HEADER */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-3 sm:px-4 h-14">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition cursor-pointer"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="font-extrabold text-sm sm:text-base tracking-wide leading-tight flex items-center gap-1.5">
                <span>Buku Kas Harian</span>
              </h1>
              <p className="text-[10px] text-rose-200 font-medium">
                Pencatatan uang masuk & keluar kasir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowGuideModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-bold text-white transition cursor-pointer border border-white/20"
            title="Cara membaca buku kas"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Panduan</span>
          </button>
        </div>

        {/* 2. DATE SELECTOR BAR */}
        <div className="px-3 sm:px-4 pb-2.5 pt-0.5 flex items-center justify-between gap-2 border-t border-white/10">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition cursor-pointer text-white shrink-0"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Clickable Date Selector Pill */}
            <div className="relative group flex items-center">
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 border border-white/25 text-white transition cursor-pointer shadow-xs select-none max-w-full"
                title="Klik untuk memilih tanggal langsung dari kalender"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-200 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-bold text-xs sm:text-sm tracking-wide truncate">
                  {formatDateIndo(selectedDate.getTime())}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-rose-200 group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Native Date Input: transparently overlayed and accessible via showPicker & direct touch */}
              <input
                ref={dateInputRef}
                type="date"
                value={formatLocalDateKey(selectedDate)}
                onChange={handleDateSelect}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 [color-scheme:dark]"
                aria-label="Pilih tanggal buku kas"
              />
            </div>

            {!isSelectedDateToday && (
              <button
                type="button"
                onClick={handleToday}
                className="text-[10px] font-black bg-white text-[#800000] hover:bg-rose-50 px-2 py-1 rounded-lg shadow-xs active:scale-90 transition cursor-pointer shrink-0"
                title="Kembali ke Hari Ini"
              >
                Hari Ini
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-90 transition cursor-pointer text-white shrink-0"
            title="Hari Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. MAIN CONTAINER */}
      <main className="flex-1 p-2 sm:p-5 space-y-2 max-w-3xl mx-auto w-full">
     

        {/* KARTU RINGKASAN KASIR (TUTUP KASIR FISIK) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 space-y-2">
          {/* Baris 1: Kas Masuk, Keluar, dan Selisih Kas */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Kas Masuk */}
            <div className="p-1 rounded-xl bg-emerald-50 border border-emerald-200/80">
              <span className="block text-[10px] font-bold  tracking-wider text-emerald-700">
                Kas Masuk
              </span>
              <span className="text-sm sm:text-base font-black text-emerald-800 font-mono tracking-tight block mt-0.5">
                {formatRupiah(totals.totalMasuk)}
              </span>
              
            </div>

            {/* Kas Keluar */}
            <div className="p-1 rounded-xl bg-rose-50 border border-rose-200/80">
              <span className="block text-[10px] font-bold  tracking-wider text-rose-700">
                Kas Keluar
              </span>
              <span className="text-sm sm:text-base font-black text-rose-700 font-mono tracking-tight block mt-0.5">
                {formatRupiah(totals.totalKeluar)}
              </span>
              
            </div>

            {/* Selisih Kas */}
            <div className="p-1 rounded-xl bg-slate-50 border border-slate-200">
              <span className="block text-[10px] font-bold  tracking-wider text-slate-500">
                Selisih Kas
              </span>
              <span
                className={`text-sm sm:text-base font-black font-mono tracking-tight block mt-0.5 ${
                  totals.selisihKas >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {totals.selisihKas >= 0 ? '+' : ''}
                {formatRupiah(totals.selisihKas)}
              </span>
           
            </div>
          </div>

   <div className="grid grid-cols-2 gap-2 w-full text-xs">
  {/* Box Fisik Uang Laci */}
  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl border border-amber-200/80 min-w-0">
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
    
      <div className="min-w-0">
        <span className="font-extrabold text-amber-900 text-[10px] sm:text-[11px] block truncate">
          Tunai
        </span>
      </div>
    </div>
    <span className="font-black text-amber-900 font-mono text-[11px] sm:text-sm shrink-0 pl-1">
      {formatRupiah(totals.perkiraanUangLaci)}
    </span>
  </div>

  {/* Box Non-Tunai */}
  <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl  border border-sky-200/80 min-w-0">
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
   
      <div className="min-w-0">
        <span className="font-extrabold text-sky-900 text-[10px] sm:text-[11px] block truncate">
         Transfer
        </span>
      </div>
    </div>
    <span className="font-black text-sky-900 font-mono text-[11px] sm:text-sm shrink-0 pl-1">
      {formatRupiah(totals.totalMasukNonTunai)}
    </span>
  </div>
</div>

          {/* Baris Khusus: Sisa Piutang Nota Pelanggan (Terpisah Mandiri) */}
          {totals.totalPiutang > 0 && (
            <div className="flex items-center justify-between p-1  text-xs">
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950 text-[11px] block">
                    Sisa Piutang Nota (Belum Dibayar)
                  </span>
                
                </div>
              </div>
              <span className="font-black text-amber-900 font-mono text-xs sm:text-sm">
                {formatRupiah(totals.totalPiutang)}
              </span>
            </div>
          )}
        </div>

        {/* 4. SEGMENTED TAB SWITCHER (UANG KAS vs LOGISTIK CUCIAN) */}
        <div className="bg-slate-200/80 p-1 rounded-2xl grid grid-cols-2 text-xs font-black shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('uang')}
            className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'uang'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Coins className="w-4 h-4 text-emerald-600" />
            <span>Arus Kas Uang</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black">
              {totals.countCashRows}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logistik')}
            className={`py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'logistik'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shirt className="w-4 h-4 text-indigo-600" />
            <span>Serah Terima Baju</span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
              {totals.countBajuMasuk + totals.countBajuDiambil}
            </span>
          </button>
        </div>


        {/* 6. DAFTAR MUTASI SESUAI TAB AKTIF */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          {/* Header Tabel */}
          <div className="bg-slate-100/90 px-2 py-2 text-[11px] font-extrabold text-slate-600 flex justify-between items-center border-b border-slate-200">
            <span className="w-10 shrink-0">Waktu</span>
            <span className="flex-1 px-2">
              {activeTab === 'uang' ? 'Rincian Mutasi Kas' : 'Rincian Serah Terima Cucian'}
            </span>
            <span className="w-24 text-right shrink-0">
              {activeTab === 'uang' ? 'Nominal' : ''}
            </span>
          </div>

{/* TAB 1: MUTASI UANG KAS SAJA */}
{/* TAB 1: MUTASI UANG KAS SAJA */}
{activeTab === 'uang' && (
  <div className="divide-y divide-slate-100 text-xs">
    {displayedCashRows.length === 0 ? (
      <div className="p-8 text-center text-slate-400 space-y-1">
        <Wallet className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="font-semibold text-xs text-slate-600">
          Tidak ada transaksi uang pada tanggal ini.
        </p>
        <p className="text-[11px] text-slate-400">
          Hanya transaksi dengan uang masuk atau uang keluar yang ditampilkan di sini.
        </p>
      </div>
    ) : (
      displayedCashRows.map((row, idx) => {
        const isMasuk = row.jumlahMasuk > 0;
        const isNonTunai = row.metodePembayaran === 'Non-Tunai';

        return (
          <div
            key={idx}
            onClick={() => row.transaksiId && onOpenDetailTransaksi(row.transaksiId)}
            className={`py-2 px-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition ${
              row.transaksiId ? 'cursor-pointer' : ''
            }`}
          >
            {/* Jam */}
            <div className="w-8 font-mono text-xs text-slate-400 shrink-0 font-medium">
              {formatShortTime(row.timestamp)}
            </div>

            {/* Keterangan di Kiri */}
            <div className="flex-1 px-2 min-w-0">
              <div className="font-bold text-slate-900 text-xs truncate">
                {row.keterangan}
              </div>
            </div>

            {/* Bagian Kanan: Badge Status, Badge TF, & Nominal */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isNonTunai && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-sky-50 text-sky-800 shrink-0">
                  tf
                </span>
              )}

              {row.badgeText && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-extrabold text-slate-700 border shrink-0">
                  {row.badgeText}
                </span>
              )}

              {/* Nominal Uang Masuk / Keluar */}
              <div className="w-16 text-right font-black font-mono text-xs">
                {isMasuk ? (
                  <span className="text-emerald-700 flex items-center justify-end gap-0.5">
                    <span>{formatRupiah(row.jumlahMasuk).replace('Rp ', '')}</span>
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center justify-end gap-0.5">
                    <span>{formatRupiah(row.jumlahKeluar).replace('Rp ', '')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
)}

{/* TAB 2: LOGISTIK SERAH TERIMA CUCIAN */}
{activeTab === 'logistik' && (
  <div className="divide-y divide-slate-100 text-xs">
    {displayedLogisticRows.length === 0 ? (
      <div className="p-8 text-center text-slate-400 space-y-1">
        <Shirt className="w-8 h-8 text-slate-300 mx-auto" />
        <p className="font-semibold text-xs text-slate-600">
          Tidak ada aktivitas serah terima cucian pada tanggal ini.
        </p>
      </div>
    ) : (
      displayedLogisticRows.map((row, idx) => {
        const isMasuk = row.logType === 'MASUK';

        // Memisahkan keterangan dengan ' • ' jika ada
        const parts = (row.keterangan || '').split(' • ');
        const namaUtama = parts[0] || '';
        const statusKanan = parts.slice(1).join(' • ');

        return (
          <div
            key={idx}
            onClick={() => row.transaksiId && onOpenDetailTransaksi(row.transaksiId)}
            className={`py-2 px-2.5 flex items-center justify-between text-xs transition ${
              row.transaksiId ? 'cursor-pointer' : ''
            } ${
              isMasuk 
                ? 'bg-emerald-50/50 hover:bg-emerald-50/90' 
                : 'bg-purple-50/40 hover:bg-purple-50/80'
            }`}
          >
            {/* Jam */}
            <div className="w-8 font-mono text-xs text-slate-400 shrink-0 font-medium">
              {formatShortTime(row.timestamp)}
            </div>

            {/* Detail Cucian (Nama di Kiri, Status Keterangan di Kanan) */}
            <div className="flex-1 px-2 min-w-0 flex items-center justify-between gap-2">
              <div className="font-bold text-slate-900 text-xs truncate min-w-0 flex-1">
                {namaUtama}
              </div>
              
              {statusKanan && (
                <span className={`text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-md border ${
                  isMasuk 
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200' 
                    : 'bg-purple-100 text-purple-900 border-purple-200'
                }`}>
                  {statusKanan}
                </span>
              )}
            </div>
          </div>
        );
      })
    )}
  </div>
)}
        </div>
      </main>

      {/* MODAL PANDUAN BUKU KAS */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-[#800000] flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Panduan Buku Kas</h3>
                  <p className="text-[11px] text-slate-400">Cara kerja pencatatan kas laundry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <strong className="text-emerald-900 font-black block flex items-center gap-1">
                  <Coins className="w-4 h-4 text-emerald-700" />
                  1. Arus Kas Riil (Uang Masuk & Keluar)
                </strong>
                <p>
                  Uang hanya dihitung masuk kas saat kasir <strong>benar-benar menerima uang</strong> (baik itu pembayaran Lunas di Awal, DP Cucian, atau Pelunasan saat baju diambil). Transaksi yang bayar saat ambil tidak dihitung uang masuk sampai hari pelunasannya tiba.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <strong className="text-amber-900 font-black block flex items-center gap-1">
                  <Banknote className="w-4 h-4 text-amber-700" />
                  2. Fisik Uang di Laci Kasir
                </strong>
                <p>
                  Saat tutup toko di sore hari, uang tunai fisik yang wajib ada di laci kasir adalah <strong>Total Kas Masuk Tunai</strong> dikurangi <strong>Pengeluaran Biaya Toko</strong>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <strong className="text-indigo-900 font-black block flex items-center gap-1">
                  <Shirt className="w-4 h-4 text-indigo-700" />
                  3. Tab Serah Terima Baju
                </strong>
                <p>
                  Gunakan tab <strong>"Serah Terima Baju"</strong> jika Anda ingin melihat berapa banyak nota cucian yang baru masuk atau selesai diserahkan ke pelanggan tanpa mengotori buku kas uang.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
