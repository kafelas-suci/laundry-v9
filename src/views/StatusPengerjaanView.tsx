import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  UserCheck,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Search,
  X,
  User as UserIcon,
} from 'lucide-react';
import { Transaksi, Layanan, User, SettingsData, OperationalStaff } from '../types';
import { formatShortDate, formatShortTime, formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { AssignStaffModal } from '../components/AssignStaffModal';
import { useToast, useConfirm } from '../components/NotificationContext';
import { getLaundryLimits } from '../utils/subscription';

interface StatusPengerjaanViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  semuaLayanan: Layanan[];
  staffList: User[];
  operationalStaffList?: OperationalStaff[];
  currentUser?: User | null;
  settings: SettingsData;
  activeLaundryId: string;
  currentTier?: string | null;
  onOpenDetail: (transaksiId: string) => void;
  onUpdateTransaksi: (updated: Transaksi) => void;
  onAmbilTransaksi?: (transaksi: Transaksi) => void;
  onAmbilBanyakTransaksi?: (transaksiList: Transaksi[]) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const StatusPengerjaanView: React.FC<StatusPengerjaanViewProps> = ({
  onBack,
  transaksiList,
  semuaLayanan,
  staffList,
  operationalStaffList = [],
  currentUser,
  settings,
  activeLaundryId,
  currentTier,
  onOpenDetail,
  onUpdateTransaksi,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const limits = getLaundryLimits(currentTier);
  const canAssignStaff = limits.canAssignStaff;

  const [selectedTrxForStaff, setSelectedTrxForStaff] = useState<Transaksi | null>(null);

  const [statusFilter, setStatusFilter] = useState<'semua' | 'baru_masuk' | 'sedang_dikerjakan'>('semua');
  const [estimasiFilter, setEstimasiFilter] = useState<'semua' | 'terlewat' | 'hari_ini' | 'sisa_1_hari'>('semua');
  const [activeStaffFilter, setActiveStaffFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateMode, setDateMode] = useState<'hari_ini' | 'custom' | 'bulan_ini'>('hari_ini');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  const dateRange = useMemo(() => {
    const now = new Date();
    if (dateMode === 'hari_ini') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      return { start, end, label: `Hari Ini (${formatTanggalIndo(now, false)})` };
    }
    if (dateMode === 'bulan_ini') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
      const lastDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[now.getMonth()];
      return {
        start,
        end,
        label: `Bulan Ini (1 - ${lastDateObj.getDate()} ${monthName} ${now.getFullYear()})`,
      };
    }
    const [y, m, d] = selectedDate.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
    return { start, end, label: formatTanggalIndo(target, true) };
  }, [dateMode, selectedDate]);

  const handleShiftDate = (days: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setDate(base.getDate() + days);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setDateMode('custom');
  };

  const activeOrders = useMemo(() => {
    return transaksiList.filter(
      (t) => {
        if (!t || t.status === 'Selesai' || t.status === 'Diambil') return false;
        if (t.laundryId === activeLaundryId) return true;
        if (!t.laundryId) return true;
        if (
          (activeLaundryId === 'lnd-1' || activeLaundryId === 'demo-lnd-1') &&
          (t.laundryId === 'lnd-1' || t.laundryId === 'demo-lnd-1')
        ) {
          return true;
        }
        return false;
      }
    );
  }, [transaksiList, activeLaundryId]);

  const allOrders = useMemo(() => {
    return transaksiList.filter((t) => {
      if (!t) return false;
      if (t.laundryId === activeLaundryId) return true;
      if (!t.laundryId) return true;
      if (
        (activeLaundryId === 'lnd-1' || activeLaundryId === 'demo-lnd-1') &&
        (t.laundryId === 'lnd-1' || t.laundryId === 'demo-lnd-1')
      ) {
        return true;
      }
      return false;
    });
  }, [transaksiList, activeLaundryId]);

  const branchOpStaff = useMemo(() => {
    return operationalStaffList.filter((os) => os.laundryId === activeLaundryId);
  }, [operationalStaffList, activeLaundryId]);

  const otherStaff = useMemo(() => {
    const onlineName = (currentUser?.displayName || '').trim().toLowerCase();
    return staffList.filter(
      (s) => (s.displayName || '').trim().toLowerCase() !== onlineName
    );
  }, [staffList, currentUser]);

  const isHitungKerjaStaf = settings.hitungKerjaStaf ?? true;
  const hasRegisteredStaff = isHitungKerjaStaf && canAssignStaff && (otherStaff.length > 0 || branchOpStaff.length > 0);

  const workloadMap = useMemo(() => {
    return semuaLayanan.reduce((acc, lay) => {
      acc[lay.nama] = lay.hitungBebanKerja;
      return acc;
    }, {} as Record<string, boolean>);
  }, [semuaLayanan]);

  const calculateTransactionKg = (trx: Transaksi): number => {
    if (!isHitungKerjaStaf) return 0;
    if (!trx.items || !Array.isArray(trx.items) || trx.items.length === 0) return 0;
    return trx.items
      .filter((it) => it && (workloadMap[it.namaLayanan] ?? true))
      .reduce((sum, it) => {
        const isKg = (it?.satuan || '').toLowerCase().includes('kg');
        const qty = it.berat || 0;
        return sum + (isKg ? qty : (qty > 0 ? qty : 1));
      }, 0);
  };

  const getWorkTimestamp = (trx: Transaksi): number => {
    return trx.tanggalDitugaskan || trx.tanggalStatusSelesai || trx.tanggalMasuk;
  };

  interface StaffSummary {
    nama: string;
    totalKg: number;
    totalNota: number;
  }

  const staffWorkload = useMemo(() => {
    if (!isHitungKerjaStaf) return [];
    const map: Record<string, StaffSummary> = {};

    allOrders.forEach((t) => {
      if (!t.dikerjakanOleh || !t.dikerjakanOleh.trim()) return;
      const time = getWorkTimestamp(t);
      if (time < dateRange.start || time > dateRange.end) return;

      const name = t.dikerjakanOleh.trim();
      const kg = calculateTransactionKg(t);

      if (!map[name]) {
        map[name] = { nama: name, totalKg: 0, totalNota: 0 };
      }
      map[name].totalKg += kg;
      map[name].totalNota += 1;
    });

    return Object.values(map).sort((a, b) => b.totalKg - a.totalKg);
  }, [allOrders, dateRange, workloadMap, isHitungKerjaStaf]);

  const totalKgPeriode = useMemo(() => {
    return staffWorkload.reduce((sum, s) => sum + s.totalKg, 0);
  }, [staffWorkload]);

  const now = Date.now();

  const displayedOrders = useMemo(() => {
    return activeOrders.filter((t) => {
      if (statusFilter === 'baru_masuk' && t.status !== 'Diterima') return false;
      if (statusFilter === 'sedang_dikerjakan' && t.status !== 'Proses') return false;

      if (estimasiFilter !== 'semua') {
        const est = t.tanggalSelesai || t.tanggalMasuk + 3 * 24 * 60 * 60 * 1000;
        const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));
        if (estimasiFilter === 'terlewat' && diffDays >= 0) return false;
        if (estimasiFilter === 'hari_ini' && diffDays !== 0) return false;
        if (estimasiFilter === 'sisa_1_hari' && diffDays !== 1) return false;
      }

      if (activeStaffFilter) {
        if ((t.dikerjakanOleh || '').trim().toLowerCase() !== activeStaffFilter.toLowerCase()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (t.namaPelanggan || '').toLowerCase().includes(q);
        const matchInvoice = (t.nomorTransaksi || '').toLowerCase().includes(q);
        const matchStaff = (t.dikerjakanOleh || '').toLowerCase().includes(q);
        if (!matchName && !matchInvoice && !matchStaff) return false;
      }

      return true;
    }).sort((a, b) => (b.tanggalMasuk || 0) - (a.tanggalMasuk || 0));
  }, [activeOrders, statusFilter, estimasiFilter, activeStaffFilter, searchQuery, now]);

  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, estimasiFilter, activeStaffFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return displayedOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedOrders, validCurrentPage]);

  const handleActionButtonClick = (trx: Transaksi) => {
    if (trx.status === 'Diterima') {
      if (hasRegisteredStaff) {
        setSelectedTrxForStaff(trx);
      } else {
        const loginUserName = isHitungKerjaStaf ? (currentUser?.displayName || 'Kasir') : null;
        const nowTime = Date.now();
        const autoFinish = settings.selesaikanSaatDitugaskan;
        const updated: Transaksi = {
          ...trx,
          status: autoFinish ? 'Selesai' : 'Proses',
          dikerjakanOleh: loginUserName,
          tanggalDitugaskan: isHitungKerjaStaf ? nowTime : null,
          tanggalStatusSelesai: autoFinish ? nowTime : null,
        };
        onUpdateTransaksi(updated);
        if (autoFinish) {
          toast.success(
            loginUserName
              ? `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai dikerjakan oleh ${loginUserName}!`
              : `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai diproses!`
          );
        } else {
          toast.success(
            loginUserName
              ? `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} otomatis dikerjakan oleh ${loginUserName}!`
              : `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} mulai diproses!`
          );
        }
      }
    } else if (trx.status === 'Proses') {
      const updated: Transaksi = {
        ...trx,
        status: 'Selesai' as const,
        tanggalStatusSelesai: Date.now(),
      };
      onUpdateTransaksi(updated);
      toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai dikerjakan!`);
    }
  };

  const handleAssignStaff = (staffName: string) => {
    if (!selectedTrxForStaff) return;
    const autoFinish = settings.selesaikanSaatDitugaskan;
    const nowTime = Date.now();
    const updated: Transaksi = {
      ...selectedTrxForStaff,
      dikerjakanOleh: staffName,
      status: autoFinish ? 'Selesai' : 'Proses',
      tanggalDitugaskan: nowTime,
      tanggalStatusSelesai: autoFinish ? nowTime : null,
    };
    onUpdateTransaksi(updated);
    if (autoFinish) {
      toast.success(
        `Pesanan ${selectedTrxForStaff.nomorTransaksi || selectedTrxForStaff.namaPelanggan} selesai dikerjakan oleh ${staffName}!`
      );
    } else {
      toast.success(`Pesanan ditugaskan ke ${staffName}`);
    }
    setSelectedTrxForStaff(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-wide">Status Pengerjaan</h1>
            <p className="text-[10px] text-rose-200">{isHitungKerjaStaf ? 'Antrean Cucian Aktif & Kinerja Staf' : 'Antrean Cucian Aktif'}</p>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 p-1 md:p-6 space-y-1 max-w-xl md:max-w-4xl mx-auto w-full">
        
       <div className="bg-white rounded-2xl p-1 border border-slate-200 shadow-2xs space-y-2">
  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold w-full gap-1">
    <button
      type="button"
      onClick={() => setDateMode('hari_ini')}
      className={`flex-1 text-center px-2 py-1.5 rounded-lg transition cursor-pointer ${
        dateMode === 'hari_ini' ? 'bg-[#800000] text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      Hari Ini
    </button>
    <button
      type="button"
      onClick={() => setDateMode('bulan_ini')}
      className={`flex-1 text-center px-2 py-1.5 rounded-lg transition cursor-pointer ${
        dateMode === 'bulan_ini' ? 'bg-[#800000] text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      Bulan Ini
    </button>
    <button
      type="button"
      onClick={() => setDateMode('custom')}
      className={`flex-1 justify-center px-1 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
        dateMode === 'custom' ? 'bg-[#800000] text-white shadow-sm font-black' : 'text-slate-600 hover:bg-slate-200/60'
      }`}
    >
      <Calendar className="w-3.5 h-3.5" />
      <span>Tanggal</span>
    </button>
  </div>

  {/* Pemilih Tanggal Kustom */}
  {dateMode === 'custom' && (
    <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl animate-in fade-in border border-slate-200">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleShiftDate(-1)}
          className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          title="Hari Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) setSelectedDate(e.target.value);
          }}
          className="px-2 py-1 rounded-lg bg-white text-slate-900 border border-slate-300 text-xs font-bold"
        />
        <button
          type="button"
          onClick={() => handleShiftDate(1)}
          className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
          title="Hari Berikutnya"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="text-[11px] font-bold text-slate-700 truncate">
        {selectedDate ? formatTanggalIndo(new Date(selectedDate), false) : ''}
      </div>
    </div>
  )}
</div>

     {/* 2. REKAP PRODUKSI STAF */}
{isHitungKerjaStaf ? (
  <div className="bg-white rounded-2xl px-2 py-1 border border-slate-200 shadow-2xs space-y-0.5">
    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-0 w-full">
      <div className="shrink-0">
        <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <span>Produksi Staf</span>
          <span className="text-[11px] font-black text-[#800000]">
            ({totalKgPeriode.toFixed(1)} kg)
          </span>
        </div>
      </div>

      {/* Kolom Pencarian */}
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari pelanggan atau no. nota..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-[#800000] text-slate-800 placeholder:text-slate-400 shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>

    {/* Daftar Staf */}
    {staffWorkload.length === 0 ? (
      <p className="text-xs text-slate-400 italic py-1">
        Belum ada cucian yang dikerjakan oleh staf pada periode ini.
      </p>
    ) : (
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {staffWorkload.map((staf) => {
          const isSelected = activeStaffFilter === staf.nama;
          return (
            <button
              key={staf.nama}
              type="button"
              onClick={() => setActiveStaffFilter(isSelected ? null : staf.nama)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                isSelected
                  ? 'bg-[#800000] border-[#800000] text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <span>{staf.nama}:</span>
              <strong className={isSelected ? 'text-white' : 'text-[#800000]'}>
                {staf.totalKg.toFixed(1)} kg
              </strong>
              <span className={`text-[10px] ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                ({staf.totalNota})
              </span>
            </button>
          );
        })}

        {activeStaffFilter && (
          <button
            type="button"
            onClick={() => setActiveStaffFilter(null)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Semua Staf</span>
          </button>
        )}
      </div>
    )}
  </div>
) : null}
        {/* DAFTAR ANTREAN CUCIAN */}
        <div className="space-y-1.5">
          {displayedOrders.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl text-center border border-slate-200 text-xs text-slate-500 space-y-1.5">
              <Clock className="w-7 h-7 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">
                Tidak ada antrean cucian yang perlu dikerjakan.
              </p>
            </div>
          ) : (
            paginatedOrders.map((trx) => {
              const est = trx.tanggalSelesai || trx.tanggalMasuk + 3 * 24 * 60 * 60 * 1000;
              const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;

              return (
                <div
                  key={trx.id}
                  onClick={() => onOpenDetail(trx.id)}
                  className="bg-white px-2.5 py-1.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5 hover:border-[#800000] cursor-pointer transition"
                >
                  <div className="w-9 shrink-0 text-center border-r border-slate-100 flex flex-col justify-center">
                    <div className="text-[11px] font-bold text-slate-800 leading-none">
                      {formatShortTime(trx.tanggalMasuk)}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-none mt-1">
                      {formatShortDate(trx.tanggalMasuk)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {trx.namaPelanggan}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {trx.nomorTransaksi}
                      </span>

                      {isHitungKerjaStaf && (
                        trx.dikerjakanOleh ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (hasRegisteredStaff) setSelectedTrxForStaff(trx);
                            }}
                            className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 inline-flex items-center gap-1"
                          >
                            <UserIcon className="w-3 h-3 text-emerald-600" />
                            <span>{trx.dikerjakanOleh}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionButtonClick(trx);
                            }}
                            className="text-[10px] text-rose-700 font-bold bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded-md border border-rose-200/60 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <UserIcon className="w-3 h-3 text-rose-500" />
                            <span>Belum</span>
                          </button>
                        )
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 truncate mt-1">
                      {Array.isArray(trx.items) && trx.items.length > 0
                        ? trx.items.map((it) => `${it.namaLayanan || 'Layanan'} (${it.berat || 0} ${it.satuan || ''})`).join(', ')
                        : 'Layanan Cuci'}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end justify-between self-stretch border-l border-slate-100 pl-1 min-w-[72px]">
                    <div className="text-right">
                      <div
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg inline-block ${
                          isOverdue
                            ? 'bg-red-100 text-red-700'
                            : diffDays === 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {isOverdue ? 'Lewat' : diffDays === 0 ? 'Hari Ini' : `${diffDays} hari`}
                      </div>
                    </div>

                    <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                      {trx.status === 'Diterima' ? (
                        <button
                          onClick={() => handleActionButtonClick(trx)}
                          className="px-2.5 py-1 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition cursor-pointer bg-rose-600 hover:bg-rose-700"
                        >
                          <Clock className="w-3 h-3" />
                          <span>{settings.selesaikanSaatDitugaskan ? 'Selesai' : hasRegisteredStaff ? 'Tugaskan' : 'Proses'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActionButtonClick(trx)}
                          className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Selesai</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Paginasi Status Pengerjaan */}
        {displayedOrders.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex items-center justify-between gap-2 mt-1">
            <div className="text-[11px] text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-800">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-bold text-slate-800">{Math.min(validCurrentPage * ITEMS_PER_PAGE, displayedOrders.length)}</span> dari{' '}
              <span className="font-bold text-[#800000]">{displayedOrders.length}</span> antrean
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={validCurrentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 text-xs font-bold text-slate-700 transition flex items-center gap-0.5 cursor-pointer"
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
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 text-xs font-bold text-slate-700 transition flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER INFORMASI STATUS TANGGAL TERPILIH */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 text-slate-300 py-2 px-4 text-center z-20 shadow-lg backdrop-blur-md bg-slate-900/95">
        <div className="max-w-xl md:max-w-4xl mx-auto flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Status Periode: <strong className="text-white">{dateRange.label}</strong></span>
          </div>
          <div className="text-slate-400">
            Total Rekap Staf: <strong className="text-amber-400">{totalKgPeriode.toFixed(1)} kg</strong>
          </div>
        </div>
      </footer>

      {/* Staff Selection Modal */}
      <AssignStaffModal
        isOpen={!!selectedTrxForStaff}
        onClose={() => setSelectedTrxForStaff(null)}
        staffList={staffList}
        operationalStaffList={operationalStaffList}
        activeLaundryId={activeLaundryId}
        currentUser={currentUser}
        transaksi={selectedTrxForStaff}
        onAssign={handleAssignStaff}
      />
    </div>
  );
};