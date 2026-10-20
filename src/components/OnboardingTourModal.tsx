import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Coins,
  Shirt,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Printer,
  Smartphone,
  Truck,
  ArrowRight,
  Wallet,
  Receipt,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';

export interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain?: boolean) => void;
  onOpenNewTransaksi?: () => void;
  onOpenAturKas?: () => void;
  onOpenStatusPengerjaan?: () => void;
  onOpenBukuKas?: () => void;
  isMobile?: boolean;
  laundryName?: string;
  userName?: string;
}

interface TourStep {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  spotlightTargetMobile?: string;
  spotlightTargetDesktop?: string;
  spotlightHint?: string;
  content: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onOpenNewTransaksi,
  onOpenAturKas,
  onOpenStatusPengerjaan,
  onOpenBukuKas,
  isMobile = false,
  laundryName = "Kafela's Laundry",
  userName = 'Kasir',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Keyboard navigation (Escape to close, Arrow keys for step navigation)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(dontShowAgain);
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < steps.length - 1) {
          setCurrentStep((prev) => prev + 1);
        } else {
          onClose(dontShowAgain);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep, dontShowAgain]);

  // Reset step to 0 when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const steps: TourStep[] = [
    // Langkah 1: Sambutan
    {
      id: 'welcome',
      badge: 'Selamat Datang',
      title: 'Selamat Datang di Kasir Laundry!',
      subtitle: `Halo, ${userName}! Sistem kasir & operasional ${laundryName} siap digunakan.`,
      icon: Sparkles,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50 border-amber-200',
      content: (
        <div className="space-y-3.5 text-xs text-slate-600">
          <p className="leading-relaxed">
            Aplikasi ini dirancang khusus untuk mempermudah operasional harian laundry Anda:
            mulai dari penerimaan cucian di kasir, cetak struk thermal, pantau cucian,
            hingga pembukuan kas otomatis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#800000] flex items-center justify-center shrink-0 mt-0.5">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Input Transaksi Kilat</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cetak struk Bluetooth 58mm & kirim via WhatsApp dalam hitungan detik.</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Atur Kas Toko</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Catat pengeluaran belanja sabun, listrik, dan modal kas laci pagi hari.</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Pantau Pengerjaan</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Status Baru Masuk, Cuci/Setrika, Selesai, dan Penyerahan Cucian.</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900">Laporan & Buku Kas</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Rekapitulasi omzet, cetak PDF A4 resmi, dan ekspor data ke Excel.</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    // Langkah 2: Membuat Transaksi Baru (Input Cucian)
    {
      id: 'transaksi_baru',
      badge: 'Alur Utama #1',
      title: 'Membuat Transaksi Baru (Input Cucian)',
      subtitle: 'Alur kasir saat pelanggan datang membawa cucian kotor ke laundry.',
      icon: Plus,
      iconColor: 'text-[#800000]',
      bgColor: 'bg-rose-50 border-rose-200',
      spotlightHint: isMobile
        ? 'Tombol bundar merah (+) di tengah bawah layar'
        : 'Tombol (+) Transaksi Baru di header atas dan sidebar',
      content: (
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-start gap-2.5">
            <Lightbulb className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-amber-900 leading-relaxed">
              <strong>Di mana tombolnya?</strong>{' '}
              {isMobile
                ? 'Tekan tombol bundar merah (+) besar di bagian tengah bawah layar HP Anda.'
                : 'Tekan tombol merah "+ Transaksi Baru" di bilah atas atau di menu samping kiri (Sidebar).'}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                1
              </span>
              <div>
                <strong className="text-slate-900">Pilih / Ketik Nama Pelanggan:</strong> Ketik nama dan nomor WhatsApp. Sistem akan otomatis mengingat data pelanggan untuk transaksi berikutnya.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                2
              </span>
              <div>
                <strong className="text-slate-900">Pilih Layanan & Timbang:</strong> Pilih layanan Kiloan, Bedcover, Satuan, atau Cuci Kering Setrika. Masukkan berat (kg) atau jumlah pakaian.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                3
              </span>
              <div>
                <strong className="text-slate-900">Pembayaran (Lunas / DP):</strong> Tentukan apakah pelanggan langsung membayar lunas, bayar sebagian (DP), atau bayar saat cucian diambil nanti.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#800000] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                4
              </span>
              <div>
                <strong className="text-slate-900">Cetak / Kirim Struk:</strong> Setelah klik Simpan, struk digital langsung tampil dengan opsi cetak ke printer Bluetooth atau kirim link nota via WhatsApp.
              </div>
            </div>
          </div>
        </div>
      ),
      primaryActionLabel: onOpenNewTransaksi ? 'Coba Form Transaksi Baru' : undefined,
      onPrimaryAction: onOpenNewTransaksi
        ? () => {
            onClose(dontShowAgain);
            onOpenNewTransaksi();
          }
        : undefined,
    },

    // Langkah 3: Mengatur Kas Toko (Atur Kas)
    {
      id: 'atur_kas',
      badge: 'Alur Utama #2',
      title: 'Mengatur Kas Toko (Catat Kas)',
      subtitle: 'Mencatat pengeluaran operasional toko & pemasukan manual kasir.',
      icon: Coins,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      spotlightHint: isMobile
        ? 'Tombol "Atur Kas" di navigasi bawah layar HP'
        : 'Tombol "Catat Kas" di header atas dan sidebar PC',
      content: (
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5">
            <Coins className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-emerald-950 leading-relaxed">
              <strong>Di mana tombolnya?</strong>{' '}
              {isMobile
                ? 'Tekan tombol menu "Atur Kas" di bilah navigasi bawah layar HP Anda.'
                : 'Tekan tombol "Catat Kas" di bagian atas dasbor atau sidebar menu.'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-red-700 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Catat Pengeluaran
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Catat belanja deterjen, softener, plastik packing, token listrik, air galon, hingga uang makan atau gaji karyawan.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-emerald-700 flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Catat Pemasukan Manual
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Catat modal kas awal laci kasir saat buka toko di pagi hari atau setoran kas tambahan di luar nota cucian.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
            💡 <strong>Otomatisasi Laba:</strong> Setiap pengeluaran yang dicatat langsung memotong uang masuk di kartu <strong>"Total Laba Hari Ini"</strong> secara akurat dan real-time.
          </div>
        </div>
      ),
      primaryActionLabel: onOpenAturKas ? 'Coba Buka Atur Kas' : undefined,
      onPrimaryAction: onOpenAturKas
        ? () => {
            onClose(dontShowAgain);
            onOpenAturKas();
          }
        : undefined,
    },

    // Langkah 4: Melacak Status Pengerjaan & Penyerahan
    {
      id: 'status_cucian',
      badge: 'Operasional Cucian',
      title: 'Pantau Status Cucian & Ambil Pesanan',
      subtitle: 'Memantau cucian dari antrean hingga diserahkan kembali ke pelanggan.',
      icon: Shirt,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50 border-indigo-200',
      content: (
        <div className="space-y-3 text-xs text-slate-600">
          <p className="leading-relaxed">
            Di layar utama Dashboard, pesanan dibagi menjadi status pengerjaan yang jelas:
          </p>

          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                <span className="font-bold text-slate-900">Baru Masuk (Diterima)</span>
              </div>
              <span className="text-[11px] text-slate-500">Cucian baru masuk antrean</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span className="font-bold text-slate-900">Sedang Dikerjakan</span>
              </div>
              <span className="text-[11px] text-slate-500">Proses cuci, kering, atau setrika</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-bold text-slate-900">Selesai (Siap Diambil)</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Siap diserahkan</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
            <Truck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-700 leading-relaxed">
              <strong>Penyerahan Cucian (Tombol Ambil):</strong> Saat pelanggan mengambil cuciannya, tekan tombol <strong>"Ambil"</strong> pada kartu transaksi. Jika masih ada sisa tagihan, sistem akan meminta konfirmasi pelunasan, uang masuk ke kas hari itu, dan nota otomatis tersimpan di <strong>Arsip Diambil</strong>.
            </div>
          </div>
        </div>
      ),
    },

    // Langkah 5: Buku Kas, Laporan & Ekspor Data
    {
      id: 'laporan_rekap',
      badge: 'Keuangan & Ekspor',
      title: 'Buku Kas, Laporan Keuangan & Ekspor',
      subtitle: 'Seluruh riwayat keuangan laundry tercatat rapi dan siap diekspor.',
      icon: BarChart3,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50 border-purple-200',
      content: (
        <div className="space-y-3 text-xs text-slate-600">
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Wallet className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Buku Kas Harian</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Melihat rincian uang masuk per nota, pelunasan cucian, dan pengeluaran harian lengkap dengan saldo akhir kasir toko.
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <BarChart3 className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Laporan & Ekspor Excel / PDF A4</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Analisis komparasi omzet bulanan, cetak dokumen laporan keuangan resmi format A4, dan unduh data ke format spreadsheet Excel (.xlsx).
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
              <Printer className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-slate-900">Pengaturan Printer & Toko</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Sambungkan printer Bluetooth Thermal Anda di menu <strong>Pengaturan</strong>. Printer yang pernah tersambung akan otomatis terhubung kembali (Auto-Reconnect).
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Tur panduan cepat selesai! Anda siap mengoperasikan kasir laundry.</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const StepIcon = current.icon;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose(dontShowAgain);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200">
      {/* Backdrop semi-transparan dengan blur fokus */}
      <div
        onClick={() => onClose(dontShowAgain)}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
      />

      {/* Main Tour Card Container */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col z-10 max-h-[92vh] sm:max-h-[88vh]">
        {/* Header Strip with Accent & Progress */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 bg-linear-to-b from-slate-50/80 to-white">
          <div className="flex items-center justify-between gap-3 mb-2.5">
            {/* Step Counter Badge */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-[#800000] border border-rose-200 text-[11px] font-extrabold tracking-wide">
                {current.badge}
              </span>
              <span className="text-[11px] text-slate-400 font-semibold tabular-nums">
                Langkah {currentStep + 1} dari {steps.length}
              </span>
            </div>

            {/* Close / Skip Button */}
            <button
              type="button"
              onClick={() => onClose(dontShowAgain)}
              title="Lewati panduan (Esc)"
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Title & Subtitle */}
          <div className="flex items-start gap-3 mt-1">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${current.bgColor}`}
            >
              <StepIcon className={`w-5 h-5 ${current.iconColor}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                {current.title}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-2">
                {current.subtitle}
              </p>
            </div>
          </div>

          {/* Step Progress Dots Indicator */}
          <div className="flex items-center gap-1.5 mt-3.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                title={`Langkah ${idx + 1}: ${s.title}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? 'w-7 bg-[#800000]'
                    : idx < currentStep
                    ? 'w-3 bg-rose-200 hover:bg-rose-300'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content Body (Scrollable if necessary) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {current.content}
        </div>

        {/* Footer Actions & Navigation */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
          {/* Quick Action Button if this step has one */}
          {current.primaryActionLabel && current.onPrimaryAction && (
            <button
              type="button"
              onClick={current.onPrimaryAction}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs shadow-xs transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{current.primaryActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="flex items-center justify-between gap-3">
            {/* Checkbox: Jangan tampilkan lagi */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#800000] focus:ring-[#800000] accent-[#800000]"
              />
              <span className="text-[11px] text-slate-500 font-medium">
                Jangan tampilkan otomatis lagi
              </span>
            </label>

            {/* Nav Buttons (Kembali / Lanjut) */}
            <div className="flex items-center gap-2 shrink-0">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 active:bg-slate-200 text-xs font-bold text-slate-700 transition active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sebelumnya</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] active:bg-[#4d0000] text-white font-extrabold text-xs shadow-md shadow-rose-950/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span>{isLastStep ? 'Mulai Pakai Kasir!' : 'Lanjut'}</span>
                {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
