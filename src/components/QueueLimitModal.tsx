import React from 'react';
import {
  AlertTriangle,
  Lock,
  Archive,
  Calendar,
  CheckCircle,
  Truck,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

interface QueueLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCount: number;
  selesaiCount: number;
  over3MonthsCount: number;
  lunasCount: number;
  onArchiveSelesai: () => void;
  onArchiveOlderThan3Months: () => void;
  onArchiveLunas: () => void;
  onTakeOneByOne: () => void;
  onContinueAnyway?: () => void;
}

export const QueueLimitModal: React.FC<QueueLimitModalProps> = ({
  isOpen,
  onClose,
  activeCount,
  selesaiCount,
  over3MonthsCount,
  lunasCount,
  onArchiveSelesai,
  onArchiveOlderThan3Months,
  onArchiveLunas,
  onTakeOneByOne,
  onContinueAnyway,
}) => {
  if (!isOpen) return null;

  const isHardBlocked = activeCount >= 400;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Icon & Status */}
        <div className="text-center shrink-0">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs ${
              isHardBlocked
                ? 'bg-red-100 text-red-600 ring-4 ring-red-50'
                : 'bg-amber-100 text-amber-600 ring-4 ring-amber-50'
            }`}
          >
            {isHardBlocked ? <Lock className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            {isHardBlocked
              ? 'Antrean Penuh! Transaksi Baru Dikunci'
              : 'Peringatan: Antrean Menumpuk'}
          </h3>

          <div className="mt-1.5 flex items-center justify-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                isHardBlocked
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {activeCount} Pesanan Belum Diambil
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-md mx-auto">
            {isHardBlocked ? (
              <>
                Antrean aktif laundry telah mencapai batas maksimal{' '}
                <strong className="text-red-700 font-bold">400 pesanan</strong> ({activeCount} pesanan).
                Untuk mencegah kekacauan data dan pembengkakan kuota, sistem{' '}
                <strong className="text-red-700 font-bold">tidak mengizinkan</strong> transaksi baru
                sampai ada pesanan lama yang diarsipkan.
              </>
            ) : (
              <>
                Antrean aktif laundry Anda sudah melewati{' '}
                <strong className="text-amber-700 font-bold">300 pesanan</strong> ({activeCount} pesanan).
                Segera arsipkan cucian yang sudah selesai/lunas agar antrean tetap rapi dan ringan.
              </>
            )}
          </p>
        </div>

        {/* Action Options (Scrollable) */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2.5 pr-0.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
            Pilih Aksi Pengarsipan Cepat:
          </div>

          {/* Opsi 1: Arsipkan Semua yang Selesai */}
          <button
            type="button"
            disabled={selesaiCount === 0}
            onClick={onArchiveSelesai}
            className="w-full p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 disabled:opacity-40 disabled:cursor-not-allowed text-left transition flex items-center justify-between gap-3 group active:scale-98 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-900 truncate">
                  Arsipkan Semua Pesanan Selesai
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  Tandai cucian berstatus Selesai sebagai Diambil & Lunas
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs">
                {selesaiCount} Nota
              </span>
            </div>
          </button>

          {/* Opsi 2: Arsipkan Transaksi 3 Bulan Kebelakang */}
          <button
            type="button"
            disabled={over3MonthsCount === 0}
            onClick={onArchiveOlderThan3Months}
            className="w-full p-3.5 rounded-2xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 disabled:opacity-40 disabled:cursor-not-allowed text-left transition flex items-center justify-between gap-3 group active:scale-98 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-blue-900 truncate">
                  Arsipkan Transaksi &gt; 3 Bulan Lalu
                </div>
                <div className="text-[11px] text-blue-700 font-medium mt-0.5">
                  Arsipkan nota lama yang masuk lebih dari 90 hari lalu
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-xs">
                {over3MonthsCount} Nota
              </span>
            </div>
          </button>

          {/* Opsi 3: Arsipkan Semua yang Sudah Lunas */}
          <button
            type="button"
            disabled={lunasCount === 0}
            onClick={onArchiveLunas}
            className="w-full p-3.5 rounded-2xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/80 disabled:opacity-40 disabled:cursor-not-allowed text-left transition flex items-center justify-between gap-3 group active:scale-98 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Archive className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-purple-900 truncate">
                  Arsipkan Semua yang Sudah Lunas
                </div>
                <div className="text-[11px] text-purple-700 font-medium mt-0.5">
                  Tandai cucian berstatus Lunas sebagai Diambil
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white font-black text-xs">
                {lunasCount} Nota
              </span>
            </div>
          </button>

          {/* Opsi 4: Ambil / Serahkan Satu per Satu */}
          <button
            type="button"
            onClick={onTakeOneByOne}
            className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition flex items-center justify-between gap-3 group active:scale-98 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Truck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-extrabold text-xs text-slate-900 truncate">
                  Ambil / Serahkan Satu per Satu
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Buka antrean kasir untuk memilih dan menyerahkan nota manual
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition active:scale-95"
          >
            Tutup
          </button>

          {!isHardBlocked && onContinueAnyway && (
            <button
              type="button"
              onClick={onContinueAnyway}
              className="px-4 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-black shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>Tetap Lanjut Buat Transaksi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {isHardBlocked && (
            <div className="text-right">
              <span className="text-[11px] font-bold text-red-600">
                🔒 Arsipkan minimal {activeCount - 399} nota untuk membuka kunci
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
