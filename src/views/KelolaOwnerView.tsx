import React, { useState } from 'react';
import {
  ArrowLeft,
  Wallet,
  Plus,
  CreditCard,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  Video,
  ChevronDown,
  Edit,
  Trash2,
  X,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  AlertCircle,
  Sparkles,
  Lock,
  UserCheck
} from 'lucide-react';
import { User, Laundry, SubscriptionHistory } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { useToast, useConfirm } from '../components/NotificationContext';

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
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [showBranches, setShowBranches] = useState(true);
  const [harianDays, setHarianDays] = useState('7');
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

  const jumlahCabang = laundries.length;
  const cabangTambahan = Math.max(0, jumlahCabang - 1);

  // Pricing formula matching KelolaOwnerActivity.kt
  const HARGA_DASAR_BULANAN = 27000;
  const HARGA_CABANG_BULANAN = 20000;
  const totalBiayaBulanan = HARGA_DASAR_BULANAN + cabangTambahan * HARGA_CABANG_BULANAN;

  const HARGA_DASAR_HARIAN = 1000;
  const HARGA_CABANG_HARIAN = 500;
  const hargaHarianPerHari = HARGA_DASAR_HARIAN + cabangTambahan * HARGA_CABANG_HARIAN;

  const sisaHari = Math.max(
    0,
    Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const handlePayBulanan = async () => {
    if (currentUser.walletBalance < totalBiayaBulanan) {
      toast.warning(`Saldo dompet tidak mencukupi (${formatRupiah(totalBiayaBulanan)}). Silakan isi saldo terlebih dahulu.`);
      setShowTopUpModal(true);
      return;
    }
    const ok = await confirm({
      title: 'Beli Paket Bulanan',
      message: `Beli Paket Bulanan 30 Hari seharga ${formatRupiah(totalBiayaBulanan)}? Saldo dompet akan dipotong.`,
      confirmText: 'Beli Sekarang',
    });
    if (ok) {
      onExtendSubscription(`Paket Bulanan (${jumlahCabang} Cabang)`, totalBiayaBulanan, 30);
      toast.success('Perpanjangan langganan 30 hari berhasil!');
    }
  };

  const handlePayHarian = async () => {
    const days = parseInt(harianDays, 10);
    if (isNaN(days) || days <= 0) {
      toast.warning('Masukkan jumlah hari yang valid.');
      return;
    }
    const cost = hargaHarianPerHari * days;
    if (currentUser.walletBalance < cost) {
      toast.warning(`Saldo dompet tidak mencukupi (${formatRupiah(cost)}). Silakan isi saldo terlebih dahulu.`);
      setShowTopUpModal(true);
      return;
    }
    const ok = await confirm({
      title: 'Beli Paket Harian',
      message: `Beli Paket Harian ${days} Hari seharga ${formatRupiah(cost)}? Saldo dompet akan dipotong.`,
      confirmText: 'Beli Sekarang',
    });
    if (ok) {
      onExtendSubscription(`Paket Harian ${days} Hari (${jumlahCabang} Cabang)`, cost, days);
      toast.success(`Perpanjangan langganan ${days} hari berhasil!`);
    }
  };

  const handleAddBranchSubmit = () => {
    if (!newBranchName.trim()) {
      toast.warning('Nama cabang laundry wajib diisi.');
      return;
    }
    if (laundries.length >= 3) {
      toast.warning('Maksimal batas cabang untuk akun ini adalah 3 cabang.');
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
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-base tracking-wide">Owner & Kelola Cabang</h1>
      </header>

      <main className="flex-1 p-3 md:p-6 space-y-3 md:space-y-4 overflow-y-auto max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        {/* Owner Profile Banner Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#800000]" />
              <span>Profil Pemilik / Owner</span>
            </div>
            <h2 className="text-base font-black text-slate-900 mt-0.5 truncate">
              {currentUser.displayName}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
              <span className="flex items-center gap-1">
                📞 <strong>{currentUser.nomorTelepon || 'Nomor HP belum diatur'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Login: {currentUser.emailOrPhone || currentUser.nomorTelepon || '-'} (Terkunci)</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditDisplayName(currentUser.displayName || '');
              setEditNomorTelepon(currentUser.nomorTelepon || '');
              setShowEditOwnerModal(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Ganti Nama & Nomor</span>
          </button>
        </div>

        {/* 1. WALLET & SUBSCRIPTION CARD (Matches wallet card in activity_kelola_owner.xml) */}
        <div className="bg-[#1e293b] text-white rounded-2xl shadow-md overflow-hidden border border-slate-700">
          {/* Header Masa Aktif */}
          <div className="bg-[#800000] px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>Masa Aktif Akun: {sisaHari > 0 ? `Aktif (${sisaHari} Hari Tersisa)` : 'Kedaluwarsa'}</span>
          </div>

          {/* Saldo Akun & Tombol Ganti Nama / Top Up */}
          <div className="p-4 flex items-center justify-between border-b border-slate-700">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Saldo Dompet Akun</span>
              <span className="text-xl font-black text-white">{formatRupiah(currentUser.walletBalance)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditDisplayName(currentUser.displayName || '');
                  setEditNomorTelepon(currentUser.nomorTelepon || '');
                  setShowEditOwnerModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                title="Kelola ganti nama dan nomor telepon owner"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Ganti Nama/No</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTopUpModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs transition active:scale-95 cursor-pointer"
                title="Isi saldo akun owner"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Top Up</span>
              </button>
            </div>
          </div>

          {/* Perpanjangan Options */}
          <div className="p-1 space-y-3">
         

            {/* Bulanan */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700">
              <div>
                <div className="font-bold text-xs text-white">Bulanan (30 Hari)</div>
                <div className="text-[11px] text-slate-400">
                  {formatRupiah(totalBiayaBulanan)} ({jumlahCabang} Cabang)
                </div>
              </div>
              <button
                onClick={handlePayBulanan}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95"
              >
                Bayar
              </button>
            </div>

            {/* Harian */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-white">
                  Harian ({formatRupiah(hargaHarianPerHari)}/hari)
                </div>
                <div className="text-[11px] text-slate-400">Pilih durasi fleksibel</div>
              </div>
              <input
                type="number"
                min="1"
                value={harianDays}
                onChange={(e) => setHarianDays(e.target.value)}
                className="w-14 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-600 text-xs text-center font-bold text-white"
              />
              <button
                onClick={handlePayHarian}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 shrink-0"
              >
                Bayar
              </button>
            </div>
          </div>
        </div>

        {/* 2. DAFTAR CABANG LAUNDRY (Matches MaterialCardView in activity_kelola_owner.xml) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="bg-[#800000] text-white p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white" />
              <span className="font-bold text-xs">Daftar Cabang Laundry ({laundries.length}/3)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddBranchModal(true)}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold transition"
              >
                + Cabang
              </button>
              <button
                onClick={() => setShowBranches(!showBranches)}
                className="p-1 rounded-full hover:bg-white/20 transition"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showBranches ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showBranches && (
            <div className="divide-y divide-slate-100 p-2">
              {laundries.map((lnd) => {
                const isActive = lnd.id === activeLaundryId;
                return (
                  <div
                    key={lnd.id}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 transition ${
                      isActive ? 'bg-rose-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      onClick={() => onSelectLaundry(lnd.id)}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        )}
                        <span className="font-bold text-xs text-slate-900">{lnd.namaLaundry}</span>
                        {isActive && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                            Aktif
                          </span>
                        )}
                      </div>
                      {lnd.alamat && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{lnd.alamat}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingLaundry(lnd)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#800000] hover:bg-rose-50"
                        title="Edit Cabang"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {laundries.length > 1 && (
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Hapus Cabang',
                              message: `Yakin ingin menghapus cabang '${lnd.namaLaundry}'? Data layanan dan transaksi pada cabang ini akan terpengaruh.`,
                              confirmText: 'Ya, Hapus Cabang',
                              isDestructive: true,
                            });
                            if (ok) {
                              onDeleteLaundry(lnd.id);
                              toast.success(`Cabang '${lnd.namaLaundry}' berhasil dihapus.`);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
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

        {/* 3. FOOTER NAVIGATION (Riwayat, Bantuan CS, Tutorial) */}
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              📜 Riwayat Langganan
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
              className="py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
            >
              💬 Bantuan CS
            </button>
          </div>
        </div>
      </main>

      {/* Top Up Wallet Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#800000] text-white p-4 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Isi Saldo Akun Owner
                </h3>
                <p className="text-[11px] text-white/80 mt-0.5">
                  Saldo digunakan untuk perpanjang masa aktif server & cabang laundry
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTopUpModal(false);
                  setCustomTopUp('');
                  setCopiedBank(null);
                }}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* Saldo Saat Ini & Penjelasan */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Saldo Dompet Saat Ini:</span>
                  <div className="text-base font-black text-slate-900">{formatRupiah(currentUser.walletBalance)}</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>Masa Aktif: </span>
                  <strong className={sisaHari > 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                    {sisaHari > 0 ? `${sisaHari} Hari` : 'Kedaluwarsa'}
                  </strong>
                </div>
              </div>

              {/* 1. Pilih Nominal */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>1. Pilih Nominal Top Up</span>
                </label>
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
                        className={`p-2.5 rounded-xl border text-center transition font-bold ${
                          isSelected
                            ? 'border-[#800000] bg-rose-50/80 text-[#800000] ring-1 ring-[#800000]'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                        }`}
                      >
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {nom === 27000 ? 'Pas 1 Bln (1 Cabang)' : 'Top Up'}
                        </span>
                        <span className="text-xs font-black">{formatRupiah(nom)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Input Bebas */}
                <div className="pt-1.5">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      placeholder="Atau ketik nominal kustom (misal: 47000)..."
                      value={customTopUp}
                      onChange={(e) => {
                        setCustomTopUp(e.target.value);
                        const n = parseInt(e.target.value, 10);
                        if (!isNaN(n) && n > 0) setSelectedNominal(n);
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Tujuan Pembayaran */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    2. Tujuan Pembayaran (Transfer ke Rekening Resmi):
                  </label>
                </div>
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-slate-700">
                  <p className="text-[11px] text-slate-600">
                    Pembayaran langganan disetorkan kepada <strong>Admin / Pengembang Kafelas Laundry</strong> melalui:
                  </p>

                  {/* Rekening Bank BRI */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200/80">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black">BRI</span>
                        <span className="tracking-wide">4108 0100 8396 530</span>
                      </div>
                      <div className="text-[10px] text-slate-500">a/n Iqbal S nuha</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('410801008396530');
                        setCopiedBank('BRI');
                        setTimeout(() => setCopiedBank(null), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      {copiedBank === 'BRI' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* E-Wallet DANA */}
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-200/80">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-black">DANA</span>
                        <span className="tracking-wide">0856 5978 1477</span>
                      </div>
                      <div className="text-[10px] text-slate-500">a/n Suci K Kusumah</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('085659781477');
                        setCopiedBank('DANA');
                        setTimeout(() => setCopiedBank(null), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                    >
                      {copiedBank === 'DANA' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Salin No. DANA</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Cara Konfirmasi Pembayaran */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800">
                  3. Selesaikan Pembayaran:
                </label>

                {/* Tombol Utama: Kirim Bukti ke WhatsApp Admin */}
                <button
                  type="button"
                  onClick={() => {
                    const nominalFinal = customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal;
                    const pesanWA = `Halo Admin Kafelas Laundry,\nSaya ingin konfirmasi pembayaran langganan / top up saldo akun owner:\n• Nama: ${currentUser.displayName}\n• ID Akun: ${currentUser.uid}\n• Nominal: ${formatRupiah(nominalFinal)}\n• Metode: Transfer BRI (Iqbal S nuha) / DANA (Suci K Kusumah)\n• Cabang: ${laundries.map((l) => l.namaLaundry).join(', ')}\n\nBerikut saya lampirkan bukti transfernya. Mohon bantu verifikasi saldo akun saya. Terima kasih!`;
                    window.open(
                      `https://api.whatsapp.com/send?phone=6285659781477&text=${encodeURIComponent(pesanWA)}`,
                      '_blank'
                    );
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
                >
                  <span>💬 Kirim Bukti Transfer ke WhatsApp Admin ({formatRupiah(customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal)})</span>
                  <ExternalLink className="w-4 h-4" />
                </button>

                {/* Tombol Uji Coba / Sandbox Testing */}
                <div className="pt-2 border-t border-dashed border-slate-200">
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
                    <div className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Mode Uji Coba / Demo Developer:</strong> Ingin langsung menambah saldo untuk mengetes perpanjangan paket tanpa transfer riil?
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nominalFinal = customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal;
                        if (nominalFinal <= 0) {
                          toast.warning('Nominal harus lebih dari 0.');
                          return;
                        }
                        onTopUpWallet(nominalFinal);
                        setShowTopUpModal(false);
                        setCustomTopUp('');
                        toast.success(`Saldo ${formatRupiah(nominalFinal)} berhasil ditambahkan ke akun Anda!`);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] transition active:scale-95"
                    >
                      ⚡ Tambah Saldo Instan ({formatRupiah(customTopUp ? parseInt(customTopUp, 10) || selectedNominal : selectedNominal)})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Tambah Cabang Laundry Baru</h3>
              <button onClick={() => setShowAddBranchModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nama Cabang *
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Contoh: Cabang 3 Buahbatu"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Alamat Cabang
                </label>
                <input
                  type="text"
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Jl. Raya..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nomor WhatsApp Cabang
                </label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="0812..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Salin Daftar Layanan & Harga dari Cabang:
                </label>
                <select
                  value={copyLayananFrom}
                  onChange={(e) => setCopyLayananFrom(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
                >
                  <option value="">Gunakan Layanan Default Baru</option>
                  {laundries.map((l) => (
                    <option key={l.id} value={l.id}>
                      Salin dari {l.namaLaundry}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddBranchSubmit}
                  className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Edit Data Cabang</h3>
              <button onClick={() => setEditingLaundry(null)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nama Laundry
                </label>
                <input
                  type="text"
                  value={editingLaundry.namaLaundry}
                  onChange={(e) =>
                    setEditingLaundry({ ...editingLaundry, namaLaundry: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  value={editingLaundry.alamat || ''}
                  onChange={(e) =>
                    setEditingLaundry({ ...editingLaundry, alamat: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  value={editingLaundry.nomorTelepon || ''}
                  onChange={(e) =>
                    setEditingLaundry({ ...editingLaundry, nomorTelepon: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setEditingLaundry(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    onUpdateLaundry(editingLaundry);
                    setEditingLaundry(null);
                    toast.success('Data cabang berhasil disimpan!');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-[#800000] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Riwayat Langganan & Top Up</h3>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto divide-y divide-slate-100 text-xs">
              {subscriptionHistory.length === 0 ? (
                <p className="text-slate-400 italic text-center py-6">Belum ada riwayat transaksi langganan.</p>
              ) : (
                subscriptionHistory.map((h) => (
                  <div key={h.id} className="py-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-slate-900">{h.packageName}</div>
                      <div className="text-[10px] text-slate-400">{formatDateIndo(h.purchaseDate, true)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">{formatRupiah(h.cost)}</div>
                      {h.newExpiryDate > 0 && (
                        <div className="text-[10px] text-slate-500">
                          Aktif s/d: {formatDateIndo(h.newExpiryDate)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal Edit Nama & Nomor Owner (Login Terkunci Sesuai Permintaan Pengguna) */}
      {showEditOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#800000] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Kelola Profil Owner</h3>
                  <p className="text-[10px] text-slate-400">Ganti nama dan nomor telepon owner</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditOwnerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 1. Nama Owner */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap / Tampilan Owner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nama ini digunakan sebagai identitas penanggung jawab & di sistem.
                </span>
              </div>

              {/* 2. Nomor Telepon / WA Owner */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nomor HP / WhatsApp Owner
                </label>
                <input
                  type="tel"
                  value={editNomorTelepon}
                  onChange={(e) => setEditNomorTelepon(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Nomor kontak darurat dan konfirmasi WhatsApp.
                </span>
              </div>

              {/* 3. Kredensial Login (TERKUNCI / LOCKED 🔒) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email / No. WhatsApp Login (Terkunci)</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                    Terkunci
                  </span>
                </div>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={currentUser.emailOrPhone || currentUser.nomorTelepon || '-'}
                  className="w-full px-3 py-2 rounded-lg bg-slate-200/80 border border-slate-300 text-xs font-bold text-slate-500 cursor-not-allowed select-none"
                />
                <p className="text-[10px] text-slate-500 leading-tight pt-0.5">
                  🔒 Kredensial login dikunci secara permanen demi keamanan agar akses masuk akun Anda tetap aman dan tidak terputus.
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditOwnerModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
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
                    toast.success('Nama dan nomor owner berhasil diperbarui!');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
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
