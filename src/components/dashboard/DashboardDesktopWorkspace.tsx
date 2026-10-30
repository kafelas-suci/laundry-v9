import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  History,
  Lock,
  MapPin,
  Plus,
  Receipt,
  RotateCw,
  Search,
  ShieldAlert,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import { Laundry, Pengeluaran, SettingsData, Transaksi, User } from '../../types';
import { formatRupiah, formatShortDate, formatShortTime } from '../../utils/formatters';
import type { getLaundryLimits } from '../../utils/subscription';
import { PWAInstallButton } from '../PWAInstallButton';
import { useToast } from '../NotificationContext';
import { useDeferredWidgetMount } from './useDeferredWidgetMount';
import type { DashboardFilterStatus } from '../../views/DashboardView';

const LazyDailyReportWidget = lazy(() => import('./DashboardDailyReportWidget'));

export interface DashboardDesktopWorkspaceProps {
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeBranchTrxCount: number;
  displayedTrx: Transaksi[];
  paginatedTrx: Transaksi[];
  showInitialSkeleton: boolean;
  filterStatus: DashboardFilterStatus;
  onChangeFilterStatus: (status: DashboardFilterStatus) => void;
  filterCounts: {
    semua: number;
    baruMasuk: number;
    sedangDikerjakan: number;
    selesai: number;
  };
  showBaruMasukTab: boolean;
  showSedangDikerjakanTab: boolean;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  validCurrentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onChangePage: (page: number) => void;
  getAlamat: (trx: Transaksi | null | undefined) => string;
  getEmptyStateMessage: () => string;
  settings: SettingsData;
  currentUser: User;
  activeLaundry: Laundry;
  laundries: Laundry[];
  formattedToday: string;
  limits: ReturnType<typeof getLaundryLimits>;
  isNewcomer: boolean;
  isExpired: boolean;
  currentMonthTrxCount: number;
  isMonthlyQuotaFull: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  showAmbilNotaLama: boolean;
  onManualSync?: () => void;
  onHideAmbilNotaLama: (e: React.MouseEvent) => void;
  onOpenTransitionModal: (initialQuery: string) => void;
  onSelectBranch?: (laundryId: string) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
  onOpenExpiredModal?: () => void;
  onOpenKelolaOwner: () => void;
  onOpenLimitModal?: () => void;
  onOpenNewTransaksi: () => void;
  onOpenAturKas: () => void;
  onOpenTour?: () => void;
  onOpenDetailTransaksi: (id: string) => void;
  onSelesaikanTransaksi: (trx: Transaksi) => void;
  onRequestAmbilTransaksi: (trx: Transaksi) => void;
  onOpenBukuKas: () => void;
  onOpenLaporan: () => void;
}

const DesktopKpiSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 animate-pulse" aria-hidden="true">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs h-[98px] flex flex-col justify-between"
      >
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 rounded bg-slate-200/80" />
          <div className="w-7 h-7 rounded-lg bg-slate-100" />
        </div>
        <div className="space-y-1.5">
          <div className="h-5 w-24 rounded bg-slate-200/80" />
          <div className="h-2.5 w-32 rounded bg-slate-100" />
        </div>
      </div>
    ))}
  </div>
);

const DesktopSidebarReportSkeleton: React.FC = () => (
  <div
    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5 animate-pulse"
    aria-hidden="true"
  >
    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
      <div className="space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-slate-200/80" />
        <div className="h-2.5 w-24 rounded bg-slate-100" />
      </div>
      <div className="h-6 w-20 rounded-lg bg-slate-100" />
    </div>
    <div className="space-y-2">
      <div className="h-10 rounded-xl bg-slate-50 border border-slate-100" />
      <div className="h-10 rounded-xl bg-slate-50 border border-slate-100" />
      <div className="h-10 rounded-xl bg-emerald-50/50 border border-emerald-100" />
    </div>
    <div className="pt-2 border-t border-slate-100 space-y-2">
      <div className="h-3.5 w-full rounded bg-slate-100" />
      <div className="h-3.5 w-full rounded bg-slate-100" />
      <div className="h-3.5 w-full rounded bg-slate-100" />
    </div>
    <div className="h-20 rounded-xl bg-slate-50 border border-slate-100" />
  </div>
);

