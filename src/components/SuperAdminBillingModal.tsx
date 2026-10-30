import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  History,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import { auth } from '../firebase';
import { User } from '../types';
import { formatDateIndo, formatRupiah } from '../utils/formatters';
import { HARGA_PREMIUM_BULANAN } from '../utils/subscription';
import { useConfirm, useToast } from './NotificationContext';
import {
  SUPER_ADMIN_EMAILS,
  isSuperAdminEmailVerified,
  isSuperAdminUser,
} from '../services/midtransService';
import {
  AdminGrantAction,
  AdminLookedUpUser,
  BillingAuditLogItem,
  ManualTransferChannel,
  adminGrantOwnerBilling,
  adminLookupOwnerAccount,
} from '../services/billingService';

export interface SelfAccountBillingSnapshot {
  uid: string;
  walletBalance: number;
  subscriptionType: string;
  subscriptionEndDate: number | null;
}

interface SuperAdminBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSelfAccountUpdated?: (updated: SelfAccountBillingSnapshot) => void;
}

const DURATION_OPTIONS = [30, 60, 90, 180, 360] as const;
const TOPUP_PRESETS = [25000, 27000, 50000, 100000] as const;
const CHANNELS: Array<{ id: ManualTransferChannel; label: string }> = [
  { id: 'BRI', label: 'Transfer BRI' },
  { id: 'DANA', label: 'Transfer DANA' },
  { id: 'MANUAL', label: 'Manual Lainnya' },
];

function formatAuditActionLabel(action: string): string {
  switch (action) {
    case 'admin_extend_premium':
      return 'Aktivasi Premium (Admin)';
    case 'admin_topup_wallet':
      return 'Top Up Saldo (Admin)';
    case 'midtrans_extend_premium':
      return 'Paket Premium (Midtrans)';
    case 'midtrans_topup_wallet':
      return 'Top Up Saldo (Midtrans)';
    case 'wallet_extend_premium':
      return 'Perpanjang dari Saldo';
    case 'wallet_activate_branch':
      return 'Aktivasi Cabang Baru';
    default:
      return action;
  }
}

