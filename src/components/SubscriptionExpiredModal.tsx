import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Wallet,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  X,
  ShieldCheck,
  Calendar,
  Zap,
  Building2,
} from 'lucide-react';
import { User } from '../types';
import { formatRupiah, formatTanggalIndo } from '../utils/formatters';
import { HARGA_PREMIUM_BULANAN } from '../utils/subscription';
import { useToast } from './NotificationContext';
import {
  OFFICIAL_PAYMENT_ACCOUNTS,
  MidtransVerifyResult,
  buildWhatsAppAdminUrl,
  startMidtransPayment,
  verifyMidtransOrder,
} from '../services/midtransService';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTopUpWallet?: (nominal: number) => void;
  onExtendSubscription: (
    packageName: string,
    cost: number,
    days: number
  ) => Promise<boolean> | boolean | void;
  onMidtransSettled?: (result: MidtransVerifyResult) => void;
  sisaHari?: number;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onExtendSubscription,
  onMidtransSettled,
  sisaHari = 0,
}) => {
  const toast = useToast();
  const [selectedMonths, setSelectedMonths] = useState<number>(1);
  const [showManualTransfer, setShowManualTransfer] = useState(false);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedDays = selectedMonths * 30;
  const selectedCost = selectedMonths * HARGA_PREMIUM_BULANAN;
  const walletBalance = currentUser.walletBalance || 0;
  const isBalanceEnough = walletBalance >= selectedCost;

  const tglExpiredFormatted = currentUser.subscriptionEndDate
    ? formatTanggalIndo(currentUser.subscriptionEndDate, true)
    : 'Hari ini';

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    toast.success(`Nomor ${bank} (${text}) berhasil disalin!`);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const handlePayWithWallet = async () => {
    if (!isBalanceEnough) {
      toast.warning(
        `Saldo belum mencukupi (${formatRupiah(walletBalance)}). Gunakan tombol Lewat Midtrans atau Transfer Biasa di bawah.`
      );
      return;
    }
    setIsProcessing(true);
    try {
      const ok = await onExtendSubscription(
        `Paket Premium (${selectedDays} Hari)`,
        selectedCost,
        selectedDays
      );
      if (ok !== false) {
        toast.success(`Masa aktif Paket Premium berhasil diperpanjang ${selectedDays} hari!`);
        onClose();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayMidtrans = async () => {
    setIsProcessing(true);
    try {
      const result = await startMidtransPayment({
        purpose: 'extend_premium',
        amount: selectedCost,
        customerName: currentUser.displayName,
        customerPhone: currentUser.nomorTelepon,
      });

      if (result.status === 'settled') {
        onMidtransSettled?.(result);
        toast.success(`Masa aktif Paket Premium berhasil diperpanjang ${result.durationDays || selectedDays} hari!`);
        onClose();
      } else if (result.status === 'pending') {
        setPendingOrderId(result.orderId);
        toast.info(result.message || 'Menunggu penyelesaian pembayaran Midtrans.');
      } else {
        toast.warning(result.message || 'Pembayaran belum diselesaikan.');
      }
    } catch (err: any) {
      if (err?.code === 'MIDTRANS_NOT_CONFIGURED') {
        setShowManualTransfer(true);
        toast.warning(err.message);
      } else {
        toast.error(err?.message || 'Gagal membuka pembayaran Midtrans.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPending = async () => {
    if (!pendingOrderId) return;
    setIsProcessing(true);
    try {
      const result = await verifyMidtransOrder(pendingOrderId);
      if (result.status === 'settled') {
        onMidtransSettled?.(result);
        toast.success(`Pembayaran terverifikasi! Paket Premium aktif ${result.durationDays || selectedDays} hari.`);
        setPendingOrderId(null);
        onClose();
      } else if (result.status === 'failed') {
        setPendingOrderId(null);
        toast.error(result.message || 'Transaksi dibatalkan atau kedaluwarsa.');
      } else {
        toast.info('Pembayaran masih menunggu konfirmasi.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memeriksa status pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  const waConfirmMessage = `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi transfer perpanjangan Paket Premium (${selectedDays} Hari):\n• Nama Laundry: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal: ${formatRupiah(selectedCost)}`;

  const csHelpMessage = `Halo CS Kafelas Laundry, saya ingin konsultasi perpanjangan hari langganan akun owner: ${currentUser.displayName}.`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        <div className="bg-gradient-to-r from-[#800000] via-[#991B1B] to-[#700000] text-white p-4 sm:p-5 flex items-start justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3 text-amber-300" />
                <span>{sisaHari > 0 ? `Sisa ${sisaHari} Hari` : 'Masa Langganan Habis'}</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-1">
                Perpanjang Paket Premium
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-2 cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 bg-rose-50 border border-rose-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block">
                Status Akun Owner
              </span>
              <p className="font-extrabold text-rose-950 text-xs sm:text-sm">
                {sisaHari > 0 ? 'Perpanjang Lebih Awal' : 'Hari Langganan Telah Berakhir'}
              </p>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Berakhir pada: {tglExpiredFormatted}</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-black text-xs shrink-0 shadow-xs tabular-nums">
              {sisaHari} Hari
            </span>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                    Saldo Dompet Owner
                  </span>
                  <div className="text-xl font-black text-white font-mono tabular-nums tracking-tight mt-0.5">
                    {formatRupiah(walletBalance)}
                  </div>
                </div>
              </div>

              {isBalanceEnough && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayWithWallet}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer shrink-0"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isProcessing ? 'Memproses...' : 'Potong Saldo'}</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border-2 border-[#800000]/25 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">
                  Pilih Durasi Perpanjangan
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Tanpa batas kuota transaksi bulanan, kasir lintas HP, laporan Excel & PDF resmi
                </p>
              </div>
              <div className="text-right shrink-0 pl-2">
                <span className="text-sm font-black text-[#800000] font-mono tabular-nums">
                  {formatRupiah(selectedCost)}
                </span>
                <span className="text-[10px] text-slate-400 block">/ {selectedDays} Hari</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((months) => {
                const cost = months * HARGA_PREMIUM_BULANAN;
                const active = selectedMonths === months;
                return (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setSelectedMonths(months)}
                    className={`p-2 rounded-xl border text-center transition font-bold cursor-pointer ${
                      active
                        ? 'border-[#800000] bg-rose-50 text-[#800000] ring-1 ring-[#800000]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-500 font-medium">
                      {months * 30} Hari
                    </span>
                    <span className="text-xs font-black font-mono tabular-nums">
                      {formatRupiah(cost)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-800 block">
                Pilih Cara Perpanjang Sekarang:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handlePayMidtrans}
                  className="py-3 px-3.5 rounded-xl bg-[#800000] hover:bg-[#660000] disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Lewat Midtrans</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualTransfer((prev) => !prev)}
                  className={`py-3 px-3.5 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer ${
                    showManualTransfer
                      ? 'border-[#800000] bg-rose-50 text-[#800000]'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Transfer Biasa</span>
                </button>
              </div>

              {pendingOrderId && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleVerifyPending}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Cek Status Pembayaran Midtrans ({pendingOrderId.slice(-8)})</span>
                </button>
              )}
            </div>

            {showManualTransfer && (
              <div className="p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl space-y-2.5 text-slate-700 animate-fade-in">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Transfer {formatRupiah(selectedCost)} ke Rekening Resmi:
                </span>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-black">
                        {OFFICIAL_PAYMENT_ACCOUNTS.BRI.bank}
                      </span>
                      <span className="font-mono tabular-nums">
                        {OFFICIAL_PAYMENT_ACCOUNTS.BRI.displayNumber}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      a/n {OFFICIAL_PAYMENT_ACCOUNTS.BRI.holderName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        OFFICIAL_PAYMENT_ACCOUNTS.BRI.copyNumber,
                        OFFICIAL_PAYMENT_ACCOUNTS.BRI.bank
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedBank === 'BRI' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>Salin</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200/80 shadow-2xs">
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-black">
                        {OFFICIAL_PAYMENT_ACCOUNTS.DANA.bank}
                      </span>
                      <span className="font-mono tabular-nums">
                        {OFFICIAL_PAYMENT_ACCOUNTS.DANA.displayNumber}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      a/n {OFFICIAL_PAYMENT_ACCOUNTS.DANA.holderName}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        OFFICIAL_PAYMENT_ACCOUNTS.DANA.copyNumber,
                        OFFICIAL_PAYMENT_ACCOUNTS.DANA.bank
                      )
                    }
                    className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    {copiedBank === 'DANA' ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-500" />
                    )}
                    <span>Salin</span>
                  </button>
                </div>

                <a
                  href={buildWhatsAppAdminUrl(waConfirmMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <span>Kirim Bukti ke WhatsApp Admin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-[11px]">Butuh bantuan aktivasi atau pembayaran?</span>
            </div>
            <a
              href={buildWhatsAppAdminUrl(csHelpMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#800000] hover:underline text-[11px] shrink-0 ml-2 cursor-pointer"
            >
              Hubungi CS WA
            </a>
          </div>
        </div>

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
