import React, { useState, useMemo, useEffect } from 'react';
import {
  Archive,
  Settings as SettingsIcon,
  Search,
  Plus,
  DollarSign,
  FileText,
  Clock,
  Sparkles,
  CheckCircle,
  Truck,
  Building2,
  ChevronDown,
  Download,
  AlertCircle,
  Smartphone,
  Inbox,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lock,
  ShieldAlert,
  Crown,
  RotateCw,
  Cloud,
  Shirt,
  Wallet,
  Coins,
  BarChart3,
  History,
  X,
} from 'lucide-react';
import { Transaksi, SettingsData, User, Laundry, Pengeluaran } from '../types';
import { formatRupiah, formatShortDate, formatShortTime, extractTransaksiCashInEntries } from '../utils/formatters';
import { IndexedDbService } from '../utils/indexedDb';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { getLaundryLimits } from '../utils/subscription';
import { QuickTransitionPickupModal, TransitionPickupData } from '../components/QuickTransitionPickupModal';
import { useToast } from '../components/NotificationContext';

export type DashboardFilterStatus = 'semua' | 'selesai' | 'baru_masuk' | 'sedang_dikerjakan';

interface DashboardViewProps {
  transaksiList: Transaksi[];
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
  onOpenApkModal: () => void;
  onOpenKelolaPelanggan: () => void;
  onOpenKelolaLayanan: () => void;
  onOpenKelolaOwner: () => void;
  onSyncCloudData?: () => Promise<void> | void;
  onSelesaikanTransaksi: (transaksi: Transaksi) => void;
  onAmbilTransaksi: (transaksi: Transaksi) => void;
  onAmbilBanyakTransaksi?: (transaksiList: Transaksi[]) => void;
  onSaveTransitionPickup?: (data: TransitionPickupData) => void;
  onUpdateSettings?: (settings: SettingsData) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transaksiList,
  currentUser,
  activeLaundry,
  laundries,
  pengeluaranList = [],
  isMobile = false,
  deviceInfo,
  currentTier,
  onOpenUpgradeModal,
  onOpenExpiredModal,
  onOpenNewTransaksi,
  onOpenLimitModal,
  onOpenDetailTransaksi,
  onOpenArsip,
  onOpenSettings,
  onOpenStatusPengerjaan,
  onOpenBukuKas,
  onOpenLaporan,
  onOpenAturKas,
  onOpenSwitchBranch,
  onOpenApkModal,
  onOpenKelolaPelanggan,
  onOpenKelolaLayanan,
  onOpenKelolaOwner,
  onSyncCloudData,
  onSelesaikanTransaksi,
  onAmbilTransaksi,
  onAmbilBanyakTransaksi,
  onSaveTransitionPickup,
  onUpdateSettings,
  settings,
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  // 3 Tombol Filter: Default awal menampilkan semua transaksi baru masuk
  const [filterStatus, setFilterStatus] = useState<DashboardFilterStatus>('baru_masuk');
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [trxToAmbil, setTrxToAmbil] = useState<Transaksi | null>(null);
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false);
  const [transitionInitialQuery, setTransitionInitialQuery] = useState('');

  const showAmbilNotaLama = settings?.tampilkanTombolAmbilNotaLama !== false;

  const handleHideAmbilNotaLama = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateSettings && settings) {
      onUpdateSettings({
        ...settings,
        tampilkanTombolAmbilNotaLama: false,
      });
      toast.info('Tombol Ambil Nota Lama disembunyikan. Dapat diaktifkan kembali di Pengaturan.');
    }
  };

  const handleManualSync = async () => {
    if (isSyncing || !onSyncCloudData) return;
    setIsSyncing(true);
    try {
      await onSyncCloudData();
    } finally {
      setIsSyncing(false);
    }
  };

  // Filter transactions for active branch (exclude archived/picked-up)
  const activeBranchTrx = useMemo(() => {
    return transaksiList.filter((trx) => trx.laundryId === activeLaundry.id && trx.status !== 'Diambil');
  }, [transaksiList, activeLaundry.id]);

  // Count items per category
  const filterCounts = useMemo(() => {
    let baruMasuk = 0;
    let sedangDikerjakan = 0;
    let selesai = 0;

    activeBranchTrx.forEach((t) => {
      if (t.status === 'Diterima') baruMasuk++;
      else if (t.status === 'Proses') sedangDikerjakan++;
      else if (t.status === 'Selesai') selesai++;
    });

    return {
      semua: activeBranchTrx.length,
      baruMasuk,
      sedangDikerjakan,
      selesai,
    };
  }, [activeBranchTrx]);

  // Alur langsung selesai (tanpa melalui status kuning / sedang dikerjakan):
  // 1. Tab Jam Merah ('Baru Masuk') SELALU DITAMPILKAN
  // 2. Tab 'Sedang Dikerjakan' (kuning) DIHILANGKAN jika opsi ini aktif (kecuali jika masih ada data cucian lama yang berstatus proses)
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
        return nameMatch || invMatch || phoneMatch;
      });
    }

    return list;
  }, [activeBranchTrx, filterStatus, searchQuery]);

  // Paginasi 10 Transaksi per Halaman (Hemat Memori & Ringan untuk HP)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset halaman saat filter status atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(displayedTrx.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedTrx = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return displayedTrx.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedTrx, validCurrentPage]);

  // Daily statistics calculation
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();

    const branchAll = transaksiList.filter((t) => t.laundryId === activeLaundry.id);

    const masukHariIni = branchAll.filter((t) => t.tanggalMasuk >= startOfToday);
    const diambilHariIni = branchAll.filter((t) => (t.tanggalPengambilan || 0) >= startOfToday);
    const selesaiHariIni = branchAll.filter((t) => (t.tanggalStatusSelesai || 0) >= startOfToday);

    // Calculate income today (Hanya uang riil yang masuk hari ini)
    let totalUangMasuk = 0;
    masukHariIni.forEach((t) => {
      const bayarAwal = Math.min(t.totalHarga, t.jumlahDp || 0);
      totalUangMasuk += bayarAwal;
    });

    // Add settlement for collected today
    diambilHariIni.forEach((t) => {
      if (t.statusPembayaran === 'Lunas') {
        const pelunasan = Math.max(0, t.totalHarga - (t.jumlahDp || 0));
        totalUangMasuk += pelunasan;
      }
    });

    const harusSelesaiHariIni = activeBranchTrx.filter((t) => {
      if (t.status === 'Selesai') return false;
      if (!t.tanggalSelesai) return false;
      return t.tanggalSelesai <= Date.now() + 24 * 60 * 60 * 1000;
    }).length;

    const readyCount = activeBranchTrx.filter((t) => t.status === 'Selesai').length;

    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;

    const totalPengeluaranHariIni = (pengeluaranList || [])
      .filter((p) => p.laundryId === activeLaundry.id && p.tanggal >= startOfToday && p.tanggal <= endOfToday)
      .reduce((sum, item) => sum + (item.jumlah || 0), 0);

    return {
      transaksiMasuk: masukHariIni.length,
      transaksiDiambil: diambilHariIni.length,
      transaksiSelesai: selesaiHariIni.length,
      harusSelesai: harusSelesaiHariIni,
      totalUangMasuk,
      totalPengeluaran: totalPengeluaranHariIni,
      readyCount,
    };
  }, [transaksiList, activeLaundry.id, activeBranchTrx, pengeluaranList]);

  const totalLaba = Math.max(0, stats.totalUangMasuk - stats.totalPengeluaran);

  // Perhitungan Status Langganan & Masa Aktif
  const now = Date.now();
  const subscriptionEnd = currentUser.subscriptionEndDate || (now + 30 * 24 * 60 * 60 * 1000);
  const diffMs = subscriptionEnd - now;
  const sisaHari = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpiringSoon = sisaHari <= 5 && sisaHari > 0;
  const isExpired = diffMs <= 0;

  const formatTanggalKadaluarsa = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(subscriptionEnd));
  }, [subscriptionEnd]);

  const limits = useMemo(() => {
    return getLaundryLimits(currentTier || currentUser.subscriptionType);
  }, [currentTier, currentUser.subscriptionType]);

  const isNewcomer = limits.tier === 'newcomer';
  const paketNama = limits.label;

  const formattedToday = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  }).format(new Date());

  const getEmptyStateMessage = () => {
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
  };
 
  return (
    <div className="flex flex-col h-full max-h-full bg-slate-100 text-slate-800 select-none overflow-hidden relative">
      {!isMobile ? (
        /* ============================================================================
           TAMPILAN KHUSUS PC / TABLET (WEB WORKSPACE DENGAN SIDEBAR)
           ============================================================================ */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header Bar PC / Tablet */}
          <header className="bg-white border-b border-slate-200/90 px-6 h-16 flex items-center justify-between shrink-0 z-20 shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-black text-base text-slate-900 tracking-tight">
                    Dashboard Antrean & Kasir
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-[#800000] border border-rose-200/80 text-[11px] font-bold">
                    {typeof activeLaundry.namaLaundry === 'object' ? (activeLaundry.namaLaundry as any)?.namaLaundry || "Kafela's Laundry" : (activeLaundry.namaLaundry || "Kafela's Laundry")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium capitalize mt-0.5">
                  {formattedToday} • {activeLaundry.alamat || 'Operasional Kasir Aktif'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <PWAInstallButton variant="header" />

              {/* Badge Status & Sisa Hari Langganan PC */}
       
              {laundries.length > 1 && (
                <button
                  type="button"
                  onClick={onOpenSwitchBranch}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#800000]" />
                  <span>Ganti Cabang</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              )}

              {onSyncCloudData && (
                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  title="Sinkronkan data dengan database Cloud (Firestore)"
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xl:inline">{isSyncing ? 'Menyinkron...' : 'Sinkron Cloud'}</span>
                </button>
              )}

              {showAmbilNotaLama && (
                <div className="inline-flex items-center rounded-xl bg-amber-600 shadow-2xs overflow-hidden group">
                  <button
                    type="button"
                    onClick={() => {
                      setTransitionInitialQuery('');
                      setIsTransitionModalOpen(true);
                    }}
                    title="Ambil & Pelunasan Nota Lama dari Aplikasi Sebelumnya (Transisi Cepat)"
                    className="px-3.5 py-2 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <History className="w-3.5 h-3.5 text-amber-100" />
                    <span>Ambil Nota Lama</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleHideAmbilNotaLama}
                    title="Sembunyikan tombol (Dapat dimunculkan kembali di Pengaturan)"
                    className="px-2 py-2.5 bg-amber-700/80 hover:bg-amber-800 active:bg-amber-900 text-amber-200 hover:text-white transition flex items-center justify-center cursor-pointer border-l border-amber-500/40"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onOpenAturKas}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 transition active:scale-95"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Catat Kas</span>
              </button>

              <button
                type="button"
                onClick={onOpenNewTransaksi}
                title={
                  activeBranchTrx.length >= 400
                    ? 'Transaksi baru dikunci (Capai 400+ pesanan). Klik untuk kelola arsip.'
                    : activeBranchTrx.length >= 300
                    ? 'Peringatan: 300+ pesanan aktif belum diambil'
                    : 'Buat Transaksi Baru'
                }
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition active:scale-95 ${
                  activeBranchTrx.length >= 400
                    ? 'bg-red-600 hover:bg-red-700 text-white ring-2 ring-red-200'
                    : activeBranchTrx.length >= 300
                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-200'
                    : 'bg-[#800000] hover:bg-[#660000] text-white'
                }`}
              >
                {activeBranchTrx.length >= 400 ? (
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                )}
                <span>Transaksi Baru</span>
                {activeBranchTrx.length >= 400 ? (
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-black">
                    Terkunci
                  </span>
                ) : activeBranchTrx.length >= 300 ? (
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
              {activeBranchTrx.length >= 300 && (
                <div
                  onClick={onOpenLimitModal || onOpenNewTransaksi}
                  className={`p-4 rounded-2xl border cursor-pointer active:scale-99 transition flex items-center justify-between gap-3 shadow-xs ${
                    activeBranchTrx.length >= 400
                      ? 'bg-red-50 border-red-300 text-red-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                        activeBranchTrx.length >= 400 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {activeBranchTrx.length >= 400 ? (
                        <Lock className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <ShieldAlert className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </div>
                    <div className="min-w-0 text-xs">
                      <div className="font-black flex items-center gap-2 flex-wrap">
                        <span className="text-sm">
                          {activeBranchTrx.length >= 400
                            ? 'Batas Maksimal Tercapai: Pembuatan Transaksi Baru Terkunci!'
                            : 'Peringatan: Transaksi Aktif Mendekati Batas Maksimal'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-black ${
                            activeBranchTrx.length >= 400
                              ? 'bg-red-200 text-red-900'
                              : 'bg-amber-200 text-amber-900'
                          }`}
                        >
                          {activeBranchTrx.length} / 400 Pesanan
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mt-0.5">
                        {activeBranchTrx.length >= 400
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
                    className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 shadow-xs active:scale-95 transition ${
                      activeBranchTrx.length >= 400
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
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md font-bold font-mono">
                          Saldo Dompet: {formatRupiah(currentUser.walletBalance || 0)}
                        </span>
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

              {/* Baris Kartu Ringkasan KPI Harian (4 Kolom Proporsional) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Pemasukan Hari Ini
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                      +
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-black text-emerald-700 tracking-tight">
                      {formatRupiah(stats.totalUangMasuk)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {stats.transaksiMasuk} Transaksi Masuk Hari Ini
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Pengeluaran Hari Ini
                    </span>
                    <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs">
                      -
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-black text-red-600 tracking-tight">
                      {formatRupiah(stats.totalPengeluaran)}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Biaya Operasional Tercatat
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                      Total Laba Hari Ini
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="mt-2">
                    <div className="text-lg font-black text-emerald-800 tracking-tight">
                      {formatRupiah(totalLaba)}
                    </div>
                    <div className="text-[11px] text-emerald-700/80 font-semibold mt-0.5">
                      Selisih Kas Masuk & Keluar
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Target Penyelesaian
                    </span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center pt-0.5">
                    <div className="bg-slate-50 rounded-lg py-1 px-1.5 border border-slate-100">
                      <div className="text-xs font-black text-emerald-700">{stats.transaksiSelesai}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Selesai</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg py-1 px-1.5 border border-slate-100">
                      <div className="text-xs font-black text-slate-800">{stats.transaksiDiambil}</div>
                      <div className="text-[10px] text-slate-500 font-semibold">Diambil</div>
                    </div>
                    <div className="bg-amber-50/70 rounded-lg py-1 px-1.5 border border-amber-200/60">
                      <div className="text-xs font-black text-amber-700">{stats.harusSelesai}</div>
                      <div className="text-[10px] text-amber-800 font-semibold">Target</div>
                    </div>
                  </div>
                </div>
              </div>

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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama pelanggan, nomor nota, atau telepon..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-9 pr-8 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000] focus:bg-white transition"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFilterStatus('semua')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
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
                          onClick={() => setFilterStatus(filterStatus === 'baru_masuk' ? 'semua' : 'baru_masuk')}
                          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
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
                            setFilterStatus(filterStatus === 'sedang_dikerjakan' ? 'semua' : 'sedang_dikerjakan')
                          }
                          className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
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
                        onClick={() => setFilterStatus(filterStatus === 'selesai' ? 'semua' : 'selesai')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
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
                    {/* Table Header */}
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 grid grid-cols-12 gap-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      <div className="col-span-2">Waktu & Nota</div>
                      <div className="col-span-3">Pelanggan</div>
                      <div className="col-span-3">Rincian Layanan</div>
                      <div className="col-span-2 text-right">Tagihan & Status</div>
                      <div className="col-span-2 text-right">Aksi Cepat</div>
                    </div>

                    {displayedTrx.length === 0 ? (
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
                              onClick={() => {
                                setTransitionInitialQuery(searchQuery);
                                setIsTransitionModalOpen(true);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
                            >
                              <History className="w-4 h-4 text-amber-600" />
                              <span>Nota "{searchQuery}" tidak ada di sistem baru? Klik untuk Ambil Nota Lama (10 Detik)</span>
                            </button>
                          </div>
                        )}
                        {filterStatus !== 'semua' && (
                          <button
                            type="button"
                            onClick={() => setFilterStatus('semua')}
                            className="text-xs text-[#800000] font-bold underline hover:text-[#660000]"
                          >
                            Lihat Semua Pesanan Aktif
                          </button>
                        )}
                      </div>
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
                                      `${it?.namaLayanan || 'Layanan'} (${it?.berat || 0} ${it?.satuan || ''})`
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
                              {/* Kolom 1: Waktu & Nota */}
                              <div className="col-span-2 min-w-0">
                                <div className="font-mono text-xs font-bold text-[#800000] truncate">
                                  {trx.nomorTransaksi || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {formatShortDate(trx.tanggalMasuk)} • {formatShortTime(trx.tanggalMasuk)}
                                </div>
                              </div>

                              {/* Kolom 2: Pelanggan */}
                              <div className="col-span-3 min-w-0">
                                <div className="font-bold text-sm text-slate-900 truncate">
                                  {trx.namaPelanggan}
                                </div>
                                {trx.alamat ? (
                                  <div className="text-[11px] text-slate-400 truncate">{trx.alamat}</div>
                                ) : trx.nomorTelepon ? (
                                  <div className="text-[11px] text-slate-400 truncate">{trx.nomorTelepon}</div>
                                ) : null}
                              </div>

                              {/* Kolom 3: Rincian Layanan */}
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

                              {/* Kolom 4: Tagihan & Status Pembayaran */}
                              <div className="col-span-2 text-right">
                                <div className="text-xs font-extrabold text-slate-900">
                                  {formatRupiah(trx.totalHarga)}
                                </div>
                                <div
                                  className={`text-[11px] font-black mt-0.5 ${
                                    isLunas ? 'text-emerald-600' : 'text-red-600'
                                  }`}
                                >
                                  {isLunas ? 'LUNAS' : `Sisa ${formatRupiah(sisa).replace('Rp ', '')}`}
                                </div>
                              </div>

                              {/* Kolom 5: Aksi Cepat Status */}
                              <div
                                className="col-span-2 flex justify-end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {trx.status === 'Diterima' ? (
                                  settings?.selesaikanSaatDitugaskan ? (
                                    <button
                                      type="button"
                                      onClick={() => onSelesaikanTransaksi(trx)}
                                      title="Langsung Selesai & Siap Ambil"
                                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      <span>Selesai</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onSelesaikanTransaksi(trx)}
                                      title="Mulai Pengerjaan"
                                      className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
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
                                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
                                  >
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Selesai</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setTrxToAmbil(trx)}
                                    title="Ambil / Serahkan ke Pelanggan"
                                    className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition"
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

                    {/* Kontrol Paginasi */}
                    {displayedTrx.length > 0 && (
                      <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-2">
                        <div className="text-xs text-slate-500 font-medium">
                          Menampilkan{' '}
                          <span className="font-bold text-slate-800">
                            {(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}
                          </span>{' '}
                          -{' '}
                          <span className="font-bold text-slate-800">
                            {Math.min(validCurrentPage * ITEMS_PER_PAGE, displayedTrx.length)}
                          </span>{' '}
                          dari <span className="font-bold text-[#800000]">{displayedTrx.length}</span>{' '}
                          transaksi
                        </div>

                        {totalPages > 1 && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={validCurrentPage === 1}
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1"
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
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-1"
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

                {/* Kolom Kanan: Panel Ringkasan Harian & Pintasan Cepat */}
                <div className="xl:col-span-4 2xl:col-span-3 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#800000]">
                          Rekap Kas Hari Ini
                        </h3>
                        <p className="text-[11px] text-slate-500 capitalize mt-0.5">{formattedToday}</p>
                      </div>
                      <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg truncate max-w-[120px]">
                        {typeof currentUser.displayName === 'object' ? (currentUser.displayName as any)?.displayName || (currentUser.displayName as any)?.namaLaundry || 'Owner' : (currentUser.displayName || 'Owner')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Pemasukan Kas</span>
                        <span className="text-xs font-extrabold text-emerald-600">
                          {formatRupiah(stats.totalUangMasuk)}
                        </span>
                      </div>
                      <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Pengeluaran</span>
                        <span className="text-xs font-extrabold text-red-600">
                          {formatRupiah(stats.totalPengeluaran)}
                        </span>
                      </div>
                      <div className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Total Laba Hari Ini</span>
                        <span className="text-sm font-black text-emerald-700">
                          {formatRupiah(totalLaba)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex justify-between items-center">
                        <span>Transaksi Masuk Hari Ini</span>
                        <span className="font-bold text-slate-900">{stats.transaksiMasuk} Nota</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Selesai Dikerjakan Hari Ini</span>
                        <span className="font-bold text-emerald-700">{stats.transaksiSelesai} Nota</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Transaksi Diambil Hari Ini</span>
                        <span className="font-bold text-slate-900">{stats.transaksiDiambil} Nota</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Harus Selesai (24 Jam)</span>
                        <span className="font-bold text-amber-600">{stats.harusSelesai} Nota</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={onOpenBukuKas}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:border-[#800000] hover:text-[#800000] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Buku Kas</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenLaporan}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:border-[#800000] hover:text-[#800000] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Laporan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================================
           TAMPILAN KHUSUS HP / MOBILE (DIPERTAHANKAN 100% SESUAI ASLINYA)
           ============================================================================ */
        <>
          {/* 1. TOOLBAR ATAS (Maroon) */}
          <header className="bg-[#800000] text-white shadow-md shrink-0 z-30">
            <div className="flex items-center justify-between px-3 md:px-6 h-14">
              {/* Tombol Kiri: Arsip Transaksi */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onOpenArsip}
                  title="Arsip Transaksi"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
                >
                  <Archive className="w-5 h-5 text-white" />
                </button>

                {/* Nama Laundry & Switcher Cabang */}
                <button
                  onClick={() => onOpenUpgradeModal ? onOpenUpgradeModal() : (laundries.length > 1 ? onOpenSwitchBranch() : onOpenKelolaOwner())}
                  title={`Paket: ${paketNama} (${isNewcomer ? 'Gratis' : `${sisaHari} hari lagi`}). Klik untuk kelola.`}
                  className="flex flex-col items-start px-2 py-1 rounded-xl hover:bg-white/10 active:scale-98 transition max-w-[190px]"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sl truncate text-white tracking-wide">
                      {typeof activeLaundry.namaLaundry === 'object' ? (activeLaundry.namaLaundry as any)?.namaLaundry || "Kafela's Laundry" : (activeLaundry.namaLaundry || "Kafela's Laundry")}
                    </span>
                    {laundries.length > 1 && (
                      <ChevronDown className="w-3.5 h-3.5 text-white/80 shrink-0" />
                    )}
                  </div>
                
                </button>
              </div>

              {/* Tombol Kanan: Pasang PWA, Sinkron Cloud & Settings */}
              <div className="flex items-center gap-1.5">
                <PWAInstallButton variant="header" />

                {onSyncCloudData && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    title="Sinkronkan Cloud"
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 active:scale-95 transition disabled:opacity-60 cursor-pointer"
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
          <div className="flex-1 overflow-y-auto px-2 sm:px-4 md:px-6 py-1">
            <div className="max-w-7xl mx-auto w-full space-y-3 pb-2">
              {/* PWA Install Banner */}
              <PWAInstallButton variant="banner" />

              {/* Alert Banner Masa Langganan Habis (Mobile) */}
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
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-bold font-mono">
                          Saldo: {formatRupiah(currentUser.walletBalance || 0)}
                        </span>
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



       

              {/* Alert Banner Batas Transaksi Aktif di HP (>= 300 Peringatan, >= 400 Terkunci) */}
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
                        activeBranchTrx.length >= 400 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
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

              {/* 2. PENCARIAN & 3 TOMBOL FILTER BERSEBELAHAN */}
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
                <div className="flex grid grid-cols-2 gap-1 items-center">
                  {/* Kolom 1: Kolom Pencarian */}
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

                  {/* Kolom 2: Tombol Filter (Mobile) */}
                  <div className={`grid ${showSedangDikerjakanTab ? 'grid-cols-3' : 'grid-cols-2'} gap-1 w-full`}>
                  

                    {/* Tombol 1: Baru Masuk (Filter Jam Merah) */}
                    <button
                      type="button"
                      onClick={() => setFilterStatus(filterStatus === 'baru_masuk' ? 'semua' : 'baru_masuk')}
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

                    {/* Tombol 2: Sedang Dikerjakan (Kuning) - Disembunyikan saat alur langsung selesai */}
                    {showSedangDikerjakanTab && (
                      <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'sedang_dikerjakan' ? 'semua' : 'sedang_dikerjakan')}
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

                    {/* Tombol 3: Selesai / Siap Ambil (Centang Hijau) */}
                    <button
                      type="button"
                      onClick={() => setFilterStatus(filterStatus === 'selesai' ? 'semua' : 'selesai')}
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

              {/* 4. DAFTAR TRANSAKSI AKTIF */}
              <main className="space-y-">
                {displayedTrx.length === 0 ? (
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
                ) : (
                  paginatedTrx.map((trx, index) => {
                    const isLunas = trx.statusPembayaran === 'Lunas';
                    const sisa = Math.max(0, trx.totalHarga - trx.jumlahDp);
                    const isEven = index % 2 === 0;

                    const serviceText =
                      Array.isArray(trx.items) && trx.items.length > 0
                        ? trx.items.map((it) => `${it?.namaLayanan || 'Layanan'} (${it?.berat || 0} ${it?.satuan || ''})`).join(', ')
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
                          {/* Tanggal & Jam Masuk (Diperkecil / Compact) */}
                          <div className="w-9 shrink-0 text-center border-r border-slate-200 pr-1.5 flex flex-col justify-center">
                            <div className="text-[10px] text-slate-800 leading-none">
                              {formatShortTime(trx.tanggalMasuk)}
                            </div>
                            <div className="text-[9px] text-slate-400 leading-none mt-1">
                              {formatShortDate(trx.tanggalMasuk)}
                            </div>
                          </div>

                          {/* Pelanggan, Layanan & Item Jadwal */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 truncate">
                                {trx.namaPelanggan}
                              </span>
                              <div className="text-[9px] text-slate-400 font-mono leading-tight mt-0.5">
                                {trx.nomorTransaksi || '-'}
                              </div>

                              {/* Lunas / Sisa di Ujung Kanan */}
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

                            <div className="text-[10px] text-slate-600 truncate mt-0.5 italic">
                              {serviceText}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end justify-start gap-1 self-stretch border-l border-slate-200 pl-2 text-center">
                            <div
                              className="flex-1 w-full flex items-stretch justify-stretch"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {trx.status === 'Diterima' ? (
                                settings?.selesaikanSaatDitugaskan ? (
                                  <button
                                    type="button"
                                    onClick={() => onSelesaikanTransaksi(trx)}
                                    title="Langsung Selesai & Siap Ambil"
                                    className="w-10 min-h-[20px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onSelesaikanTransaksi(trx)}
                                    title="Mulai Pengerjaan"
                                    className="w-10 min-h-[20px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex flex-col items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )
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

              {/* 5. KONTROL PAGINASI (10 TRANSAKSI PER HALAMAN) */}
              {displayedTrx.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
                    Menampilkan <span className="font-bold text-slate-800">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(validCurrentPage * ITEMS_PER_PAGE, displayedTrx.length)}</span> dari <span className="font-bold text-[#800000]">{displayedTrx.length}</span> transaksi
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
                                {showEllipsis && <span className="text-xs text-slate-400 px-0.5">...</span>}
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

          {/* 5. KARTU RINGKASAN HARIAN (Terkunci tetap di bawah, tidak terscroll) */}
          <div className="shrink-0 z-20 bg-slate-100/95 backdrop-blur-xs px-2 sm:px-4 pt-1.5 pb-[70px] border-t border-slate-200/80 shadow-md">
            <div className="max-w-7xl mx-auto w-full">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
                {/* Header Ringkasan: Tanggal & User Login */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-800 capitalize">
                      {formattedToday}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                      {typeof currentUser.displayName === 'object' ? (currentUser.displayName as any)?.displayName || (currentUser.displayName as any)?.namaLaundry || 'Owner' : (currentUser.displayName || 'Owner')}
                    </span>

                    <button
                      type="button"
                      onClick={() => setIsSummaryCollapsed(!isSummaryCollapsed)}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition active:scale-95 flex items-center justify-center"
                      title={isSummaryCollapsed ? 'Buka Rincian Lengkap' : 'Sembunyikan / Perkecil'}
                    >
                      {isSummaryCollapsed ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {isSummaryCollapsed ? (
                  <div className="flex items-center justify-between text-[11px] font-bold pt-0.5">
                    <span className="text-slate-600">
                      Masuk: <span className="text-emerald-700 font-extrabold">{formatRupiah(stats.totalUangMasuk)}</span>
                    </span>
                    <span className="text-slate-600">
                      Keluar: <span className="text-red-600 font-extrabold">{formatRupiah(stats.totalPengeluaran)}</span>
                    </span>
                    <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-black">
                      Laba: {formatRupiah(totalLaba)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">Pemasukan</span>
                        <span className="text-xs font-bold text-emerald-600">
                          {formatRupiah(stats.totalUangMasuk)}
                        </span>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500">Pengeluaran</span>
                        <span className="text-xs font-bold text-red-600">
                          {formatRupiah(stats.totalPengeluaran)}
                        </span>
                      </div>
                    </div>

                    <div className="px-2.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Total Laba Hari Ini</span>
                      <span className="text-xs font-black text-emerald-700">
                        {formatRupiah(totalLaba)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1.5 text-slate-600 border-t border-slate-100">
                      <div className="flex justify-between items-center">
                        <span>Transaksi Masuk:</span>
                        <span className="font-bold text-slate-900">{stats.transaksiMasuk}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Selesai Hari Ini:</span>
                        <span className="font-bold text-emerald-700">{stats.transaksiSelesai}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Transaksi Diambil:</span>
                        <span className="font-bold text-slate-900">{stats.transaksiDiambil}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Harus Selesai:</span>
                        <span className="font-bold text-amber-600">{stats.harusSelesai}</span>
                      </div>
                    </div>

         
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 6. FLOATING ACTION BUTTON (+) TRANSAKSI BARU */}
          <button
            onClick={onOpenNewTransaksi}
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

            <button
              onClick={onOpenLaporan}
              className="flex flex-col items-center justify-center flex-1 py-1 hover:bg-white/10 rounded-xl transition text-[10px] active:scale-95 cursor-pointer"
              title="Laporan Keuangan & Grafik Analisis Bisnis"
            >
              <BarChart3 className="w-5 h-5 mb-0.5" />
              <span className="font-semibold tracking-tight">Laporan</span>
            </button>
          </nav>
        </>
      )}

      {/* MODAL KONFIRMASI PENGAMBILAN TRANSAKSI ("Benar mau diambil?") */}
      {trxToAmbil && (() => {
        const isLunas = trxToAmbil.statusPembayaran === 'Lunas';
        const sisa = Math.max(0, trxToAmbil.totalHarga - (trxToAmbil.jumlahDp || 0));
        const servicesDesc =
          Array.isArray(trxToAmbil.items) && trxToAmbil.items.length > 0
            ? trxToAmbil.items.map((it) => `${it?.namaLayanan || 'Layanan'} (${it?.berat || 0} ${it?.satuan || ''})`).join(', ')
            : 'Layanan Laundry';

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
              {/* Header Icon */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Truck className="w-7 h-7" />
              </div>

              {/* Title & Pertanyaan Utama */}
              <h3 className="text-lg font-black text-slate-900 text-center tracking-tight">
                Benar mau diambil?
              </h3>
              <p className="text-xs text-slate-500 text-center mt-1">
                Konfirmasi penyerahan cucian ke pelanggan
              </p>

              {/* Rincian Transaksi */}
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mt-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[190px]">
                    {trxToAmbil.namaPelanggan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">No. Nota / Faktur:</span>
                  <span className="font-mono font-bold text-slate-700">
                    {trxToAmbil.nomorTransaksi || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-slate-500 shrink-0">Layanan:</span>
                  <span className="text-slate-800 font-medium text-right line-clamp-2">
                    {servicesDesc}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold">Total Tagihan:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatRupiah(trxToAmbil.totalHarga)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
                  <span className="text-slate-500">Status Pembayaran:</span>
                  {isLunas || sisa <= 0 ? (
                    <span className="px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 text-[11px]">
                      LUNAS
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800 text-[11px]">
                      SISA {formatRupiah(sisa)}
                    </span>
                  )}
                </div>
              </div>

              {/* Catatan Sisa Pembayaran / Pelunasan */}
              {!isLunas && sisa > 0 ? (
                <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Masih terdapat sisa tagihan sebesar <strong className="font-bold text-rose-700">{formatRupiah(sisa)}</strong>.
                    Jika Anda konfirmasi <strong>"Ya, Benar Diambil"</strong>, transaksi ini otomatis ditandai <strong>LUNAS</strong> dan diserahkan.
                  </div>
                </div>
              ) : (
                <div className="mt-3.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Cucian sudah lunas dan siap diserahkan kepada pelanggan. Data akan otomatis masuk ke arsip cucian selesai diambil.
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="grid grid-cols-2 gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setTrxToAmbil(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-700 transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAmbilTransaksi(trxToAmbil);
                    setTrxToAmbil(null);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Ya, Benar Diambil</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL INPUT KILAT AMBIL NOTA LAMA (TRANSISI) */}
      <QuickTransitionPickupModal
        isOpen={isTransitionModalOpen}
        onClose={() => setIsTransitionModalOpen(false)}
        initialQuery={transitionInitialQuery}
        existingCustomers={Array.from(
          new Map(
            transaksiList
              .filter((t) => t.namaPelanggan)
              .map((t) => [t.namaPelanggan.toLowerCase(), { nama: t.namaPelanggan, nomorTelepon: t.nomorTelepon }])
          ).values()
        )}
        onSave={(data) => {
          setIsTransitionModalOpen(false);
          if (onSaveTransitionPickup) {
            onSaveTransitionPickup(data);
          }
        }}
      />
    </div>
  );
};

