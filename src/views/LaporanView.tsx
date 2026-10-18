import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Printer,
  Sparkles,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
  Calendar,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Download,
  Lock,
  Crown,
} from 'lucide-react';
import { Transaksi, Pengeluaran, SettingsData } from '../types';
import { formatRupiah, formatShortDate, formatReceiptDate } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { StorageService, defaultSettings } from '../utils/storage';
import { exportLaporanToExcel, LaporanSummaryExportData } from '../utils/excelExport';
import { generateLaporanPdf, LaporanPdfData } from '../utils/pdfExport';
import { ReportPdfModal } from '../components/ReportPdfModal';
import { useToast } from '../components/NotificationContext';
import { getLaundryLimits } from '../utils/subscription';

interface LaporanViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeLaundryId: string;
  laundryName?: string;
  currentTier?: string | null;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  onBack,
  transaksiList,
  pengeluaranList,
  activeLaundryId,
  laundryName,
  currentTier,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const limits = getLaundryLimits(currentTier);
  const canExcel = limits.canExportExcel;
  const canPdf = limits.canExportOfficialPdf;
  const canGrowth = limits.canViewComparisonGrowth;

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'komparasi'>('ringkasan');
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth); // 0-11, or -1 for All
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [showDailyDetails, setShowDailyDetails] = useState<boolean>(false);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);
  const [monthArchive, setMonthArchive] = useState<Transaksi[]>([]);
  const [prevMonthArchive, setPrevMonthArchive] = useState<Transaksi[]>([]);

  // Ambil pengaturan toko untuk nama laundry dan kop surat cetak
  const settings = useMemo(() => {
    return StorageService.get<SettingsData>('settings', defaultSettings);
  }, []);

  const effectiveLaundryName = laundryName || settings.headerStruk || settings.appTitle || "Kafelas Laundry";

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Hitung periode pembanding (bulan lalu atau tahun lalu)
  const prevPeriodInfo = useMemo(() => {
    if (selectedMonth !== -1) {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
      return {
        month: prevMonth,
        year: prevYear,
        label: `${monthNames[prevMonth]} ${prevYear}`,
        type: 'MoM' as const, // Month-over-Month
      };
    } else {
      const prevYear = selectedYear - 1;
      return {
        month: -1,
        year: prevYear,
        label: `Tahun ${prevYear}`,
        type: 'YoY' as const, // Year-over-Year
      };
    }
  }, [selectedMonth, selectedYear]);

  // Muat arsip bulan berjalan dari IndexedDB lokal (0 Reads Firestore jika tersimpan)
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

  // Muat arsip periode pembanding dari IndexedDB lokal
  useEffect(() => {
    let isMounted = true;
    if (prevPeriodInfo.month !== -1) {
      FirebaseSyncService.fetchArsipBulan(activeLaundryId, prevPeriodInfo.year, prevPeriodInfo.month)
        .then((list) => {
          if (isMounted) setPrevMonthArchive(list);
        })
        .catch(console.warn);
    } else {
      setPrevMonthArchive([]);
    }
    return () => {
      isMounted = false;
    };
  }, [activeLaundryId, prevPeriodInfo.year, prevPeriodInfo.month]);

  // Collapsible section toggles
  const [expandLayanan, setExpandLayanan] = useState(true);
  const [expandPengeluaran, setExpandPengeluaran] = useState(true);
  const [expandPelanggan, setExpandPelanggan] = useState(true);

  // Filter transaksi & pengeluaran periode aktif
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
  }, [transaksiList, pengeluaranList, activeLaundryId, selectedMonth, selectedYear, monthArchive]);

  // Filter transaksi & pengeluaran periode sebelumnya (untuk komparasi historis)
  const { prevFilteredTrx, prevFilteredExp } = useMemo(() => {
    const map = new Map<string, Transaksi>();
    transaksiList.forEach((t) => map.set(t.id, t));
    prevMonthArchive.forEach((t) => map.set(t.id, t));
    const combinedTrx = Array.from(map.values());

    const trx = combinedTrx.filter((t) => {
      if (t.laundryId !== activeLaundryId) return false;
      const d = new Date(t.tanggalMasuk);
      const matchYear = d.getFullYear() === prevPeriodInfo.year;
      const matchMonth = prevPeriodInfo.month === -1 || d.getMonth() === prevPeriodInfo.month;
      return matchYear && matchMonth;
    });

    const exp = pengeluaranList.filter((p) => {
      if (p.laundryId !== activeLaundryId) return false;
      const d = new Date(p.tanggal);
      const matchYear = d.getFullYear() === prevPeriodInfo.year;
      const matchMonth = prevPeriodInfo.month === -1 || d.getMonth() === prevPeriodInfo.month;
      return matchYear && matchMonth;
    });

    return { prevFilteredTrx: trx, prevFilteredExp: exp };
  }, [transaksiList, pengeluaranList, activeLaundryId, prevPeriodInfo, prevMonthArchive]);

  // Agregat Metrik Periode Berjalan
  const summary = useMemo(() => {
    let totalOmzet = 0;
    let totalUangMasuk = 0;
    let totalUangMasukTrx = 0;
    let countLunas = 0;
    let countBelumLunas = 0;
    let totalWeight = 0;

    filteredTrx.forEach((t) => {
      totalOmzet += t.totalHarga;
      if (t.statusPembayaran === 'Lunas') {
        countLunas++;
        totalUangMasuk += t.totalHarga;
        totalUangMasukTrx += t.totalHarga;
      } else {
        countBelumLunas++;
        totalUangMasuk += t.jumlahDp || 0;
        totalUangMasukTrx += t.jumlahDp || 0;
      }

      (t.items || []).forEach((it) => {
        totalWeight += it.berat || 0;
      });
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
      expenseCategoryMap[p.keterangan || 'Operasional'] =
        (expenseCategoryMap[p.keterangan || 'Operasional'] || 0) + p.jumlah;
    });

    // Daily breakdown table
    const dailyMap: Record<string, { trxCount: number; masuk: number; keluar: number }> = {};
    filteredTrx.forEach((t) => {
      const dayKey = new Date(t.tanggalMasuk).toISOString().slice(0, 10);
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
      dailyMap[dayKey].trxCount++;
      dailyMap[dayKey].masuk += t.statusPembayaran === 'Lunas' ? t.totalHarga : t.jumlahDp || 0;
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
      totalPengeluaran,
      labaBersih,
      totalTrx: filteredTrx.length,
      totalWeight,
      countLunas,
      countBelumLunas,
      serviceList: Object.entries(serviceMap).sort((a, b) => b[1] - a[1]),
      customerList: Object.entries(customerMap).sort((a, b) => b[1] - a[1]),
      expenseList: Object.entries(expenseCategoryMap).sort((a, b) => b[1] - a[1]),
      dailyRows: Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])),
    };
  }, [filteredTrx, filteredExp]);

  // Agregat Metrik Periode Pembanding (Periode Lalu)
  const prevSummary = useMemo(() => {
    let totalOmzet = 0;
    let totalUangMasuk = 0;
    let totalWeight = 0;

    prevFilteredTrx.forEach((t) => {
      totalOmzet += t.totalHarga;
      if (t.statusPembayaran === 'Lunas') {
        totalUangMasuk += t.totalHarga;
      } else {
        totalUangMasuk += t.jumlahDp || 0;
      }
      (t.items || []).forEach((it) => {
        totalWeight += it.berat || 0;
      });
    });

    const totalPengeluaran = prevFilteredExp.reduce((sum, p) => sum + p.jumlah, 0);
    const labaBersih = totalUangMasuk - totalPengeluaran;

    // Service map periode lalu
    const serviceMap: Record<string, number> = {};
    prevFilteredTrx.forEach((t) => {
      (t.items || []).forEach((it) => {
        if (!it) return;
        serviceMap[it.namaLayanan] = (serviceMap[it.namaLayanan] || 0) + (it.berat || 0);
      });
    });

    return {
      totalOmzet,
      totalUangMasuk,
      totalPengeluaran,
      labaBersih,
      totalTrx: prevFilteredTrx.length,
      totalWeight,
      serviceMap,
    };
  }, [prevFilteredTrx, prevFilteredExp]);

  // Kalkulasi Pertumbuhan Komparatif (Growth Rates)
  const comparativeAnalytics = useMemo(() => {
    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const omzetDiff = summary.totalOmzet - prevSummary.totalOmzet;
    const omzetGrowth = calcGrowth(summary.totalOmzet, prevSummary.totalOmzet);

    const uangMasukDiff = summary.totalUangMasuk - prevSummary.totalUangMasuk;
    const uangMasukGrowth = calcGrowth(summary.totalUangMasuk, prevSummary.totalUangMasuk);

    const expDiff = summary.totalPengeluaran - prevSummary.totalPengeluaran;
    const expGrowth = calcGrowth(summary.totalPengeluaran, prevSummary.totalPengeluaran);

    const labaDiff = summary.labaBersih - prevSummary.labaBersih;
    const labaGrowth = calcGrowth(summary.labaBersih, prevSummary.labaBersih);

    const trxDiff = summary.totalTrx - prevSummary.totalTrx;
    const trxGrowth = calcGrowth(summary.totalTrx, prevSummary.totalTrx);

    const weightDiff = summary.totalWeight - prevSummary.totalWeight;
    const weightGrowth = calcGrowth(summary.totalWeight, prevSummary.totalWeight);

    return {
      omzetDiff,
      omzetGrowth,
      uangMasukDiff,
      uangMasukGrowth,
      expDiff,
      expGrowth,
      labaDiff,
      labaGrowth,
      trxDiff,
      trxGrowth,
      weightDiff,
      weightGrowth,
    };
  }, [summary, prevSummary]);

  const currentPeriodeLabel = `${selectedMonth === -1 ? 'Semua Bulan' : monthNames[selectedMonth]} ${selectedYear}`;

  // Handler Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    if (!canExcel) {
      onOpenUpgradeModal?.('Ekspor Pembukuan Lengkap ke Excel Spreadsheet (.xlsx)');
      return;
    }

    try {
      const exportPayload: LaporanSummaryExportData = {
        laundryName: effectiveLaundryName,
        periodeLabel: currentPeriodeLabel,
        totalOmzet: summary.totalOmzet,
        totalUangMasuk: summary.totalUangMasuk,
        totalUangMasukTrx: summary.totalUangMasukTrx,
        totalPengeluaran: summary.totalPengeluaran,
        labaBersih: summary.labaBersih,
        totalTrx: summary.totalTrx,
        countLunas: summary.countLunas,
        countBelumLunas: summary.countBelumLunas,
        comparison: {
          prevPeriodeLabel: prevPeriodInfo.label,
          prevOmzet: prevSummary.totalOmzet,
          prevUangMasuk: prevSummary.totalUangMasuk,
          prevPengeluaran: prevSummary.totalPengeluaran,
          prevLabaBersih: prevSummary.labaBersih,
          prevTrxCount: prevSummary.totalTrx,
          omzetGrowth: comparativeAnalytics.omzetGrowth,
          labaGrowth: comparativeAnalytics.labaGrowth,
        },
        serviceList: summary.serviceList,
        customerList: summary.customerList,
        expenseList: summary.expenseList,
        dailyRows: summary.dailyRows,
      };

      exportLaporanToExcel(exportPayload, filteredTrx, filteredExp);
      toast.success('Berkas Excel (.xlsx) berhasil diunduh!');
    } catch (err) {
      console.error('Export Excel error:', err);
      toast.error('Gagal mengekspor berkas Excel. Coba lagi.');
    }
  };

  // Payload data lengkap untuk pembuatan dokumen PDF resmi
  const pdfPayload: LaporanPdfData = useMemo(() => ({
    laundryName: effectiveLaundryName,
    laundryAddress: settings.address || 'Bandung',
    laundryPhone: settings.phoneNumber || '-',
    periodeLabel: currentPeriodeLabel,
    totalOmzet: summary.totalOmzet,
    totalUangMasuk: summary.totalUangMasuk,
    totalUangMasukTrx: summary.totalUangMasukTrx,
    totalPengeluaran: summary.totalPengeluaran,
    labaBersih: summary.labaBersih,
    totalTrx: summary.totalTrx,
    totalWeight: summary.totalWeight,
    countLunas: summary.countLunas,
    countBelumLunas: summary.countBelumLunas,
    comparison: {
      prevPeriodeLabel: prevPeriodInfo.label,
      prevOmzet: prevSummary.totalOmzet,
      prevUangMasuk: prevSummary.totalUangMasuk,
      prevPengeluaran: prevSummary.totalPengeluaran,
      prevLabaBersih: prevSummary.labaBersih,
      prevTrxCount: prevSummary.totalTrx,
      omzetGrowth: comparativeAnalytics.omzetGrowth,
      labaGrowth: comparativeAnalytics.labaGrowth,
      expGrowth: comparativeAnalytics.expGrowth,
      trxGrowth: comparativeAnalytics.trxGrowth,
    },
    serviceList: summary.serviceList,
    expenseList: summary.expenseList,
  }), [
    effectiveLaundryName,
    settings.address,
    settings.phoneNumber,
    currentPeriodeLabel,
    summary,
    prevPeriodInfo.label,
    prevSummary,
    comparativeAnalytics,
  ]);

  // 1-Click Direct Download PDF File
  const handleDownloadPDF = () => {
    if (!canPdf) {
      onOpenUpgradeModal?.('Cetak & Unduh Dokumen Laporan Keuangan Resmi A4 (.pdf)');
      return;
    }

    try {
      const fileName = generateLaporanPdf(pdfPayload);
      toast.success(`Berkas PDF ${fileName} berhasil diunduh ke HP/PC!`);
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error('Gagal mengunduh PDF. Membuka pratinjau...');
      setShowPdfModal(true);
    }
  };

  // Open Preview & Print Modal
  const handleOpenPdfModal = () => {
    if (!canPdf) {
      onOpenUpgradeModal?.('Pratinjau & Cetak Dokumen Laporan Keuangan Resmi A4');
      return;
    }

    setShowPdfModal(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 h-14 no-print">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={onBack}
            className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-1 sm:mr-2 cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-sm sm:text-base tracking-wide leading-tight truncate">
              Laporan Keuangan
            </h1>
            <p className="text-[10px] text-red-200/90 hidden sm:block truncate">
              {effectiveLaundryName} • {currentPeriodeLabel}
            </p>
          </div>
        </div>

        {/* Tombol Ekspor Excel & Cetak PDF */}
     {/* Tombol Ekspor Excel, Cetak PDF & Pratinjau (Warna hanya pada Icon/Logo) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Tombol Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white transition active:scale-95 cursor-pointer"
            title={!canExcel ? 'Terkunci di Paket Newcomer (Klik untuk upgrade)' : 'Unduh Spreadsheet Excel (.xlsx)'}
          >
            {!canExcel ? (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span className="hidden sm:inline">Excel</span>
            {!canExcel && (
              <span className="text-[9px] text-amber-300 bg-amber-400/20 px-1 py-0.2 rounded font-black">
                BASIC
              </span>
            )}
          </button>

          {/* Tombol PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white transition active:scale-95 cursor-pointer"
            title={!canPdf ? 'Terkunci di Paket Newcomer (Klik untuk upgrade ke Basic)' : 'Unduh Berkas PDF (.pdf) Langsung'}
          >
            {!canPdf ? (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Download className="w-4 h-4 text-rose-400" />
            )}
            <span className="hidden sm:inline">PDF</span>
            <span className="sm:hidden">PDF</span>
            {!canPdf && (
              <span className="text-[9px] text-amber-300 bg-amber-400/20 px-1 py-0.2 rounded font-black">
                BASIC
              </span>
            )}
          </button>

          {/* Tombol Cetak / Pratinjau */}
          <button
            type="button"
            onClick={handleOpenPdfModal}
            className="px-2 sm:px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:bg-white/25 text-white transition active:scale-95 cursor-pointer"
            title={!canPdf ? 'Terkunci di Paket Newcomer (Klik untuk upgrade)' : 'Pratinjau Dokumen & Cetak Kertas'}
          >
            {!canPdf ? (
              <Lock className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Printer className="w-4 h-4 text-amber-300" />
            )}
            <span className="hidden md:inline">Cetak</span>
            <span className="md:hidden">Cetak</span>
          </button>
        </div>
      </header>

      {/* Filter Month & Year Bar + Tab Switcher */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 shadow-2xs no-print">
        <div className="max-w-xl md:max-w-5xl mx-auto w-full space-y-2.5">
          {/* Dropdown Pemilihan Periode */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 md:max-w-xs">
              <span className="text-xs font-bold text-slate-600">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#800000]"
              >
                <option value={-1}>Semua Bulan (Tahunan)</option>
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

          {/* Tab Switcher: Ringkasan vs Analisis Komparasi */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'ringkasan'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📊 Ringkasan Keuangan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!canGrowth) {
                  onOpenUpgradeModal?.('Analisis Komparasi Pertumbuhan Historis (MoM & YoY)');
                  return;
                }
                setActiveTab('komparasi');
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'komparasi'
                  ? 'bg-[#800000] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {!canGrowth ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Analisis Komparasi {!canGrowth ? '(Basic)' : ''}</span>
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto max-w-xl md:max-w-5xl mx-auto w-full no-print">
        {/* ======================================================== */}
        {/* TAB 1: RINGKASAN KEUANGAN                                */}
        {/* ======================================================== */}
        {activeTab === 'ringkasan' && (
          <>
            {/* Data Keuangan Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-extrabold text-[#800000] uppercase tracking-wider">
                  Data Keuangan ({currentPeriodeLabel})
                </h2>
                <span className="text-[11px] text-slate-500 font-medium">
                  {summary.totalTrx} Transaksi
                </span>
              </div>

              <div className="space-y-2 text-xs divide-y divide-slate-100">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-600">Total Pendapatan (Omzet)</span>
                  <span className="font-extrabold text-slate-900 tabular-nums">
                    {formatRupiah(summary.totalOmzet)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-700 font-bold">Total Uang Masuk</span>
                  <span className="font-black text-emerald-700 tabular-nums">
                    {formatRupiah(summary.totalUangMasuk)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1.5 pl-3 text-slate-500 text-[11px]">
                  <span>- Pemasukan Transaksi Cucian</span>
                  <span className="tabular-nums">{formatRupiah(summary.totalUangMasukTrx)}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-700 font-bold">Total Pengeluaran Operasional</span>
                  <span className="font-black text-red-600 tabular-nums">
                    {formatRupiah(summary.totalPengeluaran)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2.5 bg-emerald-50/70 p-2.5 rounded-xl text-sm font-black border border-emerald-100">
                  <span className="text-slate-800">Laba Bersih</span>
                  <span
                    className={`tabular-nums ${
                      summary.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {formatRupiah(summary.labaBersih)}
                  </span>
                </div>
              </div>
            </div>

            {/* Data Transaksi Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
              <h2 className="text-xs font-extrabold text-[#800000] uppercase tracking-wider">
                Status Pelunasan Transaksi
              </h2>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] text-slate-500 font-medium">Total Order</p>
                  <p className="text-base font-black text-slate-900 tabular-nums">{summary.totalTrx}</p>
                </div>
                <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                  <p className="text-[10px] text-emerald-700 font-medium">Lunas</p>
                  <p className="text-base font-black text-emerald-700 tabular-nums">{summary.countLunas}</p>
                </div>
                <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-medium">Belum Lunas</p>
                  <p className="text-base font-black text-amber-700 tabular-nums">{summary.countBelumLunas}</p>
                </div>
              </div>
            </div>

            {/* Grid Rekapitulasi (1 kolom di HP, 3 kolom di PC) */}
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
                  {expandLayanan ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandLayanan && (
                  <div className="divide-y divide-slate-100 text-xs pt-1">
                    {summary.serviceList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2">Belum ada data layanan</p>
                    ) : (
                      summary.serviceList.map(([name, weight], idx) => (
                        <div key={idx} className="py-1.5 flex justify-between">
                          <span className="text-slate-700">- {name}</span>
                          <span className="font-bold text-slate-900 tabular-nums">
                            {weight.toFixed(1)} Unit/Kg
                          </span>
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
                    Rekap Biaya Operasional ({summary.expenseList.length})
                  </h2>
                  {expandPengeluaran ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandPengeluaran && (
                  <div className="divide-y divide-slate-100 text-xs pt-1">
                    {summary.expenseList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2">Belum ada data pengeluaran</p>
                    ) : (
                      summary.expenseList.map(([cat, total], idx) => (
                        <div key={idx} className="py-1.5 flex justify-between">
                          <span className="text-slate-700">- {cat}</span>
                          <span className="font-bold text-red-600 tabular-nums">{formatRupiah(total)}</span>
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
                    Pelanggan Terbanyak ({summary.customerList.length})
                  </h2>
                  {expandPelanggan ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandPelanggan && (
                  <div className="divide-y divide-slate-100 text-xs pt-1">
                    {summary.customerList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2">Belum ada transaksi</p>
                    ) : (
                      summary.customerList.slice(0, 10).map(([name, count], idx) => (
                        <div key={idx} className="py-1.5 flex justify-between">
                          <span className="text-slate-700">
                            {idx + 1}. {name}
                          </span>
                          <span className="font-bold text-[#800000] tabular-nums">
                            {count} Transaksi
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tombol Tampilkan Rincian Harian */}
            <button
              type="button"
              onClick={() => setShowDailyDetails(!showDailyDetails)}
              className="w-full py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition cursor-pointer"
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
                        <div
                          key={idx}
                          className="p-2.5 grid grid-cols-5 text-center items-center hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {dateObj.getDate()} {monthNames[dateObj.getMonth()].slice(0, 3)}
                          </span>
                          <span className="text-slate-600 tabular-nums">{val.trxCount}</span>
                          <span className="text-right font-bold text-emerald-600 tabular-nums">
                            {formatRupiah(val.masuk).replace('Rp ', '')}
                          </span>
                          <span className="text-right font-bold text-red-600 tabular-nums">
                            {formatRupiah(val.keluar).replace('Rp ', '')}
                          </span>
                          <span
                            className={`text-right font-bold tabular-nums ${
                              laba >= 0 ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {formatRupiah(laba).replace('Rp ', '')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ANALISIS KOMPARASI PRO (Bulan Lalu vs Sekarang)   */}
        {/* ======================================================== */}
        {activeTab === 'komparasi' && (
          <div className="space-y-4">
            {/* Header Komparasi Context */}
            <div className="p-4 rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 text-white shadow-md border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-bold mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Komparasi Pertumbuhan Usaha (Pro Analytics)
                </span>
                <h3 className="text-base font-black">
                  {currentPeriodeLabel} <span className="text-slate-400 font-normal">dibandingkan</span>{' '}
                  <span className="text-amber-200">{prevPeriodInfo.label}</span>
                </h3>
              </div>
              <div className="text-[11px] bg-white/10 px-3 py-1.5 rounded-xl border border-white/15 text-slate-200">
                Tipe: <strong>{prevPeriodInfo.type === 'MoM' ? 'Bulan ke Bulan (MoM)' : 'Tahun ke Tahun (YoY)'}</strong>
              </div>
            </div>

            {/* 4 Kartu Metrik Komparasi Utama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Omzet Usaha */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500">Omzet Usaha</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                      comparativeAnalytics.omzetGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.omzetGrowth >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {comparativeAnalytics.omzetGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.omzetGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 tabular-nums">
                  {formatRupiah(summary.totalOmzet)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Periode Lalu:</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(prevSummary.totalOmzet)}</span>
                </div>
                <div className="text-[11px] flex justify-between">
                  <span>Selisih:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      comparativeAnalytics.omzetDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.omzetDiff >= 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.omzetDiff)}
                  </span>
                </div>
              </div>

              {/* 2. Laba Bersih */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500">Laba Bersih</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                      comparativeAnalytics.labaGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.labaGrowth >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5" />
                    )}
                    {comparativeAnalytics.labaGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.labaGrowth.toFixed(1)}%
                  </span>
                </div>
                <p
                  className={`text-lg font-black tabular-nums ${
                    summary.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatRupiah(summary.labaBersih)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Periode Lalu:</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(prevSummary.labaBersih)}</span>
                </div>
                <div className="text-[11px] flex justify-between">
                  <span>Selisih:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      comparativeAnalytics.labaDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.labaDiff >= 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.labaDiff)}
                  </span>
                </div>
              </div>

              {/* 3. Pengeluaran Operasional */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500">Beban Pengeluaran</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                      comparativeAnalytics.expGrowth <= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {comparativeAnalytics.expGrowth <= 0 ? 'Hemat ' : 'Naik '}
                    {Math.abs(comparativeAnalytics.expGrowth).toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-black text-red-600 tabular-nums">
                  {formatRupiah(summary.totalPengeluaran)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Periode Lalu:</span>
                  <span className="font-semibold tabular-nums">{formatRupiah(prevSummary.totalPengeluaran)}</span>
                </div>
                <div className="text-[11px] flex justify-between">
                  <span>Selisih:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      comparativeAnalytics.expDiff <= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.expDiff > 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.expDiff)}
                  </span>
                </div>
              </div>

              {/* 4. Total Order & Berat Cucian */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-slate-500">Order & Volume</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black ${
                      comparativeAnalytics.trxGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.trxGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.trxGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 tabular-nums">
                  {summary.totalTrx} <span className="text-xs text-slate-500 font-normal">Order</span> ({summary.totalWeight.toFixed(1)} Kg)
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                  <span>Periode Lalu:</span>
                  <span className="font-semibold tabular-nums">
                    {prevSummary.totalTrx} Order ({prevSummary.totalWeight.toFixed(1)} Kg)
                  </span>
                </div>
                <div className="text-[11px] flex justify-between">
                  <span>Selisih:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      comparativeAnalytics.trxDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.trxDiff >= 0 ? '+' : ''}
                    {comparativeAnalytics.trxDiff} Order
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Comparison Progress Bars */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Visual Rasio Pencapaian Finansial
              </h4>

              {/* Bar 1: Omzet Comparison */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">Perbandingan Omzet</span>
                  <span className="text-slate-900 tabular-nums">
                    {formatRupiah(summary.totalOmzet)} vs {formatRupiah(prevSummary.totalOmzet)}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-500"
                    style={{
                      width: `${
                        prevSummary.totalOmzet + summary.totalOmzet > 0
                          ? Math.min(100, Math.max(5, (summary.totalOmzet / (summary.totalOmzet + prevSummary.totalOmzet)) * 100))
                          : 50
                      }%`,
                    }}
                    title={`Periode Ini: ${formatRupiah(summary.totalOmzet)}`}
                  />
                  <div
                    className="h-full bg-slate-300 transition-all duration-500"
                    style={{
                      width: `${
                        prevSummary.totalOmzet + summary.totalOmzet > 0
                          ? Math.min(100, Math.max(5, (prevSummary.totalOmzet / (summary.totalOmzet + prevSummary.totalOmzet)) * 100))
                          : 50
                      }%`,
                    }}
                    title={`Periode Lalu: ${formatRupiah(prevSummary.totalOmzet)}`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" /> Periode Ini ({currentPeriodeLabel})
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-slate-400" /> Periode Lalu ({prevPeriodInfo.label})
                  </span>
                </div>
              </div>

              {/* Bar 2: Laba Bersih Comparison */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-700">Perbandingan Laba Bersih</span>
                  <span className="text-slate-900 tabular-nums">
                    {formatRupiah(summary.labaBersih)} vs {formatRupiah(prevSummary.labaBersih)}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#800000] transition-all duration-500"
                    style={{
                      width: `${
                        Math.max(0, prevSummary.labaBersih) + Math.max(0, summary.labaBersih) > 0
                          ? Math.min(
                              100,
                              Math.max(
                                5,
                                (Math.max(0, summary.labaBersih) /
                                  (Math.max(0, summary.labaBersih) + Math.max(0, prevSummary.labaBersih))) *
                                  100
                              )
                            )
                          : 50
                      }%`,
                    }}
                  />
                  <div
                    className="h-full bg-slate-300 transition-all duration-500"
                    style={{
                      width: `${
                        Math.max(0, prevSummary.labaBersih) + Math.max(0, summary.labaBersih) > 0
                          ? Math.min(
                              100,
                              Math.max(
                                5,
                                (Math.max(0, prevSummary.labaBersih) /
                                  (Math.max(0, summary.labaBersih) + Math.max(0, prevSummary.labaBersih))) *
                                  100
                              )
                            )
                          : 50
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Evaluasi Usaha Otomatis */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Ringkasan Evaluasi Performa Bisnis:</span>
              </div>
              <ul className="space-y-1 text-amber-900/90 pl-5 list-disc leading-relaxed text-[11px]">
                {comparativeAnalytics.omzetGrowth > 0 ? (
                  <li>
                    <strong>Pendapatan Meningkat:</strong> Omzet toko Anda mengalami kenaikan sebesar{' '}
                    <span className="font-bold text-emerald-800">
                      +{comparativeAnalytics.omzetGrowth.toFixed(1)}% ({formatRupiah(comparativeAnalytics.omzetDiff)})
                    </span>{' '}
                    dibanding periode {prevPeriodInfo.label}.
                  </li>
                ) : comparativeAnalytics.omzetGrowth < 0 ? (
                  <li>
                    <strong>Pendapatan Menurun:</strong> Omzet toko Anda terkoreksi sebesar{' '}
                    <span className="font-bold text-red-700">
                      {comparativeAnalytics.omzetGrowth.toFixed(1)}% ({formatRupiah(comparativeAnalytics.omzetDiff)})
                    </span>
                    . Pertimbangkan promo bundling atau follow-up pelanggan lama.
                  </li>
                ) : (
                  <li>Pendapatan stabil dan seimbang dengan periode sebelumnya.</li>
                )}

                {comparativeAnalytics.expDiff > 0 ? (
                  <li>
                    <strong>Perhatian Biaya:</strong> Pengeluaran operasional naik sebesar{' '}
                    <span className="font-bold text-red-700">
                      +{formatRupiah(comparativeAnalytics.expDiff)} (+{comparativeAnalytics.expGrowth.toFixed(1)}%)
                    </span>
                    . Pastikan stok deterjen, listrik, dan gas terkontrol efisien.
                  </li>
                ) : comparativeAnalytics.expDiff < 0 ? (
                  <li>
                    <strong>Efisiensi Positif:</strong> Pengeluaran operasional berhasil dihemat sebesar{' '}
                    <span className="font-bold text-emerald-800">
                      {formatRupiah(Math.abs(comparativeAnalytics.expDiff))} ({Math.abs(comparativeAnalytics.expGrowth).toFixed(1)}%)
                    </span>
                    .
                  </li>
                ) : null}

                <li>
                  Total pelanggan yang dilayani pada periode ini sebanyak{' '}
                  <strong>{summary.customerList.length} orang</strong> dengan rata-rata{' '}
                  <strong>
                    {summary.totalTrx > 0 ? (summary.totalWeight / summary.totalTrx).toFixed(1) : '0'} Kg
                  </strong>{' '}
                  per nota.
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Modal Pratinjau Dokumen & Cetak PDF Resmi */}
      <ReportPdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        data={pdfPayload}
      />
    </div>
  );
};