export const DashboardDesktopWorkspace: React.FC<DashboardDesktopWorkspaceProps> = ({
  transaksiList,
  pengeluaranList,
  activeBranchTrxCount,
  displayedTrx,
  paginatedTrx,
  showInitialSkeleton,
  filterStatus,
  onChangeFilterStatus,
  filterCounts,
  showBaruMasukTab,
  showSedangDikerjakanTab,
  searchQuery,
  onChangeSearchQuery,
  validCurrentPage,
  totalPages,
  itemsPerPage,
  onChangePage,
  getAlamat,
  getEmptyStateMessage,
  settings,
  currentUser,
  activeLaundry,
  laundries,
  formattedToday,
  limits,
  isNewcomer,
  isExpired,
  currentMonthTrxCount,
  isMonthlyQuotaFull,
  isSyncing,
  lastSyncTime,
  showAmbilNotaLama,
  onManualSync,
  onHideAmbilNotaLama,
  onOpenTransitionModal,
  onSelectBranch,
  onOpenUpgradeModal,
  onOpenExpiredModal,
  onOpenKelolaOwner,
  onOpenLimitModal,
  onOpenNewTransaksi,
  onOpenAturKas,
  onOpenTour,
  onOpenDetailTransaksi,
  onSelesaikanTransaksi,
  onRequestAmbilTransaksi,
  onOpenBukuKas,
  onOpenLaporan,
}) => {
  const toast = useToast();
  const isHeavyWidgetsReady = useDeferredWidgetMount();
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const desktopBranchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isBranchDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (desktopBranchDropdownRef.current && !desktopBranchDropdownRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBranchDropdownOpen]);

  const resolvedLaundryName =
    typeof activeLaundry.namaLaundry === 'object'
      ? (activeLaundry.namaLaundry as { namaLaundry?: string })?.namaLaundry || "Kafela's Laundry"
      : activeLaundry.namaLaundry || "Kafela's Laundry";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Bar PC / Tablet */}
      <header className="bg-white border-b border-slate-200/90 px-6 h-16 flex items-center justify-between shrink-0 z-20 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base text-slate-900 tracking-tight">
                Dashboard Antrean &amp; Kasir
              </h1>
              {laundries.length > 1 ? (
                <div className="relative inline-block" ref={desktopBranchDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    title="Klik untuk memilih cabang laundry"
                    className="px-2 py-0.5 rounded-md bg-rose-50 text-[#800000] border border-rose-200/80 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <span>{resolvedLaundryName}</span>
                    <ChevronDown
                      className={`w-3 h-3 text-[#800000]/80 transition-transform ${
                        isBranchDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isBranchDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 text-slate-800 animate-in fade-in zoom-in-95 overflow-hidden">
                      <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          Pilih Cabang
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {laundries.length} Cabang
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
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
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#800000] border border-rose-200/80 text-[11px] font-bold">
                  {resolvedLaundryName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
              {formattedToday} • {activeLaundry.alamat || 'Operasional Kasir Aktif'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <PWAInstallButton variant="header" />

          {onManualSync && (
            <button
              type="button"
              onClick={onManualSync}
              disabled={isSyncing}
              title="Sinkronisasi Paksa (Smart Delta Sync - Hemat Kuota, Jeda Cooldown 10 Menit)"
              className="px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-xs font-bold text-blue-900 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60 cursor-pointer shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">
                {isSyncing ? 'Menyinkron...' : 'Sinkronisasi Paksa'}
              </span>
              {lastSyncTime > 0 && !isSyncing && (
                <span className="text-[10px] font-normal text-blue-600/80 hidden 2xl:inline tabular-nums">
                  •{' '}
                  {new Date(lastSyncTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </button>
          )}

          {showAmbilNotaLama && (
            <div className="inline-flex items-center rounded-xl bg-amber-600 shadow-2xs overflow-hidden group">
              <button
                type="button"
                onClick={() => onOpenTransitionModal('')}
                title="Ambil & Pelunasan Nota Lama dari Aplikasi Sebelumnya (Transisi Cepat)"
                className="px-3.5 py-2 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-amber-100" />
                <span>Ambil Nota Lama</span>
              </button>
              <button
                type="button"
                onClick={onHideAmbilNotaLama}
                title="Sembunyikan tombol (Dapat dimunculkan kembali di Pengaturan)"
                className="px-2 py-2.5 bg-amber-700/80 hover:bg-amber-800 active:bg-amber-900 text-amber-200 hover:text-white transition flex items-center justify-center cursor-pointer border-l border-amber-500/40"
              >
                <X className="w-3.5 h-3.5" />
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
              title={`Terpakai ${currentMonthTrxCount} dari ${limits.maxMonthlyTransactions} nota bulan ini. Klik untuk lihat opsi upgrade.`}
              className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition cursor-pointer select-none active:scale-95 ${
                isMonthlyQuotaFull
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Receipt
                className={`w-3.5 h-3.5 ${isMonthlyQuotaFull ? 'text-rose-600' : 'text-[#800000]'}`}
              />
              <span className="font-mono tabular-nums">
                {currentMonthTrxCount} / {limits.maxMonthlyTransactions} Nota
              </span>
              {isMonthlyQuotaFull ? (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-black uppercase">
                  Penuh
                </span>
              ) : (
                <span className="text-[10px] text-emerald-700 font-semibold hidden xl:inline">
                  Gratis
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenAturKas}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Catat Kas</span>
          </button>

          <button
            type="button"
            onClick={onOpenTour}
            className="px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Mulai Tur Panduan Interaktif"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mulai Tur</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewTransaksi}
            data-tour="btn-tambah-transaksi"
            title={
              activeBranchTrxCount >= 400
                ? 'Transaksi baru dikunci (Capai 400+ pesanan). Klik untuk kelola arsip.'
                : activeBranchTrxCount >= 300
                ? 'Peringatan: 300+ pesanan aktif belum diambil'
                : 'Buat Transaksi Baru'
            }
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              activeBranchTrxCount >= 400
                ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-200'
                : activeBranchTrxCount >= 300
                ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-200'
                : 'bg-[#800000] hover:bg-[#660000] text-white'
            }`}
          >
            {activeBranchTrxCount >= 400 ? (
              <Lock className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <Plus className="w-4 h-4 stroke-[2.5]" />
            )}
            <span>Transaksi Baru</span>
            {activeBranchTrxCount >= 400 ? (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">
                Terkunci
              </span>
            ) : activeBranchTrxCount >= 300 ? (
              <span className="text-[10px] bg-amber-800 text-amber-100 px-1.5 py-0.5 rounded font-black">
                300+
              </span>
            ) : null}
          </button>
        </div>
      </header>

      {/* Main Scrollable PC / Tablet Workspace */}
      <div className="flex-1 overflow-y-auto p-5 lg:p-6">
        <div className="max-w-7xl mx-auto w-full space-y-5">
          <PWAInstallButton variant="banner" />

          {/* Alert Banner Batas Transaksi Aktif (>= 300 Peringatan, >= 400 Terkunci) */}
          {activeBranchTrxCount >= 300 && (
            <div
              onClick={onOpenLimitModal || onOpenNewTransaksi}
              className={`p-4 rounded-2xl border cursor-pointer active:scale-99 transition flex items-center justify-between gap-3 shadow-xs ${
                activeBranchTrxCount >= 400
                  ? 'bg-red-50 border-red-300 text-red-950'
                  : 'bg-amber-50 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                    activeBranchTrxCount >= 400
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  {activeBranchTrxCount >= 400 ? (
                    <Lock className="w-5 h-5 stroke-[2.5]" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                  )}
                </div>
                <div className="min-w-0 text-xs">
                  <div className="font-black flex items-center gap-2 flex-wrap">
                    <span className="text-sm">
                      {activeBranchTrxCount >= 400
                        ? 'Batas Maksimal Tercapai: Pembuatan Transaksi Baru Terkunci!'
                        : 'Peringatan: Transaksi Aktif Mendekati Batas Maksimal'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                        activeBranchTrxCount >= 400
                          ? 'bg-red-200 text-red-900'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {activeBranchTrxCount} / 400 Pesanan
                    </span>
                  </div>
                  <p className="text-xs opacity-90 mt-0.5">
                    {activeBranchTrxCount >= 400
                      ? 'Anda tidak dapat membuat transaksi baru sampai dilakukan pengarsipan pesanan yang menumpuk. Klik di sini untuk mengarsipkan cepat.'
                      : 'Sudah mencapai 300+ pesanan belum diambil. Klik di sini untuk menandai sudah diambil atau mengarsipkan pesanan lama.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (onOpenLimitModal || onOpenNewTransaksi)();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 shadow-xs active:scale-95 transition cursor-pointer ${
                  activeBranchTrxCount >= 400
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                Kelola Arsip Cepat
              </button>
            </div>
          )}

          {/* Alert Banner Masa Langganan Habis (PC) */}
          {isExpired && !isNewcomer && (
            <div
              onClick={() => (onOpenExpiredModal || onOpenKelolaOwner)()}
              className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-[#800000] text-white border border-rose-500/40 shadow-sm cursor-pointer active:scale-98 transition flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 text-amber-300">
                  <Clock className="w-5 h-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-amber-300 tracking-wider uppercase">
                      Masa Langganan Habis (0 Hari Tersisa)
                    </span>
                    {currentUser.role === 'owner' && (
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold font-mono">
                        Saldo Dompet: {formatRupiah(currentUser.walletBalance || 0)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Hari langganan akun Anda telah berakhir. Klik di sini untuk melihat saldo, mengisi saldo, dan perpanjang 30 hari.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (onOpenExpiredModal || onOpenKelolaOwner)();
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shrink-0 shadow-sm transition active:scale-95 cursor-pointer"
              >
                Perpanjang 30 Hari
              </button>
            </div>
          )}

          {/* Baris Kartu Ringkasan KPI Harian (Code-Split + Deferred Render) */}
          {isHeavyWidgetsReady ? (
            <Suspense fallback={<DesktopKpiSkeleton />}>
              <LazyDailyReportWidget
                variant="desktop-kpi"
                transaksiList={transaksiList}
                pengeluaranList={pengeluaranList}
                activeLaundryId={activeLaundry.id}
                currentUser={currentUser}
                formattedToday={formattedToday}
              />
            </Suspense>
          ) : (
            <DesktopKpiSkeleton />
          )}

          {/* Area Kerja Utama: Daftar Antrean & Panel Ringkasan Kanan */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Kolom Kiri (Utama): Pencarian, Filter & Tabel Antrean */}
            <div className="xl:col-span-8 2xl:col-span-9 space-y-3.5">
              {/* Bar Pencarian & Filter */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => onChangeSearchQuery(e.target.value)}
                    placeholder="Cari nama pelanggan, nomor nota, atau telepon..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-8 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => onChangeSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeFilterStatus('semua')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      filterStatus === 'semua'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>Semua</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-white/20">
                      {filterCounts.semua}
                    </span>
                  </button>

                  {showBaruMasukTab && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeFilterStatus(
                          filterStatus === 'baru_masuk' ? 'semua' : 'baru_masuk'
                        )
                      }
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        filterStatus === 'baru_masuk'
                          ? 'bg-rose-700 text-white shadow-2xs ring-2 ring-rose-200'
                          : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Baru Masuk</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-rose-200 text-rose-900">
                        {filterCounts.baruMasuk}
                      </span>
                    </button>
                  )}

                  {showSedangDikerjakanTab && (
                    <button
                      type="button"
                      onClick={() =>
                        onChangeFilterStatus(
                          filterStatus === 'sedang_dikerjakan' ? 'semua' : 'sedang_dikerjakan'
                        )
                      }
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                        filterStatus === 'sedang_dikerjakan'
                          ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>Dikerjakan</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-amber-200 text-amber-900">
                        {filterCounts.sedangDikerjakan}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onChangeFilterStatus(filterStatus === 'selesai' ? 'semua' : 'selesai')
                    }
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      filterStatus === 'selesai'
                        ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-200'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Siap Ambil</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black bg-emerald-200 text-emerald-900">
                      {filterCounts.selesai}
                    </span>
                  </button>
                </div>
              </div>

              {/* Daftar Antrean Transaksi (PC / Tablet Table Card List) */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <div className="col-span-2">Alamat &amp; Waktu</div>
                  <div className="col-span-3">Pelanggan</div>
                  <div className="col-span-3">Rincian Layanan</div>
                  <div className="col-span-2 text-right">Tagihan &amp; Status</div>
                  <div className="col-span-2 text-right">Aksi Cepat</div>
                </div>

                {displayedTrx.length === 0 ? (
                  showInitialSkeleton ? (
                    <div
                      className="divide-y divide-slate-100"
                      aria-busy="true"
                      aria-label="Memuat antrean transaksi"
                    >
                      {[0, 1, 2, 3, 4].map((idx) => (
                        <div
                          key={idx}
                          className="px-4 py-3 grid grid-cols-12 gap-3 items-center animate-pulse"
                        >
                          <div className="col-span-2 space-y-1.5">
                            <div className="h-3.5 w-24 rounded bg-slate-200/80" />
                            <div className="h-2.5 w-20 rounded bg-slate-100" />
                          </div>
                          <div className="col-span-3 space-y-1.5">
                            <div className="h-4 w-32 rounded bg-slate-200/80" />
                            <div className="h-2.5 w-24 rounded bg-slate-100" />
                          </div>
                          <div className="col-span-3 space-y-1.5">
                            <div className="h-3.5 w-40 rounded bg-slate-200/80" />
                            <div className="h-2.5 w-24 rounded bg-slate-100" />
                          </div>
                          <div className="col-span-2 flex flex-col items-end space-y-1.5">
                            <div className="h-3.5 w-20 rounded bg-slate-200/80" />
                            <div className="h-2.5 w-14 rounded bg-slate-100" />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <div className="h-8 w-24 rounded-xl bg-slate-200/70" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center space-y-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">
                        {getEmptyStateMessage()}
                      </p>
                      {searchQuery && showAmbilNotaLama && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => onOpenTransitionModal(searchQuery)}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                          >
                            <History className="w-4 h-4 text-amber-600" />
                            <span>
                              Nota "{searchQuery}" tidak ada di sistem baru? Klik untuk Ambil Nota
                              Lama (10 Detik)
                            </span>
                          </button>
                        </div>
                      )}
                      {filterStatus !== 'semua' && (
                        <button
                          type="button"
                          onClick={() => onChangeFilterStatus('semua')}
                          className="text-xs text-[#800000] font-bold underline hover:text-[#660000] cursor-pointer"
                        >
                          Lihat Semua Pesanan Aktif
                        </button>
                      )}
                    </div>
                  )
                ) : (
                  <div className="divide-y divide-slate-100">
                    {paginatedTrx.map((trx, index) => {
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
                          className={`px-4 py-3 grid grid-cols-12 gap-3 items-center cursor-pointer transition hover:bg-rose-50/40 ${
                            isEven ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <div className="col-span-2 min-w-0">
                            <div
                              className="text-xs font-bold text-slate-800 truncate flex items-center gap-1"
                              title={getAlamat(trx)}
                            >
                              <MapPin className="w-3.5 h-3.5 text-rose-600/70 shrink-0" />
                              <span className="truncate">{getAlamat(trx)}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {formatShortDate(trx.tanggalMasuk)} • {formatShortTime(trx.tanggalMasuk)}
                            </div>
                          </div>

                          <div className="col-span-3 min-w-0">
                            <div className="font-bold text-sm text-slate-900 truncate">
                              {trx.namaPelanggan}
                            </div>
                            {trx.nomorTelepon ? (
                              <div className="text-[11px] text-slate-400 truncate">
                                {trx.nomorTelepon}
                              </div>
                            ) : trx.nomorTransaksi ? (
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                {trx.nomorTransaksi}
                              </div>
                            ) : null}
                          </div>

                          <div className="col-span-3 min-w-0">
                            <div className="text-xs text-slate-700 font-medium line-clamp-2">
                              {serviceText}
                            </div>
                            {trx.dikerjakanOleh && (
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                Staf: {trx.dikerjakanOleh}
                              </div>
                            )}
                          </div>

                          <div className="col-span-2 text-right">
                            <div className="text-xs font-extrabold text-slate-900 tabular-nums">
                              {formatRupiah(trx.totalHarga)}
                            </div>
                            <div
                              className={`text-[11px] font-black mt-0.5 tabular-nums ${
                                isLunas ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {isLunas ? 'LUNAS' : `Sisa ${formatRupiah(sisa).replace('Rp ', '')}`}
                            </div>
                          </div>

                          <div
                            className="col-span-2 flex justify-end"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {trx.status === 'Diterima' ? (
                              settings?.selesaikanSaatDitugaskan ? (
                                <button
                                  type="button"
                                  data-tour="btn-dashboard-kerjakan"
                                  onClick={() => onSelesaikanTransaksi(trx)}
                                  title="Langsung Selesai & Siap Ambil"
                                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>Selesai</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  data-tour="btn-dashboard-kerjakan"
                                  onClick={() => onSelesaikanTransaksi(trx)}
                                  title="Mulai Pengerjaan"
                                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Proses</span>
                                </button>
                              )
                            ) : trx.status === 'Proses' ? (
                              <button
                                type="button"
                                onClick={() => onSelesaikanTransaksi(trx)}
                                title="Tandai Selesai"
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Selesai</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-tour="btn-diambil"
                                onClick={() => onRequestAmbilTransaksi(trx)}
                                title="Ambil / Serahkan ke Pelanggan"
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Serahkan</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {displayedTrx.length > 0 && (
                  <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500 font-medium">
                      Menampilkan{' '}
                      <span className="font-bold text-slate-800">
                        {(validCurrentPage - 1) * itemsPerPage + 1}
                      </span>{' '}
                      -{' '}
                      <span className="font-bold text-slate-800">
                        {Math.min(validCurrentPage * itemsPerPage, displayedTrx.length)}
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
                          onClick={() => onChangePage(Math.max(1, validCurrentPage - 1))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer"
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
                                    onClick={() => onChangePage(pageNum)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                                      validCurrentPage === pageNum
                                        ? 'bg-[#800000] text-white shadow-2xs'
                                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
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
                          onClick={() => onChangePage(Math.min(totalPages, validCurrentPage + 1))}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1 cursor-pointer"
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

            {/* Kolom Kanan: Panel Ringkasan Laporan Harian & Grafik Tren (Code-Split + Deferred Render) */}
            <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
              {isHeavyWidgetsReady ? (
                <Suspense fallback={<DesktopSidebarReportSkeleton />}>
                  <LazyDailyReportWidget
                    variant="desktop-sidebar"
                    transaksiList={transaksiList}
                    pengeluaranList={pengeluaranList}
                    activeLaundryId={activeLaundry.id}
                    currentUser={currentUser}
                    formattedToday={formattedToday}
                    onOpenBukuKas={onOpenBukuKas}
                    onOpenLaporan={onOpenLaporan}
                  />
                </Suspense>
              ) : (
                <DesktopSidebarReportSkeleton />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDesktopWorkspace;
