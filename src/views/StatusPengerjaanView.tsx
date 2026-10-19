import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  UserCheck,
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

  // 1. FILTER STATUS TUNGGAL (Hanya status pengerjaan aktif: 'semua' | 'baru_masuk' | 'sedang_dikerjakan')
  // Pesanan 'Selesai' dan 'Diambil' tidak tampil di sini
  const [statusFilter, setStatusFilter] = useState<'semua' | 'baru_masuk' | 'sedang_dikerjakan'>('semua');

  // Filter 4 Kotak Estimasi: Semua Estimasi / Terlewat / Hari Ini / Sisa 1 Hari
  const [estimasiFilter, setEstimasiFilter] = useState<'semua' | 'terlewat' | 'hari_ini' | 'sisa_1_hari'>('semua');

  // Filter Staf Aktif (klik dari chip staf di atas)
  const [activeStaffFilter, setActiveStaffFilter] = useState<string | null>(null);

  // Pencarian Cepat
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. TOGGLE TANGGAL: Hari Ini - Pilih Tanggal - Bulan Ini (Tgl 1 - Akhir Bulan)
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [dateMode, setDateMode] = useState<'hari_ini' | 'custom' | 'bulan_ini'>('hari_ini');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Hitung rentang tanggal untuk rekap staf
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
    // Custom date
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

  // Antrean pengerjaan: HANYA cucian yang belum selesai (Diterima & Proses). Yang sudah Selesai / Diambil TIDAK tampil di sini.
  const activeOrders = useMemo(() => {
    return transaksiList.filter(
      (t) => t.laundryId === activeLaundryId && t.status !== 'Selesai' && t.status !== 'Diambil'
    );
  }, [transaksiList, activeLaundryId]);

  // Semua transaksi outlet ini untuk hitung rekap historis kg pengerjaan staf pada periode terpilih
  const allOrders = useMemo(() => {
    return transaksiList.filter((t) => t.laundryId === activeLaundryId);
  }, [transaksiList, activeLaundryId]);

  // Cek ketersediaan staf lain selain user yang sedang login
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

  // Jumlah untuk tab status antrean
  const filterCounts = useMemo(() => {
    let baruMasuk = 0;
    let sedangDikerjakan = 0;

    activeOrders.forEach((t) => {
      if (t.status === 'Diterima') baruMasuk++;
      else if (t.status === 'Proses') sedangDikerjakan++;
    });

    return {
      semua: activeOrders.length,
      baruMasuk,
      sedangDikerjakan,
    };
  }, [activeOrders]);

  // Map beban kerja layanan
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

  // REKAP PRODUKSI STAF PER PERIODE (Hari Ini / Pilih Tanggal / Bulan Ini)
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

  // Ringkasan Estimasi untuk 4 Kotak (Semua, Terlewat, Hari Ini, Sisa 1 Hari)
  const now = Date.now();
  const summaryEstimasi = useMemo(() => {
    let terlewat = 0;
    let hariIni = 0;
    let sisa1 = 0;

    activeOrders.forEach((t) => {
      const est = t.tanggalSelesai || t.tanggalMasuk + 3 * 24 * 60 * 60 * 1000;
      const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) terlewat++;
      else if (diffDays === 0) hariIni++;
      else if (diffDays === 1) sisa1++;
    });

    return { terlewat, hariIni, sisa1 };
  }, [activeOrders, now]);

  // FILTERING ANTREAN (Status + Estimasi 4 Kotak + Staf Aktif + Pencarian)
  const displayedOrders = useMemo(() => {
    return activeOrders.filter((t) => {
      // 1. Status Filter (Hanya Masuk atau Proses)
      if (statusFilter === 'baru_masuk' && t.status !== 'Diterima') return false;
      if (statusFilter === 'sedang_dikerjakan' && t.status !== 'Proses') return false;

      // 2. Filter 4 Kotak Estimasi: Semua / Terlewat / Hari Ini / Sisa 1 Hari
      if (estimasiFilter !== 'semua') {
        const est = t.tanggalSelesai || t.tanggalMasuk + 3 * 24 * 60 * 60 * 1000;
        const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));
        if (estimasiFilter === 'terlewat' && diffDays >= 0) return false;
        if (estimasiFilter === 'hari_ini' && diffDays !== 0) return false;
        if (estimasiFilter === 'sisa_1_hari' && diffDays !== 1) return false;
      }

      // 3. Filter Staf (jika user mengklik salah satu nama staf di rekap)
      if (activeStaffFilter) {
        if ((t.dikerjakanOleh || '').trim().toLowerCase() !== activeStaffFilter.toLowerCase()) {
          return false;
        }
      }

      // 4. Pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (t.namaPelanggan || '').toLowerCase().includes(q);
        const matchInvoice = (t.nomorTransaksi || '').toLowerCase().includes(q);
        const matchStaff = (t.dikerjakanOleh || '').toLowerCase().includes(q);
        if (!matchName && !matchInvoice && !matchStaff) return false;
      }

      return true;
    });
  }, [activeOrders, statusFilter, estimasiFilter, activeStaffFilter, searchQuery, now]);

  // Paginasi 10 per halaman
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

  // Penugasan Staf & Aksi Status
  const handleActionButtonClick = (trx: Transaksi) => {
    if (trx.status === 'Diterima') {
      if (hasRegisteredStaff) {
        // Jika ada staf lain yang terdaftar, buka modal pilih staf
        setSelectedTrxForStaff(trx);
      } else {
        // OTOMATIS SEPERTI DI DASHBOARD:
        // Saat tidak ada staf lain yang terdaftar, otomatis dikerjakan oleh siapapun yang online saat ini!
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
          if (settings.waNotificationEnabled && trx.nomorTelepon) {
            confirm({
              title: 'Kirim Notifikasi WhatsApp',
              message: `Pekerjaan selesai! Ingin buka WhatsApp dan kirim notifikasi siap ambil ke ${trx.namaPelanggan}?`,
              confirmText: 'Buka WhatsApp',
              cancelText: 'Nanti Saja',
            }).then((ok) => {
              if (ok) {
                const sisa = Math.max(0, trx.totalHarga - trx.jumlahDp);
                const msg = `Halo Kak *${trx.namaPelanggan}*,\nCucian Anda (Nota *${trx.nomorTransaksi}*) sudah *SELESAI* dan siap diambil di ${settings.headerStruk}.\nSisa Tagihan: ${formatRupiah(sisa)}\nTerima kasih!`;
                const phone = (trx.nomorTelepon || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
                window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
              }
            });
          }
        } else {
          toast.success(
            loginUserName
              ? `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} otomatis dikerjakan oleh ${loginUserName}!`
              : `Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} mulai diproses!`
          );
        }
      }
    } else if (trx.status === 'Proses') {
      // Tandai Selesai: Cucian yang sudah selesai otomatis keluar dari antrean pengerjaan ini
      const updated: Transaksi = {
        ...trx,
        status: 'Selesai' as const,
        tanggalStatusSelesai: Date.now(),
      };
      onUpdateTransaksi(updated);
      toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai dikerjakan!`);

      if (settings.waNotificationEnabled && trx.nomorTelepon) {
        confirm({
          title: 'Kirim Notifikasi WhatsApp',
          message: `Pekerjaan selesai! Ingin buka WhatsApp dan kirim notifikasi siap ambil ke ${trx.namaPelanggan}?`,
          confirmText: 'Buka WhatsApp',
          cancelText: 'Nanti Saja',
        }).then((ok) => {
          if (ok) {
            const sisa = Math.max(0, trx.totalHarga - trx.jumlahDp);
            const msg = `Halo Kak *${trx.namaPelanggan}*,\nCucian Anda (Nota *${trx.nomorTransaksi}*) sudah *SELESAI* dan siap diambil di ${settings.headerStruk}.\nSisa Tagihan: ${formatRupiah(sisa)}\nTerima kasih!`;
            const phone = (trx.nomorTelepon || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
          }
        });
      }
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
      if (settings.waNotificationEnabled && selectedTrxForStaff.nomorTelepon) {
        confirm({
          title: 'Kirim Notifikasi WhatsApp',
          message: `Pekerjaan selesai! Ingin buka WhatsApp dan kirim notifikasi siap ambil ke ${selectedTrxForStaff.namaPelanggan}?`,
          confirmText: 'Buka WhatsApp',
          cancelText: 'Nanti Saja',
        }).then((ok) => {
          if (ok) {
            const sisa = Math.max(0, selectedTrxForStaff.totalHarga - selectedTrxForStaff.jumlahDp);
            const msg = `Halo Kak *${selectedTrxForStaff.namaPelanggan}*,\nCucian Anda (Nota *${selectedTrxForStaff.nomorTransaksi}*) sudah *SELESAI* dan siap diambil di ${settings.headerStruk}.\nSisa Tagihan: ${formatRupiah(sisa)}\nTerima kasih!`;
            const phone = (selectedTrxForStaff.nomorTelepon || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
            window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`, '_blank');
          }
        });
      }
    } else {
      toast.success(`Pesanan ditugaskan ke ${staffName}`);
    }
    setSelectedTrxForStaff(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
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
      <main className="flex-1 p-2 md:p-6 space-y-1 max-w-xl md:max-w-4xl mx-auto w-full">
        {/* 1. REKAP PRODUKSI STAF DENGAN TOGGLE: HARI INI - PILIH TANGGAL - BULAN INI */}
        {isHitungKerjaStaf ? (
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
          
          {/* Baris Atas: Judul (Kiri) & Kolom Pencarian (Kanan - Sejajar di HP & PC) */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1 w-full">
            {/* Bagian Judul / Header Info */}
            <div className="shrink-0">
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>Produksi Staf</span>
                <span className="text-[11px] font-black text-[#800000]">
                  ({totalKgPeriode.toFixed(1)} kg)
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {dateRange.label}
              </div>
            </div>

            {/* Kolom Pencarian Persis di Samping Kanan */}
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

                    {/* Daftar Beban Kerja Staf */}
          {staffWorkload.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              Belum ada cucian yang dikerjakan oleh staf pada periode ini.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              {staffWorkload.map((staf) => {
                const isSelected = activeStaffFilter === staf.nama;
                return (
                  <button
                    key={staf.nama}
                    type="button"
                    onClick={() => {
                      setActiveStaffFilter(isSelected ? null : staf.nama);
                    }}
                    className={`px-3 py-0.5 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
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
                  className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Semua Staf</span>
                </button>
              )}
            </div>
          )}
        </div>
        ) : (
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200 inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                Perhitungan Kerja Staf: Nonaktif
              </span>
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pelanggan atau no. nota antrean..."
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
        )}


          {/* Baris Bawah: Toggle Filter Tanggal */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold w-full">
            <button
              type="button"
              onClick={() => setDateMode('hari_ini')}
              className={`flex-1 text-center px-2 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'hari_ini' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setDateMode('bulan_ini')}
              className={`flex-1 text-center px-2 py-1.5 rounded-lg transition cursor-pointer ${
                dateMode === 'bulan_ini' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              type="button"
              onClick={() => setDateMode('custom')}
              className={`flex-1 justify-center px-1 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                dateMode === 'custom' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>Tanggal</span>
            </button>
          </div>

          {/* Pemilih Tanggal Kustom (Jika Mode Pilih Tanggal Aktif) */}
          {dateMode === 'custom' && (
            <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 rounded-xl animate-in fade-in">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleShiftDate(-1)}
                  className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
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
                  className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleShiftDate(1)}
                  className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                  title="Hari Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[11px] font-bold text-slate-600 truncate">
                {selectedDate ? formatTanggalIndo(new Date(selectedDate), false) : ''}
              </div>
            </div>
          )}




        {/* DAFTAR KARTU ANTREAN CUCIAN AKTIF (HANYA YANG BELUM SELESAI) */}
        <div className="space-y-1.5">
          {displayedOrders.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl text-center border border-slate-200 text-xs text-slate-500 space-y-1.5">
              <Clock className="w-7 h-7 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">
                {statusFilter === 'baru_masuk'
                  ? 'Tidak ada pesanan baru masuk.'
                  : statusFilter === 'sedang_dikerjakan'
                  ? 'Tidak ada pesanan sedang dikerjakan.'
                  : estimasiFilter === 'terlewat'
                  ? 'Tidak ada pesanan yang terlewat estimasi.'
                  : estimasiFilter === 'hari_ini'
                  ? 'Tidak ada pesanan jatuh tempo hari ini.'
                  : estimasiFilter === 'sisa_1_hari'
                  ? 'Tidak ada pesanan jatuh tempo besok.'
                  : activeStaffFilter
                  ? `Tidak ada antrean pengerjaan untuk staf ${activeStaffFilter}.`
                  : 'Tidak ada antrean cucian yang perlu dikerjakan.'}
              </p>
              {(activeStaffFilter || searchQuery || estimasiFilter !== 'semua' || statusFilter !== 'semua') && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('semua');
                    setEstimasiFilter('semua');
                    setActiveStaffFilter(null);
                    setSearchQuery('');
                  }}
                  className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Reset Saringan
                </button>
              )}
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
      className="bg-white px-2 py-1 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5 hover:border-[#800000] cursor-pointer transition"
    >
      {/* Left: Jam & Tanggal Masuk */}
      <div className="w-9 shrink-0 text-center border-r border-slate-100 flex flex-col justify-center">
        <div className="text-[11px] font-bold text-slate-800 leading-none">
          {formatShortTime(trx.tanggalMasuk)}
        </div>
        <div className="text-[9px] text-slate-400 leading-none mt-1">
          {formatShortDate(trx.tanggalMasuk)}
        </div>
      </div>

      {/* Center: Informasi Pelanggan, Nota, Petugas (di kanan nama) & Rincian Layanan */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-xs text-slate-900 truncate">
            {trx.namaPelanggan}
          </span>

          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
            {trx.nomorTransaksi}
          </span>

          {/* Info Petugas di samping kanan Nama (hanya jika perhitungan kerja staf aktif) */}
          {isHitungKerjaStaf && (
            trx.dikerjakanOleh ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasRegisteredStaff) {
                    setSelectedTrxForStaff(trx);
                  }
                }}
                className={`text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 inline-flex items-center gap-1 ${
                  hasRegisteredStaff ? 'hover:bg-emerald-100 cursor-pointer' : ''
                }`}
                title={hasRegisteredStaff ? 'Klik untuk ganti petugas' : undefined}
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

        {/* Teks Rincian Layanan */}
        <div className="text-[11px] text-slate-600 truncate mt-1">
          {Array.isArray(trx.items) && trx.items.length > 0
            ? trx.items.map((it) => `${it.namaLayanan || 'Layanan'} (${it.berat || 0} ${it.satuan || ''})`).join(', ')
            : 'Layanan Cuci'}
        </div>
      </div>

      {/* Right: Estimasi & Tombol Aksi Cepat */}
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
              className={`px-2.5 py-1 rounded-xl text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition cursor-pointer ${
                settings.selesaikanSaatDitugaskan
                  ? 'bg-amber-500 hover:bg-amber-600'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {settings.selesaikanSaatDitugaskan ? (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span>Selesai</span>
                </>
              ) : hasRegisteredStaff ? (
                <>
                  <UserCheck className="w-3 h-3" />
                  <span>Tugaskan</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" />
                  <span>Proses</span>
                </>
              )}
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

        {/* Paginasi Status Pengerjaan (10 per halaman) */}
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
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-0.5 cursor-pointer"
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
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-35 disabled:cursor-not-allowed text-xs font-bold text-slate-700 transition flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

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
