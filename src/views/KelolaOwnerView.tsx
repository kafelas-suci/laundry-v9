import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  CreditCard,
  Building2,
  Clock,
  ChevronDown,
  Edit,
  Trash2,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Lock,
  UserCheck,
  ShieldAlert,
  Crown,
} from 'lucide-react';
import { User, Laundry, SubscriptionHistory } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { useToast, useConfirm } from '../components/NotificationContext';
import { isProTier, normalizeTier, getLaundryLimits } from '../utils/subscription';

interface KelolaOwnerViewProps {
  onBack: () => void;
  currentUser: User;
  laundries: Laundry[];
  activeLaundryId: string;
  subscriptionHistory: SubscriptionHistory[];
  onSelectLaundry: (laundryId: string) => void;
  onAddLaundry: (nama: string, alamat?: string, telepon?: string, copyFromId?: string) => void;
  onUpdateLaundry: (laundry: Laundry) => void;
  onDeleteLaundry: (laundryId: string) => void;
  onTopUpWallet: (nominal: number) => void;
  onExtendSubscription: (packageName: string, cost: number, days: number) => void;
  onUpdateOwnerProfile?: (data: { displayName: string; nomorTelepon?: string | null }) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const KelolaOwnerView: React.FC<KelolaOwnerViewProps> = ({
  onBack,
  currentUser,
  laundries,
  activeLaundryId,
  subscriptionHistory,
  onSelectLaundry,
  onAddLaundry,
  onUpdateLaundry,
  onDeleteLaundry,
  onTopUpWallet,
  onExtendSubscription,
  onUpdateOwnerProfile,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [showBranches, setShowBranches] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [customTopUp, setCustomTopUp] = useState('');
  const [selectedNominal, setSelectedNominal] = useState<number>(30000);
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Edit Owner Profile Modal State
  const [showEditOwnerModal, setShowEditOwnerModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName || '');
  const [editNomorTelepon, setEditNomorTelepon] = useState(currentUser.nomorTelepon || '');

  // Add branch form
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [copyLayananFrom, setCopyLayananFrom] = useState<string>('');

  // Editing branch
  const [editingLaundry, setEditingLaundry] = useState<Laundry | null>(null);

  const currentLimits = getLaundryLimits(currentUser.subscriptionType);
  const isNewcomer = currentLimits.tier === 'newcomer';
  const isBasic = currentLimits.tier === 'basic';
  const isPro = currentLimits.tier === 'pro';
  const HARGA_BASIC_BULANAN = 27000;
  const HARGA_PRO_BULANAN = 57000;

  const sisaHari = Math.max(
    0,
    Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const handlePayBulanan = async (tierToBuy: 'basic' | 'pro' = isPro ? 'pro' : 'basic') => {
    const cost = tierToBuy === 'pro' ? HARGA_PRO_BULANAN : HARGA_BASIC_BULANAN;
    const label = tierToBuy === 'pro' ? 'Paket Pro (Maks. 3 Cabang)' : 'Paket Basic (1 Cabang)';

    if (currentUser.walletBalance < cost) {
      toast.warning(`Saldo dompet tidak mencukupi (${formatRupiah(cost)}). Silakan isi saldo terlebih dahulu.`);
      setShowTopUpModal(true);
      return;
    }
    const ok = await confirm({
      title: `Beli ${label}`,
      message: `Beli ${label} 30 Hari seharga ${formatRupiah(cost)}? Saldo dompet akan dipotong.`,
      confirmText: 'Beli Sekarang',
    });
    if (ok) {
      onExtendSubscription(`${label} 30 Hari`, cost, 30);
      toast.success(`Langganan ${label} 30 hari berhasil diaktifkan!`);
    }
  };

  const handleAddBranchSubmit = () => {
    if (!newBranchName.trim()) {
      toast.warning('Nama cabang laundry wajib diisi.');
      return;
    }

    if (!isProTier(currentUser.subscriptionType) && laundries.length >= 1) {
      setShowAddBranchModal(false);
      onOpenUpgradeModal?.('Menambah cabang baru (Paket Basic dibatasi 1 Cabang Outlet). Upgrade ke Paket Pro untuk mengelola hingga 3 cabang.');
      return;
    }

    if (laundries.length >= 3) {
      setShowAddBranchModal(false);
      toast.warning('Batas maksimal 3 cabang outlet telah tercapai untuk Paket Pro.');
      return;
    }

    onAddLaundry(newBranchName.trim(), newBranchAddress.trim() || undefined, newBranchPhone.trim() || undefined, copyLayananFrom || undefined);
    setShowAddBranchModal(false);
    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchPhone('');
    toast.success(`Cabang '${newBranchName}' berhasil ditambahkan!`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-[#800000] to-[#990000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide leading-tight">Owner & Kelola Cabang</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowEditOwnerModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition shadow-2xs active:scale-95 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Profil Owner</span>
        </button>
      </header>

      <main className="flex-1 p-3 md:p-5 space-y-4 max-w-4xl mx-auto w-full">
        
        {/* GRID UTAMA: 2 Kolom Kompak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* KOLOM 1: DOMPET & LANGGANAN */}
          <div className="bg-[#1e293b] text-white rounded-2xl shadow-sm overflow-hidden border border-slate-700/80 flex flex-col justify-between">
            <div>
              {/* Header Masa Aktif */}
              <div className="bg-[#800000] px-3.5 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-inner">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  {isNewcomer
                    ? 'Masa Aktif: Paket Newcomer (Gratis Selamanya)'
                    : sisaHari > 0
                    ? `Masa Aktif: Aktif (${sisaHari} Hari Tersisa)`
                    : 'Kedaluwarsa'}
                </span>
              </div>

              {/* Saldo Akun & Tombol Top Up */}
              <div className="p-4 flex items-center justify-between border-b border-slate-700/80 bg-slate-900/40">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Saldo Dompet Akun</span>
                  <span className="text-xl font-black text-white tracking-tight">{formatRupiah(currentUser.walletBalance)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs transition shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Top Up</span>
                </button>
              </div>

              {/* Perpanjangan Options */}
              <div className="p-3 space-y-2">
                {/* Paket Newcomer (Gratis) */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition text-xs shadow-2xs">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-emerald-400">Paket Newcomer (Gratis)</span>
                      {isNewcomer && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                          Aktif
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Rp 0 · 1 Owner (Tanpa Kasir) · 50 Pelanggan & 50 Nota/bln · 5 Layanan</div>
                  </div>
                  {isNewcomer ? (
                    <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1">Aktif</span>
                  ) : (
                    <button
                      onClick={() => onOpenUpgradeModal?.()}
                      className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-[11px] transition shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                    >
                      Pilih
                    </button>
                  )}
                </div>

                {/* Paket Bulanan Basic */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition text-xs shadow-2xs">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">Paket Basic (30 Hari)</span>
                      {isBasic && <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-bold">Aktif</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{formatRupiah(HARGA_BASIC_BULANAN)} · 1 Cabang & 1 Kasir Mandiri</div>
                  </div>
                  <button
                    onClick={() => handlePayBulanan('basic')}
                    className="px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-[11px] transition shadow-2xs active:scale-95 shrink-0 cursor-pointer"
                  >
                    Bayar
                  </button>
                </div>

                {/* Paket Bulanan Pro */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-950/50 via-slate-800 to-slate-800 border border-amber-500/50 hover:border-amber-500 transition text-xs shadow-2xs">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        <span>Paket Pro (30 Hari)</span>
                      </span>
                      {isPro && <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-300/40 px-2 py-0.5 rounded-full font-bold">Aktif</span>}
                    </div>
                    <div className="text-[10px] text-amber-200/80 mt-0.5">{formatRupiah(HARGA_PRO_BULANAN)} · Hingga 3 Cabang, Kasir & Staf Tanpa Login</div>
                  </div>
                  <button
                    onClick={() => handlePayBulanan('pro')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow-md active:scale-95 shrink-0 cursor-pointer"
                  >
                    Bayar
                  </button>
                </div>

                {/* Tombol Bandingkan Paket */}
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal?.()}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-98 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-slate-950" />
                    <span>Bandingkan Detail Paket (Newcomer vs Basic vs Pro)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Riwayat Tombol Bawah */}
            <div className="p-3 bg-slate-900/60 border-t border-slate-700/80 flex gap-2">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-700/50 cursor-pointer"
              >
                📜 Riwayat Transaksi
              </button>
              <button
                onClick={() => {
                  window.open(
                    `https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(
                      'Halo CS Kafelas Laundry, saya ingin konsultasi seputar akun owner.'
                    )}`,
                    '_blank'
                  );
                }}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-700/50 cursor-pointer"
              >
                💬 Bantuan CS
              </button>
            </div>
          </div>

          {/* KOLOM 2: DAFTAR CABANG LAUNDRY */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
            <div>
              <div className="bg-[#800000] text-white p-3.5 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white" />
                  <span className="font-bold text-xs tracking-wide">
                    Daftar Cabang ({laundries.length} {isPro ? '/ 3 Pro' : '/ 1 Basic'})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isPro && laundries.length >= 1) {
                        onOpenUpgradeModal?.('Menambah cabang baru (Paket Basic dibatasi 1 Cabang).');
                        return;
                      }
                      if (laundries.length >= 3) {
                        toast.warning('Batas maksimal 3 cabang tercapai.');
                        return;
                      }
                      setShowAddBranchModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    {(!isPro && laundries.length >= 1) || laundries.length >= 3 ? (
                      <Lock className="w-3 h-3 text-amber-300" />
                    ) : <Plus className="w-3.5 h-3.5" />}
                    <span>Cabang</span>
                  </button>
                  <button
                    onClick={() => setShowBranches(!showBranches)}
                    className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${showBranches ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {showBranches && (
                <div className="divide-y divide-slate-100 p-2.5 max-h-72 overflow-y-auto">
                  {laundries.map((lnd) => {
                    const isActive = lnd.id === activeLaundryId;
                    return (
                      <div
                        key={lnd.id}
                        className={`p-3 rounded-xl flex items-center justify-between gap-2 transition ${
                          isActive ? 'bg-rose-50/80 border border-rose-200/60 shadow-2xs' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div
                          onClick={() => onSelectLaundry(lnd.id)}
                          className="flex-1 cursor-pointer truncate"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isActive && (
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            )}
                            <span className="font-bold text-xs text-slate-900 truncate">{lnd.namaLaundry}</span>
                            {isActive && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                          {lnd.alamat && (
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">{lnd.alamat}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => setEditingLaundry(lnd)}
                            className="p-2 rounded-xl text-slate-500 hover:text-[#800000] hover:bg-rose-50 transition cursor-pointer"
                            title="Edit Cabang"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {laundries.length > 1 && (
                            <button
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Hapus Cabang',
                                  message: `Yakin ingin menghapus cabang '${lnd.namaLaundry}'?`,
                                  confirmText: 'Hapus',
                                  isDestructive: true,
                                });
                                if (ok) {
                                  onDeleteLaundry(lnd.id);
                                  toast.success(`Cabang '${lnd.namaLaundry}' dihapus.`);
                                }
                              }}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              title="Hapus Cabang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Top Up Wallet Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100">
            <div className="bg-[#800000] text-white p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-xs flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  Isi Saldo Akun Owner
                </h3>
                <p className="text-[10px] text-white/80">Saldo untuk perpanjang masa aktif server & cabang</p>
              </div>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setCustomTopUp('');
                  setCopiedBank(null);
                }}
                className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold">Saldo Dompet Saat Ini:</span>
                  <div className="text-sm font-black text-slate-900">{formatRupiah(currentUser.walletBalance)}</div>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <span>Masa Aktif: </span>
                  <strong className={sisaHari > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {sisaHari > 0 ? `${sisaHari} Hari` : 'Kedaluwarsa'}
                  </strong>
                </div>
              </div>

              {/* 1. Pilih Nominal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 text-[11px]">1. Pilih Nominal Top Up</label>
                <div className="grid grid-cols-2 gap-2">
                  {[27000, 30000, 50000, 100000].map((nom) => {
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
                          {nom === 27000 ? 'Paket 1 Bln' : 'Top Up'}
                        </span>
                        <span className="text-xs font-black">{formatRupiah(nom)}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1">
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="Nominal kustom..."
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
                <label className="font-bold text-slate-800 text-[11px]">2. Transfer ke Rekening Resmi:</label>
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2 text-slate-700">
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[9px] font-black">BRI</span>
                        <span>4108 0100 8396 530</span>
                      </div>
                      <div className="text-[10px] text-slate-500">a/n Iqbal S nuha</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('410801008396530');
                        setCopiedBank('BRI');
                        setTimeout(() => setCopiedBank(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedBank === 'BRI' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>Salin</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200/80 shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[9px] font-black">DANA</span>
                        <span>0856 5978 1477</span>
                      </div>
                      <div className="text-[10px] text-slate-500">a/n Suci K Kusumah</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('085659781477');
                        setCopiedBank('DANA');
                        setTimeout(() => setCopiedBank(null), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedBank === 'DANA' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      <span>Salin</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Konfirmasi */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const nominalFinal = customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal;
                    const pesanWA = `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi top up saldo akun owner:\n• Nama: ${currentUser.displayName}\n• ID: ${currentUser.uid}\n• Nominal: ${formatRupiah(nominalFinal)}`;
                    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(pesanWA)}`, '_blank');
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>💬 Kirim Bukti ke WhatsApp Admin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const nominalFinal = customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal;
                    if (nominalFinal <= 0) return;
                    onTopUpWallet(nominalFinal);
                    setShowTopUpModal(false);
                    setCustomTopUp('');
                    toast.success(`Saldo ${formatRupiah(nominalFinal)} berhasil ditambahkan!`);
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] transition active:scale-95 cursor-pointer"
                >
                  ⚡ Tambah Saldo Instan Demo ({formatRupiah(customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-3.5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Tambah Cabang Laundry Baru</h3>
              <button onClick={() => setShowAddBranchModal(false)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Cabang *</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Contoh: Cabang Buahbatu"
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Cabang</label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Jl. Raya..."
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor WhatsApp Cabang</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Salin Layanan dari Cabang:</label>
                <select
                  value={copyLayananFrom}
                  onChange={(e) => setCopyLayananFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
                >
                  <option value="">Gunakan Layanan Default</option>
                  {laundries.map((l) => (
                    <option key={l.id} value={l.id}>Salin dari {l.namaLaundry}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddBranchSubmit}
                  className="flex-1 py-2.5 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Buat Cabang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editingLaundry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-3.5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Edit Data Cabang</h3>
              <button onClick={() => setEditingLaundry(null)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Laundry</label>
                <input
                  type="text"
                  value={editingLaundry.namaLaundry}
                  onChange={(e) => setEditingLaundry({ ...editingLaundry, namaLaundry: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Lengkap</label>
                <input
                  type="text"
                  value={editingLaundry.alamat || ''}
                  onChange={(e) => setEditingLaundry({ ...editingLaundry, alamat: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={editingLaundry.nomorTelepon || ''}
                  onChange={(e) => setEditingLaundry({ ...editingLaundry, nomorTelepon: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setEditingLaundry(null)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onUpdateLaundry(editingLaundry);
                    setEditingLaundry(null);
                    toast.success('Data cabang berhasil disimpan!');
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-100">
            <div className="bg-[#800000] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-xs tracking-wide">Riwayat Langganan & Top Up</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 text-xs">
              {subscriptionHistory.length === 0 ? (
                <p className="text-slate-400 italic text-center py-8">Belum ada riwayat transaksi.</p>
              ) : (
                subscriptionHistory.map((h) => (
                  <div key={h.id} className="py-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{h.packageName}</div>
                      <div className="text-[10px] text-slate-400">{formatDateIndo(h.purchaseDate, true)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600 text-xs">{formatRupiah(h.cost)}</div>
                      {h.newExpiryDate > 0 && (
                        <div className="text-[10px] text-slate-500">Aktif s/d: {formatDateIndo(h.newExpiryDate)}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Nama & Nomor Owner */}
      {showEditOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-5 space-y-3.5 border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#800000] flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Kelola Profil Owner</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditOwnerModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap Owner *</label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor HP / WhatsApp Owner</label>
                <input
                  type="tel"
                  value={editNomorTelepon}
                  onChange={(e) => setEditNomorTelepon(e.target.value)}
                  placeholder="08123456789"
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-500" />
                    <span>Email / No. WhatsApp Login (Terkunci)</span>
                  </label>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentUser.emailOrPhone || currentUser.nomorTelepon || '-'}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-200/80 border border-slate-300 text-[11px] font-bold text-slate-500 cursor-not-allowed select-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditOwnerModal(false)}
                  className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!editDisplayName.trim()) {
                      toast.warning('Nama Owner tidak boleh kosong.');
                      return;
                    }
                    if (onUpdateOwnerProfile) {
                      onUpdateOwnerProfile({
                        displayName: editDisplayName.trim(),
                        nomorTelepon: editNomorTelepon.trim() || null,
                      });
                    }
                    setShowEditOwnerModal(false);
                    toast.success('Profil owner berhasil diperbarui!');
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-md transition cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};