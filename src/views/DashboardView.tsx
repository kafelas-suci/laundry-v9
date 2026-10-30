import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  History,
  Lock,
  Plus,
  Receipt,
  RotateCw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Shirt,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { Laundry, Pelanggan, Pengeluaran, SettingsData, Transaksi, User } from '../types';
import type { TransitionPickupData } from '../components/QuickTransitionPickupModal';
import { formatRupiah, formatShortDate, formatShortTime } from '../utils/formatters';
import { StorageService } from '../utils/storage';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getLaundryLimits } from '../utils/subscription';
import { useConfirm, useToast } from '../components/NotificationContext';
import { useDeferredWidgetMount } from '../components/dashboard/useDeferredWidgetMount';

// Code-Split Heavy Widgets & Modals (Dimuat asinkron agar initial load ringan di perangkat kelas bawah)
const LazyDailyReportWidget = lazy(
  () => import('../components/dashboard/DashboardDailyReportWidget')
);
const LazyDesktopWorkspace = lazy(
  () => import('../components/dashboard/DashboardDesktopWorkspace')
);
const LazyPickupConfirmModal = lazy(
  () => import('../components/dashboard/DashboardPickupConfirmModal')
);
const LazyQuickTransitionPickupModal = lazy(() =>
  import('../components/QuickTransitionPickupModal').then((m) => ({
    default: m.QuickTransitionPickupModal,
  }))
);

export type DashboardFilterStatus = 'semua' | 'selesai' | 'baru_masuk' | 'sedang_dikerjakan';

interface DashboardViewProps {
  transaksiList: Transaksi[];
  isLoadingTransaksi?: boolean;
  pelangganList?: Pelanggan[];
  settings: SettingsData;
  currentUser: User;
  activeLaundry: Laundry;
  laundries: Laundry[];
  pengeluaranList?: Pengeluaran[];
  isMobile?: boolean;
  deviceInfo?: {
    isMobile: boolean;
    isPhone: boolean;
    os: string;
  };
  currentTier?: string | null;
  onOpenUpgradeModal?: (reason?: string) => void;
  onOpenExpiredModal?: () => void;
  onOpenNewTransaksi: () => void;
  onOpenLimitModal?: () => void;
  onOpenDetailTransaksi: (transaksiId: string) => void;
  onOpenArsip: () => void;
  onOpenSettings: () => void;
  onOpenStatusPengerjaan: () => void;
  onOpenBukuKas: () => void;
  onOpenLaporan: () => void;
  onOpenAturKas: () => void;
  onOpenSwitchBranch: () => void;
  onSelectBranch?: (laundryId: string) => void;
  onOpenApkModal: () => void;
  onOpenKelolaPelanggan: () => void;
  onOpenKelolaLayanan: () => void;
  onOpenKelolaOwner: () => void;
  onSyncCloudData?: () =>
    | Promise<{ transaksiCount?: number; pelangganCount?: number; layananCount?: number } | void>
    | void;
  onSelesaikanTransaksi: (transaksi: Transaksi) => void;
  onAmbilTransaksi: (transaksi: Transaksi) => void;
  onAmbilBanyakTransaksi?: (transaksiList: Transaksi[]) => void;
  onSaveTransitionPickup?: (data: TransitionPickupData) => void;
  onUpdateSettings?: (settings: SettingsData) => void;
  onOpenTour?: () => void;
}

const MobileDailyReportSkeleton: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <div
    className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2 animate-pulse"
    aria-hidden="true"
  >
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
      <div className="h-3.5 w-28 rounded bg-slate-200/80" />
      <div className="h-4 w-20 rounded bg-slate-100" />
    </div>
    {collapsed ? (
      <div className="flex items-center justify-between pt-0.5">
        <div className="h-3.5 w-20 rounded bg-slate-100" />
        <div className="h-3.5 w-20 rounded bg-slate-100" />
        <div className="h-4 w-24 rounded bg-emerald-100/70" />
      </div>
    ) : (
      <>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="h-7 rounded-lg bg-slate-50 border border-slate-100" />
          <div className="h-7 rounded-lg bg-slate-50 border border-slate-100" />
        </div>
        <div className="h-8 rounded-lg bg-emerald-50/50 border border-emerald-100" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-slate-100">
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-3 rounded bg-slate-100" />
          <div className="h-3 rounded bg-slate-100" />
        </div>
      </>
    )}
  </div>
);

const DesktopWorkspaceFallback: React.FC = () => (
  <div className="flex flex-col h-full overflow-hidden bg-slate-100">
    <div className="bg-white border-b border-slate-200/90 px-6 h-16 flex items-center justify-between shrink-0">
      <div className="space-y-1.5 animate-pulse">
        <div className="h-4 w-48 rounded bg-slate-200/80" />
        <div className="h-3 w-36 rounded bg-slate-100" />
      </div>
      <div className="flex items-center gap-2.5 animate-pulse">
        <div className="h-9 w-28 rounded-xl bg-slate-100" />
        <div className="h-9 w-36 rounded-xl bg-[#800000]/20" />
      </div>
    </div>
    <div className="flex-1 p-5 lg:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-5 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[98px] rounded-2xl bg-white border border-slate-200/80" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white border border-slate-200/80" />
      </div>
    </div>
  </div>
);

