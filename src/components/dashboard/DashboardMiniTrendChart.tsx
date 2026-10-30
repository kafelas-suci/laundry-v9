import React, { useMemo, useState } from 'react';
import { Transaksi, Pengeluaran } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface DashboardMiniTrendChartProps {
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeLaundryId: string;
  compact?: boolean;
}

interface DayBucket {
  key: string;
  shortLabel: string;
  dateLabel: string;
  income: number;
  expense: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DashboardMiniTrendChart: React.FC<DashboardMiniTrendChartProps> = ({
  transaksiList,
  pengeluaranList,
  activeLaundryId,
  compact = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(6);

  const buckets = useMemo<DayBucket[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const windowStart = todayStart - 6 * DAY_MS;

    const dayFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });
    const fullFormatter = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    });

    const list: DayBucket[] = Array.from({ length: 7 }, (_, idx) => {
      const ts = windowStart + idx * DAY_MS;
      const d = new Date(ts);
      return {
        key: String(ts),
        shortLabel: idx === 6 ? 'Hr Ini' : dayFormatter.format(d).slice(0, 3),
        dateLabel: fullFormatter.format(d),
        income: 0,
        expense: 0,
      };
    });

    for (let i = 0; i < transaksiList.length; i++) {
      const t = transaksiList[i];
      if (!t || t.laundryId !== activeLaundryId) continue;

      if (!t.isTransisi && t.tanggalMasuk >= windowStart) {
        const idx = Math.floor((t.tanggalMasuk - windowStart) / DAY_MS);
        if (idx >= 0 && idx < 7) {
          list[idx].income += Math.min(t.totalHarga, t.jumlahDp || 0);
        }
      }

      const pickupTs = t.tanggalPengambilan || 0;
      if (pickupTs >= windowStart && t.statusPembayaran === 'Lunas') {
        const idx = Math.floor((pickupTs - windowStart) / DAY_MS);
        if (idx >= 0 && idx < 7) {
          list[idx].income += Math.max(0, t.totalHarga - (t.jumlahDp || 0));
        }
      }
    }

    for (let i = 0; i < pengeluaranList.length; i++) {
      const p = pengeluaranList[i];
      if (!p || p.laundryId !== activeLaundryId || p.tanggal < windowStart) continue;
      const idx = Math.floor((p.tanggal - windowStart) / DAY_MS);
      if (idx >= 0 && idx < 7) {
        list[idx].expense += p.jumlah || 0;
      }
    }

    return list;
  }, [transaksiList, pengeluaranList, activeLaundryId]);

  const maxValue = useMemo(() => {
    let max = 1;
    for (let i = 0; i < buckets.length; i++) {
      if (buckets[i].income > max) max = buckets[i].income;
      if (buckets[i].expense > max) max = buckets[i].expense;
    }
    return max;
  }, [buckets]);

  const activeBucket = buckets[selectedIndex] || buckets[buckets.length - 1];
  const chartHeight = compact ? 34 : 46;

  return (
    <div className={compact ? 'pt-2 border-t border-slate-100 space-y-1.5' : 'pt-2.5 border-t border-slate-100 space-y-2'}>
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-slate-700">
          Tren Kas 7 Hari ({activeBucket.dateLabel})
        </span>
        <span className="font-mono font-bold text-emerald-700 tabular-nums">
          +{formatRupiah(activeBucket.income)}
        </span>
      </div>

      <div
        className="grid grid-cols-7 gap-1 items-end p-1.5 bg-slate-50/80 rounded-xl border border-slate-100"
        role="group"
        aria-label="Grafik tren pemasukan dan pengeluaran 7 hari terakhir"
      >
        {buckets.map((b, idx) => {
          const incomeH = Math.max(3, Math.round((b.income / maxValue) * chartHeight));
          const expenseH = b.expense > 0 ? Math.max(3, Math.round((b.expense / maxValue) * chartHeight)) : 0;
          const isSelected = idx === selectedIndex;

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              title={`${b.dateLabel}: Masuk ${formatRupiah(b.income)} | Keluar ${formatRupiah(b.expense)}`}
              className={`flex flex-col items-center justify-end gap-1 py-1 rounded-lg transition cursor-pointer ${
                isSelected ? 'bg-white shadow-2xs ring-1 ring-slate-200' : 'hover:bg-white/60'
              }`}
            >
              <svg
                viewBox={`0 0 24 ${chartHeight}`}
                className={`w-6 ${compact ? 'h-8' : 'h-11'} overflow-visible`}
                aria-hidden="true"
              >
                <rect
                  x={expenseH > 0 ? 4 : 8}
                  y={chartHeight - incomeH}
                  width={expenseH > 0 ? 7 : 8}
                  height={incomeH}
                  rx={2}
                  className={isSelected ? 'fill-emerald-600' : 'fill-emerald-500/75'}
                />
                {expenseH > 0 && (
                  <rect
                    x={13}
                    y={chartHeight - expenseH}
                    width={7}
                    height={expenseH}
                    rx={2}
                    className={isSelected ? 'fill-rose-600' : 'fill-rose-400/75'}
                  />
                )}
              </svg>
              <span
                className={`text-[9px] leading-none truncate max-w-full px-0.5 ${
                  isSelected ? 'font-extrabold text-[#800000]' : 'font-medium text-slate-400'
                }`}
              >
                {b.shortLabel}
              </span>
            </button>
          );
        })}
      </div>

      {activeBucket.expense > 0 && (
        <div className="flex items-center justify-between text-[10px] text-slate-500 px-0.5">
          <span>Pengeluaran {activeBucket.dateLabel}:</span>
          <span className="font-mono font-bold text-red-600 tabular-nums">
            -{formatRupiah(activeBucket.expense)}
          </span>
        </div>
      )}
    </div>
  );
};

export default DashboardMiniTrendChart;
