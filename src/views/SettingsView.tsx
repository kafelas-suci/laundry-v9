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
  Plus,
  Globe,
  ExternalLink,
  HelpCircle,
  Cloud,
  RefreshCw,
  CheckCircle2,
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
import { MidtransVerifyResult } from '../services/midtransService';
import { CloudBackupModal } from '../components/CloudBackupModal';
import {
  checkAppUpdateManually,
  applyAppUpdate,
  subscribePwaUpdate,
} from '../utils/pwaUpdater';

interface SettingsViewProps {
  onBack: () => void;
  settings: SettingsData;
  currentUser: User;
  activeLaundry: Laundry;
  currentTier?: string | null;
  onUpdateSettings: (newSettings: SettingsData) => Promise<void> | void;
  onUpdateLaundry?: (laundry: Laundry) => void;
  onOpenKelolaPelanggan: () => void;
  onOpenKelolaLayanan: () => void;
  onOpenKelolaOwner: () => void;
  onOpenKelolaKasir: () => void;
  onOpenApkModal: () => void;
  onOpenUpgradeModal?: (reason?: string) => void;
  onTopUpWallet?: (nominal: number) => void;
  onMidtransSettled?: (result: MidtransVerifyResult) => void;
  onUpdateOwnerProfile?: (data: { displayName: string; nomorTelepon?: string | null }) => void;
  onStartTour?: () => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  settings,
  currentUser,
  activeLaundry,
  currentTier,
  onUpdateSettings,
  onUpdateLaundry,
  onOpenKelolaPelanggan,
  onOpenKelolaLayanan,
  onOpenKelolaOwner,
  onOpenKelolaKasir,
  onOpenApkModal,
  onOpenUpgradeModal,
  onMidtransSettled,
  onUpdateOwnerProfile,
  onStartTour,
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
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(currentUser.displayName || '');
  const [editNomorTelepon, setEditNomorTelepon] = useState(currentUser.nomorTelepon || '');

  // State pemeriksaan & penerapan pembaruan aplikasi
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [lastUpdateCheckInfo, setLastUpdateCheckInfo] = useState<string | null>(null);

  React.useEffect(() => {
    return subscribePwaUpdate((needRefresh) => {
      setHasUpdateAvailable(needRefresh);
    });
  }, []);

  const handleCheckAndApplyUpdate = async () => {
    if (isCheckingUpdate || isApplyingUpdate) return;

    // Jika sebelumnya sudah terdeteksi ada pembaruan menunggu, langsung perbarui
    if (hasUpdateAvailable) {
      setIsApplyingUpdate(true);
      toast.info('Memperbarui aplikasi ke versi terbaru...');
      await applyAppUpdate();
      return;
    }

    setIsCheckingUpdate(true);
    try {
      const result = await checkAppUpdateManually();
      const jamSekarang = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      });

      if (result.hasUpdate) {
        setHasUpdateAvailable(true);
        setIsCheckingUpdate(false);
        setIsApplyingUpdate(true);
        toast.success(result.message);
        await applyAppUpdate();
        return;
      }

      if (result.status === 'offline' || result.status === 'error') {
        toast.warning(result.message);
        setLastUpdateCheckInfo(`Gagal cek (${jamSekarang}) • Periksa koneksi internet`);
      } else {
        toast.success(result.message);
        setLastUpdateCheckInfo(`Terakhir dicek pukul ${jamSekarang} • Sudah versi terbaru`);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const cleanPlaceholderVal = (val?: string | null): string => {
    if (!val) return '';
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed === '0812-3456-7890') return '';
    return trimmed;
  };

