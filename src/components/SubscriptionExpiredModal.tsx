import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Wallet,
  CreditCard,
  Plus,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  MessageCircle,
  X,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { User } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { HARGA_Premium_BULANAN } from '../utils/subscription';
import { useToast } from './NotificationContext';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTopUpWallet: (nominal: number) => void;
  onExtendSubscription: (packageName: string, cost: number, days: number) => void;
  sisaHari?: number;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onTopUpWallet,
  onExtendSubscription,
  sisaHari = 0,
}) => {
  const toast = useToast();
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [selectedNominal, setSelectedNominal] = useState<number>(HARGA_Premium_BULANAN);
  const [customNominal, setCustomNominal] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);

  if (!isOpen) return null;

  const walletBalance = currentUser.walletBalance || 0;
  const isBalanceEnough = walletBalance >= HARGA_Premium_BULANAN;
  const kekuranganSaldo = Math.max(0, HARGA_Premium_BULANAN - walletBalance);

  const tglExpiredFormatted = currentUser.subscriptionEndDate
    ? formatTanggalIndo(currentUser.subscriptionEndDate, true)
    : 'Hari ini';

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    toast.success(`Nomor ${bank} (${text}) berhasil disalin!`);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handlePayPerpanjangan = () => {
    if (!isBalanceEnough) {
      toast.warning(
        `Saldo tidak mencukupi. Diperlukan ${formatRupiah(HARGA_Premium_BULANAN)}, saldo saat ini ${formatRupiah(walletBalance)}.`
      );
      setShowTopUpForm(true);
      return;
    }

    onExtendSubscription('Paket Premium (30 Hari)', HARGA_Premium_BULANAN, 30);
    toast.success('Masa aktif langganan berhasil diperpanjang 30 hari!');
    onClose();
  };

  const finalTopUpNominal = customNominal
    ? parseInt(customNominal, 10) || selectedNominal
    : selectedNominal;

  const handleInstantTopUp = () => {
    if (finalTopUpNominal <= 0) {
      toast.warning('Nominal top up tidak valid.');
      return;
    }
    onTopUpWallet(finalTopUpNominal);
    toast.success(`Saldo ${formatRupiah(finalTopUpNominal)} berhasil ditambahkan ke dompet owner!`);
    setShowTopUpForm(false);
    setCustomNominal('');
  };

  const handleSendWAConfirmation = () => {
    const pesanWA = `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi top up saldo untuk perpanjang hari langganan:\n• Nama Laundry: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal Top Up: ${formatRupiah(finalTopUpNominal)}\n• Tujuan: Perpanjang Paket Premium (30 Hari)`;
    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(pesanWA)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header Marun Elegan */}
        <div className="bg-gradient-to-r from-[#800000] via-[#991B1B] to-[#700000] text-white p-4 sm:p-5 flex items-start justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>Masa Langganan Habis</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1">
                Perpanjang Hari Langganan
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-2 cursor-pointer"
            title="Tutup (Tetap di aplikasi)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Isi Scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Card Info Kedaluwarsa */}
          <div className="p-3.5 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                Status Akun Owner
              </span>
              <p className="font-extrabold text-rose-950 text-xs sm:text-sm">
                Hari Langganan Telah Berakhir
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Berakhir pada: {tglExpiredFormatted}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shrink-0 shadow-xs">
              0 Hari
            </span>
          </div>

          {/* Card 1: Melihat Saldo Dompet */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Saldo Dompet Owner
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight mt-0.5">
                    {formatRupiah(walletBalance)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTopUpForm(!showTopUpForm)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showTopUpForm ? 'Tutup Top Up' : 'Isi Saldo'}</span>
              </button>
            </div>

            {/* Indikator Kecukupan Saldo */}
            <div
              className={`p-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 ${
                isBalanceEnough
                  ? 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-200'
                  : 'bg-amber-950/60 border border-amber-500/30 text-amber-200'
              }`}
            >
              {isBalanceEnough ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Saldo mencukupi untuk perpanjang <strong>30 Hari</strong> ({formatRupiah(HARGA_Premium_BULANAN)}).
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Saldo kurang <strong>{formatRupiah(kekuranganSaldo)}</strong> untuk perpanjang 30 hari. Silakan isi saldo di bawah.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Form Top Up Saldo (Bisa Ditampilkan / Disembunyikan) */}
          {showTopUpForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 animate-fade-in shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#800000]" />
                  <span className="font-extrabold text-slate-900 text-xs">
                    Pengisian Saldo Dompet
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Transfer Bank / DANA
                </span>
              </div>

              {/* Pilihan Nominal Cepat */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 text-[11px] block">
                  Pilih Nominal Top Up:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[27000, 54000, 81000].map((nom) => {
                    const isSelected = selectedNominal === nom && !customNominal;
                    return (
                      <button
                        key={nom}
                        type="button"
                        onClick={() => {
                          setSelectedNominal(nom);
                          setCustomNominal('');
                        }}
                        className={`p-2 rounded-xl border text-center transition font-bold cursor-pointer ${
                          isSelected
                            ? 'border-[#800000] bg-rose-50 text-[#800000] ring-1 ring-[#800000]'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="block text-[9px] text-slate-400 font-normal">
                          {nom === 27000 ? '1 Bulan (30 Hari)' : nom === 54000 ? '2 Bulan (60 Hari)' : '3 Bulan (90 Hari)'}
                        </span>
                        <span className="text-xs font-black font-mono">{formatRupiah(nom)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="Atau ketik nominal kustom..."
                      value={customNominal}
                      onChange={(e) => {
                        setCustomNominal(e.target.value);
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n > 0) setSelectedNominal(n);
                      }}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Rincian Rekening Transfer */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2 text-slate-700">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Transfer ke Rekening Resmi Admin:
                </span>

                {/* BRI */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200/80 shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                      <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                        BRI
                      </span>
                      <span className="font-mono">4108 0100 8396 530</span>
                    </div>
                    <div className="text-[10px] text-slate-500">a/n Iqbal S nuha</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('410801008396530', 'BRI')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedBank === 'BRI' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>Salin</span>
                  </button>
                </div>

                {/* DANA */}
                <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200/80 shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                      <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[9px] font-black">
                        DANA
                      </span>
                      <span className="font-mono">0831 3230 4649</span>
                    </div>
                    <div className="text-[10px] text-slate-500">a/n Iqbal S Nuha</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('085659781477', 'DANA')}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
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

              {/* Aksi Top Up */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendWAConfirmation}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Kirim Bukti ke WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstantTopUp}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Tambah Saldo Instan ({formatRupiah(finalTopUpNominal)})</span>
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Perpanjang Hari Langganan Paket Premium (30 Hari) */}
          <div className="bg-white border-2 border-[#800000]/30 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">
                  Paket Premium (30 Hari)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Akses penuh kasir, penugasan staf, laporan keuangan, ekspor Excel & PDF resmi
                </p>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="text-sm font-black text-[#800000] font-mono">
                  {formatRupiah(HARGA_Premium_BULANAN)}
                </span>
                <span className="text-[10px] text-slate-400 block">/ 30 Hari</span>
              </div>
            </div>

            {/* Tombol Utama: Perpanjang Sekarang */}
            <button
              type="button"
              onClick={handlePayPerpanjangan}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer ${
                isBalanceEnough
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-[#800000] to-[#991B1B] hover:from-[#700000] hover:to-[#800000] text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                {isBalanceEnough
                  ? `Perpanjang 30 Hari Sekarang (Potong Saldo ${formatRupiah(HARGA_Premium_BULANAN)})`
                  : `Isi Saldo & Perpanjang (${formatRupiah(HARGA_Premium_BULANAN)})`}
              </span>
            </button>
          </div>

          {/* WhatsApp Admin Direct Link */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px]">Butuh bantuan aktivasi atau pembayaran?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.open(
                  `https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(
                    `Halo CS Kafelas Laundry, saya ingin konsultasi perpanjangan hari langganan akun owner: ${currentUser.displayName}.`
                  )}`,
                  '_blank'
                );
              }}
              className="font-bold text-[#800000] hover:underline text-[11px] shrink-0 ml-2 cursor-pointer"
            >
              Hubungi CS WA
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Data riwayat transaksi tetap aman</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition cursor-pointer"
          >
            Lanjut ke Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};
