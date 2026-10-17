import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Undo2, Archive, RefreshCw, Zap, Cloud } from 'lucide-react';
import { Transaksi } from '../types';
import { formatRupiah, formatShortDate, formatShortTime } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { useToast, useConfirm } from '../components/NotificationContext';

interface ArsipViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  activeLaundryId: string;
  onOpenDetailTransaksi: (transaksiId: string) => void;
  onRestoreTransaksi: (transaksi: Transaksi) => void;
}

export const ArsipView: React.FC<ArsipViewProps> = ({
  onBack,
  transaksiList,
  activeLaundryId,
  onOpenDetailTransaksi,
  onRestoreTransaksi,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [monthArchive, setMonthArchive] = useState<Transaksi[]>([]);
  const [isLoadingMonth, setIsLoadingMonth] = useState<boolean>(false);
  const [isFromCache, setIsFromCache] = useState<boolean>(true);
  const [isSearchingCloud, setIsSearchingCloud] = useState<boolean>(false);
  const [cloudSearchResults, setCloudSearchResults] = useState<Transaksi[] | null>(null);

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const monthYearLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(targetDate);

  // Muat arsip bulan yang dipilih (Cache-First: 0 Reads jika sudah tersimpan lokal di IndexedDB)
  const loadMonthArchive = async (forceRefresh = false) => {
    setIsLoadingMonth(true);
    try {
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const list = await FirebaseSyncService.fetchArsipBulan(activeLaundryId, year, month, forceRefresh);
      setMonthArchive(list);
      setIsFromCache(!forceRefresh);
    } catch (e) {
      console.warn('Gagal memuat arsip bulan:', e);
    } finally {
      setIsLoadingMonth(false);
    }
  };

  useEffect(() => {
    setCloudSearchResults(null);
    loadMonthArchive(false);
  }, [selectedMonthOffset, activeLaundryId]);

  // Gabungkan arsip yang dimuat dari IndexedDB/Cloud dengan transaksi berstatus 'Diambil' yang ada di state aktif saat ini
  const mergedTransactions = useMemo(() => {
    const map = new Map<string, Transaksi>();

    // Masukkan arsip yang baru saja diambil pada sesi saat ini dari transaksiList
    transaksiList.forEach((t) => {
      if (t.laundryId === activeLaundryId && t.status === 'Diambil') {
        map.set(t.id, t);
      }
    });

    // Masukkan arsip bulan dari IndexedDB/cloud
    monthArchive.forEach((t) => {
      map.set(t.id, t);
    });

    // Jika sedang ada hasil pencarian cloud
    if (cloudSearchResults && cloudSearchResults.length > 0) {
      cloudSearchResults.forEach((t) => {
        map.set(t.id, t);
      });
    }

    return Array.from(map.values());
  }, [transaksiList, monthArchive, cloudSearchResults, activeLaundryId]);

  // Filter berdasarkan bulan atau teks pencarian
  const archivedTransactions = useMemo(() => {
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    return mergedTransactions.filter((trx) => {
      if (trx.laundryId !== activeLaundryId) return false;
      if (trx.status !== 'Diambil') return false;

      // Filter pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          trx.namaPelanggan?.toLowerCase().includes(q) ||
          trx.nomorTransaksi?.toLowerCase().includes(q) ||
          trx.nomorTelepon?.includes(q)
        );
      }

      // Filter bulan aktif
      const pDate = new Date(trx.tanggalPengambilan || trx.tanggalMasuk);
      return pDate.getMonth() === targetMonth && pDate.getFullYear() === targetYear;
    });
  }, [mergedTransactions, activeLaundryId, targetDate, searchQuery]);

  // Paginasi 10 arsip per halaman
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonthOffset, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(archivedTransactions.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedArchive = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return archivedTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [archivedTransactions, validCurrentPage]);

  // Cari di Cloud khusus nomor nota jika tidak ditemukan di memori lokal bulan ini
  const handleSearchCloud = async () => {
    if (!searchQuery.trim() || isSearchingCloud) return;
    setIsSearchingCloud(true);
    try {
      const results = await FirebaseSyncService.searchArsip(activeLaundryId, searchQuery.trim());
      setCloudSearchResults(results);
      if (results.length === 0) {
        toast.warning(`Nota '${searchQuery}' tidak ditemukan di Cloud.`);
      }
    } finally {
      setIsSearchingCloud(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-12">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base tracking-wide leading-tight">Arsip Transaksi</h1>
          </div>
        </div>

        {/* Tombol Segarkan Cloud untuk Bulan Ini */}
        <button
          onClick={() => loadMonthArchive(true)}
          disabled={isLoadingMonth}
          title="Sinkronkan arsip bulan ini dari Cloud"
          className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingMonth ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sinkronkan</span>
        </button>
      </header>

      {/* Month Navigator */}
      <div className="bg-[#800000] text-white px-4 pb-3 flex items-center justify-between shadow-inner">
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
          className="p-1.5 rounded-full hover:bg-white/15 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <span className="font-bold text-sm tracking-wide capitalize">{monthYearLabel}</span>
    
        </div>
        <button
          onClick={() => setSelectedMonthOffset((prev) => prev + 1)}
          className="p-1.5 rounded-full hover:bg-white/15 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 md:px-6 md:pt-4 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full space-y-2">
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nota / nama pelanggan yang diarsipkan..."
              className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {searchQuery.trim().length >= 3 && (
            <button
              type="button"
              onClick={handleSearchCloud}
              disabled={isSearchingCloud}
              className="px-3 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
            >
              <Cloud className={`w-3.5 h-3.5 ${isSearchingCloud ? 'animate-pulse' : ''}`} />
              <span>{isSearchingCloud ? 'Mencari...' : 'Cari di Cloud'}</span>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <main className="flex-1 px-3 md:px-6 space-y-2 overflow-y-auto max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        {isLoadingMonth ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 mt-2 space-y-2">
            <RefreshCw className="w-8 h-8 text-[#800000] animate-spin mx-auto" />
            <p className="text-xs font-medium text-slate-500">Memuat arsip bulan {monthYearLabel}...</p>
          </div>
        ) : archivedTransactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 mt-2 space-y-2">
            <Archive className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-600">
              Tidak ada arsip transaksi pada periode {monthYearLabel}.
            </p>
            <p className="text-xs text-slate-400">
              Pesanan dengan status 'Diambil' pada bulan ini akan tersimpan rapi di sini tanpa membebani antrean aktif.
            </p>
          </div>
        ) : (
          paginatedArchive.map((trx) => (
            <div
              key={trx.id}
              onClick={() => onOpenDetailTransaksi(trx.id)}
              className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs hover:border-[#800000] cursor-pointer transition flex items-center justify-between gap-2.5"
            >
              {/* Tanggal & Jam Masuk / Pengambilan (Diperkecil / Compact) */}
              <div className="w-10 shrink-0 text-center border-r border-slate-100 pr-1 flex flex-col justify-center">
                <div className="text-[10px] font-bold text-slate-700 leading-none">
                  {formatShortTime(trx.tanggalPengambilan || trx.tanggalMasuk)}
                </div>
                <div className="text-[9px] text-slate-400 leading-none mt-1">
                  {formatShortDate(trx.tanggalPengambilan || trx.tanggalMasuk)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    {trx.namaPelanggan}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                    {trx.nomorTransaksi}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  Total: {formatRupiah(trx.totalHarga)} • {trx.items?.length || 0} Layanan
                </div>
              </div>

              {/* Restore Button */}
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await confirm({
                    title: 'Kembalikan Transaksi',
                    message: `Kembalikan transaksi '${trx.nomorTransaksi}' ke antrean pengerjaan aktif?`,
                    confirmText: 'Ya, Kembalikan',
                  });
                  if (ok) {
                    setMonthArchive((prev) => prev.filter((t) => t.id !== trx.id));
                    onRestoreTransaksi(trx);
                    toast.success(`Transaksi '${trx.nomorTransaksi}' berhasil dikembalikan ke antrean aktif.`);
                  }
                }}
                title="Kembalikan ke antrean aktif"
                className="p-2 rounded-xl text-slate-400 hover:text-[#800000] hover:bg-rose-50 transition cursor-pointer"
              >
                <Undo2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}

        {/* Paginasi Arsip */}
        {!isLoadingMonth && archivedTransactions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 mt-2">
            <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
              Menampilkan <span className="font-bold text-slate-800">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(validCurrentPage * ITEMS_PER_PAGE, archivedTransactions.length)}</span> dari <span className="font-bold text-[#800000]">{archivedTransactions.length}</span> arsip
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <span className="px-2 py-0.5 text-xs font-bold text-slate-700 bg-slate-100 rounded-md">
                  {validCurrentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validCurrentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-0.5"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
