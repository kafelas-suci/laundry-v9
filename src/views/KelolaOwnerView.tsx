import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Building2,
  Clock,
  ChevronDown,
  Edit,
  Trash2,
  X,
  UserCheck,
  Crown,
  Zap,
  Wallet,
  Lock,
} from 'lucide-react';
import { User, Laundry, SubscriptionHistory } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { useToast, useConfirm } from '../components/NotificationContext';
import { getLaundryLimits } from '../utils/subscription';
import { TopUpModal } from '../components/TopUpModal';
import { MidtransVerifyResult, PaymentPurpose, buildWhatsAppAdminUrl } from '../services/midtransService';

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
  onTopUpWallet?: (nominal: number) => void;
  onExtendSubscription: (packageName: string, cost: number, days: number) => void;
  onMidtransSettled?: (result: MidtransVerifyResult) => void;
  onUpdateOwnerProfile?: (data: { displayName: string; nomorTelepon?: string | null }) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
  onOpenExpiredModal?: () => void;
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
  onExtendSubscription,
  onMidtransSettled,
  onUpdateOwnerProfile,
  onOpenUpgradeModal,
  onOpenExpiredModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [showBranches, setShowBranches] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpPurpose, setTopUpPurpose] = useState<PaymentPurpose>('topup_wallet');
  const [topUpMethod, setTopUpMethod] = useState<'midtrans' | 'manual'>('midtrans');
  const [selectedNominal, setSelectedNominal] = useState<number>(27000);
  const [showAddBranchModal, setShowAddBranchModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [showEditOwnerModal, setShowEditOwnerModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName || '');
  const [editNomorTelepon, setEditNomorTelepon] = useState(currentUser.nomorTelepon || '');

  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [copyLayananFrom, setCopyLayananFrom] = useState<string>('');

  const [editingLaundry, setEditingLaundry] = useState<Laundry | null>(null);

  const currentLimits = getLaundryLimits(currentUser.subscriptionType);
  const isNewcomer = currentLimits.tier === 'newcomer';
  const isPremium = currentLimits.tier === 'premium';
  const HARGA_Premium_BULANAN = 27000;

  const sisaHari = Math.max(
    0,
    Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const openPaymentModal = (
    purpose: PaymentPurpose,
    method: 'midtrans' | 'manual',
    nominal: number = HARGA_Premium_BULANAN
  ) => {
    setTopUpPurpose(purpose);
    setTopUpMethod(method);
    setSelectedNominal(nominal);
    setShowTopUpModal(true);
  };

  const handlePayBulanan = async () => {
    const cost = HARGA_Premium_BULANAN;
    const label = 'Paket Premium (30 Hari)';

    if (currentUser.walletBalance < cost) {
      toast.warning(`Saldo dompet tidak mencukupi (${formatRupiah(cost)}). Pilih Lewat Midtrans atau Transfer Biasa.`);
      openPaymentModal('extend_premium', 'midtrans', cost);
      return;
    }
    const ok = await confirm({
      title: `Perpanjang ${label}`,
      message: `Aktifkan ${label} seharga ${formatRupiah(cost)} dari saldo dompet Anda?`,
      confirmText: 'Potong Saldo & Aktifkan',
    });
    if (ok) {
      onExtendSubscription(`${label}`, cost, 30);
      toast.success(`Langganan ${label} berhasil diaktifkan!`);
    }
  };

  const handleAddBranchSubmit = async () => {
    if (!newBranchName.trim()) {
      toast.warning('Nama cabang laundry wajib diisi.');
      return;
    }

    const isExtraBranch = laundries.length >= 1;
    const EXTRA_COST = 25000;

    if (isExtraBranch) {
      if ((currentUser.walletBalance || 0) < EXTRA_COST) {
        toast.warning(
          `Saldo dompet tidak mencukupi (${formatRupiah(EXTRA_COST)}). Silakan isi saldo terlebih dahulu.`
        );
        setShowAddBranchModal(false);
        openPaymentModal('topup_wallet', 'midtrans', EXTRA_COST);
        return;
      }

      const confirmed = await confirm({
        title: 'Konfirmasi Aktivasi Cabang Baru',
        message: `Biaya aktivasi cabang '${newBranchName.trim()}' sebesar ${formatRupiah(EXTRA_COST)} akan dipotong dari saldo dompet Anda (${formatRupiah(currentUser.walletBalance)}). Lanjutkan?`,
        confirmText: 'Ya, Bayar & Buat Cabang',
        cancelText: 'Batal',
      });

      if (!confirmed) return;
    }

    onAddLaundry(
      newBranchName.trim(),
      newBranchAddress.trim() || undefined,
      newBranchPhone.trim() || undefined,
      copyLayananFrom || undefined
    );
    setShowAddBranchModal(false);
    setNewBranchName('');
    setNewBranchAddress('');
    setNewBranchPhone('');
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
          
       {/* KOLOM 1: DOMPET & LANGGANAN (Dominan Putih & Maroon) */}
          <div className="bg-white text-slate-800 rounded-2xl shadow-md overflow-hidden border border-slate-200 flex flex-col justify-between">
            <div>
              {/* Header Masa Aktif */}
              <div
                onClick={() => {
                  if (!isNewcomer && sisaHari <= 0 && onOpenExpiredModal) {
                    onOpenExpiredModal();
                  }
                }}
                className={`px-3.5 py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition ${
                  !isNewcomer && sisaHari <= 0
                    ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer text-white animate-pulse'
                    : 'bg-[#800000] text-white'
                }`}
                title={!isNewcomer && sisaHari <= 0 ? 'Masa langganan habis! Klik untuk buka halaman perpanjangan' : undefined}
              >
                <Clock className="w-3.5 h-3.5 text-white" />
                <span>
                  {isNewcomer
                    ? 'Masa Aktif: Paket Newcomer (Gratis Selamanya)'
                    : sisaHari > 0
                    ? `Masa Aktif: Aktif (${sisaHari} Hari Tersisa)`
                    : 'Masa Langganan Habis (0 Hari) - Klik untuk Perpanjang'}
                </span>
              </div>

              <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Saldo Dompet Akun</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight tabular-nums">
                    {formatRupiah(currentUser.walletBalance)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openPaymentModal('topup_wallet', 'midtrans', 27000)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Top Up Saldo</span>
                </button>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="p-3 rounded-xl bg-white border border-slate-200 transition text-xs shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">Paket Premium (30 Hari)</span>
                        {isPremium && (
                          <span className="text-[9px] bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-bold">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                        Tanpa batas kuota transaksi bulanan, Kasir beda HP, Penugasan Staf, Laporan Lengkap, Export Excel & PDF resmi.
                      </div>
                    </div>
                    <span className="font-black text-[#800000] text-sm font-mono tabular-nums shrink-0">
                      {formatRupiah(HARGA_Premium_BULANAN)}
                    </span>
                  </div>

                  {currentUser.walletBalance >= HARGA_Premium_BULANAN && (
                    <button
                      type="button"
                      onClick={handlePayBulanan}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 tabular-nums"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Perpanjang dari Saldo ({formatRupiah(HARGA_Premium_BULANAN)})</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => openPaymentModal('extend_premium', 'midtrans', HARGA_Premium_BULANAN)}
                      className="py-2.5 px-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-[11px] transition shadow-xs active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>Lewat Midtrans</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openPaymentModal('extend_premium', 'manual', HARGA_Premium_BULANAN)}
                      className="py-2.5 px-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-[11px] transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <span>Transfer Biasa</span>
                    </button>
                  </div>
                </div>

                {!isNewcomer && sisaHari <= 0 && onOpenExpiredModal && (
                  <button
                    type="button"
                    onClick={onOpenExpiredModal}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Layar Habis Hari Langganan</span>
                  </button>
                )}

                <div className="pt-0">
                  <button
                    type="button"
                    onClick={() => onOpenUpgradeModal?.()}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98 cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>Detail & Perbandingan Paket</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
              >
                <span>Riwayat Transaksi</span>
              </button>
              <a
                href={buildWhatsAppAdminUrl('Halo CS Kafelas Laundry, saya ingin konsultasi seputar akun owner.')}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
              >
                <span>Bantuan CS</span>
              </a>
            </div>
          </div>
          {/* KOLOM 2: DAFTAR CABANG LAUNDRY */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col justify-between">
            <div>
              <div className="bg-[#800000] text-white p-3.5 flex items-center justify-between shadow-inner">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white" />
                  <span className="font-bold text-xs tracking-wide">
                    ({laundries.length} Cabang)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddBranchModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                    title="Tambah cabang baru (Rp 25.000 per cabang)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cabang </span>
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
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {typeof lnd.namaLaundry === 'object' ? (lnd.namaLaundry as any)?.namaLaundry || "Kafela's Laundry" : (lnd.namaLaundry || "Kafela's Laundry")}
                            </span>
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

      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentUser={currentUser}
        onMidtransSettled={onMidtransSettled}
        sisaHari={sisaHari}
        initialPurpose={topUpPurpose}
        initialMethod={topUpMethod}
        initialNominal={selectedNominal}
      />

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

              {laundries.length >= 1 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Biaya Aktivasi Cabang:</span>
                    <span className="text-[#800000] font-black text-sm">Rp 25.000</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Saldo Dompet Owner:</span>
                    <span className={`font-bold ${currentUser.walletBalance >= 25000 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {formatRupiah(currentUser.walletBalance || 0)}
                    </span>
                  </div>
                  {currentUser.walletBalance < 25000 && (
                    <div className="text-[10px] text-red-600 pt-1 font-semibold flex items-center justify-between">
                      <span>Saldo Anda kurang.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddBranchModal(false);
                          setSelectedNominal(25000);
                          setShowTopUpModal(true);
                        }}
                        className="underline text-[#800000] font-bold cursor-pointer hover:text-red-800"
                      >
                        Isi Saldo Rp 25.000
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                  {laundries.length >= 1 ? 'Bayar Rp 25.000 & Buat' : 'Buat Cabang'}
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