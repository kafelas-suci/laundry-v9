import React, { useState } from 'react';
import {
  CreditCard,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';
import { formatRupiah } from '../utils/formatters';
import { useToast } from './NotificationContext';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTopUpWallet: (nominal: number) => void;
  sisaHari?: number;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTopUpWallet,
  sisaHari,
}) => {
  const toast = useToast();
  const [selectedNominal, setSelectedNominal] = useState<number>(30000);
  const [customTopUp, setCustomTopUp] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveSisaHari =
    sisaHari !== undefined
      ? sisaHari
      : Math.max(
          0,
          Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
        );

  const nominalFinal = customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal;

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    toast.success(`Nomor ${bank} (${text}) berhasil disalin!`);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handleSendWA = () => {
    const pesanWA = `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi top up saldo akun owner:\n• Nama: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal: ${formatRupiah(nominalFinal)}`;
    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(pesanWA)}`, '_blank');
  };

  const handleInstantTopUp = () => {
    if (nominalFinal <= 0) {
      toast.warning('Nominal top up tidak valid.');
      return;
    }
    onTopUpWallet(nominalFinal);
    toast.success(`Saldo ${formatRupiah(nominalFinal)} berhasil ditambahkan ke dompet owner!`);
    onClose();
    setCustomTopUp('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide leading-tight">
                Isi Saldo Akun Owner
              </h3>
              <p className="text-[10px] text-rose-200">
                Saldo untuk perpanjang paket & tambah cabang
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi Form & Instruksi Top Up */}
        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          {/* Card Saldo Saat Ini */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold">
                Saldo Dompet Saat Ini:
              </span>
              <div className="text-base font-black text-slate-900 font-mono">
                {formatRupiah(currentUser.walletBalance || 0)}
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <span>Masa Aktif: </span>
              <strong
                className={
                  effectiveSisaHari > 0
                    ? 'text-emerald-700 font-bold block'
                    : 'text-rose-600 font-bold block'
                }
              >
                {effectiveSisaHari > 0 ? `${effectiveSisaHari} Hari` : 'Kedaluwarsa'}
              </strong>
            </div>
          </div>

          {/* 1. Pilih Nominal */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-[11px] block">
              1. Pilih Nominal Top Up:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[25000, 27000, 57000, 100000].map((nom) => {
                const isSelected = selectedNominal === nom && !customTopUp;
                return (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => {
                      setSelectedNominal(nom);
                      setCustomTopUp('');
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition font-bold cursor-pointer ${
                      isSelected
                        ? 'border-[#800000] bg-rose-50/80 text-[#800000] ring-1 ring-[#800000] shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="block text-[9px] text-slate-400 font-normal">
                      {nom === 25000
                        ? 'Tambah 1 Cabang'
                        : nom === 27000
                        ? 'Paket Basic (30 Hari)'
                        : nom === 57000
                        ? 'Paket Pro'
                        : 'Isi Saldo'}
                    </span>
                    <span className="text-xs font-black font-mono">{formatRupiah(nom)}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  placeholder="Nominal kustom lainnya..."
                  value={customTopUp}
                  onChange={(e) => {
                    setCustomTopUp(e.target.value);
                    const n = parseInt(e.target.value, 10);
                    if (!isNaN(n) && n > 0) setSelectedNominal(n);
                  }}
                  className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. Tujuan Pembayaran */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="font-bold text-slate-800 text-[11px] block">
              2. Transfer ke Rekening Resmi:
            </label>
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-slate-700">
              {/* Rekening BRI */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                      BRI
                    </span>
                    <span className="font-mono">4108 0100 8396 530</span>
                  </div>
                  <div className="text-[10px] text-slate-500">a/n Iqbal S nuha</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('410801008396530', 'BRI')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedBank === 'BRI' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>Salin</span>
                </button>
              </div>

              {/* Rekening DANA */}
              <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-black">
                      DANA
                    </span>
                    <span className="font-mono">0856 5978 1477</span>
                  </div>
                  <div className="text-[10px] text-slate-500">a/n Suci K Kusumah</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('085659781477', 'DANA')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedBank === 'DANA' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                  <span>Salin</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. Tombol Konfirmasi WhatsApp & Instan */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={handleSendWA}
              className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <span>💬 Kirim Bukti ke WhatsApp Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleInstantTopUp}
              className="w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>
                Tambah Saldo Instan ({formatRupiah(nominalFinal)})
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