  // Edit receipt info state (Tersinkron 1 Pintu dengan Profil Outlet Cabang Aktif)
  const [headerStruk, setHeaderStruk] = useState(
    cleanPlaceholderVal(activeLaundry?.namaLaundry) || cleanPlaceholderVal(settings.headerStruk) || ''
  );
  const [address, setAddress] = useState(
    cleanPlaceholderVal(activeLaundry?.alamat) || cleanPlaceholderVal(settings.address)
  );
  const [phoneNumber, setPhoneNumber] = useState(
    cleanPlaceholderVal(activeLaundry?.nomorTelepon) || cleanPlaceholderVal(settings.phoneNumber)
  );
  const [footerStruk, setFooterStruk] = useState(settings.footerStruk ?? '');
  const [chattyFooter, setChattyFooter] = useState(settings.chattyFooter ?? '');
  const [useLogo, setUseLogo] = useState(Boolean(settings.useLogo && settings.logoPath));
  const [logoPath, setLogoPath] = useState<string | null>(settings.logoPath || null);
  const [logoSize, setLogoSize] = useState<'kecil' | 'sedang' | 'besar'>(settings.logoSize || 'sedang');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingStruk, setIsSavingStruk] = useState(false);

  const syncInfoStrukFromProps = React.useCallback(() => {
    setHeaderStruk(
      cleanPlaceholderVal(activeLaundry?.namaLaundry) || cleanPlaceholderVal(settings.headerStruk) || ''
    );
    setAddress(
      cleanPlaceholderVal(activeLaundry?.alamat) || cleanPlaceholderVal(settings.address)
    );
    setPhoneNumber(
      cleanPlaceholderVal(activeLaundry?.nomorTelepon) || cleanPlaceholderVal(settings.phoneNumber)
    );
    setFooterStruk(settings.footerStruk ?? '');
    setChattyFooter(settings.chattyFooter ?? '');
    setUseLogo(Boolean(settings.useLogo && settings.logoPath));
    setLogoPath(settings.logoPath || null);
    setLogoSize(settings.logoSize || 'sedang');
  }, [
    activeLaundry?.namaLaundry,
    activeLaundry?.alamat,
    activeLaundry?.nomorTelepon,
    settings.headerStruk,
    settings.address,
    settings.phoneNumber,
    settings.footerStruk,
    settings.chattyFooter,
    settings.useLogo,
    settings.logoPath,
    settings.logoSize,
  ]);

  // Perbarui nilai form bila cabang aktif atau settings berganti (hanya saat modal tidak sedang diedit)
  React.useEffect(() => {
    if (showInfoStrukModal) return;
    syncInfoStrukFromProps();
  }, [activeLaundry?.id, syncInfoStrukFromProps, showInfoStrukModal]);

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

  // Toggle Features State (Hanya fitur yang benar-benar aktif & berdampak)
  const [waNotification, setWaNotification] = useState(settings.waNotificationEnabled ?? true);
  const [selesaikanOtomatis, setSelesaikanOtomatis] = useState(settings.selesaikanSaatDitugaskan ?? true);
  const [tampilkanAmbilNotaLama, setTampilkanAmbilNotaLama] = useState(settings.tampilkanTombolAmbilNotaLama ?? true);
  const [hitungKerjaStaf, setHitungKerjaStaf] = useState(settings.hitungKerjaStaf ?? true);

  const handleSaveInfoStruk = async () => {
    const cleanHeader = headerStruk.trim();
    if (!cleanHeader) {
      toast.warning('Nama laundry / header struk tidak boleh kosong.');
      return;
    }
    if (isUploadingLogo) {
      toast.warning('Mohon tunggu proses pemrosesan gambar logo selesai.');
      return;
    }

    const cleanAddress = address.trim();
    const cleanPhone = phoneNumber.trim();
    const cleanFooter = footerStruk.trim();
    const cleanChatty = chattyFooter.trim();
    const finalLogoPath = logoPath && logoPath.trim() ? logoPath.trim() : null;
    const finalUseLogo = Boolean(useLogo && finalLogoPath);

    setIsSavingStruk(true);
    try {
      await onUpdateSettings({
        ...settings,
        headerStruk: cleanHeader,
        appTitle: cleanHeader,
        address: cleanAddress,
        phoneNumber: cleanPhone,
        footerStruk: cleanFooter,
        chattyFooter: cleanChatty,
        useLogo: finalUseLogo,
        logoPath: finalLogoPath,
        logoSize,
      });
      setShowInfoStrukModal(false);
      toast.success('Pengaturan identitas & logo struk berhasil disimpan!');
    } catch (err) {
      console.error('Gagal menyimpan pengaturan struk:', err);
      toast.error('Gagal menyimpan pengaturan ke cloud, perubahan tetap tersimpan di perangkat.');
    } finally {
      setIsSavingStruk(false);
    }
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
      pemasukanManualEnabled: true,
      estimasiDisplayMode: 0,
      pengambilanTanpaSelesai: true,
      waNotificationEnabled: waNotification,
      selesaikanSaatDitugaskan: selesaikanOtomatis,
      tampilkanTombolAmbilNotaLama: tampilkanAmbilNotaLama,
      hitungKerjaStaf: hitungKerjaStaf,
      poinSystemEnabled: false,
    });
    StorageService.set('has_customized_settings', true);
    setShowFeatureSettingsModal(false);
    toast.success('Pengaturan fitur aplikasi berhasil disimpan!');
  };

  const compressLogoFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 260;
          let w = img.naturalWidth || img.width || 200;
          let h = img.naturalHeight || img.height || 200;
          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.max(1, Math.round((h * maxDim) / w));
              w = maxDim;
            } else {
              w = Math.max(1, Math.round((w * maxDim) / h));
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Canvas context tidak tersedia'));
            return;
          }
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let dataUrl = canvas.toDataURL('image/png');
          // Jika PNG masih di atas ~180KB (misal foto kompleks), kompres ke JPEG latar putih agar hemat & aman di Firestore
          if (dataUrl.length > 240_000) {
            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          }
          URL.revokeObjectURL(objectUrl);
          resolve(dataUrl);
        } catch (err) {
          URL.revokeObjectURL(objectUrl);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Gagal membaca file gambar'));
      };
      img.src = objectUrl;
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset input agar memilih file yang sama kembali tetap memicu onChange
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('Pilih file gambar yang valid (PNG, JPG, atau WEBP).');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const compressedDataUrl = await compressLogoFile(file);
      setLogoPath(compressedDataUrl);
      setUseLogo(true);
    } catch (err) {
      console.error('Logo upload compression error:', err);
      toast.error('Gagal memproses gambar logo. Silakan coba gambar lain.');
    } finally {
      setIsUploadingLogo(false);
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-2 space-y-1">
<div className="flex items-center justify-between gap-2">
  <div className="flex items-center gap-2.5 min-w-0 flex-1">
    
    {/* Tombol Edit Profil (Ikon Pensil di Kiri) */}
    {isOwner ? (
      <button
        type="button"
        onClick={() => {
          setEditDisplayName(currentUser.displayName || '');
          setEditNomorTelepon(currentUser.nomorTelepon || '');
          setShowEditOwnerModal(true);
        }}
        title="Edit Profil"
        className="w-8 h-8 rounded-xl bg-[#800000] hover:bg-[#660000] text-white flex items-center justify-center shrink-0 shadow-xs transition active:scale-95 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    ) : (
      <div className="w-8 h-8 rounded-xl bg-[#800000] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
        {(currentUser.displayName || 'O').charAt(0).toUpperCase()}
      </div>
    )}

    {/* Detail Info Nama & Keterangan */}
    <div className="min-w-0 flex-1">
      <h2 className="font-extrabold text-xs text-slate-900 truncate">
        {currentUser.displayName || 'Owner Laundry'}
      </h2>

      <p className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
        {currentUser.role === 'owner' ? 'Owner Utama' : 'Kasir Cabang'} •{' '}
        {currentUser.emailOrPhone ||
          currentUser.nomorTelepon ||
          (typeof activeLaundry?.namaLaundry === 'object'
            ? (activeLaundry.namaLaundry as any)?.namaLaundry || "Kafela's Laundry"
            : activeLaundry?.namaLaundry || "Kafela's Laundry")}
      </p>
    </div>
  </div>

  {/* Sisa Hari & Badge Paket (Ditata Vertikal di Ujung Kanan agar Proporsional) */}
  <div className="flex flex-col items-end shrink-0 text-right gap-0.5">
    {/* Sisa Hari */}
    <div className="text-xl font-bold leading-none">
      {isNewcomer ? (
        <span className="text-emerald-700 font-extrabold text-xs sm:text-sm">New Comer</span>
      ) : sisaHari > 0 ? (
        <span className={sisaHari <= 5 ? 'text-amber-700 font-black' : 'text-slate-800 font-black'}>
          {sisaHari} <span className="text-[12px] font-semibold text-slate-500 font-sans">Hari</span>
        </span>
      ) : (
        <span className="text-rose-700 font-black">Habis (0 Hari)</span>
      )}
    </div>

  </div>
</div>
              

              {/* Strip Saldo & Tombol Isi Saldo (Khusus Akun Owner, Sembunyikan Saat Admin Masuk) */}
              {isOwner && (
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
                  <button
                    type="button"
                    onClick={() => setShowTopUpModal(true)}
                    title="Isi Saldo Akun Owner Langsung"
                    className="h-9 px-3.5 rounded-xl bg-[#800000] hover:bg-[#660000] active:bg-[#4d0000] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-[#800000]/20 transition active:scale-95 cursor-pointer shrink-0"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>(+) Isi Saldo</span>
                  </button>
                </div>
              )}
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

        {/* SECTION 2: MASTER DATA LAUNDRY (Khusus Akun Owner, Disembunyikan Saat Admin Masuk) */}
        {isOwner && (
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
        )}

        {/* SECTION 3: STRUK & PRINTER BLUETOOTH */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Struk & Printer
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            <button
              type="button"
              onClick={() => {
                syncInfoStrukFromProps();
                setShowInfoStrukModal(true);
              }}
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

        {/* SECTION 4: PENGATURAN FITUR SISTEM (Khusus Akun Owner, Disembunyikan Saat Admin Masuk) */}
        {isOwner && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
              Fitur & Kebijakan Toko
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setWaNotification(settings.waNotificationEnabled ?? true);
                  setSelesaikanOtomatis(settings.selesaikanSaatDitugaskan ?? true);
                  setTampilkanAmbilNotaLama(settings.tampilkanTombolAmbilNotaLama ?? true);
                  setHitungKerjaStaf(settings.hitungKerjaStaf ?? true);
                  setShowFeatureSettingsModal(true);
                }}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">Pengaturan Fitur & Kebijakan</div>
                    <div className="text-[11px] text-slate-500 truncate">Notifikasi WA, alur pengerjaan, dan beban staf</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* SECTION: PENCADANGAN KEAMANAN DATA & GOOGLE DRIVE (Khusus Akun Owner) */}
        {isOwner && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
              Pencadangan & Keamanan Data
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBackupModal(true)}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Cadangkan Data ke Google Drive</span>
                      <span className="text-[9px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.2 rounded">Aman</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Simpan manual nota, pelanggan & arsip ke Google Drive / Cloud
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* SECTION 5: WEBSITE PUBLIK & TUTORIAL (MANDIRI) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Website Publik & Panduan Outlet
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            <a
              href="/landing.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Lihat Web Profil Resmi Outlet</span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">Stand-Alone</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">Halaman promosi mandiri: cukup edit public/landing.html</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </a>

            <a
              href="/tutorial.html"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-brand-600 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Panduan Interaktif Garis Penunjuk</span>
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">Tutorial</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">Peta tombol 4 layar kasir & garis panah penunjuk fungsi</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </a>
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Mulai Tur Panduan Kasir (Sorot Interaktif)</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">In-App</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Panduan langkah demi langkah langsung di tombol aplikasi
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            )}
          </div>
        </div>

        {/* SECTION: SISTEM & PEMBARUAN APLIKASI */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">
            Sistem & Pembaruan Aplikasi
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <button
              type="button"
              disabled={isCheckingUpdate || isApplyingUpdate}
              onClick={handleCheckAndApplyUpdate}
              className="w-full p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 active:bg-slate-100 transition text-left cursor-pointer disabled:opacity-75"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    hasUpdateAvailable
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${
                      isCheckingUpdate || isApplyingUpdate ? 'animate-spin' : ''
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span>
                      {isApplyingUpdate
                        ? 'Memperbarui Aplikasi...'
                        : isCheckingUpdate
                        ? 'Memeriksa Pembaruan...'
                        : hasUpdateAvailable
                        ? 'Perbarui Aplikasi Sekarang'
                        : 'Periksa Pembaruan Aplikasi'}
                    </span>
                    {hasUpdateAvailable ? (
                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                        Tersedia
                      </span>
                    ) : lastUpdateCheckInfo && !lastUpdateCheckInfo.startsWith('Gagal') ? (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Terbaru</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {isApplyingUpdate
                      ? 'Memasang versi terbaru & memuat ulang otomatis...'
                      : isCheckingUpdate
                      ? 'Menghubungi server untuk mengecek versi terbaru...'
                      : hasUpdateAvailable
                      ? 'Versi baru tersedia! Ketuk untuk langsung memperbarui'
                      : lastUpdateCheckInfo ||
                        'Cek versi terbaru & perbarui otomatis jika tersedia'}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold shrink-0 transition ${
                  isApplyingUpdate || hasUpdateAvailable
                    ? 'bg-[#800000] text-white shadow-xs'
                    : isCheckingUpdate
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-sky-50 text-sky-700 border border-sky-200/80'
                }`}
              >
                {isApplyingUpdate
                  ? 'Memasang...'
                  : isCheckingUpdate
                  ? 'Mengecek...'
                  : hasUpdateAvailable
                  ? 'Perbarui'
                  : 'Cek Update'}
              </span>
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
              <button
                type="button"
                onClick={() => setShowInfoStrukModal(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logo Section */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2.5 text-center">
              <label className="flex items-center justify-center gap-2 text-xs font-bold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useLogo}
                  onChange={(e) => setUseLogo(e.target.checked)}
                  className="w-4 h-4 accent-[#800000]"
                />
                <span>Gunakan Logo di Struk</span>
              </label>

              {useLogo && (
                <div className="space-y-2.5">
                  {logoPath ? (
                    <div className="space-y-2">
                      <div className="relative inline-block border border-slate-200 p-2 rounded-xl bg-white shadow-2xs">
                        <img src={logoPath} alt="Logo" className="h-16 w-auto max-w-[140px] object-contain mx-auto" />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPath(null);
                            setUseLogo(false);
                          }}
                          title="Hapus Logo"
                          className="absolute -top-2 -right-2 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-xs cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer transition">
                          <Upload className="w-3.5 h-3.5 text-[#800000]" />
                          <span>{isUploadingLogo ? 'Memproses...' : 'Ganti Logo'}</span>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                        </label>
                      </div>

                      <div className="pt-1">
                        <div className="text-[10px] font-semibold text-slate-500 mb-1">Ukuran Logo di Struk</div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(['kecil', 'sedang', 'besar'] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setLogoSize(sz)}
                              className={`py-1 rounded-lg text-[11px] font-bold capitalize border transition cursor-pointer ${
                                logoSize === sz
                                  ? 'bg-[#800000] text-white border-[#800000]'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {sz}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 rounded-xl p-3 block cursor-pointer hover:bg-slate-100 transition bg-white/70">
                      <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                      <span className="text-xs text-slate-600 font-semibold block">
                        {isUploadingLogo ? 'Memproses gambar logo...' : 'Pilih Gambar Logo Toko'}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Format PNG / JPG (otomatis disesuaikan untuk struk)
                      </span>
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Nama Laundry / Header Struk
                </label>
                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                  1 Pintu Terpadu
                </span>
              </div>
              <input
                type="text"
                value={headerStruk}
                onChange={(e) => setHeaderStruk(e.target.value)}
                placeholder="Contoh: Kafelas Laundry"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Nama ini otomatis menjadi nama outlet aktif dan tercetak di semua struk kasir, Bluetooth &amp; WhatsApp.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Alamat Lengkap Outlet
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat toko..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Nomor Telepon / WhatsApp Outlet
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0812..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
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
                type="button"
                disabled={isSavingStruk}
                onClick={() => setShowInfoStrukModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingStruk || isUploadingLogo}
                onClick={handleSaveInfoStruk}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs disabled:opacity-60 cursor-pointer"
              >
                {isSavingStruk ? 'Menyimpan...' : 'Simpan'}
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
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={waNotification}
                  onChange={(e) => setWaNotification(e.target.checked)}
                  className="w-4 h-4 accent-[#800000] mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    ● Konfirmasi kirim pesan WhatsApp saat cucian selesai
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Membuka konfirmasi kirim pesan WA ke pelanggan otomatis ketika status pesanan diubah ke Selesai.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={selesaikanOtomatis}
                  onChange={(e) => setSelesaikanOtomatis(e.target.checked)}
                  className="w-4 h-4 accent-[#800000] mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    ● Selesaikan status pengerjaan otomatis saat ditugaskan
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Saat staf pengerjaan dipilih/ditugaskan, pesanan langsung ditandai Selesai (cocok untuk alur kerja cepat 1 langkah).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tampilkanAmbilNotaLama}
                  onChange={(e) => setTampilkanAmbilNotaLama(e.target.checked)}
                  className="w-4 h-4 accent-[#800000] mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    ● Tampilkan tombol "Ambil Nota Lama" (Transisi Cepat)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Menampilkan tombol di Dashboard & saran saat pencarian nota nihil. Jika dinonaktifkan (atau ditutup dengan tombol X), tombol akan tersembunyi.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={hitungKerjaStaf}
                  onChange={(e) => setHitungKerjaStaf(e.target.checked)}
                  className="w-4 h-4 accent-[#800000] mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-800 text-xs block">
                    ● Aktifkan Perhitungan Kerja Staf (Produksi & Beban Cucian)
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                    Apabila diceklis maka perhitungan beban kerja staf (kg cucian, jumlah nota) dan pemilihan petugas pengerjaan aktif. Jika tidak diceklis, maka perhitungan kerja staf dinonaktifkan.
                  </span>
                </div>
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
      <TopUpModal
        isOpen={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        currentUser={currentUser}
        onMidtransSettled={onMidtransSettled}
        sisaHari={sisaHari}
      />

      {/* MODAL PENCADANGAN KE GOOGLE DRIVE & CLOUD */}
      <CloudBackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        currentUser={currentUser}
        activeLaundry={activeLaundry}
      />
    </div>
  );
};
