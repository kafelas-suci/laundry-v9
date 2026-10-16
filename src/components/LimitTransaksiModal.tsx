import React, { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Lock,
  X,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { Transaksi } from '../types';

interface LimitTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  uncollectedList: Transaksi[];
  onArsipSemua: (list: Transaksi[]) => void;
  onArsipTigaBulan: (list: Transaksi[]) => void;
  onArsipLunas: (list: Transaksi[]) => void;
  onOpenStatusPengerjaan: () => void;
  onProceedCreateNew: () => void;
}

export const LimitTransaksiModal: React.FC<LimitTransaksiModalProps> = ({
  isOpen,
  onClose,
  uncollectedList,
  onArsipSemua,
  onArsipTigaBulan,
  onArsipLunas,
  onOpenStatusPengerjaan,
  onProceedCreateNew,
}) => {
  if (!isOpen) return null;

  const totalBelumDiambil = uncollectedList.length;
  const isLocked = totalBelumDiambil >= 400;
  const isWarning = totalBelumDiambil >= 300 && totalBelumDiambil < 400;

  // Filter 3 bulan kebelakang (90 hari lalu)
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const listTigaBulan = uncollectedList.filter((t) => t.tanggalMasuk < ninetyDaysAgo);

  // Filter yang sudah Lunas
  const listLunas = uncollectedList.filter((t) => t.statusPembayaran === 'Lunas');

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleAction = (actionType: 'semua' | 'tiga_bulan' | 'lunas') => {
    if (actionType === 'semua') {
      const count = uncollectedList.length;
      onArsipSemua(uncollectedList);
      setFeedbackMsg(`Berhasil menandai ${count} transaksi sebagai Diambil & Lunas!`);
    } else if (actionType === 'tiga_bulan') {
      const count = listTigaBulan.length;
      if (count === 0) {
        setFeedbackMsg('Tidak ada transaksi belum diambil yang lebih dari 3 bulan lalu.');
        return;
      }
      onArsipTigaBulan(listTigaBulan);
      setFeedbackMsg(`Berhasil mengarsipkan ${count} transaksi berusia > 3 bulan lalu.`);
    } else if (actionType === 'lunas') {
      const count = listLunas.length;
      if (count === 0) {
        setFeedbackMsg('Tidak ada transaksi belum diambil yang berstatus Lunas.');
        return;
      }
      onArsipLunas(listLunas);
      setFeedbackMsg(`Berhasil mengarsipkan ${count} transaksi lunas ke arsip diambil.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div
          className={`p-4 sm:p-5 text-white flex items-start justify-between ${
            isLocked ? 'bg-gradient-to-r from-red-700 to-rose-800' : 'bg-gradient-to-r from-amber-600 to-orange-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              {isLocked ? (
                <Lock className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {isLocked ? 'Batas Penuh Terkunci' : 'Peringatan Batas Transaksi'}
                </span>
                <span className="text-xs font-bold text-white/90">
                  {totalBelumDiambil} / 400 Pesanan
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5">
                {isLocked ? 'Pembuatan Transaksi Dikunci' : 'Transaksi Aktif Mencapai Batas'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Progress / Quota Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Pesanan Belum Diambil</span>
              <span className="font-black text-slate-900">
                <span className={isLocked ? 'text-red-600 text-sm' : 'text-amber-600 text-sm'}>
                  {totalBelumDiambil}
                </span>{' '}
                pesanan
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isLocked ? 'bg-red-600' : totalBelumDiambil >= 300 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (totalBelumDiambil / 400) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>Peringatan: 300 pesanan</span>
              <span className="font-bold text-red-600">Batas Maksimal: 400 pesanan</span>
            </div>
          </div>

          {/* Feedback banner if action taken */}
          {feedbackMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-medium">{feedbackMsg}</div>
            </div>
          )}

          {/* Explanation message */}
          <div
            className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
              isLocked
                ? 'bg-red-50 border-red-200 text-red-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            {isLocked ? (
              <p>
                <strong>Transaksi aktif telah mencapai batas maksimal ({totalBelumDiambil} pesanan)!</strong>{' '}
                Aplikasi <strong>tidak mengizinkan pembuatan transaksi baru</strong> sampai Anda melakukan
                pengarsipan pesanan yang menumpuk. Silakan pilih salah satu tombol pengarsipan di bawah ini.
              </p>
            ) : (
              <p>
                <strong>Perhatian:</strong> Transaksi aktif sudah mencapai batas ({totalBelumDiambil} pesanan).
                Jika mencapai 400 pesanan, pembuatan transaksi baru akan dikunci. Segera rapikan dengan
                mengambil satu per satu atau memilih opsi arsipkan di bawah ini.
              </p>
            )}
          </div>

          {/* Action Options Group */}
          <div className="space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-1">
              Pilihan Tindakan Pengarsipan Cepat:
            </div>

            {/* OPSI 1: Tandai Semua Sudah Ambil (Arsipkan Semua) */}
            <button
              type="button"
              onClick={() => handleAction('semua')}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 active:scale-98 transition flex items-start gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-950">
                    Tandai Sudah Ambil (Arsipkan Semua)
                  </h4>
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 shrink-0">
                    {totalBelumDiambil} Nota
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
                  Tandai seluruh {totalBelumDiambil} pesanan aktif sebagai selesai diambil & lunas.
                  Semua transaksi langsung masuk ke menu Arsip.
                </p>
              </div>
            </button>

            {/* OPSI 2: Arsipkan Transaksi 3 Bulan Kebelakang */}
            <button
              type="button"
              disabled={listTigaBulan.length === 0}
              onClick={() => handleAction('tiga_bulan')}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white active:scale-98 transition flex items-start gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">
                    Arsipkan Transaksi 3 Bulan Kebelakang
                  </h4>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                      listTigaBulan.length > 0
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {listTigaBulan.length} Nota
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Arsipkan transaksi lama yang masuk sebelum 3 bulan lalu (90+ hari) yang belum ditandai diambil.
                </p>
              </div>
            </button>

            {/* OPSI 3: Arsipkan Semua yang Lunas */}
            <button
              type="button"
              disabled={listLunas.length === 0}
              onClick={() => handleAction('lunas')}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white active:scale-98 transition flex items-start gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                <Archive className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">
                    Arsipkan Semua yang Lunas
                  </h4>
                  <span
                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                      listLunas.length > 0
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {listLunas.length} Nota
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Arsipkan pesanan yang sudah berstatus Lunas ke dalam arsip diambil.
                </p>
              </div>
            </button>

            {/* OPSI 4: Ambil Satu per Satu di Menu Status Pengerjaan */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenStatusPengerjaan();
              }}
              className="w-full text-left p-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-98 transition flex items-start gap-3 group"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition">
                <Clock className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900">
                    Klik Ambil Satu per Satu
                  </h4>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Buka menu Status Pengerjaan untuk memeriksa rincian pakaian dan menyerahkan cucian satu per satu ke pelanggan.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200/60 text-xs font-bold text-slate-700 transition active:scale-95"
          >
            Tutup
          </button>

          {/* Tombol Lanjut Buat Transaksi Baru (Hanya aktif jika < 400) */}
          {isLocked ? (
            <div className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-300 text-slate-500 text-xs font-extrabold cursor-not-allowed">
              <Lock className="w-4 h-4" />
              <span>Terkunci (Arsipkan Terlebih Dahulu)</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedCreateNew();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition active:scale-95"
            >
              <span>Tetap Lanjut Buat Transaksi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
