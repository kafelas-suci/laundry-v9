import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
} from 'lucide-react';
import { Pengeluaran, Transaksi, User } from '../../types';
import { formatRupiah } from '../../utils/formatters';

const LazyMiniTrendChart = lazy(() => import('./DashboardMiniTrendChart'));

export interface DailyDashboardStats {
  transaksiMasuk: number;
  transaksiDiambil: number;
  transaksiSelesai: number;
  harusSelesai: number;
  totalUangMasuk: number;
  totalPengeluaran: number;
  totalLaba: number;
}

/**
 * Single-pass O(N) reduksi laporan harian tanpa membuat array salinan berulang (.filter),
 * sehingga sangat hemat RAM dan CPU di perangkat kelas bawah.
 */
export function useDailyDashboardStats(
  transaksiList: Transaksi[],
  pengeluaranList: Pengeluaran[],
  activeLaundryId: string
): DailyDashboardStats {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = today.getTime();
    const endOfToday = startOfToday + 24 * 60 * 60 * 1000 - 1;
    const deadline24h = Date.now() + 24 * 60 * 60 * 1000;

    let transaksiMasuk = 0;
    let transaksiDiambil = 0;
    let transaksiSelesai = 0;
    let harusSelesai = 0;
    let totalUangMasuk = 0;

    for (let i = 0; i < transaksiList.length; i++) {
      const t = transaksiList[i];
      if (!t || t.laundryId !== activeLaundryId) continue;

      if (!t.isTransisi && t.tanggalMasuk >= startOfToday) {
        transaksiMasuk++;
        totalUangMasuk += Math.min(t.totalHarga, t.jumlahDp || 0);
      }

      if ((t.tanggalPengambilan || 0) >= startOfToday) {
        transaksiDiambil++;
        if (t.statusPembayaran === 'Lunas') {
          totalUangMasuk += Math.max(0, t.totalHarga - (t.jumlahDp || 0));
        }
      }

      if ((t.tanggalStatusSelesai || 0) >= startOfToday) {
        transaksiSelesai++;
      }

      if (
        t.status !== 'Diambil' &&
        t.status !== 'Selesai' &&
        t.tanggalSelesai &&
        t.tanggalSelesai <= deadline24h
      ) {
        harusSelesai++;
      }
    }

    let totalPengeluaran = 0;
    for (let i = 0; i < pengeluaranList.length; i++) {
      const p = pengeluaranList[i];
      if (
        p &&
        p.laundryId === activeLaundryId &&
        p.tanggal >= startOfToday &&
        p.tanggal <= endOfToday
      ) {
        totalPengeluaran += p.jumlah || 0;
      }
    }

    return {
      transaksiMasuk,
      transaksiDiambil,
      transaksiSelesai,
      harusSelesai,
      totalUangMasuk,
      totalPengeluaran,
      totalLaba: Math.max(0, totalUangMasuk - totalPengeluaran),
    };
  }, [transaksiList, pengeluaranList, activeLaundryId]);
}

interface DashboardDailyReportWidgetProps {
  variant: 'desktop-kpi' | 'desktop-sidebar' | 'mobile-bar';
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeLaundryId: string;
  currentUser: User;
  formattedToday: string;
  isSummaryCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenBukuKas?: () => void;
  onOpenLaporan?: () => void;
}

