import React, { useState } from 'react';
import {
  ArrowLeft,
  LogOut,
  Building2,
  Users,
  Tag,
  Receipt,
  Printer,
  Sliders,
  Upload,
  Trash2,
  X,
  Smartphone,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Calendar,
  CreditCard,
  Clock,
  Crown,
  Lock,
} from 'lucide-react';
import { SettingsData, User, Laundry } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { formatDateIndo, formatRupiah } from '../utils/formatters';
import { StorageService, defaultOwnerUser } from '../utils/storage';
import { useToast } from '../components/NotificationContext';
import { isProTier, normalizeTier, getLaundryLimits } from '../utils/subscription';
import {
  getSavedBluetoothPrinter,
  disconnectBluetoothPrinter,
  pairBluetoothPrinterDirectly,
} from '../utils/nativeBridge';
import { TopUpModal } from '../components/TopUpModal';

interface SettingsViewProps {
  onBack: () => void;
  settings: SettingsData;
  currentUser: User;
  activeLaundry: Laundry;
  currentTier?: string | null;
  onUpdateSettings: (newSettings: SettingsData) => void;
  onOpenKelolaPelanggan: () => void;
  onOpenKelolaLayanan: () => void;
  onOpenKelolaOwner: () => void;
  onOpenKelolaKasir: () => void;
  onOpenApkModal: () => void;
  onOpenUpgradeModal?: (reason?: string) => void;
  onTopUpWallet?: (nominal: number) => void;
  onUpdateOwnerProfile?: (data: { displayName: string; nomorTelepon?: string | null }) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  settings,
  currentUser,
  activeLaundry,
  currentTier,
  onUpdateSettings,
  onOpenKelolaPelanggan,
  onOpenKelolaLayanan,
  onOpenKelolaOwner,
  onOpenKelolaKasir,
  onOpenApkModal,
  onOpenUpgradeModal,
  onTopUpWallet,
  onUpdateOwnerProfile,
  onLogout,
}) => {
  const toast = useToast();
  const isOwner = currentUser.role === 'owner';

  // Perhitungan Sisa Masa Aktif Langganan
  const ownerUser = StorageService.get<User[]>('users', []).find((u) => u.role === 'owner') || defaultOwnerUser;
  const effectiveEndDate =
    currentUser.subscriptionEndDate ||
    (currentUser.role !== 'owner' ? ownerUser?.subscriptionEndDate : undefined) ||
    defaultOwnerUser.subscriptionEndDate ||
    Date.now();

  const sisaHari = Math.max(
    0,
    Math.ceil((effectiveEndDate - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const tanggalBerakhirStr = formatDateIndo(effectiveEndDate);

  // Sub-dialog states
  const [showInfoStrukModal, setShowInfoStrukModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showFeatureSettingsModal, setShowFeatureSettingsModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [showEditOwnerModal, setShowEditOwnerModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName || '');
  const [editNomorTelepon, setEditNomorTelepon] = useState(currentUser.nomorTelepon || '');

  // Edit receipt info state
  const [headerStruk, setHeaderStruk] = useState(settings.headerStruk);
  const [address, setAddress] = useState(settings.address);
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber);
  const [footerStruk, setFooterStruk] = useState(settings.footerStruk);
  const [chattyFooter, setChattyFooter] = useState(settings.chattyFooter);
  const [useLogo, setUseLogo] = useState(settings.useLogo);
  const [logoPath, setLogoPath] = useState<string | null>(settings.logoPath);

  // Printer name & auto-reconnect state
  const [printerName, setPrinterName] = useState(settings.printerName);
  const [savedBtPrinter, setSavedBtPrinter] = useState<string | null>(() => getSavedBluetoothPrinter().name);

  const handleDisconnectBluetooth = () => {
    disconnectBluetoothPrinter();
    setSavedBtPrinter(null);
    toast.success('Sandingan printer Bluetooth berhasil diputus!');
  };

  const handlePairBluetooth = async () => {
    const res = await pairBluetoothPrinterDirectly();
    if (res.success && res.printerName) {
      setSavedBtPrinter(res.printerName);
      setPrinterName(res.printerName);
      onUpdateSettings({
        ...settings,
        printerName: res.printerName,
      });
      toast.success(res.message);
    } else if (res.message && !res.message.includes('dibatalkan')) {
      toast.warning(res.message);
    }
  };

  // Toggle Features State
  const [pemasukanManual, setPemasukanManual] = useState(settings.pemasukanManualEnabled);
  const [estimasiPerItem, setEstimasiPerItem] = useState(settings.estimasiDisplayMode === 0);
  const [waNotification, setWaNotification] = useState(settings.waNotificationEnabled);
  const [selesaikanOtomatis, setSelesaikanOtomatis] = useState(settings.selesaikanSaatDitugaskan);
  const [ambilTanpaSelesai, setAmbilTanpaSelesai] = useState(settings.pengambilanTanpaSelesai);

  const handleSaveInfoStruk = () => {
    onUpdateSettings({
      ...settings,
      headerStruk,
      address,
      phoneNumber,
      footerStruk,
      chattyFooter,
      useLogo,
      logoPath,
    });
    setShowInfoStrukModal(false);
    toast.success('Informasi struk berhasil disimpan!');
  };

  const handleSavePrinter = () => {
    if (!printerName.trim()) {
      toast.warning('Nama printer tidak boleh kosong.');
      return;
    }
    onUpdateSettings({
      ...settings,
      printerName: printerName.trim(),
    });
    setShowPrinterModal(false);
    toast.success('Pengaturan printer berhasil disimpan!');
  };

  const handleSaveFeatureSettings = () => {
    onUpdateSettings({
      ...settings,
      pemasukanManualEnabled: pemasukanManual,
      estimasiDisplayMode: estimasiPerItem ? 0 : 1,
      waNotificationEnabled: waNotification,
      selesaikanSaatDitugaskan: selesaikanOtomatis,
      pengambilanTanpaSelesai: ambilTanpaSelesai,
      poinSystemEnabled: false,
    });
    setShowFeatureSettingsModal(false);
    toast.success('Pengaturan fitur aplikasi berhasil disimpan!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const limits = getLaundryLimits(currentTier);
    if (!limits.canUseCustomLogoOnReceipt) {
      toast.warning('Fitur upload logo toko di struk hanya untuk Paket Basic / Pro.');
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setLogoPath(reader.result as string);
        setUseLogo(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* 1. APP BAR HEADER (Maroon) */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-xl hover:bg-white/10 active:scale-95 transition"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="font-bold text-base tracking-wide">Pengaturan Laundry</h1>
          </div>
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(true)}
            title="Keluar Akun"
            className="p-1.5 rounded-xl hover:bg-white/10 transition text-rose-200 hover:text-white flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN SCROLL CONTAINER */}
      <main className="flex-1 p-3.5 sm:p-5 space-y-4 overflow-y-auto max-w-xl md:max-w-2xl mx-auto w-full">
   {/* KARTU RINGKAS PROFIL OWNER, SALDO & KELOLA LANGGANAN */}
{/* KARTU RINGKAS PROFIL OWNER, SALDO & KELOLA LANGGANAN */}
        {(() => {
          const limits = getLaundryLimits(currentTier || currentUser.subscriptionType);
          const isNewcomer = limits.tier === 'newcomer';

          return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5">
              {/* Profil Header Compact */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#800000] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                    {(currentUser.displayName || 'O').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-extrabold text-xs text-slate-900 truncate">
                        {currentUser.displayName || 'Owner Laundry'}
                      </h2>
                      <span
                        className={`px-1.5 py-0.2 rounded-md border text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          isNewcomer
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border-sky-300'
                        }`}
                      >
                        {limits.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                      {currentUser.role === 'owner' ? 'Owner Utama' : 'Kasir Cabang'} • {currentUser.emailOrPhone || currentUser.nomorTelepon || activeLaundry.namaLaundry}
                    </p>
                  </div>
                </div>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditDisplayName(currentUser.displayName || '');
                      setEditNomorTelepon(currentUser.nomorTelepon || '');
                      setShowEditOwnerModal(true);
                    }}
                    className="py-1 px-2.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-[10px] shrink-0 transition active:scale-95 cursor-pointer"
                  >
                    Edit Profil
                  </button>
                )}
              </div>

              {/* Strip Saldo Berani & Terhubung ke Tombol */}
              <div className="border-t border-slate-100 pt-0 flex items-center justify-between gap-2">
                {/* Badge Saldo Mencolok */}
                <div className="flex items-center gap-2 bg-[#800000]/5 border border-[#800000]/20 px-3 py-1.5 rounded-xl min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#800000]/70 shrink-0">
                    Saldo
                  </span>
                  <div className="h-3.5 w-px bg-[#800000]/20 shrink-0" />
                  <span className="text-base sm:text-lg font-black text-[#800000] font-mono tracking-tight tabular-nums truncate">
                    {formatRupiah(currentUser.walletBalance || 0)}
                  </span>
                </div>

                {/* Tombol Aksi Tambah Saldo Langsung */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => setShowTopUpModal(true)}
                    title="Isi Saldo Akun Owner Langsung"
                    className="h-9 px-3.5 rounded-xl bg-[#800000] hover:bg-[#660000] active:bg-[#4d0000] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-[#800000]/20 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>(+) Isi Saldo</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* SECTION 1: MANAJEMEN OUTLET & KASIR (Owner Only) */}
        {isOwner && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
              Manajemen Outlet & Kasir
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
              <button
                type="button"
                onClick={onOpenKelolaOwner}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#800000] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">Profil & Kelola Cabang</div>
                    <div className="text-[11px] text-slate-500 truncate">Tambah outlet baru, alamat, dan langganan</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>

              <button
                type="button"
                onClick={onOpenKelolaKasir}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">Kelola Akun Kasir</div>
                    <div className="text-[11px] text-slate-500 truncate">Tambah staf, ubah PIN, dan hak akses cabang</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: MASTER DATA LAUNDRY */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Master Data Laundry
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={onOpenKelolaPelanggan}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Data Pelanggan</div>
                  <div className="text-[11px] text-slate-500 truncate">Buku kontak konsumen, nomor WA & alamat</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>

            <button
              type="button"
              onClick={onOpenKelolaLayanan}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Daftar Harga Layanan</div>
                  <div className="text-[11px] text-slate-500 truncate">Kiloan, satuan, durasi kerja, dan tarif jasa</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* SECTION 3: STRUK & PRINTER BLUETOOTH */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Struk & Printer
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInfoStrukModal(true)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Identitas & Logo Struk</div>
                  <div className="text-[11px] text-slate-500 truncate">Nama toko, catatan kaki, alamat & logo nota cetak</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>

            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                  <Printer className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Printer Bluetooth Thermal</div>
                  <div className="text-[11px] text-slate-500 truncate">Perangkat aktif: {printerName || 'RPP02N'}</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* SECTION 4: PENGATURAN FITUR SISTEM */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Fitur & Kebijakan Toko
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFeatureSettingsModal(true)}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900">Pengaturan Fitur & Kebijakan</div>
                  <div className="text-[11px] text-slate-500 truncate">Notifikasi WA, kas manual, dan alur nota</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </button>
          </div>
        </div>

   

        {/* SECTION 6: KELUAR DARI AKUN (LOGOUT) */}
        <div className="pt-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirmModal(true)}
            className="w-full p-3.5 rounded-2xl bg-white border border-rose-200/80 hover:bg-rose-50/70 text-rose-700 shadow-2xs flex items-center justify-between transition active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-extrabold text-rose-700 text-xs">Keluar dari Akun (Logout)</div>
                <div className="text-[11px] text-rose-500 font-normal">Selesaikan sesi kerja dan kembali ke halaman login</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
          </button>
        </div>
      </main>

      {/* MODAL 1: IDENTITAS STRUK */}
      {showInfoStrukModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Identitas & Logo Struk</h3>
              <button onClick={() => setShowInfoStrukModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logo Section */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2 text-center">
              <label className="flex items-center justify-center gap-2 text-xs font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLogo}
                  onChange={(e) => {
                    const limits = getLaundryLimits(currentTier);
                    if (e.target.checked && !limits.canUseCustomLogoOnReceipt) {
                      toast.warning('Fitur kustomisasi logo toko di struk hanya untuk Paket Basic / Pro.');
                      return;
                    }
                    setUseLogo(e.target.checked);
                  }}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span>Gunakan Logo di Struk</span>
              </label>

              {useLogo && (
                <div className="space-y-2">
                  {logoPath ? (
                    <div className="relative inline-block border p-1 rounded-lg bg-white">
                      <img src={logoPath} alt="Logo" className="h-16 w-auto max-w-[140px] object-contain" />
                      <button
                        onClick={() => setLogoPath(null)}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 rounded-xl p-3 block cursor-pointer hover:bg-slate-100 transition">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-500 font-semibold">Pilih Gambar Logo Toko</span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Laundry (Header Struk)
              </label>
              <input
                type="text"
                value={headerStruk}
                onChange={(e) => setHeaderStruk(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Alamat Lengkap
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nomor Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Catatan Syarat & Ketentuan Bawah Struk
              </label>
              <textarea
                rows={2}
                value={footerStruk}
                onChange={(e) => setFooterStruk(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Pesan Penutup Struk
              </label>
              <input
                type="text"
                value={chattyFooter}
                onChange={(e) => setChattyFooter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowInfoStrukModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSaveInfoStruk}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTER BLUETOOTH */}
      {showPrinterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Atur Printer Bluetooth</h3>
              <button onClick={() => setShowPrinterModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Sandingan Otomatis Aktif (Zero-Prompt) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600">Sandingan Otomatis (Zero-Prompt)</span>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Struk langsung dicetak ke printer tersimpan tanpa membuka pop-up berulang kali. Jika printer mati, sistem akan otomatis membuka dialog pencarian baru.
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                <div className="text-xs font-semibold text-slate-800 truncate mr-2">
                  Tersimpan: <strong className="text-[#800000]">{savedBtPrinter || printerName || 'RPP02N'}</strong>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handlePairBluetooth}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold transition"
                  >
                    Ganti
                  </button>
                  {savedBtPrinter && (
                    <button
                      type="button"
                      onClick={handleDisconnectBluetooth}
                      className="px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition"
                    >
                      Putus
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Bluetooth Printer (APK / Fallback)
              </label>
              <input
                type="text"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                placeholder="Contoh: RPP02N atau PT-210"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPrinterName('RPP02N')}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset Default
              </button>
              <button
                onClick={handleSavePrinter}
                className="flex-1 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PENGATURAN FITUR (Matches activity_struk_settings.xml) */}
      {showFeatureSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Pengaturan Fitur Aplikasi</h3>
              <button onClick={() => setShowFeatureSettingsModal(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pemasukanManual}
                  onChange={(e) => setPemasukanManual(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span className="font-bold text-slate-800">● Aktifkan Catat Pemasukan Manual</span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={estimasiPerItem}
                  onChange={(e) => setEstimasiPerItem(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span className="font-bold text-slate-800">
                  ● Tampilkan estimasi selesai pada setiap item layanan
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={waNotification}
                  onChange={(e) => setWaNotification(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span className="font-bold text-slate-800">
                  ● Konfirmasi kirim pesan WhatsApp saat cucian selesai
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selesaikanOtomatis}
                  onChange={(e) => setSelesaikanOtomatis(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span className="font-bold text-slate-800">
                  ● Selesaikan status pengerjaan otomatis saat ditugaskan
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ambilTanpaSelesai}
                  onChange={(e) => setAmbilTanpaSelesai(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span className="font-bold text-slate-800">
                  ● Izinkan ambil cucian tanpa menunggu status selesai
                </span>
              </label>

            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowFeatureSettingsModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveFeatureSettings}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs active:scale-95 transition"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PROFIL OWNER - dibuka dari tombol Langganan */}
      {showEditOwnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Edit Profil Owner</h3>
              <button
                type="button"
                onClick={() => setShowEditOwnerModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Owner
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                placeholder="Masukkan nama owner"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nomor Telepon
              </label>
              <input
                type="tel"
                value={editNomorTelepon}
                onChange={(e) => setEditNomorTelepon(e.target.value)}
                placeholder="Masukkan nomor telepon"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]"
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Email atau nomor untuk login tidak diubah dari menu ini.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowEditOwnerModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
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
                  if (!onUpdateOwnerProfile) {
                    toast.warning('Fungsi simpan profil belum dihubungkan di komponen induk.');
                    return;
                  }
                  onUpdateOwnerProfile({
                    displayName: editDisplayName.trim(),
                    nomorTelepon: editNomorTelepon.trim() || null,
                  });
                  setShowEditOwnerModal(false);
                  toast.success('Permintaan pembaruan profil berhasil dikirim.');
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs"
              >
                Simpan Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: KONFIRMASI LOGOUT */}
      {showLogoutConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900">Keluar dari Akun?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin keluar dari akun? Anda perlu memasukkan email & kata sandi untuk masuk kembali.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 active:scale-95 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirmModal(false);
                  onLogout();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL ISI SALDO AKUN OWNER */}
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentUser={currentUser}
        onTopUpWallet={(nominal) => {
          if (onTopUpWallet) {
            onTopUpWallet(nominal);
          } else {
            toast.success(`Saldo ${formatRupiah(nominal)} berhasil ditambahkan!`);
          }
        }}
        sisaHari={sisaHari}
      />
    </div>
  );
};
