import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Calendar, TrendingUp, BarChart3, Users, DollarSign } from 'lucide-react';
import { Transaksi, Pengeluaran, LayananItem } from '../types';
import { formatRupiah, formatShortDate } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';

interface LaporanViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeLaundryId: string;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  onBack,
  transaksiList,
  pengeluaranList,
  activeLaundryId,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); // 0-11, or -1 for All
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [showDailyDetails, setShowDailyDetails] = useState<boolean>(false);
  const [monthArchive, setMonthArchive] = useState<Transaksi[]>([]);

  // Muat arsip bulan dari IndexedDB lokal (0 Reads Firestore jika sudah tersimpan)
  useEffect(() => {
    let isMounted = true;
    if (selectedMonth !== -1) {
      FirebaseSyncService.fetchArsipBulan(activeLaundryId, selectedYear, selectedMonth)
        .then((list) => {
          if (isMounted) setMonthArchive(list);
        })
        .catch(console.warn);
    } else {
      setMonthArchive([]);
    }
    return () => {
      isMounted = false;
    };
  }, [activeLaundryId, selectedYear, selectedMonth]);

  // Collapsible section toggles
  const [expandPemasukan, setExpandPemasukan] = useState(true);
  const [expandPengeluaran, setExpandPengeluaran] = useState(true);
  const [expandLayanan, setExpandLayanan] = useState(true);
  const [expandPelanggan, setExpandPelanggan] = useState(true);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Filter transactions & expenses based on selected Month & Year
  const { filteredTrx, filteredExp } = useMemo(() => {
    const map = new Map<string, Transaksi>();
    transaksiList.forEach((t) => map.set(t.id, t));
    monthArchive.forEach((t) => map.set(t.id, t));
    const combinedTrx = Array.from(map.values());

    const trx = combinedTrx.filter((t) => {
      if (t.laundryId !== activeLaundryId) return false;
      const d = new Date(t.tanggalMasuk);
      const matchYear = d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
      return matchYear && matchMonth;
    });

    const exp = pengeluaranList.filter((p) => {
      if (p.laundryId !== activeLaundryId) return false;
      const d = new Date(p.tanggal);
      const matchYear = d.getFullYear() === selectedYear;
      const matchMonth = selectedMonth === -1 || d.getMonth() === selectedMonth;
      return matchYear && matchMonth;
    });

    return { filteredTrx: trx, filteredExp: exp };
  }, [transaksiList, pengeluaranList, activeLaundryId, selectedMonth, selectedYear]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    let totalOmzet = 0;
    let totalUangMasuk = 0;
    let totalUangMasukTrx = 0;
    let countLunas = 0;
    let countBelumLunas = 0;

    filteredTrx.forEach((t) => {
      totalOmzet += t.totalHarga;
      if (t.statusPembayaran === 'Lunas') {
        countLunas++;
        totalUangMasuk += t.totalHarga;
        totalUangMasukTrx += t.totalHarga;
      } else {
        countBelumLunas++;
        totalUangMasuk += t.jumlahDp;
        totalUangMasukTrx += t.jumlahDp;
      }
    });

    const totalPengeluaran = filteredExp.reduce((sum, p) => sum + p.jumlah, 0);
    const labaBersih = totalUangMasuk - totalPengeluaran;

    // Service Breakdown
    const serviceMap: Record<string, number> = {};
    filteredTrx.forEach((t) => {
      (t.items || []).forEach((it) => {
        if (!it) return;
        serviceMap[it.namaLayanan] = (serviceMap[it.namaLayanan] || 0) + (it.berat || 0);
      });
    });

    // Customer Breakdown
    const customerMap: Record<string, number> = {};
    filteredTrx.forEach((t) => {
      customerMap[t.namaPelanggan] = (customerMap[t.namaPelanggan] || 0) + 1;
    });

    // Expense Breakdown
    const expenseCategoryMap: Record<string, number> = {};
    filteredExp.forEach((p) => {
      expenseCategoryMap[p.keterangan] = (expenseCategoryMap[p.keterangan] || 0) + p.jumlah;
    });

    // Daily breakdown table
    const dailyMap: Record<string, { trxCount: number; masuk: number; keluar: number }> = {};
    filteredTrx.forEach((t) => {
      const dayKey = new Date(t.tanggalMasuk).toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
      dailyMap[dayKey].trxCount++;
      dailyMap[dayKey].masuk += t.statusPembayaran === 'Lunas' ? t.totalHarga : t.jumlahDp;
    });
    filteredExp.forEach((p) => {
      const dayKey = new Date(p.tanggal).toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
      dailyMap[dayKey].keluar += p.jumlah;
    });

    return {
      totalOmzet,
      totalUangMasuk,
      totalUangMasukTrx,
      totalPemasukanLainnya: 0,
      totalPengeluaran,
      labaBersih,
      totalTrx: filteredTrx.length,
      countLunas,
      countBelumLunas,
      serviceList: Object.entries(serviceMap).sort((a, b) => b[1] - a[1]),
      customerList: Object.entries(customerMap).sort((a, b) => b[1] - a[1]),
      expenseList: Object.entries(expenseCategoryMap).sort((a, b) => b[1] - a[1]),
      dailyRows: Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [filteredTrx, filteredExp]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 md:px-6 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-base tracking-wide">Laporan Keuangan</h1>
      </header>

      {/* Filter Month & Year Bar */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 shadow-2xs">
        <div className="max-w-xl md:max-w-5xl mx-auto w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 md:max-w-xs">
            <span className="text-xs font-bold text-slate-600">Bulan:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#800000]"
            >
              <option value={-1}>Semua Bulan</option>
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Tahun:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#800000]"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto max-w-xl md:max-w-5xl mx-auto w-full">
        {/* Data Keuangan Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <h2 className="text-xs font-extrabold text-[#800000] uppercase tracking-wider">
            Data Keuangan ({selectedMonth === -1 ? 'Tahunan' : monthNames[selectedMonth]} {selectedYear})
          </h2>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-600">Total Pendapatan (Omzet)</span>
              <span className="font-extrabold text-slate-900">{formatRupiah(summary.totalOmzet)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-700 font-bold">Total Uang Masuk</span>
              <span className="font-black text-emerald-700">{formatRupiah(summary.totalUangMasuk)}</span>
            </div>

            <div className="flex justify-between items-center pt-1.5 pl-3 text-slate-500 text-[11px]">
              <span>- Pemasukan Transaksi</span>
              <span>{formatRupiah(summary.totalUangMasukTrx)}</span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-slate-700 font-bold">Total Pengeluaran Operasional</span>
              <span className="font-black text-red-600">{formatRupiah(summary.totalPengeluaran)}</span>
            </div>

            <div className="flex justify-between items-center pt-2.5 bg-emerald-50/60 p-2 rounded-xl text-sm font-black">
              <span className="text-slate-800">Laba Bersih</span>
              <span className={summary.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {formatRupiah(summary.labaBersih)}
              </span>
            </div>
          </div>
        </div>

        {/* Data Transaksi Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
          <h2 className="text-xs font-extrabold text-[#800000] uppercase tracking-wider">
            Data Transaksi
          </h2>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-600">Total Transaksi:</span>
            <span className="font-bold text-slate-900">
              {summary.totalTrx} ({summary.countLunas} Lunas, {summary.countBelumLunas} Belum Lunas)
            </span>
          </div>
        </div>

        {/* Grid Rekapitulasi (1 kolom di HP, 3 kolom berdampingan di PC/Tablet) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-start">
          {/* Rekapitulasi Layanan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div
              onClick={() => setExpandLayanan(!expandLayanan)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Rekapitulasi Layanan ({summary.serviceList.length})
              </h2>
              {expandLayanan ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expandLayanan && (
              <div className="divide-y divide-slate-100 text-xs pt-1">
                {summary.serviceList.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2">Belum ada data layanan</p>
                ) : (
                  summary.serviceList.map(([name, weight], idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span className="text-slate-700">- {name}</span>
                      <span className="font-bold text-slate-900">{weight.toFixed(1)} Unit/Kg</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Rekapitulasi Pengeluaran */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div
              onClick={() => setExpandPengeluaran(!expandPengeluaran)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Rekapitulasi Biaya Pengeluaran ({summary.expenseList.length})
              </h2>
              {expandPengeluaran ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expandPengeluaran && (
              <div className="divide-y divide-slate-100 text-xs pt-1">
                {summary.expenseList.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2">Belum ada data pengeluaran</p>
                ) : (
                  summary.expenseList.map(([cat, total], idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span className="text-slate-700">- {cat}</span>
                      <span className="font-bold text-red-600">{formatRupiah(total)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pelanggan Teratas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <div
              onClick={() => setExpandPelanggan(!expandPelanggan)}
              className="flex justify-between items-center cursor-pointer select-none"
            >
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Pelanggan Teratas ({summary.customerList.length})
              </h2>
              {expandPelanggan ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>

            {expandPelanggan && (
              <div className="divide-y divide-slate-100 text-xs pt-1">
                {summary.customerList.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-2">Belum ada transaksi</p>
                ) : (
                  summary.customerList.slice(0, 10).map(([name, count], idx) => (
                    <div key={idx} className="py-1.5 flex justify-between">
                      <span className="text-slate-700">{idx + 1}. {name}</span>
                      <span className="font-bold text-[#800000]">{count} Transaksi</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tombol Tampilkan Rincian Harian (Matches btn_trigger) */}
        <button
          onClick={() => setShowDailyDetails(!showDailyDetails)}
          className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition"
        >
          {showDailyDetails ? '▲ Sembunyikan Rincian Harian' : '▼ Tampilkan Rincian Harian'}
        </button>

        {/* Daily Breakdown Table */}
        {showDailyDetails && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="bg-[#800000] text-white px-3 py-2 text-[11px] font-bold grid grid-cols-5 text-center">
              <span>Tgl</span>
              <span>Trx</span>
              <span className="text-right">Masuk</span>
              <span className="text-right">Keluar</span>
              <span className="text-right">Laba</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {summary.dailyRows.length === 0 ? (
                <p className="text-slate-400 italic text-center py-4">Tidak ada data harian</p>
              ) : (
                summary.dailyRows.map(([dateKey, val], idx) => {
                  const laba = val.masuk - val.keluar;
                  const dateObj = new Date(dateKey);
                  return (
                    <div key={idx} className="p-2.5 grid grid-cols-5 text-center items-center hover:bg-slate-50">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {dateObj.getDate()} {monthNames[dateObj.getMonth()].slice(0, 3)}
                      </span>
                      <span className="text-slate-600">{val.trxCount}</span>
                      <span className="text-right font-bold text-emerald-600">
                        {formatRupiah(val.masuk).replace('Rp ', '')}
                      </span>
                      <span className="text-right font-bold text-red-600">
                        {formatRupiah(val.keluar).replace('Rp ', '')}
                      </span>
                      <span className={`text-right font-bold ${laba >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {formatRupiah(laba).replace('Rp ', '')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