export const DashboardDailyReportWidget: React.FC<DashboardDailyReportWidgetProps> = ({
  variant,
  transaksiList,
  pengeluaranList,
  activeLaundryId,
  currentUser,
  formattedToday,
  isSummaryCollapsed = false,
  onToggleCollapse,
  onOpenBukuKas,
  onOpenLaporan,
}) => {
  const stats = useDailyDashboardStats(transaksiList, pengeluaranList, activeLaundryId);
  const [showMobileChart, setShowMobileChart] = useState(false);
  const isOwner = currentUser.role === 'owner';

  const resolvedUserLabel =
    typeof currentUser.displayName === 'object'
      ? (currentUser.displayName as { displayName?: string; namaLaundry?: string })?.displayName ||
        (currentUser.displayName as { namaLaundry?: string })?.namaLaundry ||
        'Owner'
      : currentUser.displayName || 'Owner';

  if (variant === 'desktop-kpi') {
    return (
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
            <div className="text-lg font-black text-emerald-700 tracking-tight tabular-nums">
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
            <div className="text-lg font-black text-red-600 tracking-tight tabular-nums">
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
            <div className="text-lg font-black text-emerald-800 tracking-tight tabular-nums">
              {formatRupiah(stats.totalLaba)}
            </div>
            <div className="text-[11px] text-emerald-700/80 font-semibold mt-0.5">
              Selisih Kas Masuk &amp; Keluar
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
              <div className="text-xs font-black text-emerald-700 tabular-nums">{stats.transaksiSelesai}</div>
              <div className="text-[10px] text-slate-500 font-semibold">Selesai</div>
            </div>
            <div className="bg-slate-50 rounded-lg py-1 px-1.5 border border-slate-100">
              <div className="text-xs font-black text-slate-800 tabular-nums">{stats.transaksiDiambil}</div>
              <div className="text-[10px] text-slate-500 font-semibold">Diambil</div>
            </div>
            <div className="bg-amber-50/70 rounded-lg py-1 px-1.5 border border-amber-200/60">
              <div className="text-xs font-black text-amber-700 tabular-nums">{stats.harusSelesai}</div>
              <div className="text-[10px] text-amber-800 font-semibold">Target</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'desktop-sidebar') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#800000]">
              Rekap Kas Hari Ini
            </h3>
            <p className="text-[11px] text-slate-500 capitalize mt-0.5">{formattedToday}</p>
          </div>
          <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg truncate max-w-[120px]">
            {resolvedUserLabel}
          </span>
        </div>

        <div className="space-y-2">
          <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Pemasukan Kas</span>
            <span className="text-xs font-extrabold text-emerald-600 tabular-nums">
              {formatRupiah(stats.totalUangMasuk)}
            </span>
          </div>
          <div className="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Pengeluaran</span>
            <span className="text-xs font-extrabold text-red-600 tabular-nums">
              {formatRupiah(stats.totalPengeluaran)}
            </span>
          </div>
          <div className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Total Laba Hari Ini</span>
            <span className="text-sm font-black text-emerald-700 tabular-nums">
              {formatRupiah(stats.totalLaba)}
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <div className="flex justify-between items-center">
            <span>Transaksi Masuk Hari Ini</span>
            <span className="font-bold text-slate-900 tabular-nums">{stats.transaksiMasuk} Nota</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Selesai Dikerjakan Hari Ini</span>
            <span className="font-bold text-emerald-700 tabular-nums">{stats.transaksiSelesai} Nota</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Transaksi Diambil Hari Ini</span>
            <span className="font-bold text-slate-900 tabular-nums">{stats.transaksiDiambil} Nota</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Harus Selesai (24 Jam)</span>
            <span className="font-bold text-amber-600 tabular-nums">{stats.harusSelesai} Nota</span>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="pt-2.5 border-t border-slate-100 space-y-2 animate-pulse">
              <div className="h-3.5 w-36 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-50 rounded-xl border border-slate-100" />
            </div>
          }
        >
          <LazyMiniTrendChart
            transaksiList={transaksiList}
            pengeluaranList={pengeluaranList}
            activeLaundryId={activeLaundryId}
          />
        </Suspense>

        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenBukuKas}
            className="py-2 px-3 rounded-xl border border-slate-200 hover:border-[#800000] hover:text-[#800000] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Buku Kas</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={onOpenLaporan}
              className="py-2 px-3 rounded-xl border border-slate-200 hover:border-[#800000] hover:text-[#800000] text-xs font-bold text-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Laporan</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Mobile Bottom Bar
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold text-slate-800 capitalize">
            {formattedToday}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[120px]">
            {resolvedUserLabel}
          </span>

          {isOwner && !isSummaryCollapsed && (
            <button
              type="button"
              onClick={() => setShowMobileChart((v) => !v)}
              className={`p-1 rounded transition active:scale-95 flex items-center justify-center cursor-pointer ${
                showMobileChart
                  ? 'bg-rose-50 text-[#800000]'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title={showMobileChart ? 'Sembunyikan Grafik 7 Hari' : 'Lihat Grafik Tren Kas 7 Hari'}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100 transition active:scale-95 flex items-center justify-center cursor-pointer"
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
            Masuk:{' '}
            <span className="text-emerald-700 font-extrabold tabular-nums">
              {formatRupiah(stats.totalUangMasuk)}
            </span>
          </span>
          <span className="text-slate-600">
            Keluar:{' '}
            <span className="text-red-600 font-extrabold tabular-nums">
              {formatRupiah(stats.totalPengeluaran)}
            </span>
          </span>
          <span className="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-black tabular-nums">
            Laba: {formatRupiah(stats.totalLaba)}
          </span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500">Pemasukan</span>
              <span className="text-xs font-bold text-emerald-600 tabular-nums">
                {formatRupiah(stats.totalUangMasuk)}
              </span>
            </div>
            <div className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500">Pengeluaran</span>
              <span className="text-xs font-bold text-red-600 tabular-nums">
                {formatRupiah(stats.totalPengeluaran)}
              </span>
            </div>
          </div>

          <div className="px-2.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Total Laba Hari Ini</span>
            <span className="text-xs font-black text-emerald-700 tabular-nums">
              {formatRupiah(stats.totalLaba)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1.5 text-slate-600 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <span>Transaksi Masuk:</span>
              <span className="font-bold text-slate-900 tabular-nums">{stats.transaksiMasuk}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Selesai Hari Ini:</span>
              <span className="font-bold text-emerald-700 tabular-nums">{stats.transaksiSelesai}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Transaksi Diambil:</span>
              <span className="font-bold text-slate-900 tabular-nums">{stats.transaksiDiambil}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Harus Selesai:</span>
              <span className="font-bold text-amber-600 tabular-nums">{stats.harusSelesai}</span>
            </div>
          </div>

          {showMobileChart && (
            <Suspense
              fallback={
                <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-pulse">
                  <div className="h-3 w-32 bg-slate-100 rounded" />
                  <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
                </div>
              }
            >
              <LazyMiniTrendChart
                transaksiList={transaksiList}
                pengeluaranList={pengeluaranList}
                activeLaundryId={activeLaundryId}
                compact
              />
            </Suspense>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardDailyReportWidget;
