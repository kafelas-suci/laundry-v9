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
  BarChart3,
  LineChart,
  Layers,
  Award,
  Zap,
  Activity,
  Info,
  Building2,
  Users,
} from 'lucide-react';
import { Transaksi, Pengeluaran, SettingsData, Laundry, StaffPerformanceSummary } from '../types';
import { formatRupiah, formatShortDate, formatReceiptDate, formatLocalDateKey, extractTransaksiCashInEntries } from '../utils/formatters';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { StorageService, defaultSettings } from '../utils/storage';
import { IndexedDbService } from '../utils/indexedDb';
import { exportLaporanToExcel, LaporanSummaryExportData } from '../utils/excelExport';
import { generateLaporanPdf, LaporanPdfData } from '../utils/pdfExport';
import { ReportPdfModal } from '../components/ReportPdfModal';
import { useToast } from '../components/NotificationContext';
import { getLaundryLimits } from '../utils/subscription';
import { BranchComparisonD3Chart, BranchPerformanceData } from '../components/BranchComparisonD3Chart';

interface LaporanViewProps {
  onBack: () => void;
  transaksiList: Transaksi[];
  pengeluaranList: Pengeluaran[];
  activeLaundryId: string;
  laundryName?: string;
  currentTier?: string | null;
  onOpenUpgradeModal?: (reason?: string) => void;
  laundries?: Laundry[];
  onSelectBranch?: (branchId: string) => void;
  allTransaksiList?: Transaksi[];
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  onBack,
  transaksiList,
  pengeluaranList,
  activeLaundryId,
  laundryName,
  currentTier,
  onOpenUpgradeModal,
  laundries = [],
  onSelectBranch,
  allTransaksiList,
}) => {
  const toast = useToast();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const limits = getLaundryLimits(currentTier);
  const canExcel = limits.canExportExcel;
  const canPdf = limits.canExportOfficialPdf;
  const canGrowth = limits.canViewComparisonGrowth;

  const [activeTab, setActiveTab] = useState<'ringkasan' | 'komparasi' | 'cabang'>('ringkasan');
  const [compareChartMode, setCompareChartMode] = useState<'batang' | 'tren' | 'layanan' | 'staf' | 'rasio'>('batang');
  const [trendMetric, setTrendMetric] = useState<'omzet' | 'uangMasuk' | 'trx'>('omzet');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
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

  const rawLaundryName = laundryName || settings.headerStruk || settings.appTitle;
  const effectiveLaundryName = typeof rawLaundryName === 'object' && rawLaundryName !== null
    ? (rawLaundryName as any).namaLaundry || "Kafelas Laundry"
    : (rawLaundryName || "Kafelas Laundry");

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
      // Jika "Semua Bulan (Tahunan)" dipilih, muat seluruh arsip laundry dari IndexedDB lokal
      IndexedDbService.getAllArchive(activeLaundryId)
        .then((list) => {
          if (isMounted) setMonthArchive(list);
        })
        .catch(console.warn);
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
      IndexedDbService.getAllArchive(activeLaundryId)
        .then((list) => {
          if (isMounted) setPrevMonthArchive(list);
        })
        .catch(console.warn);
    }
    return () => {
      isMounted = false;
    };
  }, [activeLaundryId, prevPeriodInfo.year, prevPeriodInfo.month]);

  // Collapsible section toggles
  const [expandLayanan, setExpandLayanan] = useState(true);
  const [expandStaf, setExpandStaf] = useState(true);
  const [expandPengeluaran, setExpandPengeluaran] = useState(true);
  const [expandPelanggan, setExpandPelanggan] = useState(true);
  const [expandPelunasanLalu, setExpandPelunasanLalu] = useState(true);

  // Toggle tampilkan semua baris (melebihi 3 baris teratas)
  const [showAllLayanan, setShowAllLayanan] = useState<boolean>(false);
  const [showAllStaf, setShowAllStaf] = useState<boolean>(false);
  const [showAllPengeluaran, setShowAllPengeluaran] = useState<boolean>(false);
  const [showAllPelanggan, setShowAllPelanggan] = useState<boolean>(false);
  const [showAllPelunasanLalu, setShowAllPelunasanLalu] = useState<boolean>(false);

  // Helper pemeriksa apakah timestamp berada dalam periode tahun & bulan yang dipilih (Waktu Lokal)
  const isTimestampInPeriod = (timestamp: number | null | undefined, year: number, month: number): boolean => {
    if (!timestamp) return false;
    const d = new Date(timestamp);
    const matchYear = d.getFullYear() === year;
    const matchMonth = month === -1 || d.getMonth() === month;
    return matchYear && matchMonth;
  };

  // Kumpulan seluruh transaksi outlet aktif (aktif + arsip bulan terpilih + arsip pembanding)
  const allCombinedBranchTrx = useMemo(() => {
    const map = new Map<string, Transaksi>();
    transaksiList.forEach((t) => map.set(t.id, t));
    monthArchive.forEach((t) => map.set(t.id, t));
    prevMonthArchive.forEach((t) => map.set(t.id, t));
    return Array.from(map.values()).filter((t) => t.laundryId === activeLaundryId);
  }, [transaksiList, monthArchive, prevMonthArchive, activeLaundryId]);

  // Perhitungan Data Komparasi Kinerja Antar-Cabang (D3.js)
  const branchComparisonData: BranchPerformanceData[] = useMemo(() => {
    const effectiveLaundries: Laundry[] = laundries && laundries.length > 0
      ? laundries
      : [{ id: activeLaundryId, ownerId: 'owner', namaLaundry: effectiveLaundryName, alamat: '', nomorTelepon: '' }];

    const sourceTrx = allTransaksiList && allTransaksiList.length > 0 ? allTransaksiList : transaksiList;

    const isMatchBranch = (t: Transaksi, branchId: string) => {
      if (t.laundryId === branchId) return true;
      if (!t.laundryId && branchId === effectiveLaundries[0]?.id) return true;
      return false;
    };

    // Filter transaksi berdasarkan periode aktif
    const activePeriodTrx = sourceTrx.filter((t) => isTimestampInPeriod(t.tanggalMasuk, selectedYear, selectedMonth));
    const totalBusinessOmzet = activePeriodTrx.reduce((sum, t) => sum + (t.totalHarga || 0), 0);

    return effectiveLaundries.map((lnd) => {
      const branchTrx = activePeriodTrx.filter((t) => isMatchBranch(t, lnd.id));
      const totalOmzet = branchTrx.reduce((sum, t) => sum + (t.totalHarga || 0), 0);
      const totalTrx = branchTrx.length;
      const aov = totalTrx > 0 ? Math.round(totalOmzet / totalTrx) : 0;
      const percentageContribution = totalBusinessOmzet > 0 ? (totalOmzet / totalBusinessOmzet) * 100 : 0;

      // Hitung uang masuk kasir untuk cabang ini
      let totalUangMasuk = 0;
      sourceTrx.filter((t) => isMatchBranch(t, lnd.id)).forEach((t) => {
        const entries = extractTransaksiCashInEntries(t);
        entries.forEach((entry) => {
          if (isTimestampInPeriod(entry.timestamp, selectedYear, selectedMonth)) {
            totalUangMasuk += entry.amount;
          }
        });
      });

      return {
        branchId: lnd.id,
        branchName: lnd.namaLaundry,
        totalOmzet,
        totalUangMasuk,
        totalTrx,
        aov,
        percentageContribution,
        address: lnd.alamat,
        phone: lnd.nomorTelepon,
      };
    });
  }, [laundries, activeLaundryId, effectiveLaundryName, allTransaksiList, transaksiList, selectedYear, selectedMonth]);

  // Filter transaksi masuk & pengeluaran periode aktif
  const { filteredTrx, filteredExp } = useMemo(() => {
    const trx = allCombinedBranchTrx.filter((t) => isTimestampInPeriod(t.tanggalMasuk, selectedYear, selectedMonth));

    const exp = pengeluaranList.filter((p) => {
      if (p.laundryId !== activeLaundryId) return false;
      return isTimestampInPeriod(p.tanggal, selectedYear, selectedMonth);
    });

    return { filteredTrx: trx, filteredExp: exp };
  }, [allCombinedBranchTrx, pengeluaranList, activeLaundryId, selectedMonth, selectedYear]);

  // Filter transaksi masuk & pengeluaran periode sebelumnya (untuk komparasi historis)
  const { prevFilteredTrx, prevFilteredExp } = useMemo(() => {
    const trx = allCombinedBranchTrx.filter((t) => isTimestampInPeriod(t.tanggalMasuk, prevPeriodInfo.year, prevPeriodInfo.month));

    const exp = pengeluaranList.filter((p) => {
      if (p.laundryId !== activeLaundryId) return false;
      return isTimestampInPeriod(p.tanggal, prevPeriodInfo.year, prevPeriodInfo.month);
    });

    return { prevFilteredTrx: trx, prevFilteredExp: exp };
  }, [allCombinedBranchTrx, pengeluaranList, activeLaundryId, prevPeriodInfo]);

  // Agregat Metrik Periode Berjalan (Arus Kas Riil & Pelunasan Lintas Bulan)
  const summary = useMemo(() => {
    let totalOmzet = 0;
    let countLunas = 0;
    let countBelumLunas = 0;
    let totalWeight = 0;
    let totalPiutang = 0;

    const serviceMap: Record<string, number> = {};
    const customerMap: Record<string, number> = {};
    const staffMap: Record<string, StaffPerformanceSummary> = {};

    // 1. Data Pesanan Cucian Masuk pada Periode Ini
    const endOfPeriod = selectedMonth === -1
      ? new Date(selectedYear, 11, 31, 23, 59, 59, 999).getTime()
      : new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).getTime();

    filteredTrx.forEach((t) => {
      totalOmzet += t.totalHarga || 0;
      const waktuPelunasan = t.tanggalPelunasan || t.tanggalPengambilan;
      const isLunasInPeriod = t.statusPembayaran === 'Lunas' && (!waktuPelunasan || waktuPelunasan <= endOfPeriod);

      if (isLunasInPeriod) {
        countLunas++;
      } else {
        countBelumLunas++;
        const bayarAwal = Math.min(t.totalHarga || 0, t.jumlahDp || 0);
        const sisa = Math.max(0, (t.totalHarga || 0) - bayarAwal);
        totalPiutang += sisa;
      }

      (t.items || []).forEach((it) => {
        if (!it) return;
        totalWeight += it.berat || 0;
        serviceMap[it.namaLayanan] = (serviceMap[it.namaLayanan] || 0) + (it.berat || 0);
      });

      if (t.namaPelanggan) {
        customerMap[t.namaPelanggan] = (customerMap[t.namaPelanggan] || 0) + 1;
      }

      // Evaluasi Kinerja Staf / Kasir
      const rawStaff = t.dikerjakanOleh && t.dikerjakanOleh.trim()
        ? t.dikerjakanOleh.trim()
        : 'Kasir / Belum Ditugaskan';

      if (!staffMap[rawStaff]) {
        staffMap[rawStaff] = {
          nama: rawStaff,
          totalTrx: 0,
          totalKg: 0,
          totalOmzet: 0,
          countSelesai: 0,
          countProses: 0,
          countDiterima: 0,
        };
      }

      staffMap[rawStaff].totalTrx += 1;
      staffMap[rawStaff].totalOmzet += t.totalHarga || 0;
      (t.items || []).forEach((it) => {
        if (!it) return;
        staffMap[rawStaff].totalKg += it.berat || 0;
      });

      if (t.status === 'Selesai' || t.status === 'Diambil') {
        staffMap[rawStaff].countSelesai += 1;
      } else if (t.status === 'Proses') {
        staffMap[rawStaff].countProses += 1;
      } else {
        staffMap[rawStaff].countDiterima += 1;
      }
    });

    // 2. Data Arus Kas Masuk Kasir Riil (Uang Masuk DP + Pelunasan yang diterima di bulan ini)
    let totalUangMasuk = 0;
    let uangMasukOrderBulanIni = 0;
    let uangPelunasanBulanLalu = 0;
    const dailyMap: Record<string, { trxCount: number; masuk: number; keluar: number }> = {};
    const pelunasanBulanLaluList: {
      trx: Transaksi;
      pelunasan: number;
      waktuPelunasan: number;
    }[] = [];

    // Catat jumlah order masuk pada hari order masuk (Ganti hari lokal: 00:00 tengah malam)
    filteredTrx.forEach((t) => {
      const dayKey = formatLocalDateKey(t.tanggalMasuk);
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
      dailyMap[dayKey].trxCount++;
    });

    // Evaluasi seluruh aliran uang masuk riil dari SEMUA transaksi
    allCombinedBranchTrx.forEach((t) => {
      const entries = extractTransaksiCashInEntries(t);
      entries.forEach((entry) => {
        if (isTimestampInPeriod(entry.timestamp, selectedYear, selectedMonth)) {
          totalUangMasuk += entry.amount;

          // Apakah uang ini berasal dari order yang masuk di bulan ini atau bulan sebelumnya?
          const orderMasukDiBulanIni = isTimestampInPeriod(t.tanggalMasuk, selectedYear, selectedMonth);
          if (orderMasukDiBulanIni) {
            uangMasukOrderBulanIni += entry.amount;
          } else {
            uangPelunasanBulanLalu += entry.amount;
            if (entry.type === 'pelunasan') {
              pelunasanBulanLaluList.push({
                trx: t,
                pelunasan: entry.amount,
                waktuPelunasan: entry.timestamp,
              });
            }
          }

          // Catat pemasukan kas pada hari uang tersebut fisik diterima di kasir
          const dayKey = formatLocalDateKey(entry.timestamp);
          if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
          dailyMap[dayKey].masuk += entry.amount;
        }
      });
    });

    // 3. Evaluasi Pengeluaran Operasional pada Periode Ini
    const expenseCategoryMap: Record<string, number> = {};
    let totalPengeluaran = 0;
    filteredExp.forEach((p) => {
      totalPengeluaran += p.jumlah;
      expenseCategoryMap[p.keterangan || 'Operasional'] =
        (expenseCategoryMap[p.keterangan || 'Operasional'] || 0) + p.jumlah;

      const dayKey = formatLocalDateKey(p.tanggal);
      if (!dailyMap[dayKey]) dailyMap[dayKey] = { trxCount: 0, masuk: 0, keluar: 0 };
      dailyMap[dayKey].keluar += p.jumlah;
    });

    const labaBersih = totalUangMasuk - totalPengeluaran;

    const staffList = Object.values(staffMap).sort((a, b) => {
      if (b.totalTrx !== a.totalTrx) return b.totalTrx - a.totalTrx;
      return b.totalKg - a.totalKg;
    });

    return {
      totalOmzet,
      totalUangMasuk,
      totalUangMasukTrx: totalUangMasuk, // Seluruh uang kasir laundry yang diterima
      uangMasukOrderBulanIni,
      uangPelunasanBulanLalu,
      totalPiutang,
      totalPengeluaran,
      labaBersih,
      totalTrx: filteredTrx.length,
      totalWeight,
      countLunas,
      countBelumLunas,
      serviceMap,
      serviceList: Object.entries(serviceMap).sort((a, b) => b[1] - a[1]),
      staffList,
      customerList: Object.entries(customerMap).sort((a, b) => b[1] - a[1]),
      expenseList: Object.entries(expenseCategoryMap).sort((a, b) => b[1] - a[1]),
      dailyRows: Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])),
      pelunasanBulanLaluList: pelunasanBulanLaluList.sort((a, b) => b.waktuPelunasan - a.waktuPelunasan),
    };
  }, [filteredTrx, filteredExp, allCombinedBranchTrx, selectedMonth, selectedYear]);

  // Agregat Metrik Periode Pembanding (Periode Lalu)
  const prevSummary = useMemo(() => {
    let totalOmzet = 0;
    let totalWeight = 0;

    prevFilteredTrx.forEach((t) => {
      totalOmzet += t.totalHarga || 0;
      (t.items || []).forEach((it) => {
        totalWeight += it.berat || 0;
      });
    });

    // Hitung arus kas masuk riil periode pembanding
    let totalUangMasuk = 0;
    allCombinedBranchTrx.forEach((t) => {
      const entries = extractTransaksiCashInEntries(t);
      entries.forEach((entry) => {
        if (isTimestampInPeriod(entry.timestamp, prevPeriodInfo.year, prevPeriodInfo.month)) {
          totalUangMasuk += entry.amount;
        }
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
  }, [prevFilteredTrx, prevFilteredExp, allCombinedBranchTrx, prevPeriodInfo]);

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

  // Data Perbandingan Tren Kurva SVG (Harian jika per bulan, atau Bulanan jika per tahun)
  const trendComparisonData = useMemo(() => {
    const isYearly = selectedMonth === -1;
    const numPoints = isYearly ? 12 : new Date(selectedYear, selectedMonth + 1, 0).getDate();

    const currentPoints: { label: string; fullLabel: string; omzet: number; uangMasuk: number; trx: number }[] = [];
    const prevPoints: { label: string; fullLabel: string; omzet: number; uangMasuk: number; trx: number }[] = [];

    for (let i = 0; i < numPoints; i++) {
      const label = isYearly ? monthNames[i].slice(0, 3) : `${i + 1}`;
      const fullLabel = isYearly
        ? `${monthNames[i]} ${selectedYear}`
        : `${i + 1} ${monthNames[selectedMonth]} ${selectedYear}`;
      currentPoints.push({ label, fullLabel, omzet: 0, uangMasuk: 0, trx: 0 });

      const prevFullLabel = isYearly
        ? `${monthNames[i]} ${prevPeriodInfo.year}`
        : `${i + 1} ${prevPeriodInfo.month !== -1 ? monthNames[prevPeriodInfo.month] : ''} ${prevPeriodInfo.year}`;
      prevPoints.push({ label, fullLabel: prevFullLabel, omzet: 0, uangMasuk: 0, trx: 0 });
    }

    // 1. Omzet dan order masuk periode berjalan
    filteredTrx.forEach((t) => {
      const d = new Date(t.tanggalMasuk);
      const idx = isYearly ? d.getMonth() : d.getDate() - 1;
      if (idx >= 0 && idx < numPoints) {
        currentPoints[idx].omzet += t.totalHarga || 0;
        currentPoints[idx].trx += 1;
      }
    });

    // 2. Arus kas masuk riil periode berjalan
    allCombinedBranchTrx.forEach((t) => {
      const entries = extractTransaksiCashInEntries(t);
      entries.forEach((entry) => {
        if (isTimestampInPeriod(entry.timestamp, selectedYear, selectedMonth)) {
          const d = new Date(entry.timestamp);
          const idx = isYearly ? d.getMonth() : d.getDate() - 1;
          if (idx >= 0 && idx < numPoints) {
            currentPoints[idx].uangMasuk += entry.amount;
          }
        }
      });
    });

    // 3. Omzet dan order masuk periode pembanding
    prevFilteredTrx.forEach((t) => {
      const d = new Date(t.tanggalMasuk);
      const idx = isYearly ? d.getMonth() : d.getDate() - 1;
      if (idx >= 0 && idx < numPoints) {
        prevPoints[idx].omzet += t.totalHarga || 0;
        prevPoints[idx].trx += 1;
      }
    });

    // 4. Arus kas masuk riil periode pembanding
    allCombinedBranchTrx.forEach((t) => {
      const entries = extractTransaksiCashInEntries(t);
      entries.forEach((entry) => {
        if (isTimestampInPeriod(entry.timestamp, prevPeriodInfo.year, prevPeriodInfo.month)) {
          const d = new Date(entry.timestamp);
          const idx = isYearly ? d.getMonth() : d.getDate() - 1;
          if (idx >= 0 && idx < numPoints) {
            prevPoints[idx].uangMasuk += entry.amount;
          }
        }
      });
    });

    return { isYearly, numPoints, currentPoints, prevPoints };
  }, [filteredTrx, prevFilteredTrx, allCombinedBranchTrx, selectedMonth, selectedYear, prevPeriodInfo, monthNames]);

  // Data Perbandingan Kinerja Seluruh Layanan (Kg / Unit)
  const serviceComparisonList = useMemo(() => {
    const curMap = summary.serviceMap || {};
    const prvMap = prevSummary.serviceMap || {};
    const allNames = Array.from(new Set([...Object.keys(curMap), ...Object.keys(prvMap)]));

    return allNames
      .map((name) => {
        const currentVal = curMap[name] || 0;
        const prevVal = prvMap[name] || 0;
        const diff = currentVal - prevVal;
        const growth = prevVal === 0 ? (currentVal > 0 ? 100 : 0) : ((currentVal - prevVal) / prevVal) * 100;
        return { name, currentVal, prevVal, diff, growth };
      })
      .sort((a, b) => b.currentVal - a.currentVal);
  }, [summary.serviceMap, prevSummary.serviceMap]);

  // Metrik Rasio Eksekutif & Skor Kesehatan Bisnis
  const executiveMetrics = useMemo(() => {
    const currentMargin = summary.totalOmzet > 0 ? (summary.labaBersih / summary.totalOmzet) * 100 : 0;
    const prevMargin = prevSummary.totalOmzet > 0 ? (prevSummary.labaBersih / prevSummary.totalOmzet) * 100 : 0;
    const marginDiff = currentMargin - prevMargin;

    const currentAov = summary.totalTrx > 0 ? summary.totalOmzet / summary.totalTrx : 0;
    const prevAov = prevSummary.totalTrx > 0 ? prevSummary.totalOmzet / prevSummary.totalTrx : 0;
    const aovDiff = currentAov - prevAov;

    const currentCostRatio = summary.totalOmzet > 0 ? (summary.totalPengeluaran / summary.totalOmzet) * 100 : 0;
    const prevCostRatio = prevSummary.totalOmzet > 0 ? (prevSummary.totalPengeluaran / prevSummary.totalOmzet) * 100 : 0;

    let score = 50;
    if (currentMargin >= 40) score += 20;
    else if (currentMargin >= 20) score += 10;
    else if (currentMargin < 0) score -= 25;

    if (comparativeAnalytics.omzetGrowth > 10) score += 15;
    else if (comparativeAnalytics.omzetGrowth > 0) score += 10;
    else if (comparativeAnalytics.omzetGrowth < -10) score -= 15;

    if (currentCostRatio <= 50) score += 15;
    else if (currentCostRatio > 75) score -= 15;

    const healthScore = Math.max(10, Math.min(100, Math.round(score)));

    let healthLabel = 'Sangat Sehat & Menguntungkan';
    let healthColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (healthScore < 40) {
      healthLabel = 'Perlu Efisiensi & Waspada Biaya';
      healthColor = 'text-red-700 bg-red-50 border-red-200';
    } else if (healthScore < 70) {
      healthLabel = 'Stabil & Bertumbuh Wajar';
      healthColor = 'text-amber-700 bg-amber-50 border-amber-200';
    }

    return {
      currentMargin,
      prevMargin,
      marginDiff,
      currentAov,
      prevAov,
      aovDiff,
      currentCostRatio,
      prevCostRatio,
      healthScore,
      healthLabel,
      healthColor,
    };
  }, [summary, prevSummary, comparativeAnalytics]);

  const currentPeriodeLabel = `${selectedMonth === -1 ? 'Semua Bulan' : monthNames[selectedMonth]} ${selectedYear}`;

  // Handler Ekspor Excel (.xlsx)
  const handleExportExcel = () => {
    if (!canExcel) {
      toast.warning('Fitur ekspor Excel (.xlsx) hanya untuk Paket Premium.');
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
        uangMasukOrderBulanIni: summary.uangMasukOrderBulanIni,
        uangPelunasanBulanLalu: summary.uangPelunasanBulanLalu,
        totalPiutang: summary.totalPiutang,
        pelunasanBulanLaluList: summary.pelunasanBulanLaluList,
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
        staffList: summary.staffList,
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
    uangMasukOrderBulanIni: summary.uangMasukOrderBulanIni,
    uangPelunasanBulanLalu: summary.uangPelunasanBulanLalu,
    totalPiutang: summary.totalPiutang,
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
    staffList: summary.staffList,
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
      toast.warning('Fitur cetak dan unduh dokumen laporan resmi PDF hanya untuk Paket Premium.');
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
      toast.warning('Fitur cetak dokumen laporan resmi PDF hanya untuk Paket Premium.');
      return;
    }

    setShowPdfModal(true);
  };

  return (
    <div className="flex flex-col max-h-screen bg-slate-100 text-slate-800 pb-16">
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

          {/* Tab Switcher: Ringkasan vs Analisis Komparasi vs Performa Cabang */}
          <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('ringkasan')}
              className={`py-2 px-1.5 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'ringkasan'
                  ? 'bg-white text-slate-900 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="truncate">📊 Ringkasan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (!canGrowth) {
                  toast.warning('Fitur analisis komparasi pertumbuhan (MoM & YoY) hanya untuk Paket Premium.');
                  return;
                }
                setActiveTab('komparasi');
              }}
              className={`py-2 px-1.5 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'komparasi'
                  ? 'bg-[#800000] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {!canGrowth ? (
                <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">📈 Komparasi {!canGrowth ? '(Basic)' : ''}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cabang')}
              className={`py-2 px-1.5 sm:px-3 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                activeTab === 'cabang'
                  ? 'bg-[#800000] text-white shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">🏢 Performa Cabang</span>
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
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xs font-extrabold text-[#800000] uppercase tracking-wider">
                    Data Keuangan ({currentPeriodeLabel})
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Siklus Tutup Buku &amp; Ganti Hari: 00:00 Tengah Malam (Waktu Lokal)
                  </p>
                </div>
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
                  <span className="text-slate-700 font-bold">Total Uang Masuk Kasir</span>
                  <span className="font-black text-emerald-700 tabular-nums">
                    {formatRupiah(summary.totalUangMasuk)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1.5 pl-3 text-slate-500 text-[11px]">
                  <span>• Dari Order Masuk Periode Ini</span>
                  <span className="tabular-nums font-medium">{formatRupiah(summary.uangMasukOrderBulanIni)}</span>
                </div>

                {summary.uangPelunasanBulanLalu > 0 && (
                  <div className="flex justify-between items-center pt-1.5 pl-3 text-emerald-700 text-[11px] font-semibold bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100">
                    <span>+ Pelunasan Order Bulan Lalu ({summary.pelunasanBulanLaluList.length} Nota)</span>
                    <span className="tabular-nums font-bold">+{formatRupiah(summary.uangPelunasanBulanLalu)}</span>
                  </div>
                )}

                {summary.totalPiutang > 0 && (
                  <div className="flex justify-between items-center pt-1.5 pl-3 text-amber-700 text-[11px]">
                    <span>• Piutang Berjalan (Belum Lunas)</span>
                    <span className="tabular-nums font-medium">{formatRupiah(summary.totalPiutang)}</span>
                  </div>
                )}

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

            {/* Kartu Khusus: Pelunasan Order Bulan Lalu yang Masuk Kas di Bulan Ini */}
            {summary.pelunasanBulanLaluList.length > 0 && (
              <div className="bg-emerald-50/80 rounded-2xl border border-emerald-200 p-4 shadow-2xs space-y-2">
                <div
                  onClick={() => setExpandPelunasanLalu(!expandPelunasanLalu)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                      Pelunasan Order Bulan Lalu Masuk Kas ({summary.pelunasanBulanLaluList.length} Nota)
                    </h2>
                  </div>
                  <span className="text-xs font-black text-emerald-700 tabular-nums">
                    +{formatRupiah(summary.uangPelunasanBulanLalu)}
                  </span>
                </div>

                {expandPelunasanLalu && (
                  <div className="pt-2">
                    <div className="divide-y divide-emerald-100 text-xs">
                      {(showAllPelunasanLalu ? summary.pelunasanBulanLaluList : summary.pelunasanBulanLaluList.slice(0, 3)).map(({ trx, pelunasan, waktuPelunasan }, idx) => (
                        <div key={idx} className="py-2 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-slate-900">
                              {trx.namaPelanggan} <span className="text-slate-500 font-mono text-[11px]">({trx.nomorTransaksi || '-'})</span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Masuk: {formatShortDate(trx.tanggalMasuk)} • Lunas/Diambil: {formatReceiptDate(waktuPelunasan, true)}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-black text-emerald-700 text-sm tabular-nums">
                              +{formatRupiah(pelunasan)}
                            </span>
                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Masuk Kas {monthNames[new Date(waktuPelunasan).getMonth()]}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {summary.pelunasanBulanLaluList.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAllPelunasanLalu(!showAllPelunasanLalu)}
                        className="w-full mt-2.5 py-1.5 px-2 bg-emerald-100/70 hover:bg-emerald-100 text-emerald-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-emerald-200"
                      >
                        {showAllPelunasanLalu ? (
                          <>
                            <span>Tutup (Hanya 3 Teratas)</span>
                            <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                          </>
                        ) : (
                          <>
                            <span>Lihat Semua (+{summary.pelunasanBulanLaluList.length - 3} nota lainnya)</span>
                            <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

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

            {/* Grid Rekapitulasi (1 kolom di HP, 2 di tablet, 4 di PC) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 items-start">
              {/* 1. Rekapitulasi Layanan */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div
                  onClick={() => setExpandLayanan(!expandLayanan)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Rekap Layanan ({summary.serviceList.length})
                    </h2>
                  </div>
                  {expandLayanan ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandLayanan && (
                  <div className="pt-1">
                    {summary.serviceList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2 text-xs">Belum ada data layanan</p>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100 text-xs">
                          {(showAllLayanan ? summary.serviceList : summary.serviceList.slice(0, 3)).map(([name, weight], idx) => (
                            <div key={idx} className="py-2 flex justify-between items-center">
                              <span className="text-slate-700 truncate pr-2 font-medium">
                                <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span> {name}
                              </span>
                              <span className="font-bold text-slate-900 tabular-nums shrink-0">
                                {weight.toFixed(1)} <span className="text-[10px] text-slate-500 font-normal">Kg/Unit</span>
                              </span>
                            </div>
                          ))}
                        </div>

                        {summary.serviceList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllLayanan(!showAllLayanan)}
                            className="w-full mt-2.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200"
                          >
                            {showAllLayanan ? (
                              <>
                                <span>Tutup (Hanya 3 Teratas)</span>
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            ) : (
                              <>
                                <span>Lihat Semua (+{summary.serviceList.length - 3} layanan lainnya)</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Ringkasan Kinerja Staf */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div
                  onClick={() => setExpandStaf(!expandStaf)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Kinerja Staf ({summary.staffList.length})
                    </h2>
                  </div>
                  {expandStaf ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandStaf && (
                  <div className="pt-1">
                    {summary.staffList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2 text-xs">Belum ada staf bertugas</p>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100 text-xs">
                          {(showAllStaf ? summary.staffList : summary.staffList.slice(0, 3)).map((staf, idx) => (
                            <div key={idx} className="py-2 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 truncate pr-2 flex items-center gap-1.5">
                                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black ${
                                    idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                                    idx === 2 ? 'bg-orange-100 text-orange-800' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <span className="truncate">{staf.nama}</span>
                                </span>
                                <span className="font-extrabold text-blue-700 tabular-nums shrink-0">
                                  {staf.totalTrx} <span className="text-[10px] text-slate-500 font-normal">Order</span>
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-slate-500 pl-5.5">
                                <span>{staf.totalKg.toFixed(1)} Kg • <span className="text-emerald-700 font-semibold">{staf.countSelesai} Selesai</span></span>
                                <span className="font-bold text-slate-800 tabular-nums">{formatRupiah(staf.totalOmzet)}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {summary.staffList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllStaf(!showAllStaf)}
                            className="w-full mt-2.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200"
                          >
                            {showAllStaf ? (
                              <>
                                <span>Tutup (Hanya 3 Teratas)</span>
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            ) : (
                              <>
                                <span>Lihat Semua (+{summary.staffList.length - 3} staf lainnya)</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 3. Rekapitulasi Pengeluaran */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div
                  onClick={() => setExpandPengeluaran(!expandPengeluaran)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-red-600" />
                    <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Rekap Biaya ({summary.expenseList.length})
                    </h2>
                  </div>
                  {expandPengeluaran ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandPengeluaran && (
                  <div className="pt-1">
                    {summary.expenseList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2 text-xs">Belum ada pengeluaran</p>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100 text-xs">
                          {(showAllPengeluaran ? summary.expenseList : summary.expenseList.slice(0, 3)).map(([cat, total], idx) => (
                            <div key={idx} className="py-2 flex justify-between items-center">
                              <span className="text-slate-700 truncate pr-2 font-medium">
                                <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span> {cat}
                              </span>
                              <span className="font-bold text-red-600 tabular-nums shrink-0">
                                {formatRupiah(total)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {summary.expenseList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllPengeluaran(!showAllPengeluaran)}
                            className="w-full mt-2.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200"
                          >
                            {showAllPengeluaran ? (
                              <>
                                <span>Tutup (Hanya 3 Teratas)</span>
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            ) : (
                              <>
                                <span>Lihat Semua (+{summary.expenseList.length - 3} biaya lainnya)</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Pelanggan Terbanyak */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                <div
                  onClick={() => setExpandPelanggan(!expandPelanggan)}
                  className="flex justify-between items-center cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Pelanggan Teratas ({summary.customerList.length})
                    </h2>
                  </div>
                  {expandPelanggan ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {expandPelanggan && (
                  <div className="pt-1">
                    {summary.customerList.length === 0 ? (
                      <p className="text-slate-400 italic text-center py-2 text-xs">Belum ada transaksi</p>
                    ) : (
                      <>
                        <div className="divide-y divide-slate-100 text-xs">
                          {(showAllPelanggan ? summary.customerList : summary.customerList.slice(0, 3)).map(([name, count], idx) => (
                            <div key={idx} className="py-2 flex justify-between items-center">
                              <span className="text-slate-700 truncate pr-2 font-medium">
                                <span className="text-slate-400 font-bold mr-1">{idx + 1}.</span> {name}
                              </span>
                              <span className="font-bold text-[#800000] tabular-nums shrink-0">
                                {count} <span className="text-[10px] text-slate-500 font-normal">Order</span>
                              </span>
                            </div>
                          ))}
                        </div>

                        {summary.customerList.length > 3 && (
                          <button
                            type="button"
                            onClick={() => setShowAllPelanggan(!showAllPelanggan)}
                            className="w-full mt-2.5 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 transition cursor-pointer border border-slate-200"
                          >
                            {showAllPelanggan ? (
                              <>
                                <span>Tutup (Hanya 3 Teratas)</span>
                                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            ) : (
                              <>
                                <span>Lihat Semua (+{summary.customerList.length - 3} pelanggan lainnya)</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </>
                            )}
                          </button>
                        )}
                      </>
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
        {/* TAB 2: ANALISIS KOMPARASI PRO DENGAN GRAFIK MULTI-MODE   */}
        {/* ======================================================== */}
        {activeTab === 'komparasi' && (
          <div className="space-y-4">
        
         {/* 4 Kartu Metrik Komparasi Utama - 2 Baris x 2 Kolom di HP */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {/* 1. Omzet Usaha */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Omzet Usaha</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                      comparativeAnalytics.omzetGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.omzetGrowth >= 0 ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                    {comparativeAnalytics.omzetGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.omzetGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm sm:text-lg font-black text-slate-900 tabular-nums truncate">
                  {formatRupiah(summary.totalOmzet)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 flex justify-between gap-1">
                  <span className="shrink-0">Lalu:</span>
                  <span className="font-semibold tabular-nums truncate">{formatRupiah(prevSummary.totalOmzet)}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] flex justify-between gap-1">
                  <span className="shrink-0">Selisih:</span>
                  <span
                    className={`font-bold tabular-nums truncate ${
                      comparativeAnalytics.omzetDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.omzetDiff >= 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.omzetDiff)}
                  </span>
                </div>
              </div>

              {/* 2. Laba Bersih */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Laba Bersih</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                      comparativeAnalytics.labaGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.labaGrowth >= 0 ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    )}
                    {comparativeAnalytics.labaGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.labaGrowth.toFixed(1)}%
                  </span>
                </div>
                <p
                  className={`text-sm sm:text-lg font-black tabular-nums truncate ${
                    summary.labaBersih >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {formatRupiah(summary.labaBersih)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 flex justify-between gap-1">
                  <span className="shrink-0">Lalu:</span>
                  <span className="font-semibold tabular-nums truncate">{formatRupiah(prevSummary.labaBersih)}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] flex justify-between gap-1">
                  <span className="shrink-0">Selisih:</span>
                  <span
                    className={`font-bold tabular-nums truncate ${
                      comparativeAnalytics.labaDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.labaDiff >= 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.labaDiff)}
                  </span>
                </div>
              </div>

              {/* 3. Pengeluaran Operasional */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Beban Pengeluaran</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                      comparativeAnalytics.expGrowth <= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {comparativeAnalytics.expGrowth <= 0 ? 'Hemat ' : 'Naik '}
                    {Math.abs(comparativeAnalytics.expGrowth).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm sm:text-lg font-black text-red-600 tabular-nums truncate">
                  {formatRupiah(summary.totalPengeluaran)}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 flex justify-between gap-1">
                  <span className="shrink-0">Lalu:</span>
                  <span className="font-semibold tabular-nums truncate">{formatRupiah(prevSummary.totalPengeluaran)}</span>
                </div>
                <div className="text-[10px] sm:text-[11px] flex justify-between gap-1">
                  <span className="shrink-0">Selisih:</span>
                  <span
                    className={`font-bold tabular-nums truncate ${
                      comparativeAnalytics.expDiff <= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.expDiff > 0 ? '+' : ''}
                    {formatRupiah(comparativeAnalytics.expDiff)}
                  </span>
                </div>
              </div>

              {/* 4. Total Order & Berat Cucian */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-1.5 sm:space-y-2">
                <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-bold text-slate-500 truncate">Order & Volume</span>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 ${
                      comparativeAnalytics.trxGrowth >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {comparativeAnalytics.trxGrowth > 0 ? '+' : ''}
                    {comparativeAnalytics.trxGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs sm:text-lg font-black text-slate-900 tabular-nums truncate">
                  {summary.totalTrx} <span className="text-[10px] sm:text-xs text-slate-500 font-normal">Ord</span> ({summary.totalWeight.toFixed(1)} Kg)
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[10px] sm:text-[11px] text-slate-500 flex justify-between gap-1">
                  <span className="shrink-0">Lalu:</span>
                  <span className="font-semibold tabular-nums truncate">
                    {prevSummary.totalTrx} Ord ({prevSummary.totalWeight.toFixed(1)} Kg)
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] flex justify-between gap-1">
                  <span className="shrink-0">Selisih:</span>
                  <span
                    className={`font-bold tabular-nums truncate ${
                      comparativeAnalytics.trxDiff >= 0 ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {comparativeAnalytics.trxDiff >= 0 ? '+' : ''}
                    {comparativeAnalytics.trxDiff} Order
                  </span>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SUB-NAV 5 MODE GRAFIK VISUAL INTERAKTIF                   */}
            {/* ======================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-2xs">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCompareChartMode('batang')}
                  className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    compareChartMode === 'batang'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Batang Finansial</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompareChartMode('tren')}
                  className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    compareChartMode === 'tren'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Kurva Tren</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompareChartMode('layanan')}
                  className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    compareChartMode === 'layanan'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Battle Layanan</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompareChartMode('staf')}
                  className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    compareChartMode === 'staf'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Kinerja Staf</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCompareChartMode('rasio')}
                  className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    compareChartMode === 'rasio'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-rose-400" />
                  <span>Rasio Bisnis</span>
                </button>
              </div>
            </div>

            {/* ======================================================== */}
            {/* GRAFIK 1: GRAFIK BATANG FINANSIAL SIDE-BY-SIDE           */}
            {/* ======================================================== */}
            {compareChartMode === 'batang' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-[#800000]" />
                      <span>Grafik Komparasi 4 Pilar Finansial</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Perbandingan langsung antara {currentPeriodeLabel} dengan {prevPeriodInfo.label}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block" />
                      <span>Periode Ini</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-3 h-3 rounded-md bg-slate-300 inline-block" />
                      <span>Periode Lalu</span>
                    </span>
                  </div>
                </div>

                {/* 4 Bar Pairs */}
                <div className="space-y-4 pt-1">
                  {[
                    {
                      label: 'Omzet Usaha',
                      cur: summary.totalOmzet,
                      prev: prevSummary.totalOmzet,
                      growth: comparativeAnalytics.omzetGrowth,
                      diff: comparativeAnalytics.omzetDiff,
                      color: 'bg-emerald-600',
                      textColor: 'text-emerald-700',
                    },
                    {
                      label: 'Total Uang Masuk',
                      cur: summary.totalUangMasuk,
                      prev: prevSummary.totalUangMasuk,
                      growth: comparativeAnalytics.uangMasukGrowth,
                      diff: comparativeAnalytics.uangMasukDiff,
                      color: 'bg-emerald-700',
                      textColor: 'text-emerald-800',
                    },
                    {
                      label: 'Beban Pengeluaran',
                      cur: summary.totalPengeluaran,
                      prev: prevSummary.totalPengeluaran,
                      growth: comparativeAnalytics.expGrowth,
                      diff: comparativeAnalytics.expDiff,
                      color: 'bg-rose-500',
                      textColor: 'text-rose-600',
                      isExpense: true,
                    },
                    {
                      label: 'Laba Bersih',
                      cur: summary.labaBersih,
                      prev: prevSummary.labaBersih,
                      growth: comparativeAnalytics.labaGrowth,
                      diff: comparativeAnalytics.labaDiff,
                      color: summary.labaBersih >= 0 ? 'bg-[#800000]' : 'bg-red-700',
                      textColor: summary.labaBersih >= 0 ? 'text-[#800000]' : 'text-red-700',
                    },
                  ].map((item, idx) => {
                    const maxPillarVal = Math.max(1, Math.abs(item.cur), Math.abs(item.prev));
                    const curWidth = Math.max(4, (Math.max(0, item.cur) / maxPillarVal) * 100);
                    const prevWidth = Math.max(4, (Math.max(0, item.prev) / maxPillarVal) * 100);

                    return (
                      <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-extrabold text-slate-800">{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              Selisih: <strong className={item.diff >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                {item.diff >= 0 ? '+' : ''}{formatRupiah(item.diff)}
                              </strong>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                              item.isExpense
                                ? item.growth <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                : item.growth >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.growth > 0 ? '+' : ''}{item.growth.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Bar Periode Ini */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 w-20 shrink-0">Periode Ini:</span>
                            <div className="flex-1 bg-slate-200/60 rounded-full h-4 overflow-hidden relative">
                              <div
                                className={`h-full ${item.color} rounded-full transition-all duration-700`}
                                style={{ width: `${curWidth}%` }}
                              />
                            </div>
                            <span className={`text-xs font-black tabular-nums w-28 text-right shrink-0 ${item.textColor}`}>
                              {formatRupiah(item.cur)}
                            </span>
                          </div>

                          {/* Bar Periode Lalu */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0">Periode Lalu:</span>
                            <div className="flex-1 bg-slate-200/60 rounded-full h-3.5 overflow-hidden relative">
                              <div
                                className="h-full bg-slate-400 rounded-full transition-all duration-700"
                                style={{ width: `${prevWidth}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold tabular-nums text-slate-600 w-28 text-right shrink-0">
                              {formatRupiah(item.prev)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* GRAFIK 2: KURVA TREN AREA INTERAKTIF SVG                  */}
            {/* ======================================================== */}
            {compareChartMode === 'tren' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <LineChart className="w-4 h-4 text-emerald-600" />
                      <span>Kurva Tren Komparasi Dinamis</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {trendComparisonData.isYearly ? 'Pola Tren Bulanan (Jan - Des)' : 'Fluktuasi Harian (Tgl 1 s/d Akhir Bulan)'}
                    </p>
                  </div>

                  {/* Switcher Metrik Tren */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-bold self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setTrendMetric('omzet')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        trendMetric === 'omzet' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Omzet
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('uangMasuk')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        trendMetric === 'uangMasuk' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Uang Masuk
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrendMetric('trx')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        trendMetric === 'trx' ? 'bg-[#800000] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Order
                    </button>
                  </div>
                </div>

                {/* SVG Area Chart Container */}
                {(() => {
                  const { numPoints, currentPoints, prevPoints } = trendComparisonData;
                  const getVal = (pt: typeof currentPoints[0]) => {
                    return trendMetric === 'omzet' ? pt.omzet : trendMetric === 'uangMasuk' ? pt.uangMasuk : pt.trx;
                  };

                  const allVals = [
                    ...currentPoints.map(getVal),
                    ...prevPoints.map(getVal),
                  ];
                  const maxVal = Math.max(1, ...allVals);

                  const svgW = 600;
                  const svgH = 220;
                  const padL = 40;
                  const padR = 20;
                  const padT = 20;
                  const padB = 30;
                  const plotW = svgW - padL - padR;
                  const plotH = svgH - padT - padB;

                  const getX = (idx: number) => {
                    return padL + (idx / Math.max(1, numPoints - 1)) * plotW;
                  };

                  const getY = (val: number) => {
                    return padT + plotH - (val / maxVal) * plotH;
                  };

                  // Path kurva Periode Ini
                  const curCoords = currentPoints.map((pt, i) => ({ x: getX(i), y: getY(getVal(pt)) }));
                  const dCurLine = curCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
                  const dCurArea = `${dCurLine} L ${getX(numPoints - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

                  // Path kurva Periode Lalu
                  const prevCoords = prevPoints.map((pt, i) => ({ x: getX(i), y: getY(getVal(pt)) }));
                  const dPrevLine = prevCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');

                  const hoveredCur = hoveredPointIndex !== null ? currentPoints[hoveredPointIndex] : null;
                  const hoveredPrev = hoveredPointIndex !== null ? prevPoints[hoveredPointIndex] : null;

                  return (
                    <div className="space-y-3">
                      <div className="w-full overflow-x-auto bg-slate-50/70 p-2 rounded-xl border border-slate-200">
                        <svg
                          viewBox={`0 0 ${svgW} ${svgH}`}
                          className="w-full h-auto min-w-[500px] select-none"
                        >
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>

                          {/* Horizontal Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                            const y = padT + plotH * (1 - ratio);
                            const val = maxVal * ratio;
                            return (
                              <g key={idx}>
                                <line
                                  x1={padL}
                                  y1={y}
                                  x2={padL + plotW}
                                  y2={y}
                                  stroke="#e2e8f0"
                                  strokeDasharray="3 3"
                                />
                                <text
                                  x={padL - 6}
                                  y={y + 3}
                                  textAnchor="end"
                                  className="text-[9px] fill-slate-400 font-mono"
                                >
                                  {trendMetric === 'trx'
                                    ? Math.round(val)
                                    : val >= 1000000
                                    ? `${(val / 1000000).toFixed(1)}M`
                                    : `${Math.round(val / 1000)}k`}
                                </text>
                              </g>
                            );
                          })}

                          {/* Periode Ini Area Fill */}
                          <path d={dCurArea} fill="url(#areaGradient)" />

                          {/* Periode Lalu Line (Dashed Slate) */}
                          <path
                            d={dPrevLine}
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />

                          {/* Periode Ini Line (Solid Emerald) */}
                          <path
                            d={dCurLine}
                            fill="none"
                            stroke="#059669"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* X-Axis Labels */}
                          {currentPoints.map((pt, i) => {
                            // Show label every few points to avoid crowding
                            const step = numPoints > 20 ? 3 : 1;
                            if (i % step !== 0 && i !== numPoints - 1) return null;
                            const x = getX(i);
                            return (
                              <text
                                key={i}
                                x={x}
                                y={padT + plotH + 16}
                                textAnchor="middle"
                                className="text-[9px] fill-slate-500 font-bold"
                              >
                                {pt.label}
                              </text>
                            );
                          })}

                          {/* Interactive Hover Point Circles */}
                          {currentPoints.map((pt, i) => {
                            const x = getX(i);
                            const y = getY(getVal(pt));
                            const isHovered = hoveredPointIndex === i;

                            return (
                              <g
                                key={i}
                                onMouseEnter={() => setHoveredPointIndex(i)}
                                onTouchStart={() => setHoveredPointIndex(i)}
                                className="cursor-pointer"
                              >
                                {/* Invisible wide hit area */}
                                <rect
                                  x={x - 10}
                                  y={padT}
                                  width={20}
                                  height={plotH}
                                  fill="transparent"
                                />
                                {isHovered && (
                                  <line
                                    x1={x}
                                    y1={padT}
                                    x2={x}
                                    y2={padT + plotH}
                                    stroke="#059669"
                                    strokeWidth="1"
                                    strokeDasharray="2 2"
                                  />
                                )}
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={isHovered ? 5.5 : 3}
                                  fill={isHovered ? '#059669' : '#10b981'}
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                  className="transition-all duration-150"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      </div>

                      {/* Floating Dynamic Tooltip Card */}
                      {hoveredCur && hoveredPrev && (
                        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md border border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 animate-in fade-in">
                          <div>
                            <span className="text-[10px] text-amber-300 font-bold">
                              📅 {hoveredCur.fullLabel}
                            </span>
                            <div className="flex items-center gap-3 mt-0.5 text-xs">
                              <span className="font-bold text-emerald-400">
                                Periode Ini:{' '}
                                {trendMetric === 'trx'
                                  ? `${hoveredCur.trx} Order`
                                  : formatRupiah(trendMetric === 'omzet' ? hoveredCur.omzet : hoveredCur.uangMasuk)}
                              </span>
                              <span className="text-slate-400 font-medium">
                                Periode Lalu:{' '}
                                {trendMetric === 'trx'
                                  ? `${hoveredPrev.trx} Order`
                                  : formatRupiah(trendMetric === 'omzet' ? hoveredPrev.omzet : hoveredPrev.uangMasuk)}
                              </span>
                            </div>
                          </div>

                          {/* Delta */}
                          {(() => {
                            const curVal = getVal(hoveredCur);
                            const prvVal = getVal(hoveredPrev);
                            const diff = curVal - prvVal;
                            const growth = prvVal === 0 ? (curVal > 0 ? 100 : 0) : ((curVal - prvVal) / prvVal) * 100;
                            return (
                              <div className="text-right">
                                <span className={`text-xs font-black px-2 py-0.5 rounded ${
                                  diff >= 0 ? 'bg-emerald-900/80 text-emerald-300' : 'bg-red-900/80 text-red-300'
                                }`}>
                                  {diff >= 0 ? '+' : ''}{trendMetric === 'trx' ? `${diff} Order` : formatRupiah(diff)} ({growth.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Legend Bar */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 font-bold text-emerald-700">
                            <span className="w-3 h-1 bg-emerald-600 rounded-full inline-block" />
                            <span>Garis Hijau: Periode Ini</span>
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-500">
                            <span className="w-3 h-1 bg-slate-400 border-dashed border-b border-slate-500 inline-block" />
                            <span>Garis Putus-Putus: Periode Lalu</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 italic">
                          *Arahkan kursor / sentuh titik untuk melihat detail
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ======================================================== */}
            {/* GRAFIK 3: BATTLE LAYANAN (SERVICE PERFORMANCE COMPARISON)*/}
            {/* ======================================================== */}
            {compareChartMode === 'layanan' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Battle Kinerja Seluruh Layanan (Kg / Unit)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Evaluasi volume cucian tiap paket layanan antara {currentPeriodeLabel} vs {prevPeriodInfo.label}
                  </p>
                </div>

                {serviceComparisonList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Belum ada data pengerjaan layanan untuk dibandingkan.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {serviceComparisonList.map((svc, idx) => {
                      const maxSvcVal = Math.max(1, ...serviceComparisonList.map((s) => Math.max(s.currentVal, s.prevVal)));
                      const curWidth = Math.max(3, (svc.currentVal / maxSvcVal) * 100);
                      const prevWidth = Math.max(3, (svc.prevVal / maxSvcVal) * 100);
                      const isTopLeader = idx === 0 && svc.currentVal > 0;

                      return (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              {isTopLeader && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Award className="w-3 h-3 text-amber-600" />
                                  <span>Terlaris #1</span>
                                </span>
                              )}
                              <span className="font-black text-xs text-slate-900">{svc.name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500">
                                Selisih: <strong className={svc.diff >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                                  {svc.diff >= 0 ? '+' : ''}{svc.diff.toFixed(1)} Unit/Kg
                                </strong>
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                svc.growth >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {svc.growth > 0 ? '+' : ''}{svc.growth.toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Dual Horizontal Bars */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-500 w-20 shrink-0">Periode Ini:</span>
                              <div className="flex-1 bg-slate-200/60 rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                                  style={{ width: `${curWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-black tabular-nums text-emerald-800 w-20 text-right shrink-0">
                                {svc.currentVal.toFixed(1)} Kg
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0">Periode Lalu:</span>
                              <div className="flex-1 bg-slate-200/60 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                                  style={{ width: `${prevWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold tabular-nums text-slate-600 w-20 text-right shrink-0">
                                {svc.prevVal.toFixed(1)} Kg
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* GRAFIK 4: EVALUASI & PERINGKAT KINERJA STAF / KASIR      */}
            {/* ======================================================== */}
            {compareChartMode === 'staf' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Evaluasi &amp; Peringkat Produktivitas Staf</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Ringkasan kontribusi beban kerja cucian, order ditangani, dan omzet per staf periode {currentPeriodeLabel}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                      {summary.staffList.length} Petugas Terlibat
                    </span>
                  </div>
                </div>

                {summary.staffList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Belum ada data pengerjaan atau penugasan staf pada periode ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.staffList.map((staf, idx) => {
                      const maxTrx = Math.max(1, ...summary.staffList.map((s) => s.totalTrx));
                      const maxKg = Math.max(1, ...summary.staffList.map((s) => s.totalKg));
                      const trxWidth = Math.min(100, (staf.totalTrx / maxTrx) * 100);
                      const kgWidth = Math.min(100, (staf.totalKg / maxKg) * 100);
                      const percentOfAllTrx = summary.totalTrx > 0 ? ((staf.totalTrx / summary.totalTrx) * 100).toFixed(1) : '0';

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                  idx === 0
                                    ? 'bg-amber-400 text-amber-950 shadow-2xs'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-800'
                                    : idx === 2
                                    ? 'bg-orange-300 text-orange-900'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <span className="text-sm font-black text-slate-900">{staf.nama}</span>
                                <span className="ml-2 text-[11px] font-bold text-blue-600">
                                  ({percentOfAllTrx}% beban order)
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px]">
                                {staf.countSelesai} Selesai
                              </span>
                              {staf.countProses > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">
                                  {staf.countProses} Proses
                                </span>
                              )}
                              <span className="font-black text-slate-900 tabular-nums">
                                {formatRupiah(staf.totalOmzet)}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar visual beban kerja */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[10px] font-bold text-slate-500 w-24 shrink-0">
                                Jumlah Order:
                              </span>
                              <div className="flex-1 bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                                  style={{ width: `${trxWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-black tabular-nums text-blue-700 w-20 text-right shrink-0">
                                {staf.totalTrx} Order
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[10px] font-bold text-slate-500 w-24 shrink-0">
                                Volume Cucian:
                              </span>
                              <div className="flex-1 bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${kgWidth}%` }}
                                />
                              </div>
                              <span className="text-xs font-black tabular-nums text-indigo-700 w-20 text-right shrink-0">
                                {staf.totalKg.toFixed(1)} Kg/Unit
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ======================================================== */}
            {/* GRAFIK 5: RASIO KEUANGAN & SKOR KESEHATAN EKSEKUTIF      */}
            {/* ======================================================== */}
            {compareChartMode === 'rasio' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Skor Kesehatan Finansial Gauge Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Financial Health Index</span>
                    </span>
                    <h3 className="text-xl font-black text-slate-900">
                      Skor Kesehatan Bisnis: <span className="text-[#800000]">{executiveMetrics.healthScore} / 100</span>
                    </h3>
                    <div className="pt-1">
                      <span className={`inline-block px-3 py-1 rounded-xl text-xs font-black border ${executiveMetrics.healthColor}`}>
                        {executiveMetrics.healthLabel}
                      </span>
                    </div>
                  </div>

                  {/* Circular/Linear Visual Meter */}
                  <div className="w-full sm:w-64 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-slate-600">
                      <span>Efisiensi & Stabilitas</span>
                      <span className="tabular-nums font-black">{executiveMetrics.healthScore}%</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          executiveMetrics.healthScore >= 70
                            ? 'bg-linear-to-r from-emerald-500 to-teal-600'
                            : executiveMetrics.healthScore >= 40
                            ? 'bg-linear-to-r from-amber-400 to-amber-600'
                            : 'bg-linear-to-r from-rose-500 to-red-700'
                        }`}
                        style={{ width: `${executiveMetrics.healthScore}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400">
                      <span>Kritis (&lt;40)</span>
                      <span>Stabil (40-70)</span>
                      <span>Prima (&gt;70)</span>
                    </div>
                  </div>
                </div>

                {/* 4 Rasio Kinerja Utama */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Net Profit Margin */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-500">Net Profit Margin (Margin Laba Bersih)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900 tabular-nums">
                        {executiveMetrics.currentMargin.toFixed(1)}%
                      </span>
                      <span className={`text-xs font-black ${executiveMetrics.marginDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {executiveMetrics.marginDiff >= 0 ? '+' : ''}{executiveMetrics.marginDiff.toFixed(1)}% vs Lalu
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Dari setiap Rp 100.000 omzet, Anda mengantongi <strong>{formatRupiah(executiveMetrics.currentMargin * 1000)}</strong> laba bersih.
                    </p>
                  </div>

                  {/* 2. Average Order Value (AOV) */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-500">Rata-Rata Nilai Nota (Basket Size / AOV)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900 tabular-nums">
                        {formatRupiah(executiveMetrics.currentAov)}
                      </span>
                      <span className={`text-xs font-black ${executiveMetrics.aovDiff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {executiveMetrics.aovDiff >= 0 ? '+' : ''}{formatRupiah(executiveMetrics.aovDiff)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Rata-rata pengeluaran satu pelanggan dalam sekali cuci di outlet Anda.
                    </p>
                  </div>

                  {/* 3. Cost to Income Ratio */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-500">Rasio Beban Operasional (Cost-to-Income)</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900 tabular-nums">
                        {executiveMetrics.currentCostRatio.toFixed(1)}%
                      </span>
                      <span className={`text-xs font-black ${executiveMetrics.currentCostRatio <= executiveMetrics.prevCostRatio ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {executiveMetrics.currentCostRatio <= executiveMetrics.prevCostRatio ? 'Lebih Efisien' : 'Beban Naik'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Persentase omzet yang terserap untuk biaya deterjen, listrik, gaji, dan sewa toko.
                    </p>
                  </div>

                  {/* 4. Rata-Rata Beban per Order */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-500">Biaya Operasional per Nota Cucian</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-black text-slate-900 tabular-nums">
                        {summary.totalTrx > 0 ? formatRupiah(summary.totalPengeluaran / summary.totalTrx) : 'Rp 0'}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {summary.totalTrx} Nota
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Estimasi modal operasional yang dikeluarkan untuk menyelesaikan setiap 1 nota pelanggan.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* REKOMENDASI STRATEGIS EKSEKUTIF BERBASIS DATA RIIL       */}
            {/* ======================================================== */}
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-xs text-amber-950 space-y-2.5 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <span>Executive Business Intelligence & Saran Strategis:</span>
              </div>
              <ul className="space-y-1.5 text-amber-900/90 pl-5 list-disc leading-relaxed text-[11px]">
                {comparativeAnalytics.omzetGrowth > 0 ? (
                  <li>
                    <strong>Pendapatan Meningkat:</strong> Omzet toko Anda mengalami kenaikan sebesar{' '}
                    <span className="font-bold text-emerald-800">
                      +{comparativeAnalytics.omzetGrowth.toFixed(1)}% ({formatRupiah(comparativeAnalytics.omzetDiff)})
                    </span>{' '}
                    dibanding periode {prevPeriodInfo.label}. Pertahankan kualitas layanan dan ketepatan waktu.
                  </li>
                ) : comparativeAnalytics.omzetGrowth < 0 ? (
                  <li>
                    <strong>Pendapatan Menurun:</strong> Omzet toko Anda terkoreksi sebesar{' '}
                    <span className="font-bold text-red-700">
                      {comparativeAnalytics.omzetGrowth.toFixed(1)}% ({formatRupiah(comparativeAnalytics.omzetDiff)})
                    </span>
                    . Disarankan meluncurkan promo bundling akhir pekan atau mengirim pesan pengingat siap cuci ke pelanggan loyal.
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
                    . Pastikan pembelian sabun/pewangi dalam jumlah grosir dan matikan mesin pengering saat tidak terpakai.
                  </li>
                ) : comparativeAnalytics.expDiff < 0 ? (
                  <li>
                    <strong>Efisiensi Positif:</strong> Pengeluaran operasional berhasil dihemat sebesar{' '}
                    <span className="font-bold text-emerald-800">
                      {formatRupiah(Math.abs(comparativeAnalytics.expDiff))} ({Math.abs(comparativeAnalytics.expGrowth).toFixed(1)}%)
                    </span>
                    . Pengendalian modal berjalan efektif!
                  </li>
                ) : null}

                <li>
                  Total pelanggan yang dilayani pada periode ini sebanyak{' '}
                  <strong>{summary.customerList.length} orang</strong> dengan rata-rata beban{' '}
                  <strong>
                    {summary.totalTrx > 0 ? (summary.totalWeight / summary.totalTrx).toFixed(1) : '0'} Kg
                  </strong>{' '}
                  per nota.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: DASBOR ANALITIK PERFORMA ANTAR-CABANG (D3.JS)     */}
        {/* ======================================================== */}
        {activeTab === 'cabang' && (
          <div className="space-y-4">
            {/* Header Eksekutif Multi-Cabang */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/60 text-[#800000] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-[#800000]" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">
                      Dasbor Analitik Performa Antar-Cabang
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visualisasi D3.js perbandingan omzet, kas masuk riil, dan volume order antar-outlet periode {currentPeriodeLabel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-semibold text-slate-500">
                    Cabang Terpilih:
                  </span>
                  <span className="text-xs font-bold text-[#800000] bg-red-50 border border-red-200/80 px-2.5 py-1 rounded-lg">
                    {effectiveLaundryName}
                  </span>
                </div>
              </div>

              {/* 3 Kartu Ringkasan Konsolidasi Seluruh Cabang */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Omzet Konsolidasi</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">
                    {formatRupiah(branchComparisonData.reduce((sum, b) => sum + b.totalOmzet, 0))}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Semua cabang gabungan</span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Total Kas Masuk Riil</span>
                  <span className="text-base sm:text-lg font-black text-emerald-700 font-mono tabular-nums">
                    {formatRupiah(branchComparisonData.reduce((sum, b) => sum + b.totalUangMasuk, 0))}
                  </span>
                  <span className="text-[10px] text-emerald-600 block">Uang fisik kasir & transfer</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">Total Volume Pesanan</span>
                  <span className="text-base sm:text-lg font-black text-slate-900 font-mono tabular-nums">
                    {branchComparisonData.reduce((sum, b) => sum + b.totalTrx, 0)} Nota
                  </span>
                  <span className="text-[10px] text-slate-400 block">{branchComparisonData.length} outlet terdaftar</span>
                </div>
              </div>
            </div>

            {/* Komponen Visualisasi D3.js Chart */}
            <BranchComparisonD3Chart
              data={branchComparisonData}
              periodeLabel={currentPeriodeLabel}
              onSelectBranch={(branchId) => {
                if (onSelectBranch) {
                  onSelectBranch(branchId);
                  const targetLnd = laundries.find((l) => l.id === branchId);
                  toast.success(`Beralih ke cabang: ${targetLnd?.namaLaundry || branchId}`);
                }
              }}
              activeBranchId={activeLaundryId}
            />

            {/* Panduan Eksekutif untuk Owner */}
            <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-950 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 font-black text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Tips Eksekutif Pengelolaan Multi-Cabang:</span>
              </div>
              <ul className="space-y-1.5 text-amber-900/90 pl-5 list-disc leading-relaxed text-[11px]">
                <li>
                  <strong>Identifikasi Cabang Juara:</strong> Cabang dengan batang berwarna Marun tua adalah outlet paling produktif (peringkat #1) pada periode {currentPeriodeLabel}. Evaluasi SOP dan keramahan staf di cabang tersebut untuk diterapkan di cabang lainnya.
                </li>
                <li>
                  <strong>Cek Selisih Omzet vs Kas Masuk:</strong> Gunakan tombol filter metrik <em>"Uang Kas Masuk"</em> untuk memastikan tidak ada piutang atau pembayaran tertunda yang terlalu besar pada cabang tertentu.
                </li>
                <li>
                  <strong>Klik Baris atau Batang:</strong> Anda dapat langsung menyentuh/mengklik nama cabang atau baris tabel untuk beralih dan memeriksa pembukuan spesifik cabang tersebut.
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