export const SuperAdminBillingModal: React.FC<SuperAdminBillingModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelfAccountUpdated,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [foundUser, setFoundUser] = useState<AdminLookedUpUser | null>(null);
  const [recentLogs, setRecentLogs] = useState<BillingAuditLogItem[]>([]);

  const [grantAction, setGrantAction] = useState<AdminGrantAction>('extend_premium');
  const [channel, setChannel] = useState<ManualTransferChannel>('BRI');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [topupAmountInput, setTopupAmountInput] = useState<string>('27000');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastReplyTemplate, setLastReplyTemplate] = useState<string>('');

  const activeAdminEmail = (
    auth.currentUser?.email ||
    currentUser.authEmail ||
    currentUser.emailOrPhone ||
    ''
  )
    .trim()
    .toLowerCase();
  const isSuperAdmin = isSuperAdminUser(currentUser.authEmail || currentUser.emailOrPhone);
  const emailVerified = isSuperAdminEmailVerified();

  if (!isOpen || !isSuperAdmin) return null;

  const handleCopyText = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label} berhasil disalin.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const applySuggestedAmount = (suggested: number | null) => {
    if (!suggested || suggested <= 0) return;
    if (suggested % HARGA_PREMIUM_BULANAN === 0) {
      const candidateDays = Math.round(suggested / HARGA_PREMIUM_BULANAN) * 30;
      if ((DURATION_OPTIONS as readonly number[]).includes(candidateDays)) {
        setGrantAction('extend_premium');
        setDurationDays(candidateDays);
        return;
      }
    }
    setGrantAction('topup_wallet');
    setTopupAmountInput(String(suggested));
  };

  const executeLookup = async (raw: string) => {
    const clean = raw.trim();
    if (!clean) {
      toast.warning('Tempel pesan konfirmasi WA atau masukkan ID Akun / Email / Nomor HP pembeli.');
      return;
    }
    if (!emailVerified) {
      toast.warning(
        'Silakan masuk menggunakan tombol "Masuk dengan Akun Google" agar sesi Super Admin terverifikasi.'
      );
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setLastReplyTemplate('');
    try {
      const res = await adminLookupOwnerAccount(clean);
      setFoundUser(res.user);
      setRecentLogs(res.recentLogs || []);
      applySuggestedAmount(res.suggestedAmount);
    } catch (err: any) {
      setFoundUser(null);
      setRecentLogs([]);
      toast.error(err?.message || 'Akun tidak ditemukan.');
    } finally {
      setIsSearching(false);
    }
  };

  const parsedTopupAmount = Math.max(0, parseInt(topupAmountInput.replace(/[^0-9]/g, ''), 10) || 0);
  const premiumCalculatedCost = Math.round((durationDays / 30) * HARGA_PREMIUM_BULANAN);
  const effectiveAmount =
    grantAction === 'extend_premium' ? premiumCalculatedCost : parsedTopupAmount;

  const targetSisaHari = foundUser?.subscriptionEndDate
    ? Math.max(0, Math.ceil((foundUser.subscriptionEndDate - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const handleSubmitGrant = async () => {
    if (!foundUser) return;
    if (!emailVerified) {
      toast.warning('Verifikasi Google OAuth diperlukan untuk memproses aktivasi.');
      return;
    }
    if (foundUser.role !== 'owner') {
      toast.warning('Akun ini berstatus Kasir. Aktivasi hanya berlaku untuk akun Owner.');
      return;
    }
    if (grantAction === 'topup_wallet' && (parsedTopupAmount < 5000 || parsedTopupAmount > 50000000)) {
      toast.warning('Nominal tambah saldo harus antara Rp 5.000 hingga Rp 50.000.000.');
      return;
    }

    const summaryText =
      grantAction === 'extend_premium'
        ? `Aktifkan / perpanjang Paket Premium selama ${durationDays} Hari (${formatRupiah(effectiveAmount)}) via ${channel} untuk akun "${foundUser.displayName}" (${foundUser.uid})?`
        : `Tambahkan saldo dompet sebesar ${formatRupiah(effectiveAmount)} via ${channel} ke akun "${foundUser.displayName}" (${foundUser.uid})?`;

    const confirmed = await confirm({
      title: 'Konfirmasi Aktivasi Server',
      message: summaryText,
      confirmText:
        grantAction === 'extend_premium'
          ? `Aktifkan ${durationDays} Hari`
          : `Tambah ${formatRupiah(effectiveAmount)}`,
      cancelText: 'Periksa Lagi',
    });

    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      const res = await adminGrantOwnerBilling({
        targetUid: foundUser.uid,
        action: grantAction,
        channel,
        durationDays: grantAction === 'extend_premium' ? durationDays : 0,
        amount: effectiveAmount,
        note: noteInput.trim() || undefined,
      });

      const updatedTarget: AdminLookedUpUser = {
        ...foundUser,
        walletBalance: res.user.walletBalance,
        subscriptionType: res.user.subscriptionType,
        subscriptionEndDate: res.user.subscriptionEndDate,
      };
      setFoundUser(updatedTarget);
      if (res.auditEntry) {
        setRecentLogs((prev) => [res.auditEntry, ...prev.filter((l) => l.id !== res.auditEntry.id)]);
      }
      setNoteInput('');

      const replyMsg =
        grantAction === 'extend_premium'
          ? `Halo Kak ${updatedTarget.displayName}, terima kasih atas konfirmasi transfer ${channel} sebesar ${formatRupiah(effectiveAmount)}.\n\nPaket Premium (${durationDays} Hari) untuk akun Anda (${updatedTarget.uid}) telah aktif hingga ${
              updatedTarget.subscriptionEndDate
                ? formatDateIndo(updatedTarget.subscriptionEndDate)
                : '-'
            }. Silakan buka kembali aplikasi Kafelas Laundry.`
          : `Halo Kak ${updatedTarget.displayName}, terima kasih atas konfirmasi transfer ${channel} sebesar ${formatRupiah(effectiveAmount)}.\n\nSaldo dompet akun Anda (${updatedTarget.uid}) telah ditambahkan dan saat ini berjumlah ${formatRupiah(updatedTarget.walletBalance)}. Silakan buka kembali aplikasi Kafelas Laundry.`;
      setLastReplyTemplate(replyMsg);

      if (updatedTarget.uid === currentUser.uid) {
        onSelfAccountUpdated?.({
          uid: updatedTarget.uid,
          walletBalance: updatedTarget.walletBalance,
          subscriptionType: updatedTarget.subscriptionType,
          subscriptionEndDate: updatedTarget.subscriptionEndDate,
        });
      }

      toast.success(
        grantAction === 'extend_premium'
          ? `Paket Premium ${durationDays} Hari berhasil diaktifkan untuk ${updatedTarget.displayName}.`
          : `Saldo ${formatRupiah(effectiveAmount)} berhasil ditambahkan ke akun ${updatedTarget.displayName}.`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memproses aktivasi di server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 truncate">
              Aktivasi Transfer Manual & Saldo User
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span>Otorisasi Super Admin: </span>
              <span className="font-mono text-slate-700">{activeAdminEmail || SUPER_ADMIN_EMAILS[0]}</span>
              <span aria-hidden="true"> · </span>
              <span>BRI / DANA Terproteksi Server</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {!emailVerified && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold">Verifikasi Google OAuth Diperlukan</p>
                <p className="text-amber-800">
                  Server mewajibkan token Google OAuth terverifikasi untuk memproses saldo atau paket. Silakan keluar lalu masuk kembali memakai tombol <strong>Masuk dengan Akun Google</strong> (<span className="font-mono">{activeAdminEmail}</span>).
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Lookup */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-[#800000]" />
                <span>Cari Akun Pembeli</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery(currentUser.uid);
                  executeLookup(currentUser.uid);
                }}
                className="text-[11px] font-bold text-[#800000] hover:underline cursor-pointer"
              >
                Cek Akun Saya Sendiri
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tempel langsung seluruh teks konfirmasi WhatsApp dari pembeli (otomatis membaca <span className="font-mono text-slate-700">ID Akun</span> &amp; <span className="font-mono text-slate-700">Nominal</span>), atau ketik UID, Email, maupun Nomor WhatsApp pembeli.
            </p>
            <div className="space-y-2">
              <textarea
                rows={2}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    executeLookup(searchQuery);
                  }
                }}
                placeholder="Tempel chat konfirmasi WA pembeli, atau ketik ID Akun / Email / 0812..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000] resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSearching}
                  onClick={() => executeLookup(searchQuery)}
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mencari di Server...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Cari Akun Pembeli</span>
                    </>
                  )}
                </button>
                {(searchQuery || foundUser) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFoundUser(null);
                      setRecentLogs([]);
                      setHasSearched(false);
                      setLastReplyTemplate('');
                    }}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Empty / Not Found State */}
          {hasSearched && !isSearching && !foundUser && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center space-y-1">
              <p className="font-bold text-slate-800 text-xs">Akun belum ditemukan</p>
              <p className="text-[11px] text-slate-500">
                Pastikan ID Akun (UID), Email login, atau Nomor WhatsApp pembeli sesuai dengan yang terdaftar di aplikasi.
              </p>
            </div>
          )}

          {/* Step 2: Found User Summary & Grant Controls */}
          {foundUser && (
            <div className="space-y-5">
              {/* Account Card */}
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#800000] shrink-0" />
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">
                        {foundUser.displayName}
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      <span>Peran: {foundUser.role === 'owner' ? 'Owner' : foundUser.role}</span>
                      {foundUser.authEmail && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span>{foundUser.authEmail}</span>
                        </>
                      )}
                      {foundUser.nomorTelepon && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-mono tabular-nums">{foundUser.nomorTelepon}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyText(foundUser.uid, 'uid', 'ID Akun')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-mono text-slate-700 flex items-center gap-1.5 shrink-0 cursor-pointer"
                    title="Salin ID Akun"
                  >
                    <span className="max-w-[110px] truncate">{foundUser.uid}</span>
                    {copiedId === 'uid' ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 shrink-0" />
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] text-slate-500 font-medium">Status Paket di Server</div>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5 tabular-nums">
                      {foundUser.subscriptionType === 'premium'
                        ? targetSisaHari > 0
                          ? `Premium · ${targetSisaHari} Hari Tersisa`
                          : 'Premium · Masa Aktif Habis'
                        : 'Newcomer (Gratis)'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {foundUser.subscriptionEndDate
                        ? `Berakhir: ${formatDateIndo(foundUser.subscriptionEndDate)}`
                        : 'Kuota dasar tanpa batas hari'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-[11px] text-slate-500 font-medium">Saldo Dompet di Server</div>
                    <div className="text-base font-black text-slate-900 font-mono tabular-nums mt-0.5">
                      {formatRupiah(foundUser.walletBalance)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {foundUser.branches.length > 0
                          ? `${foundUser.branches.length} cabang (${foundUser.branches
                              .map((b) => b.namaLaundry)
                              .join(', ')})`
                          : '1 cabang utama'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Form */}
              <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-slate-900 block">
                    Pilih Jenis Aktivasi
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setGrantAction('extend_premium')}
                      className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        grantAction === 'extend_premium'
                          ? 'bg-white text-[#800000] shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 shrink-0" />
                      <span>Aktifkan Premium</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGrantAction('topup_wallet')}
                      className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        grantAction === 'topup_wallet'
                          ? 'bg-white text-[#800000] shadow-xs border border-slate-200/80'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5 shrink-0" />
                      <span>Tambah Saldo</span>
                    </button>
                  </div>
                </div>

                {/* Channel Selector */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Jalur Pembayaran Masuk
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {CHANNELS.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => setChannel(ch.id)}
                        className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          channel === ch.id
                            ? 'border-[#800000] bg-rose-50/70 text-[#800000]'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Inputs */}
                {grantAction === 'extend_premium' ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">
                        Durasi Paket Premium
                      </span>
                      <span className="text-xs font-black font-mono tabular-nums text-[#800000]">
                        {formatRupiah(premiumCalculatedCost)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {DURATION_OPTIONS.map((days) => {
                        const price = Math.round((days / 30) * HARGA_PREMIUM_BULANAN);
                        const active = durationDays === days;
                        return (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setDurationDays(days)}
                            className={`min-h-[48px] p-2 rounded-xl border text-center transition cursor-pointer ${
                              active
                                ? 'border-[#800000] bg-rose-50/80 text-[#800000]'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="block text-xs font-extrabold tabular-nums">
                              {days} Hari
                            </span>
                            <span className="block text-[10px] font-mono tabular-nums text-slate-500">
                              {formatRupiah(price)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Nominal Saldo Ditambahkan (Rp)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {TOPUP_PRESETS.map((nom) => {
                        const active = parsedTopupAmount === nom;
                        return (
                          <button
                            key={nom}
                            type="button"
                            onClick={() => setTopupAmountInput(String(nom))}
                            className={`min-h-[40px] px-2.5 py-2 rounded-xl border text-xs font-bold font-mono tabular-nums transition cursor-pointer ${
                              active
                                ? 'border-[#800000] bg-rose-50/80 text-[#800000]'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {formatRupiah(nom)}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={topupAmountInput}
                      onChange={(e) => setTopupAmountInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Masukkan angka nominal (contoh: 50000)"
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono font-bold tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000]"
                    />
                  </div>
                )}

                {/* Optional Note */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Catatan Bukti Transfer (Opsional)
                  </label>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Contoh: Bukti BRI a/n Budi pukul 14:20"
                    className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSubmitting || !emailVerified}
                  onClick={handleSubmitGrant}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses di Server...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span className="tabular-nums">
                        {grantAction === 'extend_premium'
                          ? `Proses Aktivasi Premium ${durationDays} Hari (${formatRupiah(effectiveAmount)})`
                          : `Proses Tambah Saldo ${formatRupiah(effectiveAmount)}`}
                      </span>
                    </>
                  )}
                </button>

                {lastReplyTemplate && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Aktivasi Berhasil · Siap Balas WA Pembeli</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(lastReplyTemplate, 'wa-reply', 'Pesan balasan WA')
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        {copiedId === 'wa-reply' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Salin Balasan WA</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-950 whitespace-pre-line leading-relaxed bg-white/80 rounded-lg p-2.5 border border-emerald-200/70">
                      {lastReplyTemplate}
                    </p>
                  </div>
                )}
              </section>

              {/* Step 3: Audit Ledger */}
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Log Audit Billing Akun Ini</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 tabular-nums">
                    {recentLogs.length} catatan terbaru
                  </span>
                </div>

                {recentLogs.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-[11px] text-slate-500">
                    Belum ada catatan mutasi billing pada akun ini.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {recentLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 flex items-start justify-between gap-3 text-[11px]"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="font-bold text-slate-900">
                            <span>{formatAuditActionLabel(log.action)}</span>
                            <span aria-hidden="true"> · </span>
                            <span className="text-slate-600 font-semibold">{log.channel}</span>
                          </div>
                          {log.note && (
                            <p className="text-slate-600 truncate">{log.note}</p>
                          )}
                          <p className="text-slate-400">
                            <span>{formatDateIndo(log.createdAt, true)}</span>
                            {log.actorEmail && (
                              <>
                                <span aria-hidden="true"> · </span>
                                <span className="font-mono">{log.actorEmail}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0 font-mono tabular-nums">
                          <div
                            className={`font-extrabold ${
                              log.walletDelta < 0 ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {log.walletDelta < 0
                              ? `-${formatRupiah(Math.abs(log.walletDelta))}`
                              : formatRupiah(log.amount || 0)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Saldo: {formatRupiah(log.walletAfter || 0)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
