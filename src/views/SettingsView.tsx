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
} from 'lucide-react';
import { SettingsData, User, Laundry } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { formatDateIndo } from '../utils/formatters';
import { StorageService, defaultOwnerUser } from '../utils/storage';

interface SettingsViewProps {
  onBack: () => void;
  settings: SettingsData;
  currentUser: User;
  activeLaundry: Laundry;
  onUpdateSettings: (newSettings: SettingsData) => void;
  onOpenKelolaPelanggan: () => void;
  onOpenKelolaLayanan: () => void;
  onOpenKelolaOwner: () => void;
  onOpenKelolaKasir: () => void;
  onOpenApkModal: () => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  settings,
  currentUser,
  activeLaundry,
  onUpdateSettings,
  onOpenKelolaPelanggan,
  onOpenKelolaLayanan,
  onOpenKelolaOwner,
  onOpenKelolaKasir,
  onOpenApkModal,
  onLogout,
}) => {
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

  // Edit receipt info state
  const [headerStruk, setHeaderStruk] = useState(settings.headerStruk);
  const [address, setAddress] = useState(settings.address);
  const [phoneNumber, setPhoneNumber] = useState(settings.phoneNumber);
  const [footerStruk, setFooterStruk] = useState(settings.footerStruk);
  const [chattyFooter, setChattyFooter] = useState(settings.chattyFooter);
  const [useLogo, setUseLogo] = useState(settings.useLogo);
  const [logoPath, setLogoPath] = useState<string | null>(settings.logoPath);

  // Printer name
  const [printerName, setPrinterName] = useState(settings.printerName);

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
    alert('Informasi struk berhasil disimpan!');
  };

  const handleSavePrinter = () => {
    if (!printerName.trim()) {
      alert('Nama printer tidak boleh kosong.');
      return;
    }
    onUpdateSettings({
      ...settings,
      printerName: printerName.trim(),
    });
    setShowPrinterModal(false);
    alert('Pengaturan printer berhasil disimpan!');
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
    alert('Pengaturan fitur aplikasi berhasil disimpan!');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        {/* Brand Profile & Subscription Banner */}
        <div className="bg-gradient-to-br from-[#800000] to-[#590000] text-white rounded-2xl p-4 shadow-sm space-y-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black truncate">{activeLaundry.namaLaundry}</span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                  sisaHari > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                    : 'bg-rose-500/30 text-rose-200 border-rose-400/30'
                }`}>
                  <ShieldCheck className="w-3 h-3 text-emerald-300" />
                  {sisaHari > 0 ? 'Aktif' : 'Habis'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5 truncate">
                {currentUser.role === 'owner' ? 'Owner' : 'Kasir'}: {currentUser.displayName || 'Pengguna'} • {activeLaundry.nomorTelepon || settings.phoneNumber || 'Tanpa No. HP'}
              </p>
            </div>
            {isOwner && (
              <button
                type="button"
                onClick={onOpenKelolaOwner}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-xs shrink-0 transition active:scale-95 cursor-pointer"
              >
                Langganan
              </button>
            )}
          </div>

        
        </div>

        {/* KARTU RINCIAN SISA MASA AKTIF LANGGANAN */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Status Paket & Masa Aktif</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#800000] border border-rose-200 text-[10px] font-bold capitalize">
              {currentUser.subscriptionType || 'Paket Bulanan'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Sisa Langganan
                </span>
                <div className="text-xl font-black text-[#800000] mt-0.5">
                  {sisaHari} <span className="text-xs font-bold text-slate-600">Hari</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>{sisaHari > 5 ? 'Masa aktif normal' : sisaHari > 0 ? 'Mendekati habis' : 'Kedaluwarsa'}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                  Berlaku Sampai
                </span>
                <div className="text-xs font-bold text-slate-800 mt-1 leading-snug">
                  {tanggalBerakhirStr}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Pukul 23:59 WIB
              </div>
            </div>
          </div>

          {isOwner ? (
            <button
              type="button"
              onClick={onOpenKelolaOwner}
              className="w-full py-2.5 px-3 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition active:scale-98 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Perpanjang / Kelola Paket Langganan</span>
            </button>
          ) : (
            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-center">
              Perpanjangan masa aktif hanya dapat dilakukan oleh akun Owner.
            </div>
          )}
        </div>

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

        {/* SECTION 5: INSTALASI APLIKASI */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Instalasi & Aplikasi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <PWAInstallButton variant="standalone" className="w-full !rounded-2xl" />
            <button
              type="button"
              onClick={onOpenApkModal}
              className="p-3 rounded-2xl bg-white border border-slate-200/90 hover:bg-slate-50 shadow-2xs text-xs font-bold text-slate-800 transition flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-500" />
                <span>Panduan APK / TWA</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* SECTION 6: KELUAR DARI AKUN (LOGOUT) */}
        <div className="pt-2">
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
                  onChange={(e) => setUseLogo(e.target.checked)}
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

            <p className="text-xs text-slate-500">
              Masukkan nama perangkat printer thermal bluetooth Anda (Contoh standar: <strong>RPP02N</strong> atau <strong>PT-210</strong>).
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Bluetooth Printer
              </label>
              <input
                type="text"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
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
    </div>
  );
};
