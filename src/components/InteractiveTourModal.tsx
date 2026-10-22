import React, { useState, useEffect } from 'react';
import { X, ArrowRight, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react';

export interface InteractiveTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  onRestart: () => void;
  onFinish: () => void;
}

export const TOUR_STEPS = [
  {
    title: '1. Tambah Transaksi Baru',
    description: 'Selamat datang di Tur Panduan Kasir Kafelas Laundry! Klik tombol "+ Transaksi Baru" untuk mulai mencatat cucian masuk dari pelanggan.',
    targetSelector: '[data-tour="btn-tambah-transaksi"]',
    view: 'dashboard',
  },
  {
    title: '2. Isi Nama & Layanan',
    description: 'Ketik nama pelanggan dan pilih layanan cuci (misal: Cuci Komplit / Kiloan). Sistem otomatis menghitung total biaya cucian.',
    targetSelector: '[data-tour="form-transaksi"]',
    view: 'tambah_edit',
  },
  {
    title: '3. Status Pembayaran & Simpan',
    description: 'Pilih status pembayaran (Lunas atau DP) dan metode bayar (Tunai/QRIS), lalu tekan tombol "Simpan Transaksi" untuk membuat nota.',
    targetSelector: '[data-tour="btn-simpan-transaksi"]',
    view: 'tambah_edit',
  },
  {
    title: '4. Pratinjau Nota & Cetak Bluetooth',
    description: 'Di lembar Detail Transaksi, Anda dapat langsung mencetak struk thermal 58mm ke printer Bluetooth atau membagikan teks nota WhatsApp ke pelanggan.',
    targetSelector: '[data-tour="btn-cetak-nota"]',
    view: 'detail_transaksi',
  },
  {
    title: '5. Kerjakan Cucian di Dashboard',
    description: 'Di tabel antrean Dashboard, klik tombol proses merah pada pesanan untuk mulai mengerjakannya secara kilat tanpa perlu pindah halaman.',
    targetSelector: '[data-tour="btn-dashboard-kerjakan"]',
    view: 'dashboard',
  },
  {
    title: '6. Penyerahan Cucian ("Diambil")',
    description: 'Ketika pelanggan datang mengambil pakaian, klik tombol hijau pada tabel. Pesanan otomatis masuk ke arsip dan uang masuk tercatat di Buku Kas.',
    targetSelector: '[data-tour="btn-diambil"]',
    view: 'dashboard',
  },
];

export function InteractiveTourModal({
  isOpen,
  onClose,
  currentStep,
  onStepChange,
  onRestart,
  onFinish,
}: InteractiveTourModalProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  useEffect(() => {
    if (!isOpen) {
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // ignore scroll errors
        }
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    const t1 = setTimeout(updateRect, 100);
    const t2 = setTimeout(updateRect, 300);
    const t3 = setTimeout(updateRect, 600);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStep, step.targetSelector]);

  if (!isOpen) return null;

  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isTargetAtBottom = targetRect ? targetRect.bottom > (typeof window !== 'undefined' ? window.innerHeight - 280 : 500) : false;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Backdrop overlay */}
      {!targetRect && (
        <div className="absolute inset-0 bg-slate-950/75 pointer-events-auto transition-opacity duration-300" />
      )}

      {/* Spotlight cutout highlight */}
      {targetRect && (
        <>
          {/* Box Shadow Scrim Hole */}
          <div
            className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out border-2 border-emerald-400 ring-4 ring-emerald-400/40"
            style={{
              top: Math.max(8, targetRect.top - 6),
              left: Math.max(8, targetRect.left - 6),
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.78)',
            }}
          />
          {/* Subtle pulse effect */}
          <div
            className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out animate-pulse border border-white/80"
            style={{
              top: Math.max(8, targetRect.top - 6),
              left: Math.max(8, targetRect.left - 6),
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
          />
        </>
      )}

      {/* Floating Tooltip Card */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 w-full max-w-lg px-4 pointer-events-auto z-55 transition-all duration-300 ${
          isTargetAtBottom ? 'top-6' : 'bottom-6'
        }`}
      >
        <div className="bg-slate-900/98 backdrop-blur-md text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-700/80 relative">
          {/* Tombol Tutup */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-slate-800 transition cursor-pointer"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Step Counter */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-[11px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Langkah {currentStep + 1} dari {TOUR_STEPS.length}</span>
            </span>
            <span className="text-[11px] text-slate-400">Tur Kasir Interaktif</span>
          </div>

          <h3 className="text-base sm:text-lg font-black text-white mb-1.5 tracking-tight">
            {step.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mb-4 leading-relaxed">
            {step.description}
          </p>

          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5 mb-4">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 bg-emerald-400 shadow-xs shadow-emerald-400/50'
                    : i < currentStep
                    ? 'w-2 bg-emerald-700'
                    : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-3.5 border-t border-slate-800 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Tur</span>
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => onStepChange(currentStep - 1)}
                  className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer active:scale-95"
                >
                  Sebelumnya
                </button>
              )}

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => onStepChange(currentStep + 1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <span>Lanjut</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onFinish}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Selesai Panduan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