export const DashboardView: React.FC<DashboardViewProps> = ({
  transaksiList,
  isLoadingTransaksi = false,
  pelangganList = [],
  currentUser,
  activeLaundry,
  laundries,
  pengeluaranList = [],
  isMobile = false,
  onSelectBranch,
  currentTier,
  onOpenUpgradeModal,
  onOpenExpiredModal,
  onOpenNewTransaksi,
  onOpenTour,
  onOpenLimitModal,
  onOpenDetailTransaksi,
  onOpenArsip,
  onOpenSettings,
  onOpenStatusPengerjaan,
  onOpenBukuKas,
  onOpenLaporan,
  onOpenAturKas,
  onOpenKelolaOwner,
  onSyncCloudData,
  onSelesaikanTransaksi,
  onAmbilTransaksi,
  onSaveTransitionPickup,
  onUpdateSettings,
  settings,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const isHeavyWidgetsReady = useDeferredWidgetMount();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(() =>
    StorageService.get<number>('last_force_sync_timestamp', 0)
  );

  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBranchDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  const COOLDOWN_MS = 10 * 60 * 1000; // 10 menit jeda pengaman

  const handleManualSync = async (forceBypass = false) => {
    if (isSyncing || !onSyncCloudData) return;

    const now = Date.now();
    const elapsed = now - lastSyncTime;

    // Cek Cooldown 10 menit
    if (!forceBypass && lastSyncTime > 0 && elapsed < COOLDOWN_MS) {
      const remainingMinutes = Math.ceil((COOLDOWN_MS - elapsed) / 60000);
      const passedMinutes = Math.max(1, Math.floor(elapsed / 60000));
      await confirm.confirm({
        title: 'Jeda Pengaman 10 Menit Aktif',
        message: `Sinkronisasi baru saja dilakukan ${passedMinutes} menit yang lalu.\n tunggu ${remainingMinutes} menit lagi.`,
        confirmText: 'Mengerti',
        cancelText: 'Tunggu',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await onSyncCloudData();
      const updatedNow = Date.now();
      setLastSyncTime(updatedNow);
      StorageService.set('last_force_sync_timestamp', updatedNow);

      const trxCount = res?.transaksiCount ?? 0;
      const pelCount = res?.pelangganCount ?? 0;
      const layCount = res?.layananCount ?? 0;

      if (trxCount > 0) {
        toast.success(
          `Sinkronisasi Berhasil: ${trxCount} nota baru/mutakhir diperbarui, ${pelCount} pelanggan, ${layCount} layanan tersinkron!`
        );
      } else {
        toast.success(
          `Sinkronisasi Berhasil: Seluruh koleksi telah konsisten dengan server (${pelCount} pelanggan, ${layCount} layanan).`
        );
      }
    } catch (err) {
      console.error('Error saat sinkronisasi paksa:', err);
      toast.error('Gagal menyinkronkan data dengan server. Periksa koneksi internet Anda.');
    } finally {
      setIsSyncing(false);
    }
  };

  // 3 Tombol Filter: Default awal menampilkan semua transaksi baru masuk
  const [filterStatus, setFilterStatus] = useState<DashboardFilterStatus>('baru_masuk');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [trxToAmbil, setTrxToAmbil] = useState<Transaksi | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [transitionInitialQuery, setTransitionInitialQuery] = useState('');

  const showAmbilNotaLama = settings?.tampilkanTombolAmbilNotaLama !== false;
  const isOwner = currentUser.role === 'owner';

  const handleHideAmbilNotaLama = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onUpdateSettings && settings) {
        onUpdateSettings({
          ...settings,
          tampilkanTombolAmbilNotaLama: false,
        });
        toast.info('Tombol Ambil Nota Lama disembunyikan. Dapat diaktifkan kembali di Pengaturan.');
      }
    },
    [onUpdateSettings, settings, toast]
  );

  // Single-pass komputasi antrean aktif, hitungan per status, & kuota bulan ini (hemat RAM/CPU)
  const { activeBranchTrx, filterCounts, currentMonthTrxCount } = useMemo(() => {
    const nowDate = new Date();
    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();

    const active: Transaksi[] = [];
    let baruMasuk = 0;
    let sedangDikerjakan = 0;
    let selesai = 0;
    let monthCount = 0;

    for (let i = 0; i < transaksiList.length; i++) {
      const trx = transaksiList[i];
      if (!trx || trx.laundryId !== activeLaundry.id) continue;

      if ((trx.tanggalMasuk || 0) >= startOfMonth) {
        monthCount++;
      }

      if (trx.status !== 'Diambil') {
        active.push(trx);
        if (trx.status === 'Diterima') baruMasuk++;
        else if (trx.status === 'Proses') sedangDikerjakan++;
        else if (trx.status === 'Selesai') selesai++;
      }
    }

    return {
      activeBranchTrx: active,
      filterCounts: {
        semua: active.length,
        baruMasuk,
        sedangDikerjakan,
        selesai,
      },
      currentMonthTrxCount: monthCount,
    };
  }, [transaksiList, activeLaundry.id]);

  const showInitialSkeleton = Boolean(isLoadingTransaksi && activeBranchTrx.length === 0);

  // Lookup map untuk data pelanggan (alamat lengkap / cadangan)
  const pelangganMap = useMemo(() => {
    const map: Record<string, Pelanggan> = {};
    if (pelangganList && pelangganList.length > 0) {
      for (let i = 0; i < pelangganList.length; i++) {
        const p = pelangganList[i];
        if (p?.nama) {
          map[p.nama.trim().toLowerCase()] = p;
        }
      }
    } else {
      try {
        const stored = StorageService.get<Pelanggan[]>('pelanggan', []);
        if (Array.isArray(stored)) {
          for (let i = 0; i < stored.length; i++) {
            const p = stored[i];
            if (p?.nama) {
              map[p.nama.trim().toLowerCase()] = p;
            }
          }
        }
      } catch {
        // ignore
      }
    }
    return map;
  }, [pelangganList]);

  const getAlamat = useCallback(
    (trx: Transaksi | null | undefined): string => {
      if (!trx) return '-';
      if (trx.alamat && trx.alamat.trim() !== '') {
        return trx.alamat.trim();
      }
      if (trx.namaPelanggan) {
        const p = pelangganMap[trx.namaPelanggan.trim().toLowerCase()];
        if (p?.alamat && p.alamat.trim() !== '') return p.alamat.trim();
        if (p?.alamatLengkap && p.alamatLengkap.trim() !== '') return p.alamatLengkap.trim();
      }
      return '-';
    },
    [pelangganMap]
  );

  const showSedangDikerjakanTab =
    !settings?.selesaikanSaatDitugaskan || filterCounts.sedangDikerjakan > 0;
  const showBaruMasukTab = true;

  useEffect(() => {
    if (!showSedangDikerjakanTab && filterStatus === 'sedang_dikerjakan') {
      setFilterStatus('semua');
    }
  }, [showSedangDikerjakanTab, filterStatus]);

  // Search & Status Filter
  const displayedTrx = useMemo(() => {
    let list = activeBranchTrx;

    if (filterStatus === 'baru_masuk') {
      list = list.filter((t) => t.status === 'Diterima');
    } else if (filterStatus === 'sedang_dikerjakan') {
      list = list.filter((t) => t.status === 'Proses');
    } else if (filterStatus === 'selesai') {
      list = list.filter((t) => t.status === 'Selesai');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((t) => {
        const nameMatch = t.namaPelanggan.toLowerCase().includes(q);
        const invMatch = t.nomorTransaksi?.toLowerCase().includes(q);
        const phoneMatch = t.nomorTelepon?.includes(q);
        const addr = getAlamat(t);
        const addrMatch = addr !== '-' && addr.toLowerCase().includes(q);
        return nameMatch || invMatch || phoneMatch || addrMatch;
      });
    }

    return list;
  }, [activeBranchTrx, filterStatus, searchQuery, getAlamat]);

  // Paginasi 10 Transaksi per Halaman (Hemat Memori & Ringan untuk HP)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(displayedTrx.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTrx = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return displayedTrx.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedTrx, validCurrentPage]);

  const limits = useMemo(() => {
    return getLaundryLimits(currentTier || currentUser.subscriptionType);
  }, [currentTier, currentUser.subscriptionType]);

  const isNewcomer = limits.tier === 'newcomer';
  const isMonthlyQuotaFull = currentMonthTrxCount >= limits.maxMonthlyTransactions;

  // Perhitungan Status Langganan & Masa Aktif
  const now = Date.now();
  const subscriptionEnd = currentUser.subscriptionEndDate || 0;
  const diffMs = subscriptionEnd - now;
  const isExpired = !isNewcomer && subscriptionEnd > 0 && diffMs <= 0;

  const formattedToday = useMemo(
    () =>
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      }).format(new Date()),
    []
  );

  const getEmptyStateMessage = useCallback(() => {
    if (searchQuery.trim()) {
      return 'Tidak ada transaksi yang cocok dengan kata kunci pencarian.';
    }
    switch (filterStatus) {
      case 'baru_masuk':
        return 'Tidak ada pesanan baru masuk saat ini.';
      case 'sedang_dikerjakan':
        return 'Tidak ada pesanan yang sedang dikerjakan saat ini.';
      case 'selesai':
        return 'Tidak ada pesanan berstatus selesai (siap diambil) saat ini.';
      default:
        return 'Tidak ada antrean transaksi aktif saat ini.';
    }
  }, [searchQuery, filterStatus]);

  // Daftar pelanggan unik HANYA dihitung saat modal transisi dibuka (tidak membebani render awal)
  const existingTransitionCustomers = useMemo(() => {
    if (!isTransitionModalOpen) return [];
    const map = new Map<string, { nama: string; nomorTelepon?: string }>();
    for (let i = 0; i < transaksiList.length; i++) {
      const t = transaksiList[i];
      if (t?.namaPelanggan) {
        const key = t.namaPelanggan.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { nama: t.namaPelanggan, nomorTelepon: t.nomorTelepon || undefined });
        }
      }
    }
    return Array.from(map.values());
  }, [isTransitionModalOpen, transaksiList]);

  const resolvedMobileLaundryName =
    typeof activeLaundry.namaLaundry === 'object'
      ? (activeLaundry.namaLaundry as { namaLaundry?: string })?.namaLaundry || "Kafela's Laundry"
      : activeLaundry.namaLaundry || "Kafela's Laundry";

  return (
    <div className="flex flex-col h-full max-h-full bg-slate-100 text-slate-800 select-none overflow-hidden relative">
      {!isMobile ? (
        /* ============================================================================
           TAMPILAN KHUSUS PC / TABLET (CODE-SPLIT LAZY CHUNK — TIDAK DIMUAT DI HP)
           ============================================================================ */
        <Suspense fallback={<DesktopWorkspaceFallback />}>
          <LazyDesktopWorkspace
            transaksiList={transaksiList}
            pengeluaranList={pengeluaranList}
            activeBranchTrxCount={activeBranchTrx.length}
            displayedTrx={displayedTrx}
            paginatedTrx={paginatedTrx}
            showInitialSkeleton={showInitialSkeleton}
            filterStatus={filterStatus}
            onChangeFilterStatus={setFilterStatus}
            filterCounts={filterCounts}
            showBaruMasukTab={showBaruMasukTab}
            showSedangDikerjakanTab={showSedangDikerjakanTab}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            validCurrentPage={validCurrentPage}
            totalPages={totalPages}
            itemsPerPage={ITEMS_PER_PAGE}
            onChangePage={setCurrentPage}
            getAlamat={getAlamat}
            getEmptyStateMessage={getEmptyStateMessage}
            settings={settings}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            laundries={laundries}
            formattedToday={formattedToday}
            limits={limits}
            isNewcomer={isNewcomer}
            isExpired={isExpired}
            currentMonthTrxCount={currentMonthTrxCount}
            isMonthlyQuotaFull={isMonthlyQuotaFull}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
            showAmbilNotaLama={showAmbilNotaLama}
            onManualSync={onSyncCloudData ? () => handleManualSync(false) : undefined}
            onHideAmbilNotaLama={handleHideAmbilNotaLama}
            onOpenTransitionModal={(q) => {
              setTransitionInitialQuery(q);
              setIsTransitionModalOpen(true);
            }}
            onSelectBranch={onSelectBranch}
            onOpenUpgradeModal={onOpenUpgradeModal}
            onOpenExpiredModal={onOpenExpiredModal}
            onOpenKelolaOwner={onOpenKelolaOwner}
            onOpenLimitModal={onOpenLimitModal}
            onOpenNewTransaksi={onOpenNewTransaksi}
            onOpenAturKas={onOpenAturKas}
            onOpenTour={onOpenTour}
            onOpenDetailTransaksi={onOpenDetailTransaksi}
            onSelesaikanTransaksi={onSelesaikanTransaksi}
            onRequestAmbilTransaksi={setTrxToAmbil}
            onOpenBukuKas={onOpenBukuKas}
            onOpenLaporan={onOpenLaporan}
          />
        </Suspense>
      ) : (
        /* ============================================================================
           TAMPILAN KHUSUS HP / MOBILE (RINGAN & CEPAT UNTUK PERANGKAT KELAS BAWAH)
           ============================================================================ */
        <>
          {/* 1. TOOLBAR ATAS (Maroon) */}
          <header className="bg-[#800000] text-white shadow-md shrink-0 z-30">
            <div className="flex items-center justify-between px-2 md:px-1 h-14">
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenArsip}
                  title="Arsip Transaksi"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
                >
                  <Archive className="w-5 h-5 text-white" />
                </button>

                <div className="relative" ref={branchDropdownRef}>
                  {laundries.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                      title="Klik untuk memilih cabang laundry"
                      className="flex flex-col items-start px-1 py-1 rounded-xl hover:bg-white/10 active:scale-98 transition max-w-[190px] cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[18px] truncate text-white tracking-wide">
                          {resolvedMobileLaundryName}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-white/90 shrink-0 transition-transform ${
                            isBranchDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </button>
                  ) : (
                    <div className="flex flex-col items-start px-1 py-1 max-w-[190px]">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[18px] truncate text-white tracking-wide">
                          {resolvedMobileLaundryName}
                        </span>
                      </div>
                    </div>
                  )}

                  {isBranchDropdownOpen && laundries.length > 1 && (
                    <div className="absolute left-0 top-full mt-1.5 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 overflow-hidden">
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Pilih Cabang
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {laundries.length} Cabang
                        </span>
                      </div>
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                        {laundries.map((lnd) => {
                          const isCurrent = lnd.id === activeLaundry.id;
                          const lndName =
                            typeof lnd.namaLaundry === 'object'
                              ? (lnd.namaLaundry as { namaLaundry?: string })?.namaLaundry ||
                                "Kafela's Laundry"
                              : lnd.namaLaundry || "Kafela's Laundry";
                          return (
                            <button
                              key={lnd.id}
                              type="button"
                              onClick={() => {
                                if (onSelectBranch) {
                                  onSelectBranch(lnd.id);
                                }
                                setIsBranchDropdownOpen(false);
                                if (!isCurrent) {
                                  toast.success(`Beralih ke cabang: ${lndName}`);
                                }
                              }}
                              className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition cursor-pointer ${
                                isCurrent
                                  ? 'bg-rose-50 text-[#800000] font-bold'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2">
                                  <Building2
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      isCurrent ? 'text-[#800000]' : 'text-slate-400'
                                    }`}
                                  />
                                  <span className="truncate">{lndName}</span>
                                </div>
                                {lnd.alamat && (
                                  <p className="text-[10px] text-slate-400 truncate pl-5 mt-0.5">
                                    {lnd.alamat}
                                  </p>
                                )}
                              </div>
                              {isCurrent && <Check className="w-4 h-4 text-[#800000] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0">
                <PWAInstallButton variant="header" />

                {onSyncCloudData && (
                  <button
                    type="button"
                    onClick={() => handleManualSync(false)}
                    disabled={isSyncing}
                    title="Sinkronisasi Paksa (Smart Delta Sync - Jeda Cooldown 10 Menit)"
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition disabled:opacity-60 cursor-pointer relative"
                  >
                    <RotateCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                )}

                <button
                  onClick={onOpenSettings}
                  title="Pengaturan"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
                >
                  <SettingsIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </header>

          {/* 2. AREA ATAS YANG BISA DI-SCROLL (Pencarian, Filter, Transaksi, Paginasi) */}
          <div className="flex-1 overflow-y-auto px-1.5 sm:px-4 md:px-6 py-1">
            <div className="max-w-7xl mx-auto w-full space-y-3 pb-2">
              <PWAInstallButton variant="banner" />

              {isExpired && !isNewcomer && (
                <div
                  onClick={() => (onOpenExpiredModal || onOpenKelolaOwner)()}
                  className="p-3 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-[#800000] text-white border border-rose-500/40 shadow-sm cursor-pointer active:scale-98 transition flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-amber-300">
                      <Clock className="w-4 h-4 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-black text-xs text-amber-300 tracking-wide uppercase">
                          Masa Langganan Habis
                        </span>
                        {currentUser.role === 'owner' && (
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-bold font-mono">
                            Saldo: {formatRupiah(currentUser.walletBalance || 0)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-rose-100 truncate mt-0.5">
                        Klik untuk lihat saldo, isi saldo, &amp; perpanjang 30 hari.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onOpenExpiredModal || onOpenKelolaOwner)();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Perpanjang
                  </button>
                </div>
              )}

              {isNewcomer && (
                <div
                  onClick={() =>
                    onOpenUpgradeModal?.(
                      'Batas kuota 50 transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai'
                    )
                  }
                  className={`p-2.5 sm:p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 shadow-2xs cursor-pointer active:scale-98 ${
                    isMonthlyQuotaFull
                      ? 'bg-rose-50 border-rose-300 text-rose-950 animate-pulse'
                      : currentMonthTrxCount >= 40
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isMonthlyQuotaFull
                          ? 'bg-rose-600 text-white'
                          : currentMonthTrxCount >= 40
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenUpgradeModal?.(
                        'Batas kuota 50 transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs shrink-0 shadow-2xs transition active:scale-95 cursor-pointer ${
                      isMonthlyQuotaFull
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {isMonthlyQuotaFull ? 'Upgrade' : 'Detail'}
                  </button>
                </div>
              )}

              {activeBranchTrx.length >= 300 && (
                <div
                  onClick={onOpenLimitModal || onOpenNewTransaksi}
                  className={`p-3 rounded-2xl border cursor-pointer active:scale-98 transition flex items-center justify-between gap-2.5 shadow-xs ${
                    activeBranchTrx.length >= 400
                      ? 'bg-red-50 border-red-300 text-red-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        activeBranchTrx.length >= 400
                          ? 'bg-red-600 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {activeBranchTrx.length >= 400 ? (
                        <Lock className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <div className="font-black flex items-center gap-1.5 flex-wrap">
                        <span>
                          {activeBranchTrx.length >= 400
                            ? 'Batas Transaksi Penuh'
                            : 'Peringatan Kuota Transaksi'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            activeBranchTrx.length >= 400
                              ? 'bg-red-200 text-red-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {activeBranchTrx.length} / 400
                        </span>
                      </div>
                      <p className="text-[11px] opacity-90 truncate mt-0.5">
                        {activeBranchTrx.length >= 400
                          ? 'Transaksi baru dikunci. Klik untuk arsipkan.'
                          : 'Capai 300+ nota. Klik untuk rapikan arsip.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onOpenLimitModal || onOpenNewTransaksi)();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 shadow-xs active:scale-95 transition ${
                      activeBranchTrx.length >= 400
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    Rapikan
                  </button>
                </div>
              )}

              {/* PENCARIAN & 3 TOMBOL FILTER BERSEBELAHAN */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2 sm:p-3 shadow-2xs space-y-1.5">
                {showAmbilNotaLama && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTransitionInitialQuery('');
                        setIsTransitionModalOpen(true);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>+ Ambil Nota Lama (Transisi Aplikasi)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleHideAmbilNotaLama}
                      title="Sembunyikan tombol (Dapat dimunculkan kembali di Pengaturan)"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 hover:text-slate-800 transition active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 items-center">
                  <div className="relative w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari pelanggan..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2 pl-9 pr-8 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div
                    className={`grid ${
                      showSedangDikerjakanTab ? 'grid-cols-3' : 'grid-cols-2'
                    } gap-1 w-full`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setFilterStatus(filterStatus === 'baru_masuk' ? 'semua' : 'baru_masuk')
                      }
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition ${
                        filterStatus === 'baru_masuk'
                          ? 'bg-rose-700 text-white shadow-sm ring-2 ring-rose-300'
                          : 'bg-rose-50/80 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] px-1 rounded-full font-black bg-rose-200 text-rose-900">
                        {filterCounts.baruMasuk}
                      </span>
                    </button>

                    {showSedangDikerjakanTab && (
                      <button
                        type="button"
                        onClick={() =>
                          setFilterStatus(
                            filterStatus === 'sedang_dikerjakan' ? 'semua' : 'sedang_dikerjakan'
                          )
                        }
                        className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition ${
                          filterStatus === 'sedang_dikerjakan'
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                            : 'bg-amber-50/80 hover:bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[10px] px-1 rounded-full font-black bg-amber-200 text-amber-900">
                          {filterCounts.sedangDikerjakan}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setFilterStatus(filterStatus === 'selesai' ? 'semua' : 'selesai')
                      }
                      className={`py-2 px-1 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition ${
                        filterStatus === 'selesai'
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-[10px] px-1 rounded-full font-black bg-emerald-200 text-emerald-900">
                        {filterCounts.selesai}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* DAFTAR TRANSAKSI AKTIF */}
              <main className="space-y-1">
                {displayedTrx.length === 0 ? (
                  showInitialSkeleton ? (
                    <div
                      className="space-y-1"
                      aria-busy="true"
                      aria-label="Memuat antrean transaksi"
                    >
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <div
                          key={idx}
                          className="p-2 sm:p-3 rounded-2xl border border-slate-200 bg-white shadow-2xs animate-pulse"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-9 shrink-0 border-r border-slate-100 pr-1.5 space-y-1.5">
                              <div className="h-2.5 w-7 rounded bg-slate-200/80 mx-auto" />
                              <div className="h-2 w-6 rounded bg-slate-100 mx-auto" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="h-3.5 w-32 rounded bg-slate-200/80" />
                                <div className="h-3 w-14 rounded bg-slate-200/70" />
                              </div>
                              <div className="h-2.5 w-44 rounded bg-slate-100" />
                            </div>
                            <div className="shrink-0 pl-1 border-l border-slate-100">
                              <div className="w-10 h-7 rounded-xl bg-slate-200/70" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 mt-0 space-y-1">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {getEmptyStateMessage()}
                      </p>
                      {searchQuery && showAmbilNotaLama && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setTransitionInitialQuery(searchQuery);
                              setIsTransitionModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs transition active:scale-95 text-left cursor-pointer"
                          >
                            <History className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Nota "{searchQuery}" tidak ada? Ambil Nota Lama</span>
                          </button>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {filterStatus !== 'semua' && (
                          <button
                            type="button"
                            onClick={() => setFilterStatus('semua')}
                            className="text-xs text-[#800000] font-bold underline hover:text-[#660000]"
                          >
                            Lihat Semua Pesanan
                          </button>
                        )}
                      </div>
                    </div>
                  )
                ) : (
                  paginatedTrx.map((trx, index) => {
                    const isLunas = trx.statusPembayaran === 'Lunas';
                    const sisa = Math.max(0, trx.totalHarga - trx.jumlahDp);
                    const isEven = index % 2 === 0;

                    const serviceText =
                      Array.isArray(trx.items) && trx.items.length > 0
                        ? trx.items
                            .map(
                              (it) =>
                                `${it?.namaLayanan || 'Layanan'} (${it?.berat || 0} ${
                                  it?.satuan || ''
                                })`
                            )
                            .join(', ')
                        : 'Layanan Cuci';

                    return (
                      <div
                        key={trx.id}
                        onClick={() => onOpenDetailTransaksi(trx.id)}
                        className={`p-1.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs cursor-pointer transition hover:border-[#800000] hover:shadow-xs ${
                          isEven ? 'bg-white' : 'bg-slate-50/80'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1">
                          <div className="w-9 shrink-0 text-center border-r border-slate-200 pr-1 flex flex-col justify-center">
                            <div className="text-[10px] text-slate-800 leading-none">
                              {formatShortTime(trx.tanggalMasuk)}
                            </div>
                            <div className="text-[9px] text-slate-400 leading-none mt-1">
                              {formatShortDate(trx.tanggalMasuk)}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[12.5px] text-slate-900 truncate">
                                {trx.namaPelanggan}
                              </span>
                              <div
                                className="text-[10px] text-slate-800 truncate"
                                title={getAlamat(trx)}
                              >
                                <span className="truncate">{getAlamat(trx)}</span>
                              </div>

                              <div className="ml-auto text-right">
                                <div
                                  className={`text-xs font-black tracking-tight leading-tight ${
                                    isLunas ? 'text-emerald-600' : 'text-red-600'
                                  }`}
                                >
                                  {isLunas ? 'Lunas' : formatRupiah(sisa).replace('Rp ', '')}
                                </div>
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-600 truncate italic">
                              {serviceText}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end justify-start gap-1 self-stretch border-l border-slate-200 pl-1 text-center">
                            <div
                              className="flex-1 w-full flex items-stretch justify-stretch"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {trx.status === 'Diterima' ? (
                                <button
                                  type="button"
                                  data-tour="btn-dashboard-kerjakan"
                                  onClick={() => onSelesaikanTransaksi(trx)}
                                  title={
                                    settings?.selesaikanSaatDitugaskan
                                      ? 'Langsung Selesai & Siap Ambil'
                                      : 'Mulai Pengerjaan'
                                  }
                                  className="w-10 min-h-[20px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              ) : trx.status === 'Proses' ? (
                                <button
                                  type="button"
                                  onClick={() => onSelesaikanTransaksi(trx)}
                                  title="Tandai Selesai"
                                  className="w-10 min-h-[20px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  data-tour="btn-diambil"
                                  onClick={() => setTrxToAmbil(trx)}
                                  title="Ambil / Serahkan ke Pelanggan"
                                  className="w-10 min-h-[20px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </main>

              {/* KONTROL PAGINASI (10 TRANSAKSI PER HALAMAN) */}
              {displayedTrx.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
                    Menampilkan{' '}
                    <span className="font-bold text-slate-800">
                      {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    -{' '}
                    <span className="font-bold text-slate-800">
                      {Math.min(validCurrentPage * ITEMS_PER_PAGE, displayedTrx.length)}
                    </span>{' '}
                    dari{' '}
                    <span className="font-bold text-[#800000]">{displayedTrx.length}</span>{' '}
                    transaksi
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validCurrentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1 active:scale-95"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Sebelumnya</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((pageNum) => {
                            return (
                              pageNum === 1 ||
                              pageNum === totalPages ||
                              Math.abs(pageNum - validCurrentPage) <= 1
                            );
                          })
                          .map((pageNum, idx, arr) => {
                            const prev = arr[idx - 1];
                            const showEllipsis = prev && pageNum - prev > 1;

                            return (
                              <React.Fragment key={pageNum}>
                                {showEllipsis && (
                                  <span className="text-xs text-slate-400 px-0.5">...</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                                    validCurrentPage === pageNum
                                      ? 'bg-[#800000] text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            );
                          })}
                      </div>

                      <button
                        type="button"
                        disabled={validCurrentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1 active:scale-95"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 5. WIDGET LAPORAN RINGKASAN HARIAN & GRAFIK (CODE-SPLIT + DEFERRED IDLE RENDER) */}
          <div className="shrink-0 z-20 bg-slate-100/95 backdrop-blur-xs px-2 sm:px-4 pt-1.5 pb-[70px] border-t border-slate-200/80 shadow-md">
            <div className="max-w-7xl mx-auto w-full">
              {isHeavyWidgetsReady ? (
                <Suspense fallback={<MobileDailyReportSkeleton collapsed={isSummaryCollapsed} />}>
                  <LazyDailyReportWidget
                    variant="mobile-bar"
                    transaksiList={transaksiList}
                    pengeluaranList={pengeluaranList}
                    activeLaundryId={activeLaundry.id}
                    currentUser={currentUser}
                    formattedToday={formattedToday}
                    isSummaryCollapsed={isSummaryCollapsed}
                    onToggleCollapse={() => setIsSummaryCollapsed((v) => !v)}
                  />
                </Suspense>
              ) : (
                <MobileDailyReportSkeleton collapsed={isSummaryCollapsed} />
              )}
            </div>
          </div>

          {/* 6. FLOATING ACTION BUTTON (+) TRANSAKSI BARU */}
          <button
            onClick={onOpenNewTransaksi}
            data-tour="btn-tambah-transaksi"
            title={
              activeBranchTrx.length >= 400
                ? 'Transaksi Baru Dikunci (Capai 400+ Pesanan). Klik untuk kelola arsip.'
                : activeBranchTrx.length >= 300
                ? 'Peringatan Batas Transaksi Aktif (300+)'
                : 'Buat Transaksi Baru'
            }
            className={`fixed ${
              isSummaryCollapsed ? 'bottom-5' : 'bottom-[20px]'
            } md:bottom-5 left-1/2 -translate-x-1/2 z-40 w-15 h-12 sm:w-17 sm:h-14 rounded-full ${
              activeBranchTrx.length >= 400
                ? 'bg-red-600 hover:bg-red-700 ring-2 ring-red-300'
                : activeBranchTrx.length >= 300
                ? 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300'
                : 'bg-[#800000] hover:bg-[#660000]'
            } text-white shadow-xl flex items-center justify-center transition-all active:scale-90 border-2 border-white`}
          >
            {activeBranchTrx.length >= 400 ? (
              <Lock className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Plus className="w-7 h-7" />
            )}
          </button>

          <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#800000] text-white h-14 flex items-center justify-around px-1 shadow-2xl border-t border-white/10 pb-safe">
            <button
              onClick={onOpenStatusPengerjaan}
              className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
              title="Status Pengerjaan Cucian & Antrean Staf"
            >
              <Shirt className="w-5 h-5 mb-0.5" />
              <span className="font-semibold tracking-tight">Pengerjaan</span>
            </button>

            <button
              onClick={onOpenBukuKas}
              className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
              title="Buku Kas Harian & Riwayat Transaksi Masuk/Keluar"
            >
              <Wallet className="w-5 h-5 mb-0.5" />
              <span className="font-semibold tracking-tight">Buku Kas</span>
            </button>

            <div className="flex-1 h-full pointer-events-none" aria-hidden="true" />

            <button
              onClick={onOpenAturKas}
              className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
              title="Atur Kas Toko (Catat Pengeluaran & Pemasukan Manual)"
            >
              <Coins className="w-5 h-5 mb-0.5" />
              <span className="font-semibold tracking-tight">Atur Kas</span>
            </button>

            {isOwner ? (
              <button
                type="button"
                onClick={onOpenLaporan}
                className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
                title="Laporan Keuangan & Grafik Analisis Bisnis"
              >
                <BarChart3 className="w-5 h-5 mb-0.5" />
                <span className="font-semibold tracking-tight">Laporan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenArsip}
                className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
                title="Arsip Cucian Diambil"
              >
                <Archive className="w-5 h-5 mb-0.5" />
                <span className="font-semibold tracking-tight">Arsip</span>
              </button>
            )}
          </nav>
        </>
      )}

      {/* MODAL KONFIRMASI PENGAMBILAN TRANSAKSI (LAZY CHUNK) */}
      {trxToAmbil && (
        <Suspense fallback={null}>
          <LazyPickupConfirmModal
            transaksi={trxToAmbil}
            alamat={getAlamat(trxToAmbil)}
            onCancel={() => setTrxToAmbil(null)}
            onConfirm={(trx) => {
              onAmbilTransaksi(trx);
              setTrxToAmbil(null);
            }}
          />
        </Suspense>
      )}

      {/* MODAL INPUT KILAT AMBIL NOTA LAMA (LAZY CHUNK — HANYA DIMUAT SAAT DIBUKA) */}
      {isTransitionModalOpen && (
        <Suspense fallback={null}>
          <LazyQuickTransitionPickupModal
            isOpen={isTransitionModalOpen}
            onClose={() => setIsTransitionModalOpen(false)}
            initialQuery={transitionInitialQuery}
            existingCustomers={existingTransitionCustomers}
            onSave={(data) => {
              setIsTransitionModalOpen(false);
              if (onSaveTransitionPickup) {
                onSaveTransitionPickup(data);
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};
