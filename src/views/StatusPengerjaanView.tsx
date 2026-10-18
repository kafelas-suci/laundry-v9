import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle2,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle,
  Calendar,
  Truck,
  CheckCheck,
} from 'lucide-react';
import { Transaksi, Layanan, User, SettingsData } from '../types';
import { formatShortDate, formatShortTime, formatRupiah } from '../utils/formatters';
import { AssignStaffModal } from '../components/AssignStaffModal';
import { useToast, useConfirm } from '../components/NotificationContext';
import { isProTier, getLaundryLimits } from '../utils/subscription';

interface StatusPengerjaanViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  semuaLayanan: Layanan[];
  staffList: User[];
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
  currentUser,
  settings,
  activeLaundryId,
  currentTier,
  onOpenDetail,
  onUpdateTransaksi,
  onAmbilTransaksi,
  onAmbilBanyakTransaksi,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const limits = getLaundryLimits(currentTier);
  const canAssignStaff = limits.canAssignStaff;
  const [selectedTrxForStaff, setSelectedTrxForStaff] = useState<Transaksi | null>(null);
  const [statusFilter, setStatusFilter] = useState<'semua' | 'selesai' | 'baru_masuk' | 'sedang_dikerjakan'>('semua');
  const [showConfirmBulkAmbil, setShowConfirmBulkAmbil] = useState(false);

  // Filter tasks for active laundry that are not yet "Diambil"
  const activeOrders = useMemo(() => {
    return transaksiList.filter(
      (t) => t.laundryId === activeLaundryId && t.status !== 'Diambil'
    );
  }, [transaksiList, activeLaundryId]);

  // Counts for each filter
  const filterCounts = useMemo(() => {
    let baruMasuk = 0;
    let sedangDikerjakan = 0;
    let selesai = 0;

    activeOrders.forEach((t) => {
      if (t.status === 'Diterima') baruMasuk++;
      else if (t.status === 'Proses') sedangDikerjakan++;
      else if (t.status === 'Selesai') selesai++;
    });

    return {
      semua: activeOrders.length,
      baruMasuk,
      sedangDikerjakan,
      selesai,
    };
  }, [activeOrders]);

  // Displayed orders filtered
  const displayedOrders = useMemo(() => {
    if (statusFilter === 'baru_masuk') {
      return activeOrders.filter((t) => t.status === 'Diterima');
    }
    if (statusFilter === 'sedang_dikerjakan') {
      return activeOrders.filter((t) => t.status === 'Proses');
    }
    if (statusFilter === 'selesai') {
      return activeOrders.filter((t) => t.status === 'Selesai');
    }
    return activeOrders;
  }, [activeOrders, statusFilter]);

  // Paginasi per 10 transaksi untuk efisiensi performa
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const totalPages = Math.max(1, Math.ceil(displayedOrders.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return displayedOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedOrders, validCurrentPage]);

  // Group and calculate workload per staff (only for services with hitungBebanKerja = true)
  const workloadMap = semuaLayanan.reduce((acc, lay) => {
    acc[lay.nama] = lay.hitungBebanKerja;
    return acc;
  }, {} as Record<string, boolean>);

  const staffWorkload = activeOrders
    .filter((t) => !!t.dikerjakanOleh)
    .reduce((acc, t) => {
      const staffName = t.dikerjakanOleh!;
      const totalKg = (Array.isArray(t.items) ? t.items : [])
        .filter((it) => it && (workloadMap[it.namaLayanan] ?? true))
        .reduce((sum, it) => sum + (it?.satuan?.toLowerCase() === 'kg' ? (it.berat || 0) : 1), 0);

      acc[staffName] = (acc[staffName] || 0) + totalKg;
      return acc;
    }, {} as Record<string, number>);

  // Estimate categories summary
  const now = Date.now();
  let countTerlewat = 0;
  let countHariIni = 0;
  let countSisa1 = 0;
  let countLainnya = 0;

  activeOrders.forEach((t) => {
    if (t.status === 'Selesai') return;
    const est = t.tanggalSelesai || t.tanggalMasuk + 3 * 24 * 60 * 60 * 1000;
    const diffDays = Math.ceil((est - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) countTerlewat++;
    else if (diffDays === 0) countHariIni++;
    else if (diffDays === 1) countSisa1++;
    else countLainnya++;
  });

  const handleActionButtonClick = (trx: Transaksi) => {
    if (trx.status === 'Diterima') {
      if (canAssignStaff) {
        setSelectedTrxForStaff(trx);
      } else {
        // Direct transition: tulis nama user yang sedang login
        const loginUserName = currentUser?.displayName || 'Kasir';
        const updated = {
          ...trx,
          status: 'Proses' as const,
          dikerjakanOleh: loginUserName,
        };
        onUpdateTransaksi(updated);
        toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} masuk ke tahap pengerjaan!`);
      }
    } else if (trx.status === 'Proses') {
      // Mark as finished
      const updated = {
        ...trx,
        status: 'Selesai' as const,
        tanggalStatusSelesai: Date.now(),
      };
      onUpdateTransaksi(updated);

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
    const updated: Transaksi = {
      ...selectedTrxForStaff,
      dikerjakanOleh: staffName,
      status: autoFinish ? 'Selesai' : 'Proses',
      tanggalStatusSelesai: autoFinish ? Date.now() : null,
    };
    onUpdateTransaksi(updated);
    setSelectedTrxForStaff(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-base tracking-wide">Status Pengerjaan</h1>
      </header>

      {/* Main Area */}
      <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        {/* Estimasi Summary Counters (Matches card_estimasi_summary) */}
        <div className="grid grid-cols-4 gap-2 bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs text-center text-xs">
          <div className="p-2 rounded-xl bg-red-50 text-red-700">
            <div className="text-base font-black">{countTerlewat}</div>
            <div className="text-[10px] font-bold">Terlewat</div>
          </div>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
            <div className="text-base font-black">{countHariIni}</div>
            <div className="text-[10px] font-bold">Hari Ini</div>
          </div>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
            <div className="text-base font-black">{countSisa1}</div>
            <div className="text-[10px] font-bold">Sisa 1 Hari</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 text-slate-700">
            <div className="text-base font-black">{countLainnya}</div>
            <div className="text-[10px] font-bold">Lainnya</div>
          </div>
        </div>

        {/* Staff Workload Box (Matches container_summary_staf) */}
        <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs space-y-2">
          <h3 className="text-xs font-bold text-slate-700">Ringkasan Beban Kerja Staf:</h3>
          {Object.keys(staffWorkload).length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada cucian yang ditugaskan ke staf.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(staffWorkload).map(([staf, berat]) => (
                <div
                  key={staf}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  {staf}: <span className="font-black text-[#800000]">{berat.toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          )}
        </div>

     

        {/* Tombol Aksi Massal: Selesaikan & Arsipkan Semua Cucian Selesai */}
        {filterCounts.selesai > 0 && (statusFilter === 'selesai' || statusFilter === 'semua') && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-2xs">
            <div className="flex items-center gap-2 text-xs">
              <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="text-emerald-900 font-medium">
                Terdapat <strong className="font-black text-emerald-800">{filterCounts.selesai}</strong> pesanan berstatus <strong>Selesai</strong> siap diambil.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmBulkAmbil(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Tandai Semua Sudah Diambil ({filterCounts.selesai})</span>
            </button>
          </div>
        )}

        {/* List of Orders in Production */}
        <div className="space-y-1.5">
          {displayedOrders.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl text-center border border-slate-200 text-xs text-slate-500 italic">
              {statusFilter === 'baru_masuk'
                ? 'Tidak ada pesanan baru masuk.'
                : statusFilter === 'sedang_dikerjakan'
                ? 'Tidak ada pesanan sedang dikerjakan.'
                : statusFilter === 'selesai'
                ? 'Tidak ada pesanan berstatus selesai.'
                : 'Tidak ada antrean pesanan aktif.'}
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
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2.5 hover:border-[#800000] cursor-pointer transition"
                >
                  {/* Left: Tanggal & Jam Masuk (Diperkecil / Compact) */}
                  <div className="w-10 shrink-0 text-center border-r border-slate-100 pr-1 flex flex-col justify-center">
                    <div className="text-[10px] font-bold text-slate-800 leading-none">
                      {formatShortTime(trx.tanggalMasuk)}
                    </div>
                    <div className="text-[9px] text-slate-400 leading-none mt-1">
                      {formatShortDate(trx.tanggalMasuk)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {trx.namaPelanggan}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                        {trx.nomorTransaksi}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 italic truncate mt-0.5">
                      {Array.isArray(trx.items) && trx.items.length > 0
                        ? trx.items.map((it) => `${it.namaLayanan || 'Layanan'} (${it.berat || 0} ${it.satuan || ''})`).join(', ')
                        : 'Layanan Cuci'}
                    </div>

                    {trx.dikerjakanOleh && (
                      <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                        Dikerjakan: {trx.dikerjakanOleh}
                      </div>
                    )}
                  </div>

                  {/* Kolom Kanan: Jadwal/Estimasi di ATAS Tombol Indikator Pengerjaan */}
                  <div className="shrink-0 flex flex-col items-end justify-between self-stretch border-l border-slate-100 pl-2 min-w-[72px]">
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
                        {isOverdue ? 'Lewat' : diffDays === 0 ? 'Hari Ini' : `${diffDays} hr`}
                      </div>
                 
                    </div>

                    {/* Action Button di Bawah */}
                    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                      {trx.status === 'Diterima' ? (
                        <button
                          onClick={() => handleActionButtonClick(trx)}
                          title={canAssignStaff ? 'Tugaskan Staf' : 'Mulai Proses Cucian'}
                          className="px-2 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{canAssignStaff ? 'Tugaskan' : 'Mulai'}</span>
                        </button>
                      ) : trx.status === 'Proses' ? (
                        <button
                          onClick={() => handleActionButtonClick(trx)}
                          title="Tandai Selesai"
                          className="px-2 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Selesai</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAmbilTransaksi?.(trx)}
                          title="Serahkan ke Pelanggan (Masuk Arsip)"
                          className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs active:scale-90 transition"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Serahkan</span>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 mt-1">
            <div className="text-[11px] text-slate-500 font-medium text-center sm:text-left">
              Menampilkan <span className="font-bold text-slate-800">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(validCurrentPage * ITEMS_PER_PAGE, displayedOrders.length)}</span> dari <span className="font-bold text-[#800000]">{displayedOrders.length}</span> antrean
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

      {/* Staff Selection Modal */}
      <AssignStaffModal
        isOpen={!!selectedTrxForStaff}
        onClose={() => setSelectedTrxForStaff(null)}
        staffList={staffList}
        currentUser={currentUser}
        transaksi={selectedTrxForStaff}
        onAssign={handleAssignStaff}
      />

      {/* MODAL KONFIRMASI AMBIL / ARSIPKAN MASSAL */}
      {showConfirmBulkAmbil && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Truck className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 text-center tracking-tight">
              Tandai Semua Selesai Sudah Diambil?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-1 leading-relaxed">
              Sebanyak <strong className="text-emerald-700 font-extrabold">{filterCounts.selesai} pesanan</strong> berstatus Selesai akan ditandai <strong>"Diambil"</strong>, otomatis lunas, dan langsung dipindahkan ke <strong>Arsip Transaksi</strong>.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs mt-4">
              💡 <strong>Hasil:</strong> Antrean aktif kasir Anda akan langsung bersih dari 514 cucian yang menumpuk. Rekap omzet & data pelanggan tetap tersimpan 100% aman di Laporan Keuangan dan Arsip.
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowConfirmBulkAmbil(false)}
                className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-700 transition active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const completedList = activeOrders.filter((t) => t.status === 'Selesai');
                  onAmbilBanyakTransaksi?.(completedList);
                  setShowConfirmBulkAmbil(false);
                  toast.success(`${completedList.length} pesanan berhasil ditandai Diambil dan dipindahkan ke Arsip!`);
                }}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white shadow-md transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Ya, Arsipkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
