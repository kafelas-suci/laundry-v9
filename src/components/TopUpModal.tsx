import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  X,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Building2,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { User } from '../types';
import { formatRupiah } from '../utils/formatters';
import { useToast } from './NotificationContext';
import {
  OFFICIAL_PAYMENT_ACCOUNTS,
  PaymentPurpose,
  MidtransVerifyResult,
  buildWhatsAppAdminUrl,
  startMidtransPayment,
  verifyMidtransOrder,
} from '../services/midtransService';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onTopUpWallet?: (nominal: number) => void;
  onMidtransSettled?: (result: MidtransVerifyResult) => void;
  sisaHari?: number;
  initialPurpose?: PaymentPurpose;
  initialMethod?: 'midtrans' | 'manual';
  initialNominal?: number;
}

export const TopUpModal: React.FC<TopUpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onMidtransSettled,
  sisaHari,
  initialPurpose = 'topup_wallet',
  initialMethod = 'midtrans',
  initialNominal,
}) => {
  const toast = useToast();
  const [purpose, setPurpose] = useState<PaymentPurpose>(initialPurpose);
  const [paymentMethod, setPaymentMethod] = useState<'midtrans' | 'manual'>(initialMethod);
  const [selectedNominal, setSelectedNominal] = useState<number>(initialNominal || 27000);
  const [customTopUp, setCustomTopUp] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPurpose(initialPurpose);
      setPaymentMethod(initialMethod);
      setSelectedNominal(initialNominal || 27000);
      setCustomTopUp('');
      setPendingOrderId(null);
      setIsProcessing(false);
    }
  }, [isOpen, initialPurpose, initialMethod, initialNominal]);

  if (!isOpen) return null;

  const isNewcomer = !currentUser.subscriptionType || currentUser.subscriptionType === 'newcomer';
  const effectiveSisaHari =
    sisaHari !== undefined
      ? sisaHari
      : Math.max(
          0,
          Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
        );

  const nominalFinal =
    purpose === 'extend_premium'
      ? selectedNominal
      : customTopUp
      ? parseInt(customTopUp, 10) || selectedNominal
      : selectedNominal;

  const durationDays = Math.max(30, Math.round(nominalFinal / 27000) * 30);

  const presets =
    purpose === 'extend_premium'
      ? [
          { nominal: 27000, label: '30 Hari (1 Bulan)' },
          { nominal: 54000, label: '60 Hari (2 Bulan)' },
          { nominal: 81000, label: '90 Hari (3 Bulan)' },
          { nominal: 162000, label: '180 Hari (6 Bulan)' },
        ]
      : [
          { nominal: 25000, label: 'Tambah 1 Cabang' },
          { nominal: 27000, label: 'Paket Premium 30 Hari' },
          { nominal: 54000, label: 'Saldo 2 Bulan' },
          { nominal: 100000, label: 'Isi Saldo Dompet' },
        ];

  const handleCopy = (text: string, bank: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bank);
    toast.success(`Nomor ${bank} (${text}) berhasil disalin!`);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  const waMessage =
    purpose === 'extend_premium'
      ? `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi pembayaran perpanjangan Paket Premium (${durationDays} Hari):\n• Nama: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal: ${formatRupiah(nominalFinal)}`
      : `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi top up saldo akun owner:\n• Nama: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal: ${formatRupiah(nominalFinal)}`;

  const handlePayMidtrans = async () => {
    if (purpose === 'topup_wallet' && nominalFinal < 10000) {
      toast.warning('Nominal isi saldo minimal Rp 10.000.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await startMidtransPayment({
        purpose,
        amount: nominalFinal,
        customerName: currentUser.displayName,
        customerPhone: currentUser.nomorTelepon,
      });

      if (result.status === 'settled') {
        onMidtransSettled?.(result);
        toast.success(
          purpose === 'extend_premium'
            ? `Paket Premium aktif untuk ${result.durationDays || durationDays} hari!`
            : `Saldo ${formatRupiah(nominalFinal)} berhasil masuk ke dompet Owner!`
        );
        onClose();
      } else if (result.status === 'pending') {
        setPendingOrderId(result.orderId);
        toast.info(result.message || 'Menunggu penyelesaian pembayaran Midtrans.');
      } else {
        toast.warning(result.message || 'Pembayaran belum berhasil diselesaikan.');
      }
    } catch (err: any) {
      if (err?.code === 'MIDTRANS_NOT_CONFIGURED') {
        setPaymentMethod('manual');
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
        toast.success(
          purpose === 'extend_premium'
            ? `Pembayaran terverifikasi! Paket Premium aktif ${result.durationDays || durationDays} hari.`
            : `Pembayaran terverifikasi! Saldo ${formatRupiah(result.amount || nominalFinal)} berhasil ditambahkan.`
        );
        setPendingOrderId(null);
        onClose();
      } else if (result.status === 'failed') {
        setPendingOrderId(null);
        toast.error(result.message || 'Transaksi dibatalkan atau telah kedaluwarsa.');
      } else {
        toast.info('Pembayaran masih menunggu konfirmasi dari bank/e-wallet.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memeriksa status pembayaran.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-wide leading-tight">
                {purpose === 'extend_premium' ? 'Perpanjang Paket Premium' : 'Isi Saldo Akun Owner'}
              </h3>
              <p className="text-[10px] text-rose-200">
                {purpose === 'extend_premium'
                  ? 'Tanpa batas kuota transaksi bulanan & akses penuh kasir'
                  : 'Saldo untuk perpanjang paket & tambah cabang'}
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

        <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold">Saldo Dompet Saat Ini:</span>
              <div className="text-base font-black text-slate-900 font-mono tabular-nums">
                {formatRupiah(currentUser.walletBalance || 0)}
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-500">
              <span>Status Paket: </span>
              <strong
                className={
                  isNewcomer
                    ? 'text-slate-700 font-bold block'
                    : effectiveSisaHari > 0
                    ? 'text-emerald-700 font-bold block'
                    : 'text-rose-600 font-bold block'
                }
              >
                {isNewcomer
                  ? 'Newcomer (Gratis)'
                  : effectiveSisaHari > 0
                  ? `Premium (${effectiveSisaHari} Hari)`
                  : 'Kedaluwarsa'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setPurpose('extend_premium');
                setSelectedNominal(27000);
                setCustomTopUp('');
              }}
              className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                purpose === 'extend_premium'
                  ? 'bg-white text-[#800000] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Perpanjang Paket
            </button>
            <button
              type="button"
              onClick={() => {
                setPurpose('topup_wallet');
                setSelectedNominal(27000);
              }}
              className={`py-2 px-2.5 rounded-xl font-bold text-[11px] transition cursor-pointer ${
                purpose === 'topup_wallet'
                  ? 'bg-white text-[#800000] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Isi Saldo Dompet
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-[11px] block">
              1. {purpose === 'extend_premium' ? 'Pilih Durasi Paket Premium:' : 'Pilih Nominal Top Up:'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((item) => {
                const isSelected = selectedNominal === item.nominal && !customTopUp;
                return (
                  <button
                    key={item.nominal}
                    type="button"
                    onClick={() => {
                      setSelectedNominal(item.nominal);
                      setCustomTopUp('');
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition font-bold cursor-pointer ${
                      isSelected
                        ? 'border-[#800000] bg-rose-50/80 text-[#800000] ring-1 ring-[#800000] shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <span className="block text-[9px] text-slate-500 font-medium">{item.label}</span>
                    <span className="text-xs font-black font-mono tabular-nums">
                      {formatRupiah(item.nominal)}
                    </span>
                  </button>
                );
              })}
            </div>

            {purpose === 'topup_wallet' && (
              <div className="pt-1">
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    placeholder="Nominal kustom lainnya (min. 10.000)..."
                    value={customTopUp}
                    onChange={(e) => {
                      setCustomTopUp(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (!isNaN(n) && n > 0) setSelectedNominal(n);
                    }}
                    className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 tabular-nums focus:ring-2 focus:ring-[#800000] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="font-bold text-slate-800 text-[11px] block">
              2. Pilih Metode Pembayaran:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('midtrans')}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                  paymentMethod === 'midtrans'
                    ? 'border-[#800000] bg-rose-50/90 text-[#800000] ring-1 ring-[#800000]'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className="font-extrabold text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Lewat Midtrans</span>
                </span>
                <span className="text-[10px] text-slate-500">QRIS, VA Bank, GoPay, DANA</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('manual')}
                className={`p-2.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                  paymentMethod === 'manual'
                    ? 'border-[#800000] bg-rose-50/90 text-[#800000] ring-1 ring-[#800000]'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <span className="font-extrabold text-xs flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>Transfer Biasa</span>
                </span>
                <span className="text-[10px] text-slate-500">Transfer Manual BRI / DANA</span>
              </button>
            </div>
          </div>

          {paymentMethod === 'midtrans' ? (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Pembayaran otomatis terverifikasi melalui Midtrans.{' '}
                  {purpose === 'extend_premium'
                    ? `Masa aktif Paket Premium (${durationDays} hari) langsung bertambah setelah lunas.`
                    : 'Saldo dompet langsung bertambah otomatis setelah pembayaran berhasil.'}
                </span>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePayMidtrans}
                className="w-full py-3 px-4 rounded-2xl bg-[#800000] hover:bg-[#660000] disabled:opacity-60 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer tabular-nums"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Memproses Pembayaran...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Bayar Lewat Midtrans ({formatRupiah(nominalFinal)})</span>
                  </>
                )}
              </button>

              {pendingOrderId && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleVerifyPending}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Cek Status Pembayaran ({pendingOrderId.slice(-8)})</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-slate-700">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Transfer {formatRupiah(nominalFinal)} ke Rekening Resmi:
                </span>

                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
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

                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
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

              <a
                href={buildWhatsAppAdminUrl(waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-98 cursor-pointer"
              >
                <span>Kirim Bukti Transfer ke WhatsApp Admin</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
