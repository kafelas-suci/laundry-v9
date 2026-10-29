import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { FirebaseSyncService } from './utils/firebaseSync';
import { StorageService, defaultSettings, defaultOwnerUser, defaultLayananList } from './utils/storage';
import { IndexedDbService } from './utils/indexedDb';
import {
  Transaksi,
  Layanan,
  Pelanggan,
  Pengeluaran,
  JenisPengeluaran,
  JenisPemasukan,
  User,
  Laundry,
  SettingsData,
  SubscriptionHistory,
  ArusKas,
  LayananItem,
  OperationalStaff,
} from './types';
import { SplashView } from './views/SplashView';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { TambahEditView } from './views/TambahEditView';
import { DetailTransaksiView } from './views/DetailTransaksiView';
import { StatusPengerjaanView } from './views/StatusPengerjaanView';
import { BukuKasView } from './views/BukuKasView';
import { LaporanView } from './views/LaporanView';
import { ArsipView } from './views/ArsipView';
import { KelolaPelangganView } from './views/KelolaPelangganView';
import { KelolaLayananView } from './views/KelolaLayananView';
import { KelolaOwnerView } from './views/KelolaOwnerView';
import { KelolaKasirView } from './views/KelolaKasirView';
import { SettingsView } from './views/SettingsView';

import { AturKasModal } from './components/AturKasModal';
import { SwitchBranchModal } from './components/SwitchBranchModal';
import { ApkPlaystoreModal } from './components/ApkPlaystoreModal';
import { LimitTransaksiModal } from './components/LimitTransaksiModal';
import { AssignStaffModal } from './components/AssignStaffModal';
import { ReceiptModal } from './components/ReceiptModal';
import { UpgradePlanModal } from './components/UpgradePlanModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { TopUpModal } from './components/TopUpModal';
import { TransitionPickupData } from './components/QuickTransitionPickupModal';
import {
  LaundryTier,
  normalizeTier,
  getLaundryLimits,
  EXTRA_BRANCH_PRICE,
  HARGA_PREMIUM_BULANAN,
} from './utils/subscription';
import { MidtransVerifyResult, PaymentPurpose } from './services/midtransService';
import { formatRupiah, formatLocalInvoiceDateKey } from './utils/formatters';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DesktopSidebar } from './components/DesktopSidebar';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { Lock } from 'lucide-react';
import { useToast } from './components/NotificationContext';
import { InteractiveTourModal, TOUR_STEPS } from './components/InteractiveTourModal';

type ViewType =
  | 'splash'
  | 'auth'
  | 'dashboard'
  | 'tambah_edit'
  | 'detail_transaksi'
  | 'status_pengerjaan'
  | 'buku_kas'
  | 'laporan'
  | 'arsip'
  | 'kelola_pelanggan'
  | 'kelola_layanan'
  | 'kelola_owner'
  | 'kelola_kasir'
  | 'settings';

function safeGetSessionItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
    }
  } catch {
    // Abaikan jika sessionStorage diblokir oleh pengaturan privasi / WebView
  }
}

function getValidStoredUser(): User | null {
  const raw = StorageService.get<User | null>('active_user', null);
  if (raw && typeof raw === 'object' && typeof raw.uid === 'string' && raw.uid.trim().length > 0) {
    return raw;
  }
  return null;
}

export default function App() {
  const toast = useToast();
  // Application State
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const hasSeenSplash = safeGetSessionItem('has_seen_splash');
    const storedUser = getValidStoredUser();
    if (hasSeenSplash) {
      return storedUser ? 'dashboard' : 'auth';
    }
    return 'splash';
  });
  const [initialSignUpMode, setInitialSignUpMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getValidStoredUser());
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const [settings, setSettings] = useState<SettingsData>(() => {
    const raw = StorageService.get<SettingsData>('settings', defaultSettings);
    const hasCustomized = StorageService.get<boolean>('has_customized_settings', false);
    if (!hasCustomized && raw && raw.selesaikanSaatDitugaskan === false) {
      const updated = { ...defaultSettings, ...raw, selesaikanSaatDitugaskan: true };
      StorageService.set('settings', updated);
      return updated;
    }
    return {
      ...defaultSettings,
      ...raw,
      selesaikanSaatDitugaskan: raw?.selesaikanSaatDitugaskan ?? true,
    };
  });

  const [laundries, setLaundries] = useState<Laundry[]>(() => {
    const raw = StorageService.get<Laundry[]>('laundries', []);
    return raw.length > 0 ? raw : [{ id: 'lnd-1', ownerId: 'own-1', namaLaundry: "Kafela's Laundry", alamat: '', nomorTelepon: '' }];
  });

  const [activeLaundryId, setActiveLaundryId] = useState<string>(() =>
    StorageService.get<string>('current_laundry_id', 'lnd-1')
  );

  const [transaksiList, setTransaksiList] = useState<Transaksi[]>(() => {
    const raw = StorageService.get<Transaksi[]>('transaksi', []);
    return (Array.isArray(raw) ? raw : []).map((t) => ({
      ...t,
      items: Array.isArray(t?.items) ? t.items : [],
    }));
  });

  // 1. Inisialisasi: One-time migration LocalStorage ke IndexedDB (SSOT) & hydrate transaksi lokal
  useEffect(() => {
    StorageService.initData();
    IndexedDbService.migrateLocalStorageToIndexedDb(activeLaundryId)
      .then(() => IndexedDbService.getAllLaundryTransaksi(activeLaundryId))
      .then((idbList) => {
        if (idbList && idbList.length > 0) {
          setTransaksiList((prev) => {
            if (prev.length === 0) return idbList;
            const map = new Map<string, Transaksi>();
            idbList.forEach((t) => map.set(t.id, t));
            prev.forEach((t) => map.set(t.id, t));
            return Array.from(map.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);
          });
        }
      })
      .catch(console.warn);
  }, [activeLaundryId]);

  // Real-time Live Synchronization untuk Multi-User Kasir & Owner
  useEffect(() => {
    if (!auth.currentUser || !activeLaundryId) return;

    const unsubscribe = FirebaseSyncService.subscribeTransaksi(
      activeLaundryId,
      (liveList) => {
        setTransaksiList((prev) => {
          const map = new Map<string, Transaksi>();
          // Gabungkan data lama di memori
          prev.forEach((t) => map.set(t.id, t));
          // Timpa / sisipkan pembaruan terbaru dari Firestore
          liveList.forEach((t) => map.set(t.id, t));
          const merged = Array.from(map.values()).sort(
            (a, b) => b.tanggalMasuk - a.tanggalMasuk
          );
          // SSOT dikelola oleh IndexedDB di level data layer, tidak menduplikasi ke LocalStorage
          return merged;
        });
      },
      (err) => {
        console.warn('Real-time sync listener error (tetap menggunakan cache lokal):', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeLaundryId, currentUser?.uid]);

  const [layananList, setLayananList] = useState<Layanan[]>(() =>
    StorageService.get<Layanan[]>('layanan', [])
  );

  const [pelangganList, setPelangganList] = useState<Pelanggan[]>(() =>
    StorageService.get<Pelanggan[]>('pelanggan', [])
  );

  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>(() =>
    StorageService.get<Pengeluaran[]>('pengeluaran', [])
  );

  const [manualCashLogs, setManualCashLogs] = useState<ArusKas[]>(() =>
    StorageService.get<ArusKas[]>('manual_cash_logs', [])
  );

  const [staffList, setStaffList] = useState<User[]>(() =>
    StorageService.get<User[]>('staff', [])
  );

  const [operationalStaffList, setOperationalStaffList] = useState<OperationalStaff[]>(() =>
    StorageService.get<OperationalStaff[]>('operational_staff', [])
  );

  const handleAddOperationalStaff = (nama: string, laundryId: string) => {
    const newStaff: OperationalStaff = {
      id: `op-stf-${Date.now()}`,
      laundryId,
      nama: nama.trim(),
    };
    const updated = [...operationalStaffList, newStaff];
    setOperationalStaffList(updated);
    StorageService.set('operational_staff', updated);
    toast.success(`Staf operasional '${nama}' berhasil ditambahkan!`);
  };

  const handleDeleteOperationalStaff = (id: string) => {
    const updated = operationalStaffList.filter((s) => s.id !== id);
    setOperationalStaffList(updated);
    StorageService.set('operational_staff', updated);
    toast.success('Staf operasional berhasil dihapus.');
  };

  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>(() =>
    StorageService.get<SubscriptionHistory[]>('subscription_history', [])
  );

  const [jenisPengeluaranList, setJenisPengeluaranList] = useState<JenisPengeluaran[]>(() =>
    StorageService.get<JenisPengeluaran[]>('jenis_pengeluaran', [])
  );

  const [jenisPemasukanList, setJenisPemasukanList] = useState<JenisPemasukan[]>(() =>
    StorageService.get<JenisPemasukan[]>('jenis_pemasukan', [])
  );

  // Active transaction in view/edit
  const [selectedTransaksiId, setSelectedTransaksiId] = useState<string | null>(null);
  const [transaksiToEdit, setTransaksiToEdit] = useState<Transaksi | null>(null);

  // Global Modals
  const [isAturKasOpen, setIsAturKasOpen] = useState(false);
  const [isSwitchBranchOpen, setIsSwitchBranchOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);
  const [trxForAssignStaff, setTrxForAssignStaff] = useState<Transaksi | null>(null);
  const [receiptModalTrx, setReceiptModalTrx] = useState<Transaksi | null>(null);

  // Subscription Tier state (Premium vs Pro)
  const [activeTier, setActiveTier] = useState<LaundryTier>(() => {
    const saved = StorageService.get<string | null>('active_subscription_tier', null);
    if (saved) return normalizeTier(saved);
    return normalizeTier(currentUser?.subscriptionType);
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [upgradeTriggerReason, setUpgradeTriggerReason] = useState<string | undefined>(undefined);
  const [globalPaymentModal, setGlobalPaymentModal] = useState<{
    open: boolean;
    purpose: PaymentPurpose;
    method: 'midtrans' | 'manual';
    nominal: number;
  }>({
    open: false,
    purpose: 'extend_premium',
    method: 'midtrans',
    nominal: HARGA_PREMIUM_BULANAN,
  });

  useEffect(() => {
    if (!currentUser || activeTier === 'newcomer') return;
    const now = Date.now();
    const subEnd = currentUser.subscriptionEndDate || 0;
    if (subEnd > 0 && subEnd <= now) {
      const hasPrompted = safeGetSessionItem('expired_sub_prompted');
      if (!hasPrompted) {
        setIsExpiredModalOpen(true);
        safeSetSessionItem('expired_sub_prompted', '1');
      }
    }
  }, [currentUser, activeTier]);

  const handleOpenUpgradeModal = (reason?: string) => {
    setUpgradeTriggerReason(reason);
    setIsUpgradeModalOpen(true);
  };

  // Toast & Double-Tap to Exit state saat berada di menu utama (Dashboard)
  const [exitToast, setExitToast] = useState(false);
  const lastBackTimeRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation History Stack untuk mendukung tombol kembali berjenjang (step-by-step)
  interface NavHistoryItem {
    view: ViewType;
    selectedTransaksiId: string | null;
    transaksiToEdit: Transaksi | null;
  }

  const [navHistory, setNavHistory] = useState<NavHistoryItem[]>([]);
  const navHistoryRef = useRef<NavHistoryItem[]>([]);
  const isProgrammaticBackRef = useRef(false);
  const isNavigatingBackRef = useRef(false);

  useEffect(() => {
    navHistoryRef.current = navHistory;
  }, [navHistory]);

  const navigateTo = useCallback(
    (
      nextView: ViewType,
      options?: {
        transaksiId?: string | null;
        transaksiToEdit?: Transaksi | null;
        clearHistory?: boolean;
        replace?: boolean;
      }
    ) => {
      if (options?.clearHistory || nextView === 'dashboard') {
        setNavHistory([]);
        navHistoryRef.current = [];
      } else if (!options?.replace) {
        const item: NavHistoryItem = {
          view: activeView,
          selectedTransaksiId,
          transaksiToEdit,
        };
        setNavHistory((prev) => [...prev, item]);
        navHistoryRef.current = [...navHistoryRef.current, item];
      }

      if (options && 'transaksiId' in options) {
        setSelectedTransaksiId(options.transaksiId ?? null);
      }
      if (options && 'transaksiToEdit' in options) {
        setTransaksiToEdit(options.transaksiToEdit ?? null);
      }

      setActiveView(nextView);
    },
    [activeView, selectedTransaksiId, transaksiToEdit]
  );

  const navigateBack = useCallback(() => {
    // 1. Jika ada popup modal terbuka, tutup modal terlebih dahulu
    if (receiptModalTrx) {
      setReceiptModalTrx(null);
      return;
    }
    if (isUpgradeModalOpen) {
      setIsUpgradeModalOpen(false);
      return;
    }
    if (isAturKasOpen) {
      setIsAturKasOpen(false);
      return;
    }
    if (isSwitchBranchOpen) {
      setIsSwitchBranchOpen(false);
      return;
    }
    if (isApkModalOpen) {
      setIsApkModalOpen(false);
      return;
    }
    if (isLimitModalOpen) {
      setIsLimitModalOpen(false);
      return;
    }
    if (isExpiredModalOpen) {
      setIsExpiredModalOpen(false);
      return;
    }
    if (globalPaymentModal.open) {
      setGlobalPaymentModal((prev) => ({ ...prev, open: false }));
      return;
    }
    if (trxForAssignStaff) {
      setTrxForAssignStaff(null);
      return;
    }

    const history = navHistoryRef.current;
    if (history.length > 0) {
      const prevItem = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setNavHistory(newHistory);
      navHistoryRef.current = newHistory;

      isNavigatingBackRef.current = true;
      setActiveView(prevItem.view);
      setSelectedTransaksiId(prevItem.selectedTransaksiId);
      setTransaksiToEdit(prevItem.transaksiToEdit);

      if (typeof window !== 'undefined' && window.history.length > 1) {
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
      return;
    }

    if (activeView !== 'dashboard' && activeView !== 'splash' && activeView !== 'auth') {
      isNavigatingBackRef.current = true;
      setActiveView('dashboard');
      setSelectedTransaksiId(null);
      setTransaksiToEdit(null);
      if (typeof window !== 'undefined' && window.history.length > 1) {
        isProgrammaticBackRef.current = true;
        window.history.back();
      }
      return;
    }
  }, [
    receiptModalTrx,
    isUpgradeModalOpen,
    isAturKasOpen,
    isSwitchBranchOpen,
    isApkModalOpen,
    isLimitModalOpen,
    isExpiredModalOpen,
    globalPaymentModal.open,
    trxForAssignStaff,
    activeView,
  ]);

  const navStateRef = useRef({
    activeView,
    selectedTransaksiId,
    transaksiToEdit,
    isAturKasOpen,
    isSwitchBranchOpen,
    isApkModalOpen,
    isLimitModalOpen,
    isUpgradeModalOpen,
    isExpiredModalOpen,
    isGlobalPaymentOpen: globalPaymentModal.open,
    hasTrxForAssignStaff: !!trxForAssignStaff,
    hasReceiptModalTrx: !!receiptModalTrx,
  });

  useEffect(() => {
    navStateRef.current = {
      activeView,
      selectedTransaksiId,
      transaksiToEdit,
      isAturKasOpen,
      isSwitchBranchOpen,
      isApkModalOpen,
      isLimitModalOpen,
      isUpgradeModalOpen,
      isExpiredModalOpen,
      isGlobalPaymentOpen: globalPaymentModal.open,
      hasTrxForAssignStaff: !!trxForAssignStaff,
      hasReceiptModalTrx: !!receiptModalTrx,
    };
  }, [
    activeView,
    selectedTransaksiId,
    transaksiToEdit,
    isAturKasOpen,
    isSwitchBranchOpen,
    isApkModalOpen,
    isLimitModalOpen,
    isUpgradeModalOpen,
    isExpiredModalOpen,
    globalPaymentModal.open,
    trxForAssignStaff,
    receiptModalTrx,
  ]);

  // Synchronize history navigation (Popstate listener untuk tombol kembali hardware Android / browser)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.history.state) {
      window.history.replaceState({ view: 'root' }, '');
    }

    const handlePopState = () => {
      // Jika dipicu oleh pemanggilan navigateBack() secara programmatic, abaikan agar tidak dobel pop
      if (isProgrammaticBackRef.current) {
        isProgrammaticBackRef.current = false;
        return;
      }

      const state = navStateRef.current;

      // 1. Jika ada popup modal terbuka, tutup modal tersebut terlebih dahulu
      if (state.hasReceiptModalTrx) {
        setReceiptModalTrx(null);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isUpgradeModalOpen) {
        setIsUpgradeModalOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isAturKasOpen) {
        setIsAturKasOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isSwitchBranchOpen) {
        setIsSwitchBranchOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isApkModalOpen) {
        setIsApkModalOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isLimitModalOpen) {
        setIsLimitModalOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isExpiredModalOpen) {
        setIsExpiredModalOpen(false);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.isGlobalPaymentOpen) {
        setGlobalPaymentModal((prev) => ({ ...prev, open: false }));
        window.history.pushState({ view: state.activeView }, '');
        return;
      }
      if (state.hasTrxForAssignStaff) {
        setTrxForAssignStaff(null);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }

      // 2. Jika ada riwayat halaman sebelumnya di tumpukan (navHistory), kembali ke halaman tersebut (BUKAN langsung ke Dashboard)
      const history = navHistoryRef.current;
      if (history.length > 0) {
        const prevItem = history[history.length - 1];
        const newHistory = history.slice(0, -1);
        setNavHistory(newHistory);
        navHistoryRef.current = newHistory;

        isNavigatingBackRef.current = true;
        setActiveView(prevItem.view);
        setSelectedTransaksiId(prevItem.selectedTransaksiId);
        setTransaksiToEdit(prevItem.transaksiToEdit);
        return;
      }

      // 3. Jika riwayat kosong tapi sedang berada di sub menu, kembalikan ke dashboard
      if (
        state.activeView !== 'dashboard' &&
        state.activeView !== 'splash' &&
        state.activeView !== 'auth'
      ) {
        isNavigatingBackRef.current = true;
        setActiveView('dashboard');
        setSelectedTransaksiId(null);
        setTransaksiToEdit(null);
        return;
      }

      // 4. Jika SUDAH berada di menu utama (dashboard) dan riwayat kosong, minta tekan sekali lagi untuk keluar
      if (state.activeView === 'dashboard') {
        const now = Date.now();
        if (now - lastBackTimeRef.current < 2000) {
          // Tekanan kedua dalam 2 detik di menu utama -> Izinkan keluar aplikasi
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = typeof window !== 'undefined' ? (window as any) : null;
          if (win?.MesinPrint && typeof win.MesinPrint.keluarAplikasi === 'function') {
            win.MesinPrint.keluarAplikasi();
            return;
          }
          window.history.back();
        } else {
          // Tekanan pertama di dashboard -> Tahan dan tampilkan toast "Tekan sekali lagi untuk keluar"
          lastBackTimeRef.current = now;
          window.history.pushState({ view: 'dashboard' }, '');
          setExitToast(true);

          if (exitToastTimerRef.current) {
            clearTimeout(exitToastTimerRef.current);
          }
          exitToastTimerRef.current = setTimeout(() => {
            setExitToast(false);
          }, 2000);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) {
        clearTimeout(exitToastTimerRef.current);
      }
    };
  }, []);

  // Setiap kali berganti halaman ke depan (selain splash & auth), dorong riwayat navigasi browser
  useEffect(() => {
    if (typeof window !== 'undefined' && activeView !== 'splash' && activeView !== 'auth') {
      if (isNavigatingBackRef.current) {
        isNavigatingBackRef.current = false;
        return;
      }
      window.history.pushState({ view: activeView }, '');
    }
  }, [activeView]);

  // Active branch entity - selalu pastikan id konsisten dengan activeLaundryId
  const activeLaundry = useMemo(() => {
    const cleanVal = (v: any): string => {
      if (typeof v !== 'string') return '';
      const t = v.trim();
      if (!t || t === '-' || t === '0812-3456-7890') return '';
      return t;
    };

    const sanitizeBranch = (item: any): Laundry => {
      let nama = item?.namaLaundry;
      while (typeof nama === 'object' && nama !== null) {
        nama = nama.namaLaundry || nama.name || "Kafela's Laundry";
      }
      const cleanName = cleanVal(nama);
      const branchId = typeof item?.id === 'string' ? item.id : activeLaundryId || 'lnd-1';
      const userBranchName = cleanVal(currentUser?.laundries?.[branchId]);
      const fallbackHeader = cleanVal(settings?.headerStruk);
      const rawOwnerId =
        typeof item?.ownerId === 'string' &&
        item.ownerId !== 'own-1' &&
        item.ownerId !== 'demo-owner-1'
          ? item.ownerId
          : '';
      const hasExplicitPhone =
        item?.nomorTelepon !== undefined && item?.nomorTelepon !== null && item?.nomorTelepon !== '-';
      const hasExplicitAddress =
        item?.alamat !== undefined && item?.alamat !== null && item?.alamat !== '-';

      return {
        id: branchId,
        ownerId: rawOwnerId || currentUser?.uid || auth.currentUser?.uid || 'own-1',
        namaLaundry: cleanName || userBranchName || fallbackHeader || "Kafela's Laundry",
        alamat: hasExplicitAddress ? cleanVal(item.alamat) : cleanVal(settings?.address),
        nomorTelepon: hasExplicitPhone
          ? cleanVal(item.nomorTelepon)
          : (cleanVal(settings?.phoneNumber) || cleanVal(currentUser?.nomorTelepon)),
      };
    };

    const found = laundries.find((l) => l.id === activeLaundryId);
    if (found) return sanitizeBranch(found);
    if (laundries.length > 0) {
      return sanitizeBranch({ ...laundries[0], id: activeLaundryId });
    }
    return sanitizeBranch({
      id: activeLaundryId || 'lnd-1',
      ownerId: currentUser?.uid || auth.currentUser?.uid || 'own-1',
      namaLaundry: currentUser?.laundries?.[activeLaundryId] || settings?.headerStruk || "Kafela's Laundry",
      alamat: settings?.address || '',
      nomorTelepon: settings?.phoneNumber || currentUser?.nomorTelepon || '',
    });
  }, [laundries, activeLaundryId, currentUser?.uid, currentUser?.nomorTelepon, currentUser?.laundries, settings.headerStruk, settings.address, settings.phoneNumber]);

  // Sync state helpers (1 Pintu Atomik: Settings + Cabang Aktif + Profil User + Firestore)
  const updateSettings = async (newSettings: SettingsData): Promise<void> => {
    const cleanLogoPath =
      typeof newSettings.logoPath === 'string' && newSettings.logoPath.trim()
        ? newSettings.logoPath.trim()
        : null;
    const cleanUseLogo = Boolean(newSettings.useLogo && cleanLogoPath);
    const cleanHeader =
      (newSettings.headerStruk || '').trim() ||
      activeLaundry?.namaLaundry ||
      settings.headerStruk ||
      "Kafela's Laundry";
    const cleanAddress = newSettings.address !== undefined ? newSettings.address.trim() : (settings.address || '');
    const cleanPhone = newSettings.phoneNumber !== undefined ? newSettings.phoneNumber.trim() : (settings.phoneNumber || '');

    const nextSettings: SettingsData = {
      ...settings,
      ...newSettings,
      headerStruk: cleanHeader,
      appTitle: cleanHeader,
      address: cleanAddress,
      phoneNumber: cleanPhone,
      logoPath: cleanLogoPath,
      useLogo: cleanUseLogo,
      logoSize: newSettings.logoSize || settings.logoSize || 'sedang',
    };

    setSettings(nextSettings);
    StorageService.set('settings', nextSettings);
    StorageService.set('has_customized_settings', true);

    const targetBranchId =
      activeLaundryId && activeLaundryId !== 'lnd-1' && activeLaundryId !== 'demo-lnd-1'
        ? activeLaundryId
        : currentUser?.laundryId && currentUser.laundryId !== 'lnd-1'
        ? currentUser.laundryId
        : auth.currentUser?.uid
        ? `lnd-${auth.currentUser.uid}`
        : activeLaundryId || 'lnd-1';

    if (targetBranchId !== activeLaundryId) {
      setActiveLaundryId(targetBranchId);
      StorageService.set('current_laundry_id', targetBranchId);
    }

    const ownerUid =
      currentUser?.role !== 'owner'
        ? activeLaundry?.ownerId || currentUser?.ownerId || 'own-1'
        : currentUser?.uid || auth.currentUser?.uid || 'own-1';
    const branchToSave: Laundry = {
      id: targetBranchId,
      ownerId: ownerUid,
      namaLaundry: cleanHeader,
      alamat: cleanAddress,
      nomorTelepon: cleanPhone,
    };

    setLaundries((prev) => {
      const baseList = prev.filter((l) => l.id !== 'lnd-1' || targetBranchId === 'lnd-1');
      const exists = baseList.some((l) => l.id === targetBranchId);
      const updated = exists
        ? baseList.map((l) => (l.id === targetBranchId ? { ...l, ...branchToSave } : l))
        : [...baseList, branchToSave];
      StorageService.set('laundries', updated);
      return updated;
    });

    let userToSave: User | null = null;
    if (currentUser && currentUser.role === 'owner') {
      const isPrimaryBranch =
        !currentUser.laundryId ||
        currentUser.laundryId === 'lnd-1' ||
        currentUser.laundryId === targetBranchId;
      userToSave = {
        ...currentUser,
        laundryId:
          !currentUser.laundryId || currentUser.laundryId === 'lnd-1'
            ? targetBranchId
            : currentUser.laundryId,
        laundries: {
          ...(currentUser.laundries || {}),
          [targetBranchId]: cleanHeader,
        },
        ...(isPrimaryBranch ? { nomorTelepon: cleanPhone } : {}),
      };
      setCurrentUser(userToSave);
      StorageService.set('active_user', userToSave);
    }

    if (targetBranchId && auth.currentUser && currentUser?.role === 'owner') {
      await FirebaseSyncService.saveLaundry(branchToSave).catch(console.warn);
      await Promise.all([
        FirebaseSyncService.saveSettings(targetBranchId, nextSettings).catch(console.error),
        userToSave ? FirebaseSyncService.updateUserProfile(userToSave).catch(console.warn) : Promise.resolve(),
      ]);
    }
  };

  const updateTransaksiList = (newList: Transaksi[]) => {
    const safeList = (Array.isArray(newList) ? newList : []).map((t) => ({
      ...t,
      items: Array.isArray(t?.items) ? t.items : [],
    }));
    setTransaksiList(safeList);
    // SSOT: Simpan hanya ke IndexedDB lokal untuk mencegah race conditions & kuota limit LocalStorage
    if (activeLaundryId) {
      IndexedDbService.saveAllTransaksi(activeLaundryId, safeList).catch(console.warn);
    }
  };

  const updatePengeluaranList = (newList: Pengeluaran[]) => {
    setPengeluaranList(newList);
    StorageService.set('pengeluaran', newList);
  };

  const updatePelangganList = (newList: Pelanggan[]) => {
    setPelangganList(newList);
    StorageService.set('pelanggan', newList);
  };

  const updateLayananList = (newList: Layanan[]) => {
    setLayananList(newList);
    StorageService.set('layanan', newList);
  };

  const updateLaundries = (newList: Laundry[]) => {
    setLaundries(newList);
    StorageService.set('laundries', newList);
  };

  const updateStaffList = (newList: User[]) => {
    setStaffList(newList);
    StorageService.set('staff', newList);
  };

  // Load real user and real Firestore data when authenticated
  const loadFirestoreData = async (user: User, forceSync = false): Promise<{
    transaksiCount: number;
    pelangganCount: number;
    layananCount: number;
  } | undefined> => {
    if (!auth.currentUser) {
      return;
    }
    const now = Date.now();
    const cleanField = (v: any): string => {
      if (typeof v !== 'string') return '';
      const t = v.trim();
      if (!t || t === '-' || t === '0812-3456-7890') return '';
      return t;
    };

    try {
      // 0. Jika forceSync, kuras antrean Outbox terlebih dahulu (agar nota offline kasir tidak tertimpa/hilang)
      if (forceSync) {
        await FirebaseSyncService.syncPendingOutbox().catch((err) => {
          console.warn('Gagal sinkron outbox sebelum forceSync:', err);
        });
      }

      // Gunakan cache terbaru dari StorageService untuk mencegah closure state lama menimpa data baru saat signup
      const latestStoredLaundries = StorageService.get<Laundry[]>('laundries', laundries);
      const latestStoredSettings = StorageService.get<SettingsData>('settings', settings);

      let targetLaundryId = user.laundryId || `lnd-${user.uid}`;
      let resolvedPrimaryBranch: Laundry;

      if (user.role !== 'owner') {
        const assignedBranch = await FirebaseSyncService.fetchAssignedLaundry(user.laundryId);
        if (assignedBranch) {
          targetLaundryId = assignedBranch.id;
          resolvedPrimaryBranch = assignedBranch;
          updateLaundries([assignedBranch]);
          if (assignedBranch.subscriptionType) {
            const branchTier = normalizeTier(assignedBranch.subscriptionType);
            setActiveTier(branchTier);
            StorageService.set('active_subscription_tier', branchTier);
          }
        } else {
          resolvedPrimaryBranch = {
            id: targetLaundryId,
            ownerId: user.ownerId || '',
            namaLaundry: cleanField(user.laundries?.[targetLaundryId]) || "Kafela's Laundry",
            alamat: '',
            nomorTelepon: cleanField(user.nomorTelepon),
          };
          updateLaundries([resolvedPrimaryBranch]);
        }
      } else {
        const userLaundries = await FirebaseSyncService.fetchLaundries(user.uid, latestStoredLaundries, forceSync);
        const cleanLaundries = user && user.uid && !user.uid.startsWith('demo')
          ? userLaundries.filter((l) => l.id !== 'lnd-1' && l.id !== 'demo-lnd-1' && l.namaLaundry !== '-')
          : userLaundries;
        const finalLaundries = cleanLaundries.length > 0 ? cleanLaundries : userLaundries;
        targetLaundryId = finalLaundries[0]?.id || user.laundryId || `lnd-${user.uid}`;

        if (finalLaundries.length > 0) {
          const first = finalLaundries[0];
          const profileBranchName = cleanField(user.laundries?.[first.id]);
          const profilePhone = cleanField(user.nomorTelepon);
          const enrichedFirst: Laundry = {
            ...first,
            namaLaundry:
              cleanField(first.namaLaundry) && first.namaLaundry !== 'Laundry'
                ? first.namaLaundry
                : profileBranchName || first.namaLaundry || "Kafela's Laundry",
            nomorTelepon: cleanField(first.nomorTelepon) || profilePhone || '',
            alamat: cleanField(first.alamat),
          };
          const updatedBranches = [enrichedFirst, ...finalLaundries.slice(1)];
          resolvedPrimaryBranch = enrichedFirst;
          updateLaundries(updatedBranches);
          const cloudStaff = await FirebaseSyncService.fetchOwnerStaff(updatedBranches.map((b) => b.id));
          updateStaffList(cloudStaff);
        } else {
          const profileBranchName = cleanField(user.laundries?.[targetLaundryId]);
          const initialName =
            profileBranchName ||
            cleanField(latestStoredSettings?.headerStruk) ||
            cleanField(user.displayName) ||
            "Kafela's Laundry";
          const initialPhone =
            cleanField(user.nomorTelepon) || cleanField(latestStoredSettings?.phoneNumber) || '';
          const initialAddress = cleanField(latestStoredSettings?.address);

          const defaultBranch: Laundry = {
            id: targetLaundryId,
            ownerId: user.uid,
            namaLaundry: initialName,
            alamat: initialAddress,
            nomorTelepon: initialPhone,
            subscriptionType: user.subscriptionType || 'newcomer',
            subscriptionEndDate: user.subscriptionEndDate ?? null,
          };
          resolvedPrimaryBranch = defaultBranch;
          updateLaundries([defaultBranch]);
          FirebaseSyncService.saveLaundry(defaultBranch).catch(console.warn);
        }
      }
      setActiveLaundryId(targetLaundryId);
      StorageService.set('current_laundry_id', targetLaundryId);

      // 2. Sync Transaksi (Smart Delta Sync berbasis terakhirDieditPada jika forceSync)
      const latestStoredTrx =
        transaksiList.length > 0 ? transaksiList : StorageService.get<Transaksi[]>('transaksi', []);
      let newOrUpdatedTrx = 0;
      if (forceSync) {
        const deltaSyncKey = `last_trx_delta_sync_${targetLaundryId}`;
        const lastDeltaSync = StorageService.get<number>(deltaSyncKey, 0);
        const { updatedList, newOrUpdatedCount } = await FirebaseSyncService.fetchTransaksiDelta(
          targetLaundryId,
          lastDeltaSync,
          latestStoredTrx
        );
        newOrUpdatedTrx = newOrUpdatedCount;
        if (updatedList.length > 0) {
          updateTransaksiList(updatedList);
          StorageService.set(deltaSyncKey, now);
        }
      } else if (latestStoredTrx.length > 0) {
        updateTransaksiList(latestStoredTrx);
      }

      // 3. Sync Pelanggan (Smart merge)
      const latestStoredPelanggan =
        pelangganList.length > 0 ? pelangganList : StorageService.get<Pelanggan[]>('pelanggan', []);
      const custs = await FirebaseSyncService.fetchPelanggan(targetLaundryId, latestStoredPelanggan);
      if (custs && custs.length > 0) {
        updatePelangganList(custs);
      }

      // 4. Sync Layanan (Smart merge)
      const latestStoredLayanan =
        layananList.length > 0 ? layananList : StorageService.get<Layanan[]>('layanan', []);
      const lays = await FirebaseSyncService.fetchLayanan(targetLaundryId, latestStoredLayanan);
      if (lays && lays.length > 0) {
        updateLayananList(lays);
      }

      // 5. Sync Pengeluaran (Smart merge)
      const latestStoredPengeluaran =
        pengeluaranList.length > 0 ? pengeluaranList : StorageService.get<Pengeluaran[]>('pengeluaran', []);
      const exps = await FirebaseSyncService.fetchPengeluaran(targetLaundryId, latestStoredPengeluaran);
      if (exps && exps.length > 0) {
        updatePengeluaranList(exps);
      }

      // 6. Sync Settings & pastikan nama laundry + nomor telepon + logo selaras dengan cabang aktif
      const st = await FirebaseSyncService.fetchSettings(targetLaundryId, latestStoredSettings);
      if (st) {
        const cleanHeader = cleanField(st.headerStruk);
        const cleanPhone = cleanField(st.phoneNumber);
        const cleanAddr = cleanField(st.address);
        const hasSavedSettings = Boolean((st as any).updatedAt);
        const cleanLogoPath =
          typeof st.logoPath === 'string' && st.logoPath.trim() ? st.logoPath.trim() : null;

        const syncedSettings: SettingsData = {
          ...st,
          logoPath: cleanLogoPath,
          useLogo: Boolean(st.useLogo && cleanLogoPath),
          logoSize: st.logoSize === 'kecil' || st.logoSize === 'besar' ? st.logoSize : 'sedang',
          headerStruk:
            hasSavedSettings && cleanHeader
              ? cleanHeader
              : !cleanHeader || cleanHeader === 'Laundry' || cleanHeader === "Kafela's Laundry"
              ? resolvedPrimaryBranch.namaLaundry || cleanHeader || "Kafela's Laundry"
              : cleanHeader,
          appTitle:
            hasSavedSettings && cleanHeader
              ? cleanHeader
              : !cleanField(st.appTitle) || st.appTitle === 'Laundry' || st.appTitle === "Kafela's Laundry"
              ? resolvedPrimaryBranch.namaLaundry || st.appTitle
              : st.appTitle,
          phoneNumber: hasSavedSettings
            ? cleanPhone
            : cleanPhone || cleanField(resolvedPrimaryBranch.nomorTelepon) || '',
          address: hasSavedSettings
            ? cleanAddr
            : cleanAddr || cleanField(resolvedPrimaryBranch.alamat) || '',
        };
        setSettings(syncedSettings);
        StorageService.set('settings', syncedSettings);
        if (hasSavedSettings) {
          StorageService.set('has_customized_settings', true);
          if (cleanHeader) {
            const syncedBranch: Laundry = {
              ...resolvedPrimaryBranch,
              namaLaundry: cleanHeader,
              alamat: cleanAddr,
              nomorTelepon: cleanPhone,
            };
            setLaundries((prev) => {
              const next = prev.map((l) => (l.id === targetLaundryId ? syncedBranch : l));
              StorageService.set('laundries', next);
              return next;
            });
          }
        }
      }

      StorageService.set('last_global_sync', now);

      return {
        transaksiCount: newOrUpdatedTrx,
        pelangganCount: custs.length,
        layananCount: lays.length,
      };
    } catch (err) {
      console.error('Error loading Firestore data:', err);
      throw err;
    }
  };

  // Firebase Auth Observer
  useEffect(() => {
    StorageService.initData();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // Lewati jika proses login / daftar sedang dijalankan langsung oleh AuthView (mencegah race condition menimpa namaLaundry & no telepon)
      if (FirebaseSyncService.isAuthFlowActive()) {
        return;
      }
      if (fbUser) {
        try {
          const profile = await FirebaseSyncService.getOrCreateUserProfile({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            phoneNumber: fbUser.phoneNumber,
          });
          setCurrentUser(profile);
          setActiveTier(normalizeTier(profile.subscriptionType));
          StorageService.set('active_subscription_tier', normalizeTier(profile.subscriptionType));
          StorageService.set('active_user', profile);
          await loadFirestoreData(profile, true);
          FirebaseSyncService.syncPendingOutbox().catch(console.warn);
        } catch (err: any) {
          if (err?.code === 'CASHIER_REVOKED') {
            await signOut(auth).catch(() => undefined);
            setCurrentUser(null);
            StorageService.set('active_user', null);
            setActiveView('auth');
            toast.warning(err.message || 'Akses akun kasir ini telah dinonaktifkan oleh Owner.');
          } else {
            console.warn('Gagal memuat data pengguna pada onAuthStateChanged:', err);
          }
        }
      } else {
        const stored = getValidStoredUser();
        if (!stored) {
          setCurrentUser(null);
          setActiveView((prev) => (prev === 'splash' || prev === 'auth' ? prev : 'auth'));
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Guard anti-layar-kosong: jika berada di halaman internal tanpa sesi user aktif, arahkan ke halaman login
  useEffect(() => {
    if (activeView !== 'splash' && activeView !== 'auth' && !currentUser) {
      console.warn('[Kafelas Boot] Sesi pengguna kosong pada rute internal, mengarahkan ke AuthView.');
      setActiveView('auth');
    }
  }, [activeView, currentUser]);

  // Handlers
  const handleSelectBranch = (laundryId: string) => {
    setActiveLaundryId(laundryId);
    StorageService.set('current_laundry_id', laundryId);

    // Sinkronisasi 1 Pintu: Sesuaikan identitas struk dengan cabang yang baru dipilih
    const targetBranch = laundries.find((l) => l.id === laundryId);
    if (targetBranch) {
      const syncedSettings: SettingsData = {
        ...settings,
        headerStruk: targetBranch.namaLaundry || settings.headerStruk,
        address: targetBranch.alamat || settings.address,
        phoneNumber: targetBranch.nomorTelepon || settings.phoneNumber,
      };
      setSettings(syncedSettings);
      StorageService.set('settings', syncedSettings);
    }
  };

  const handleSaveTransaction = (
    data: Omit<Transaksi, 'id'> & { id?: string },
    items: LayananItem[]
  ) => {
    const now = Date.now();
    if (data.id) {
      // Edit existing
      const oldTrx = transaksiList.find((t) => t.id === data.id);
      const isNowLunas = data.statusPembayaran === 'Lunas';
      const wasLunas = oldTrx?.statusPembayaran === 'Lunas';
      let tanggalPelunasan = data.tanggalPelunasan;
      if (isNowLunas && !wasLunas) {
        tanggalPelunasan = now;
      } else if (!isNowLunas) {
        tanggalPelunasan = null;
      } else if (isNowLunas && wasLunas && !tanggalPelunasan) {
        tanggalPelunasan = oldTrx?.tanggalPelunasan || oldTrx?.tanggalMasuk || now;
      }

      const updatedTrx = {
        ...data,
        id: data.id,
        tanggalPelunasan,
      } as Transaksi;

      const updatedList = transaksiList.map((t) =>
        t.id === data.id ? updatedTrx : t
      );
      updateTransaksiList(updatedList);
      FirebaseSyncService.saveTransaksi(updatedTrx).catch(console.error);
      setNavHistory([]);
      navHistoryRef.current = [];
      setSelectedTransaksiId(data.id);
      setReceiptModalTrx(updatedTrx);
      setActiveView('dashboard');
    } else {
      // Create new - check monthly quota
      const limits = getLaundryLimits(activeTier);
      if (currentMonthTransactions.length >= limits.maxMonthlyTransactions) {
        toast.warning(
          limits.tier === 'newcomer'
            ? `Batas kuota 50 nota transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai.`
            : `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai.`
        );
        handleOpenUpgradeModal(
          limits.tier === 'newcomer'
            ? `Batas kuota 50 transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai`
            : `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai`
        );
        return;
      }

      const dateKey = formatLocalInvoiceDateKey(now);
      const countToday =
        transaksiList.filter((t) => t.nomorTransaksi?.startsWith(dateKey)).length + 1;
      const newInvoice = `${dateKey}/${countToday}`;

      const currentBranchId = data.laundryId || activeLaundryId || activeLaundry.id || 'lnd-1';
      const newTrx: Transaksi = {
        ...data,
        id: `trx-${now}`,
        laundryId: currentBranchId,
        nomorTransaksi: newInvoice,
        tanggalPelunasan: data.statusPembayaran === 'Lunas' ? now : null,
        items,
      };

      const updatedList = [newTrx, ...transaksiList];
      updateTransaksiList(updatedList);
      FirebaseSyncService.saveTransaksi(newTrx).catch(console.error);

      // Save customer contact if new (check customer limit)
      if (data.namaPelanggan) {
        const existingCust = pelangganList.find(
          (p) => p.nama.toLowerCase() === data.namaPelanggan.toLowerCase()
        );
        if (!existingCust) {
          if (pelangganList.length >= limits.maxCustomers) {
            toast.warning(
              `Batas ${limits.maxCustomers} data pelanggan untuk ${limits.label} telah tercapai. Data kontak baru tidak disimpan ke buku pelanggan.`
            );
          } else {
            const newCust: Pelanggan = {
              id: `pel-${Date.now()}`,
              laundryId: activeLaundryId,
              nama: data.namaPelanggan,
              nomorTelepon: data.nomorTelepon,
              alamat: data.alamat,
              poin: 0,
            };
            updatePelangganList([...pelangganList, newCust]);
            FirebaseSyncService.savePelanggan(newCust).catch(console.error);
          }
        } else if (data.nomorTelepon || data.alamat) {
          const updatedCust = {
            ...existingCust,
            nomorTelepon: data.nomorTelepon || existingCust.nomorTelepon,
            alamat: data.alamat || existingCust.alamat,
          };
          updatePelangganList(
            pelangganList.map((p) => (p.id === existingCust.id ? updatedCust : p))
          );
          FirebaseSyncService.savePelanggan(updatedCust).catch(console.error);
        }
      }

      setNavHistory([]);
      navHistoryRef.current = [];
      setSelectedTransaksiId(newTrx.id);
      setReceiptModalTrx(newTrx);
      setActiveView('dashboard');
    }
  };

  const handleDeleteTransaction = (transaksiId: string) => {
    if (currentUser?.role !== 'owner') {
      toast.warning('Akses Dibatasi: Hanya Owner yang berhak menghapus nota transaksi.');
      return;
    }
    updateTransaksiList(transaksiList.filter((t) => t.id !== transaksiId));
    FirebaseSyncService.deleteTransaksi(activeLaundryId, transaksiId).catch(console.error);
    navigateBack();
  };

  const handleAmbilTransaksi = (trx: Transaksi) => {
    const now = Date.now();
    const updated: Transaksi = {
      ...trx,
      status: 'Diambil' as const,
      statusPembayaran: 'Lunas' as const,
      tanggalPengambilan: now,
      tanggalPelunasan: trx.statusPembayaran === 'Lunas' ? (trx.tanggalPelunasan || trx.tanggalMasuk) : now,
    };
    updateTransaksiList(
      transaksiList.map((t) => (t.id === trx.id ? updated : t))
    );
    FirebaseSyncService.saveTransaksi(updated).catch(console.error);
  };

  const handleAmbilBanyakTransaksi = (list: Transaksi[]) => {
    if (!list || list.length === 0) return;
    const now = Date.now();
    const updatedIds = new Set(list.map((t) => t.id));
    const updatedList = transaksiList.map((t) => {
      if (updatedIds.has(t.id)) {
        return {
          ...t,
          status: 'Diambil' as const,
          statusPembayaran: 'Lunas' as const,
          tanggalPengambilan: now,
          tanggalPelunasan: t.statusPembayaran === 'Lunas' ? (t.tanggalPelunasan || t.tanggalMasuk) : now,
        };
      }
      return t;
    });
    updateTransaksiList(updatedList);
    const updatedBatch = list.map((t) => ({
      ...t,
      status: 'Diambil' as const,
      statusPembayaran: 'Lunas' as const,
      tanggalPengambilan: now,
      tanggalPelunasan: t.statusPembayaran === 'Lunas' ? (t.tanggalPelunasan || t.tanggalMasuk) : now,
    }));
    FirebaseSyncService.saveBatchTransaksi(updatedBatch).catch(console.error);
  };

  const handleSaveTransitionPickup = (data: TransitionPickupData) => {
    const now = Date.now();
    const nominal = data.nominal !== undefined
      ? Math.max(0, data.nominal)
      : (data.sudahLunasLama ? 0 : Math.max(0, data.sisaNominal || 0));

    const cleanNota = data.noNotaLama?.trim() || null;
    const nomorTrx = cleanNota || `TRANSISI-${String(now).slice(-5)}`;
    const isLunasStatus = data.isLunas !== false;

    const newTrx: Transaksi = {
      id: `trx-transisi-${now}`,
      userId: currentUser?.uid || 'user-local',
      laundryId: activeLaundryId,
      nomorTransaksi: nomorTrx,
      noNotaLama: cleanNota || undefined,
      namaPelanggan: data.namaPelanggan.trim(),
      namaPelanggan_lowercase: data.namaPelanggan.trim().toLowerCase(),
      nomorTelepon: data.nomorTelepon?.trim() || null,
      totalHarga: nominal,
      jumlahDp: 0,
      tanggalMasuk: now,
      tanggalSelesai: now,
      tanggalPengambilan: now,
      tanggalPelunasan: isLunasStatus ? now : null,
      status: 'Diambil',
      statusPembayaran: isLunasStatus ? 'Lunas' : 'Belum Lunas',
      metodePembayaran: data.metodePembayaran,
      metodePembayaranDetail: data.metodePembayaranDetail || data.metodePembayaran,
      isTransisi: true,
      catatan: data.catatan
        ? (cleanNota ? `${data.catatan} (Nota Lama #${cleanNota})` : data.catatan)
        : (cleanNota ? `Transisi Nota Lama #${cleanNota}` : 'Transisi Nota Lama'),
      items: [
        {
          itemId: 1,
          laundryId: activeLaundryId,
          namaLayanan: data.catatan
            ? `Transisi: ${data.catatan}`
            : (cleanNota ? `Pelunasan Nota #${cleanNota}` : 'Pelunasan Cucian Transisi'),
          berat: 1,
          hargaPerKg: nominal,
          hargaSatuan: nominal,
          satuan: 'nota',
          subtotal: nominal,
        },
      ],
    };

    const updatedList = [newTrx, ...transaksiList];
    updateTransaksiList(updatedList);
    FirebaseSyncService.saveTransaksi(newTrx).catch(console.error);

    if (data.namaPelanggan) {
      const existingCust = pelangganList.find(
        (p) => p.nama.toLowerCase() === data.namaPelanggan.trim().toLowerCase()
      );
      if (!existingCust) {
        const limits = getLaundryLimits(activeTier);
        if (pelangganList.length < limits.maxCustomers) {
          const newCust: Pelanggan = {
            id: `pel-${now}`,
            laundryId: activeLaundryId,
            nama: data.namaPelanggan.trim(),
            nomorTelepon: data.nomorTelepon?.trim() || null,
            poin: 0,
          };
          updatePelangganList([...pelangganList, newCust]);
          FirebaseSyncService.savePelanggan(newCust).catch(console.error);
        }
      }
    }

    toast.success(
      `Cucian ${data.namaPelanggan}${cleanNota ? ` (Nota #${cleanNota})` : ''} diserahkan${
        nominal > 0 ? ` & uang ${formatRupiah(nominal)} masuk ke kas hari ini!` : '!'
      }`
    );

    if (data.bukaStruk) {
      setSelectedTransaksiId(newTrx.id);
      setReceiptModalTrx(newTrx);
    }
  };

  // Active uncollected orders for current branch
  const activeUncollectedTrx = useMemo(() => {
    return transaksiList.filter(
      (t) => t.laundryId === activeLaundryId && t.status !== 'Diambil'
    );
  }, [transaksiList, activeLaundryId]);

  // Transaksi bulan berjalan untuk cabang aktif (kuota per bulan)
  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return transaksiList.filter(
      (t) => t.laundryId === activeLaundryId && (t.tanggalMasuk || 0) >= startOfMonth
    );
  }, [transaksiList, activeLaundryId]);

  const handleRequestNewTransaksi = () => {
    const limits = getLaundryLimits(activeTier);
    if (currentMonthTransactions.length >= limits.maxMonthlyTransactions) {
      toast.warning(
        limits.tier === 'newcomer'
          ? `Batas kuota 50 nota transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai.`
          : `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai.`
      );
      handleOpenUpgradeModal(
        limits.tier === 'newcomer'
          ? `Batas kuota 50 transaksi per bulan untuk Paket Newcomer (Gratis) telah tercapai`
          : `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai`
      );
      return;
    }
    if (activeUncollectedTrx.length >= 300) {
      setIsLimitModalOpen(true);
    } else {
      navigateTo('tambah_edit', { transaksiToEdit: null });
    }
  };

  const TOUR_DEMO_TRX_ID = 'demo-trx-tour';

  const handleStartTour = () => {
    // Pastikan ada transaksi contoh demo untuk langkah 4, 5, 6 jika belum ada transaksi di antrean
    const demoNeeded = transaksiList.length === 0 || !transaksiList.some((t) => t.id === TOUR_DEMO_TRX_ID);
    if (demoNeeded) {
      const demoTrx: Transaksi = {
        id: TOUR_DEMO_TRX_ID,
        laundryId: activeLaundryId,
        nomorTransaksi: 'DEMO/TUR/01',
        namaPelanggan: 'Budi Santoso (Demo Tur)',
        nomorTelepon: '08123456789',
        alamat: 'Jl. Merdeka No. 45',
        totalHarga: 25000,
        diskon: 0,
        jumlahDp: 25000,
        tanggalMasuk: Date.now(),
        tanggalSelesai: Date.now() + 24 * 3600 * 1000,
        status: 'Diterima',
        statusPembayaran: 'Lunas',
        tanggalPelunasan: Date.now(),
        catatan: 'Pesanan simulasi panduan kasir',
        metodePembayaran: 'Tunai',
        metodePembayaranDetail: 'Tunai',
        items: [
          {
            itemId: 1,
            laundryId: activeLaundryId,
            namaLayanan: 'Cuci Komplit Reguler',
            berat: 3,
            hargaPerKg: 7000,
            hargaSatuan: 7000,
            satuan: 'Kg',
            subtotal: 21000,
          },
          {
            itemId: 2,
            laundryId: activeLaundryId,
            namaLayanan: 'Parfum Ekstra Wangi',
            berat: 1,
            hargaPerKg: 4000,
            hargaSatuan: 4000,
            satuan: 'Pcs',
            subtotal: 4000,
          },
        ],
      };
      setTransaksiList((prev) => [demoTrx, ...prev.filter((t) => t.id !== TOUR_DEMO_TRX_ID)]);
      setSelectedTransaksiId(TOUR_DEMO_TRX_ID);
    } else {
      setSelectedTransaksiId(transaksiList[0].id);
    }

    setTourStep(0);
    setActiveView('dashboard');
    setIsTourActive(true);
  };

  const handleTourStepChange = (newStep: number) => {
    setTourStep(newStep);
    const stepDef = TOUR_STEPS[newStep];
    if (stepDef) {
      if (stepDef.view === 'dashboard') {
        if (newStep === 4) {
          // Langkah 5: Tombol Proses ("Kerjakan" status Diterima)
          setTransaksiList((prev) =>
            prev.map((t) => (t.id === TOUR_DEMO_TRX_ID ? { ...t, status: 'Diterima' } : t))
          );
        } else if (newStep === 5) {
          // Langkah 6: Tombol Diambil ("Serahkan" status Selesai)
          setTransaksiList((prev) =>
            prev.map((t) => (t.id === TOUR_DEMO_TRX_ID ? { ...t, status: 'Selesai' } : t))
          );
        }
        setActiveView('dashboard');
      } else if (stepDef.view === 'tambah_edit') {
        setTransaksiToEdit(null);
        setActiveView('tambah_edit');
      } else if (stepDef.view === 'detail_transaksi') {
        const targetId = transaksiList.some((t) => t.id === TOUR_DEMO_TRX_ID)
          ? TOUR_DEMO_TRX_ID
          : (transaksiList[0]?.id || null);
        setSelectedTransaksiId(targetId);
        setActiveView('detail_transaksi');
      }
    }
  };

  const handleFinishTour = () => {
    setIsTourActive(false);
    setTourStep(0);
    // Bersihkan transaksi demo tur agar tidak mengotori buku kas & laporan asli
    setTransaksiList((prev) => prev.filter((t) => t.id !== TOUR_DEMO_TRX_ID));
    setActiveView('dashboard');
    toast.success('Selamat! Anda telah menyelesaikan tur panduan operasional kasir.');
  };

  const handleCloseTour = () => {
    setIsTourActive(false);
    setTransaksiList((prev) => prev.filter((t) => t.id !== TOUR_DEMO_TRX_ID));
    setActiveView('dashboard');
  };

  const handleProceedCreateNewFromLimit = () => {
    if (activeTier === 'newcomer' && activeUncollectedTrx.length >= 400) {
      toast.warning(
        'Transaksi aktif telah mencapai batas maksimal (400 pesanan). Harap arsipkan pesanan terlebih dahulu sebelum membuat transaksi baru.'
      );
      return;
    }
    setIsLimitModalOpen(false);
    navigateTo('tambah_edit', { transaksiToEdit: null });
  };

  const handleSaveCustomer = (cust: Pelanggan) => {
    const limits = getLaundryLimits(activeTier);
    const exists = pelangganList.some((p) => p.id === cust.id);
    if (!exists && pelangganList.length >= limits.maxCustomers) {
      toast.warning(
        `Batas maksimal ${limits.maxCustomers} data pelanggan telah tercapai. Fitur kapasitas pelanggan lebih besar hanya untuk Paket Premium.`
      );
      return;
    }
    const updated = exists
      ? pelangganList.map((p) => (p.id === cust.id ? cust : p))
      : [...pelangganList, cust];
    updatePelangganList(updated);
    FirebaseSyncService.savePelanggan(cust).catch(console.error);
  };

  const handleDeleteCustomer = (id: string) => {
    updatePelangganList(pelangganList.filter((p) => p.id !== id));
  };

  const handleSaveLayanan = (lay: Layanan) => {
    const limits = getLaundryLimits(activeTier);
    const exists = layananList.some((l) => l.id === lay.id);
    if (!exists && layananList.length >= limits.maxServices) {
      toast.warning(
        `Batas maksimal ${limits.maxServices} jenis layanan telah tercapai. Fitur penambahan layanan lebih banyak hanya untuk Paket Premium.`
      );
      return;
    }
    const updated = exists
      ? layananList.map((l) => (l.id === lay.id ? lay : l))
      : [...layananList, lay];
    updateLayananList(updated);
    FirebaseSyncService.saveLayanan(lay).catch(console.error);
  };

  const handleDeleteLayanan = (id: string) => {
    updateLayananList(layananList.filter((l) => l.id !== id));
    FirebaseSyncService.deleteLayanan(activeLaundryId, id).catch(console.error);
  };

  const handleAddLaundry = (
    nama: string,
    alamat?: string,
    telepon?: string,
    copyFromId?: string
  ) => {
    const isExtraBranch = laundries.length >= 1;
    const EXTRA_COST = EXTRA_BRANCH_PRICE;

    if (isExtraBranch && currentUser) {
      if ((currentUser.walletBalance || 0) < EXTRA_COST) {
        toast.warning(
          `Saldo dompet tidak mencukupi (${formatRupiah(EXTRA_COST)}). Silakan top up saldo terlebih dahulu.`
        );
        return;
      }

      const updatedUser: User = {
        ...currentUser,
        walletBalance: Math.max(0, (currentUser.walletBalance || 0) - EXTRA_COST),
      };
      setCurrentUser(updatedUser);
      StorageService.set('active_user', updatedUser);
      FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);

      const newHist: SubscriptionHistory = {
        id: `hist-${Date.now()}`,
        ownerId: currentUser.uid,
        packageName: `Aktivasi Slot Cabang Baru: ${nama}`,
        cost: EXTRA_COST,
        purchaseDate: Date.now(),
        durationDays: 30,
        newExpiryDate: currentUser.subscriptionEndDate || Date.now() + 30 * 24 * 3600 * 1000,
        laundries: [nama],
      };
      const updatedHist = [newHist, ...subscriptionHistory];
      setSubscriptionHistory(updatedHist);
      StorageService.set('subscription_history', updatedHist);
    }

    const newLndId = `lnd-${Date.now()}`;
    const newLnd: Laundry = {
      id: newLndId,
      ownerId: currentUser?.uid || 'own-1',
      namaLaundry: nama,
      alamat: alamat || null,
      nomorTelepon: telepon || null,
      subscriptionType: currentUser?.subscriptionType || activeTier,
      subscriptionEndDate: currentUser?.subscriptionEndDate ?? null,
    };
    updateLaundries([...laundries, newLnd]);
    FirebaseSyncService.saveLaundry(newLnd).catch(console.warn);

    if (copyFromId) {
      const sourceLayanan = layananList.filter((l) => l.laundryId === copyFromId);
      const clonedLayanan = sourceLayanan.map((l, i) => ({
        ...l,
        id: `lay-${Date.now()}-${i}`,
        laundryId: newLndId,
      }));
      updateLayananList([...layananList, ...clonedLayanan]);
    }

    setActiveLaundryId(newLndId);
    toast.success(
      isExtraBranch
        ? `Cabang '${nama}' berhasil diaktifkan dengan biaya ${formatRupiah(EXTRA_COST)}!`
        : `Cabang '${nama}' berhasil dibuat!`
    );
  };

  const handleUpdateLaundry = (lnd: Laundry) => {
    setLaundries((prev) => {
      const exists = prev.some((l) => l.id === lnd.id);
      const updated = exists ? prev.map((l) => (l.id === lnd.id ? lnd : l)) : [...prev, lnd];
      StorageService.set('laundries', updated);
      return updated;
    });
    FirebaseSyncService.saveLaundry(lnd).catch(console.warn);

    if (currentUser) {
      const isPrimaryBranch = !currentUser.laundryId || currentUser.laundryId === lnd.id;
      const updatedUser: User = {
        ...currentUser,
        laundries: {
          ...(currentUser.laundries || {}),
          [lnd.id]: lnd.namaLaundry,
        },
        ...(isPrimaryBranch && lnd.nomorTelepon !== undefined
          ? { nomorTelepon: lnd.nomorTelepon || '' }
          : {}),
      };
      setCurrentUser(updatedUser);
      StorageService.set('active_user', updatedUser);
      FirebaseSyncService.updateUserProfile(updatedUser).catch(console.warn);
    }

    if (lnd.id === activeLaundryId) {
      setSettings((prev) => {
        const updatedSettings: SettingsData = {
          ...prev,
          headerStruk: lnd.namaLaundry,
          appTitle: lnd.namaLaundry || prev.appTitle,
          address: lnd.alamat || '',
          phoneNumber: lnd.nomorTelepon || '',
        };
        StorageService.set('settings', updatedSettings);
        FirebaseSyncService.saveSettings(lnd.id, updatedSettings).catch(console.error);
        return updatedSettings;
      });
    }
  };

  const handleDeleteLaundry = (laundryId: string) => {
    if (laundries.length <= 1) return;
    const remaining = laundries.filter((l) => l.id !== laundryId);
    updateLaundries(remaining);
    if (activeLaundryId === laundryId) {
      setActiveLaundryId(remaining[0].id);
    }
  };

  const handleAddKasir = async (
    nama: string,
    email: string,
    pass: string,
    laundryId: string
  ): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'owner') {
      toast.error('Hanya Owner yang dapat mendaftarkan akun kasir.');
      return false;
    }

    const limits = getLaundryLimits(activeTier);

    if (limits.tier === 'newcomer' || limits.maxCashiers <= 0) {
      toast.warning('Fitur pembuatan akun kasir tambahan hanya untuk Paket Premium.');
      return false;
    }

    const branchAdmins = staffList.filter(
      (s) => s.laundryId === laundryId && (s.role === 'admin' || s.role === 'karyawan')
    );
    if (branchAdmins.length >= limits.maxAdminPerOutlet) {
      toast.warning('Cabang outlet ini sudah memiliki 1 admin kasir aktif.');
      return false;
    }

    const totalCashiers = staffList.filter((s) => s.role === 'admin' || s.role === 'karyawan').length;
    if (totalCashiers >= laundries.length) {
      toast.warning('Semua cabang laundry yang Anda kelola sudah memiliki 1 admin kasir.');
      return false;
    }

    const targetBranch = laundries.find((l) => l.id === laundryId) || activeLaundry;

    try {
      const createdKasir = await FirebaseSyncService.provisionCashierAccount({
        nama,
        emailOrPhone: email,
        password: pass,
        laundry: targetBranch,
        owner: currentUser,
      });
      updateStaffList([...staffList.filter((s) => s.uid !== createdKasir.uid), createdKasir]);
      toast.success(`Akun kasir '${nama}' berhasil didaftarkan & siap login dari HP kasir!`);
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mendaftarkan akun kasir di server.');
      return false;
    }
  };

  const handleDeleteKasir = async (uid: string) => {
    const target = staffList.find((u) => u.uid === uid);
    try {
      await FirebaseSyncService.deleteCashierAccount(target?.laundryId || activeLaundryId, uid);
      updateStaffList(staffList.filter((u) => u.uid !== uid));
      toast.success('Akun kasir berhasil dihapus.');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus akun kasir.');
    }
  };

  const handleMidtransSettled = (result: MidtransVerifyResult) => {
    if (!currentUser || result.status !== 'settled') return;

    const nextWallet =
      typeof result.walletBalance === 'number' ? result.walletBalance : currentUser.walletBalance;
    const nextSubType = result.subscriptionType || currentUser.subscriptionType || 'newcomer';
    const nextSubEnd =
      result.subscriptionEndDate !== undefined
        ? result.subscriptionEndDate
        : currentUser.subscriptionEndDate ?? null;

    const updatedUser: User = {
      ...currentUser,
      walletBalance: nextWallet,
      subscriptionType: nextSubType,
      subscriptionEndDate: nextSubEnd,
      lastSettledOrderId: result.orderId,
    };

    setCurrentUser(updatedUser);
    StorageService.set('active_user', updatedUser);

    const resolvedTier = normalizeTier(nextSubType);
    setActiveTier(resolvedTier);
    StorageService.set('active_subscription_tier', resolvedTier);

    if (result.purpose === 'extend_premium') {
      const nextBranches = laundries.map((l) => ({
        ...l,
        subscriptionType: 'premium',
        subscriptionEndDate: nextSubEnd,
      }));
      updateLaundries(nextBranches);
      FirebaseSyncService.syncBranchesSubscription(nextBranches, 'premium', nextSubEnd).catch(
        console.warn
      );
    }

    if (!result.alreadyCredited) {
      const amount = result.amount || HARGA_PREMIUM_BULANAN;
      const days = result.durationDays || 0;
      const historyItem: SubscriptionHistory = {
        id: result.orderId || `sub-${Date.now()}`,
        ownerId: currentUser.uid,
        purchaseDate: Date.now(),
        packageName:
          result.purpose === 'extend_premium'
            ? `Paket Premium Midtrans (${days || 30} Hari)`
            : `Top Up Saldo Midtrans (${formatRupiah(amount)})`,
        cost: amount,
        durationDays: days,
        newExpiryDate: nextSubEnd || 0,
        laundries: laundries.map((l) => l.id),
      };
      const newHist = [historyItem, ...subscriptionHistory];
      setSubscriptionHistory(newHist);
      StorageService.set('subscription_history', newHist);
    }
  };

  const handleExtendSubscription = (packageName: string, cost: number, days: number) => {
    if (!currentUser) return;
    if ((currentUser.walletBalance || 0) < cost) {
      toast.warning(`Saldo dompet tidak mencukupi (${formatRupiah(cost)}). Pilih Lewat Midtrans atau Transfer Biasa.`);
      setGlobalPaymentModal({
        open: true,
        purpose: 'extend_premium',
        method: 'midtrans',
        nominal: cost,
      });
      return;
    }

    const currentEnd = Math.max(Date.now(), currentUser.subscriptionEndDate || Date.now());
    const newEnd = currentEnd + days * 24 * 60 * 60 * 1000;

    const updatedUser: User = {
      ...currentUser,
      walletBalance: Math.max(0, currentUser.walletBalance - cost),
      subscriptionEndDate: newEnd,
      subscriptionType: 'premium',
    };
    setCurrentUser(updatedUser);
    StorageService.set('active_user', updatedUser);
    setActiveTier('premium');
    StorageService.set('active_subscription_tier', 'premium');

    const nextBranches = laundries.map((l) => ({
      ...l,
      subscriptionType: 'premium',
      subscriptionEndDate: newEnd,
    }));
    updateLaundries(nextBranches);

    const historyItem: SubscriptionHistory = {
      id: `sub-${Date.now()}`,
      ownerId: currentUser.uid,
      purchaseDate: Date.now(),
      packageName,
      cost,
      durationDays: days,
      newExpiryDate: newEnd,
      laundries: laundries.map((l) => l.id),
    };
    const newHist = [historyItem, ...subscriptionHistory];
    setSubscriptionHistory(newHist);
    StorageService.set('subscription_history', newHist);

    FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);
    FirebaseSyncService.syncBranchesSubscription(nextBranches, 'premium', newEnd).catch(console.warn);
  };

  const handleUpdateOwnerProfile = (data: { displayName: string; nomorTelepon?: string | null }) => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      displayName: data.displayName.trim(),
      username: data.displayName.trim(),
      nomorTelepon: data.nomorTelepon?.trim() || null,
    };
    setCurrentUser(updatedUser);
    StorageService.set('active_user', updatedUser);

    const users = StorageService.get<User[]>('users', []);
    const updatedUsers = users.map((u) => (u.uid === updatedUser.uid ? updatedUser : u));
    StorageService.set('users', updatedUsers);

    // Sinkronisasi profil ke Firestore
    FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);
  };

  const handleSavePengeluaran = (peng: Omit<Pengeluaran, 'id'>) => {
    const newPeng: Pengeluaran = {
      ...peng,
      id: `pg-${Date.now()}`,
      laundryId: activeLaundryId,
    };
    updatePengeluaranList([newPeng, ...pengeluaranList]);
    FirebaseSyncService.savePengeluaran(newPeng).catch(console.error);
    toast.success('Pengeluaran berhasil dicatat!');
  };

  const handleSavePemasukan = (pem: ArusKas) => {
    const updated = [pem, ...manualCashLogs];
    setManualCashLogs(updated);
    StorageService.set('manual_cash_logs', updated);
    toast.success('Pemasukan manual berhasil dicatat!');
  };



  // Selected Transaction Object
  const currentSelectedTransaksi =
    transaksiList.find((t) => t.id === selectedTransaksiId) || null;

  // Real-time device detection (Phone / Mobile vs PC / Desktop / Tablet)
  const device = useDeviceDetect();
  const isEffectiveMobile = device.isMobile;
  const showDesktopSidebar =
    !isEffectiveMobile &&
    activeView !== 'splash' &&
    activeView !== 'auth' &&
    !!currentUser;

  const handleLogoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    setActiveTier('newcomer');
    StorageService.set('active_user', null);
    StorageService.set('active_subscription_tier', null);
    StorageService.set('has_customized_settings', false);
    StorageService.clearAllDummyData();
    setSettings(defaultSettings);
    setTransaksiList([]);
    setPelangganList([]);
    setPengeluaranList([]);
    setManualCashLogs([]);
    setLaundries([]);
    StorageService.set('last_global_sync', 0);
    setActiveView('auth');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start text-slate-800 antialiased selection:bg-[#800000] selection:text-white">
      {/* Offline Toast */}
      <OfflineIndicator />

      {/* Main Container: Full Web App Shell with Sidebar on PC/Tablet, Original Container on HP */}
      <div
        className={
          showDesktopSidebar
            ? 'w-full h-screen overflow-hidden bg-slate-100 flex flex-row'
            : `w-full max-w-6xl bg-slate-100 ${
                activeView === 'dashboard' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
              } relative flex flex-col overflow-x-hidden`
        }
      >
        {showDesktopSidebar && currentUser && (
          <DesktopSidebar
            activeView={activeView}
            onSelectView={(v) => {
              if (v === 'dashboard') {
                setNavHistory([]);
                navHistoryRef.current = [];
                setActiveView('dashboard');
              } else {
                navigateTo(v);
              }
            }}
            onOpenNewTransaksi={handleRequestNewTransaksi}
            onOpenAturKas={() => setIsAturKasOpen(true)}
            onOpenSwitchBranch={() => setIsSwitchBranchOpen(true)}
            onLogout={handleLogoutUser}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            laundries={laundries}
            transaksiList={transaksiList}
            pelangganCount={pelangganList.filter((p) => p.laundryId === activeLaundryId).length || pelangganList.length}
            layananCount={layananList.filter((l) => l.laundryId === activeLaundryId).length || layananList.length}
            currentTier={activeTier}
            onOpenUpgradeModal={handleOpenUpgradeModal}
            onOpenExpiredModal={() => setIsExpiredModalOpen(true)}
          />
        )}

        <div
          className={
            showDesktopSidebar
              ? 'flex-1 h-full overflow-y-auto relative flex flex-col min-w-0 bg-slate-100'
              : 'contents'
          }
        >
        {/* VIEW ROUTER */}
        {activeView === 'splash' && (
          <SplashView
            appName={settings.headerStruk || "Kafela's Laundry"}
            onFinish={() => {
              safeSetSessionItem('has_seen_splash', '1');
              if (currentUser) {
                setActiveView('dashboard');
              } else {
                setActiveView('auth');
              }
            }}
          />
        )}

        {(activeView === 'auth' || (activeView !== 'splash' && !currentUser)) && (
          <AuthView
            ownerUser={defaultOwnerUser}
            staffList={staffList}
            initialSignUp={initialSignUpMode}
            onOpenLandingPage={() => {
              window.location.href = '/landing.html';
            }}
            onLoginSuccess={async (user) => {
              setInitialSignUpMode(false);
              setCurrentUser(user);
              const resolvedTier = normalizeTier(user.subscriptionType);
              setActiveTier(resolvedTier);
              StorageService.set('active_subscription_tier', resolvedTier);
              StorageService.set('active_user', user);
              await loadFirestoreData(user, true);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'dashboard' && currentUser && (
          <DashboardView
            transaksiList={transaksiList}
            pelangganList={pelangganList}
            settings={settings}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            laundries={laundries}
            pengeluaranList={pengeluaranList}
            isMobile={isEffectiveMobile}
            deviceInfo={device}
            currentTier={activeTier}
            onOpenUpgradeModal={handleOpenUpgradeModal}
            onOpenExpiredModal={() => setIsExpiredModalOpen(true)}
            onOpenNewTransaksi={handleRequestNewTransaksi}
            onOpenTour={handleStartTour}
            onOpenLimitModal={() => setIsLimitModalOpen(true)}
            onOpenDetailTransaksi={(id) => {
              navigateTo('detail_transaksi', { transaksiId: id });
            }}
            onOpenArsip={() => navigateTo('arsip')}
            onOpenSettings={() => navigateTo('settings')}
            onOpenStatusPengerjaan={() => navigateTo('status_pengerjaan')}
            onOpenBukuKas={() => navigateTo('buku_kas')}
            onOpenLaporan={() => navigateTo('laporan')}
            onOpenAturKas={() => setIsAturKasOpen(true)}
            onOpenSwitchBranch={() => setIsSwitchBranchOpen(true)}
            onSelectBranch={handleSelectBranch}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenKelolaPelanggan={() => navigateTo('kelola_pelanggan')}
            onOpenKelolaLayanan={() => navigateTo('kelola_layanan')}
            onOpenKelolaOwner={() => navigateTo('kelola_owner')}
            onSyncCloudData={() => loadFirestoreData(currentUser, true)}
            onSelesaikanTransaksi={(trx) => {
              if (trx.status === 'Diterima') {
                const isHitungKerjaStaf = settings.hitungKerjaStaf ?? true;
                if (isHitungKerjaStaf && staffList.length > 0) {
                  setTrxForAssignStaff(trx);
                } else {
                  const loginUserName = isHitungKerjaStaf ? (currentUser?.displayName || 'Kasir') : null;
                  const autoFinish = settings.selesaikanSaatDitugaskan;
                  const updated = {
                    ...trx,
                    status: autoFinish ? ('Selesai' as const) : ('Proses' as const),
                    dikerjakanOleh: loginUserName,
                    tanggalDitugaskan: isHitungKerjaStaf ? Date.now() : null,
                    tanggalStatusSelesai: autoFinish ? Date.now() : null,
                  };
                  updateTransaksiList(
                    transaksiList.map((t) => (t.id === trx.id ? updated : t))
                  );
                  if (autoFinish) {
                    toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai & siap diambil!`);
                  } else {
                    toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} mulai dikerjakan!`);
                  }
                }
              } else if (trx.status === 'Proses') {
                const updated = {
                  ...trx,
                  status: 'Selesai' as const,
                  tanggalStatusSelesai: Date.now(),
                };
                updateTransaksiList(
                  transaksiList.map((t) => (t.id === trx.id ? updated : t))
                );
                toast.success(`Pesanan ${trx.nomorTransaksi || trx.namaPelanggan} selesai & siap diambil!`);
              }
            }}
            onAmbilTransaksi={handleAmbilTransaksi}
            onAmbilBanyakTransaksi={handleAmbilBanyakTransaksi}
            onSaveTransitionPickup={handleSaveTransitionPickup}
            onUpdateSettings={updateSettings}
          />
        )}

        {activeView === 'tambah_edit' && (
          !transaksiToEdit && activeTier === 'newcomer' && activeUncollectedTrx.length >= 400 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 border border-red-200 shadow-xl space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-inner">
                  <Lock className="w-8 h-8 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
                    Batas Penuh (Maks. 400)
                  </span>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    Pembuatan Transaksi Baru Dikunci
                  </h2>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Terdapat <strong className="text-red-600 font-black">{activeUncollectedTrx.length} pesanan aktif belum diambil</strong> di cabang ini.
                  Sistem mengunci pembuatan transaksi baru sampai ada progres pengarsipan transaksi lama.
                </p>
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsLimitModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition active:scale-95"
                  >
                    Buka Opsi Pengarsipan Cepat
                  </button>
                  <button
                    type="button"
                    onClick={navigateBack}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition active:scale-95"
                  >
                    Kembali ke Halaman Sebelumnya
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <TambahEditView
              onBack={navigateBack}
              layananList={layananList}
              pelangganList={pelangganList}
              settings={settings}
              currentUser={currentUser}
              activeLaundryId={activeLaundryId}
              transaksiToEdit={transaksiToEdit}
              onSave={handleSaveTransaction}
            />
          )
        )}

        {activeView === 'detail_transaksi' && currentUser && (
          currentSelectedTransaksi ? (
            <DetailTransaksiView
              onBack={navigateBack}
              transaksi={currentSelectedTransaksi}
              settings={settings}
              currentUser={currentUser}
              pelanggan={pelangganList.find(
                (p) =>
                  p.nama.toLowerCase() ===
                  currentSelectedTransaksi.namaPelanggan.toLowerCase()
              )}
              laundryName={activeLaundry?.namaLaundry || settings.headerStruk}
              laundryPhone={activeLaundry?.nomorTelepon || settings.phoneNumber}
              laundryAddress={activeLaundry?.alamat || settings.address}
              onEdit={(trx) => {
                navigateTo('tambah_edit', { transaksiToEdit: trx });
              }}
              onDelete={handleDeleteTransaction}
              onAmbil={(trx) => {
                handleAmbilTransaksi(trx);
                navigateBack();
              }}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <h3 className="text-base font-black text-slate-900">Nota Tidak Ditemukan</h3>
                <p className="text-xs text-slate-500">
                  Data transaksi yang dipilih sudah diarsipkan atau tidak tersedia.
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('dashboard', { clearHistory: true })}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          )
        )}

        {activeView === 'status_pengerjaan' && (
          <StatusPengerjaanView
            onBack={navigateBack}
            transaksiList={transaksiList}
            pelangganList={pelangganList}
            semuaLayanan={layananList}
            staffList={staffList}
            operationalStaffList={operationalStaffList}
            currentUser={currentUser}
            settings={settings}
            activeLaundryId={activeLaundryId}
            onOpenDetail={(id) => {
              navigateTo('detail_transaksi', { transaksiId: id });
            }}
            onUpdateTransaksi={(updated) => {
              updateTransaksiList(
                transaksiList.map((t) => (t.id === updated.id ? updated : t))
              );
            }}
            onAmbilTransaksi={handleAmbilTransaksi}
            onAmbilBanyakTransaksi={handleAmbilBanyakTransaksi}
            currentTier={activeTier}
            onOpenUpgradeModal={handleOpenUpgradeModal}
          />
        )}

        {activeView === 'buku_kas' && (
          <BukuKasView
            onBack={navigateBack}
            transaksiList={transaksiList}
            pelangganList={pelangganList}
            pengeluaranList={pengeluaranList}
            manualCashLogs={manualCashLogs}
            activeLaundryId={activeLaundryId}
            onOpenDetailTransaksi={(id) => {
              navigateTo('detail_transaksi', { transaksiId: id });
            }}
          />
        )}

        {activeView === 'laporan' && (
          currentUser && currentUser.role !== 'owner' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Akses Dibatasi (Owner Only)</h3>
                <p className="text-xs text-slate-500">Laporan Keuangan & Grafik Analisis Bisnis hanya dapat diakses oleh akun dengan peran Owner.</p>
                <button
                  type="button"
                  onClick={navigateBack}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <LaporanView
              onBack={navigateBack}
              transaksiList={transaksiList}
              pengeluaranList={pengeluaranList}
              activeLaundryId={activeLaundryId}
              laundryName={activeLaundry?.namaLaundry || settings.headerStruk || "Kafelas Laundry"}
              currentTier={activeTier}
              onOpenUpgradeModal={handleOpenUpgradeModal}
              laundries={laundries}
              onSelectBranch={handleSelectBranch}
              allTransaksiList={transaksiList}
            />
          )
        )}

        {activeView === 'arsip' && (
          <ArsipView
            onBack={navigateBack}
            transaksiList={transaksiList}
            pelangganList={pelangganList}
            activeLaundryId={activeLaundryId}
            onOpenDetailTransaksi={(id) => {
              navigateTo('detail_transaksi', { transaksiId: id });
            }}
            onRestoreTransaksi={(trx) => {
              const restored: Transaksi = {
                ...trx,
                status: 'Diterima',
                tanggalPengambilan: null,
                terakhirDieditPada: Date.now(),
              };
              const exists = transaksiList.some((t) => t.id === trx.id);
              const updatedList = exists
                ? transaksiList.map((t) => (t.id === trx.id ? restored : t))
                : [restored, ...transaksiList];
              updateTransaksiList(updatedList);
              IndexedDbService.restoreToActive(activeLaundryId, restored).catch(console.error);
              FirebaseSyncService.saveTransaksi(restored).catch(console.error);
            }}
          />
        )}

        {activeView === 'kelola_pelanggan' && (
          currentUser && currentUser.role !== 'owner' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Akses Dibatasi (Owner Only)</h3>
                <p className="text-xs text-slate-500">Master Data Pelanggan hanya dapat dikelola oleh akun dengan peran Owner.</p>
                <button
                  type="button"
                  onClick={navigateBack}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <KelolaPelangganView
              onBack={navigateBack}
              pelangganList={pelangganList}
              settings={settings}
              activeLaundryId={activeLaundryId}
              currentTier={activeTier}
              onSavePelanggan={handleSaveCustomer}
              onDeletePelanggan={handleDeleteCustomer}
              onOpenUpgradeModal={handleOpenUpgradeModal}
            />
          )
        )}

        {activeView === 'kelola_layanan' && (
          currentUser && currentUser.role !== 'owner' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Akses Dibatasi (Owner Only)</h3>
                <p className="text-xs text-slate-500">Pengaturan Daftar Harga Layanan hanya dapat diakses dan diubah oleh akun dengan peran Owner.</p>
                <button
                  type="button"
                  onClick={navigateBack}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <KelolaLayananView
              onBack={navigateBack}
              layananList={layananList}
              activeLaundryId={activeLaundryId}
              settings={settings}
              currentTier={activeTier}
              onSaveLayanan={handleSaveLayanan}
              onDeleteLayanan={handleDeleteLayanan}
              onReorderLayanan={updateLayananList}
              onOpenUpgradeModal={handleOpenUpgradeModal}
            />
          )
        )}

        {activeView === 'kelola_owner' && currentUser && (
          currentUser.role !== 'owner' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Akses Dibatasi (Owner Only)</h3>
                <p className="text-xs text-slate-500">Halaman Kelola Cabang & Owner hanya dapat diakses oleh akun dengan peran Owner.</p>
                <button
                  onClick={navigateBack}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <KelolaOwnerView
              onBack={navigateBack}
              currentUser={currentUser}
              laundries={laundries}
              activeLaundryId={activeLaundryId}
              subscriptionHistory={subscriptionHistory}
              onSelectLaundry={handleSelectBranch}
              onAddLaundry={handleAddLaundry}
              onUpdateLaundry={handleUpdateLaundry}
              onDeleteLaundry={handleDeleteLaundry}
              onExtendSubscription={handleExtendSubscription}
              onMidtransSettled={handleMidtransSettled}
              onUpdateOwnerProfile={handleUpdateOwnerProfile}
              onOpenUpgradeModal={handleOpenUpgradeModal}
              onOpenExpiredModal={() => setIsExpiredModalOpen(true)}
            />
          )
        )}

        {activeView === 'kelola_kasir' && currentUser && (
          currentUser.role !== 'owner' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-100 min-h-[75vh]">
              <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-slate-200 shadow-xl space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Lock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-black text-slate-900">Akses Dibatasi (Owner Only)</h3>
                <p className="text-xs text-slate-500">Halaman Kelola Akun Kasir hanya dapat diakses oleh akun dengan peran Owner.</p>
                <button
                  onClick={navigateBack}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <KelolaKasirView
              onBack={navigateBack}
              staffList={staffList}
              laundries={laundries}
              currentTier={activeTier}
              operationalStaffList={operationalStaffList}
              activeLaundryId={activeLaundryId}
              onAddKasir={handleAddKasir}
              onDeleteKasir={handleDeleteKasir}
              onAddOperationalStaff={handleAddOperationalStaff}
              onDeleteOperationalStaff={handleDeleteOperationalStaff}
              onOpenUpgradeModal={handleOpenUpgradeModal}
            />
          )
        )}

        {activeView === 'settings' && currentUser && (
          <SettingsView
            onBack={navigateBack}
            settings={settings}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            currentTier={activeTier}
            onUpdateSettings={updateSettings}
            onUpdateLaundry={handleUpdateLaundry}
            onOpenKelolaPelanggan={() => navigateTo('kelola_pelanggan')}
            onOpenKelolaLayanan={() => navigateTo('kelola_layanan')}
            onOpenKelolaOwner={() => navigateTo('kelola_owner')}
            onOpenKelolaKasir={() => navigateTo('kelola_kasir')}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenUpgradeModal={handleOpenUpgradeModal}
            onMidtransSettled={handleMidtransSettled}
            onUpdateOwnerProfile={handleUpdateOwnerProfile}
            onStartTour={handleStartTour}
            onLogout={handleLogoutUser}
          />
        )}
        </div>

        <AturKasModal
          isOpen={isAturKasOpen}
          onClose={() => setIsAturKasOpen(false)}
          isPemasukanEnabled={settings.pemasukanManualEnabled}
          daftarJenisPengeluaran={jenisPengeluaranList}
          daftarJenisPemasukan={jenisPemasukanList}
          onSavePengeluaran={handleSavePengeluaran}
          onSavePemasukan={handleSavePemasukan}
        />

        <SwitchBranchModal
          isOpen={isSwitchBranchOpen}
          onClose={() => setIsSwitchBranchOpen(false)}
          laundries={laundries}
          activeLaundryId={activeLaundryId}
          currentTier={activeTier}
          onSelectBranch={handleSelectBranch}
          onManageBranches={() => {
            setIsSwitchBranchOpen(false);
            navigateTo('kelola_owner');
          }}
          onOpenUpgradeModal={handleOpenUpgradeModal}
        />

        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentUser={currentUser}
          currentTier={activeTier}
          triggerReason={upgradeTriggerReason}
          onExtendWithWallet={() =>
            handleExtendSubscription('Paket Premium (30 Hari)', HARGA_PREMIUM_BULANAN, 30)
          }
          onChoosePayment={(method) =>
            setGlobalPaymentModal({
              open: true,
              purpose: 'extend_premium',
              method,
              nominal: HARGA_PREMIUM_BULANAN,
            })
          }
        />

        {currentUser && (
          <TopUpModal
            isOpen={globalPaymentModal.open}
            onClose={() => setGlobalPaymentModal((prev) => ({ ...prev, open: false }))}
            currentUser={currentUser}
            onMidtransSettled={handleMidtransSettled}
            initialPurpose={globalPaymentModal.purpose}
            initialMethod={globalPaymentModal.method}
            initialNominal={globalPaymentModal.nominal}
          />
        )}

        {currentUser && (
          <SubscriptionExpiredModal
            isOpen={isExpiredModalOpen}
            onClose={() => setIsExpiredModalOpen(false)}
            currentUser={currentUser}
            onExtendSubscription={handleExtendSubscription}
            onMidtransSettled={handleMidtransSettled}
            sisaHari={Math.max(
              0,
              Math.ceil(((currentUser.subscriptionEndDate || Date.now()) - Date.now()) / (1000 * 60 * 60 * 24))
            )}
          />
        )}

        <ApkPlaystoreModal
          isOpen={isApkModalOpen}
          onClose={() => setIsApkModalOpen(false)}
        />

        <LimitTransaksiModal
          isOpen={isLimitModalOpen}
          onClose={() => setIsLimitModalOpen(false)}
          uncollectedList={activeUncollectedTrx}
          currentTier={activeTier}
          onArsipSemua={handleAmbilBanyakTransaksi}
          onArsipTigaBulan={handleAmbilBanyakTransaksi}
          onArsipLunas={handleAmbilBanyakTransaksi}
          onOpenStatusPengerjaan={() => {
            setIsLimitModalOpen(false);
            navigateTo('status_pengerjaan');
          }}
          onProceedCreateNew={handleProceedCreateNewFromLimit}
        />

        {/* Modal Pilih Petugas Pengerjaan / Tugaskan Staf dari Dashboard */}
        <AssignStaffModal
          isOpen={!!trxForAssignStaff}
          onClose={() => setTrxForAssignStaff(null)}
          staffList={staffList}
          operationalStaffList={operationalStaffList}
          activeLaundryId={activeLaundryId}
          currentUser={currentUser}
          transaksi={trxForAssignStaff}
          onAssign={(staffName) => {
            if (!trxForAssignStaff) return;
            const autoFinish = settings.selesaikanSaatDitugaskan;
            const updated: Transaksi = {
              ...trxForAssignStaff,
              dikerjakanOleh: staffName,
              status: autoFinish ? 'Selesai' : 'Proses',
              tanggalDitugaskan: Date.now(),
              tanggalStatusSelesai: autoFinish ? Date.now() : null,
            };
            updateTransaksiList(
              transaksiList.map((t) => (t.id === trxForAssignStaff.id ? updated : t))
            );
            setTrxForAssignStaff(null);
          }}
        />

        {/* Modal Struk Transaksi / Lihat Nota Langsung setelah membuat transaksi */}
        <ReceiptModal
          isOpen={!!receiptModalTrx}
          onClose={() => setReceiptModalTrx(null)}
          transaksi={receiptModalTrx}
          settings={settings}
          pelanggan={
            receiptModalTrx
              ? pelangganList.find(
                  (p) =>
                    p.nama.toLowerCase() ===
                    receiptModalTrx.namaPelanggan.toLowerCase()
                )
              : null
          }
          laundryName={activeLaundry?.namaLaundry || undefined}
          laundryPhone={activeLaundry?.nomorTelepon || undefined}
          laundryAddress={activeLaundry?.alamat || undefined}
        />

        <InteractiveTourModal
          isOpen={isTourActive}
          onClose={handleCloseTour}
          currentStep={tourStep}
          onStepChange={handleTourStepChange}
          onRestart={() => handleTourStepChange(0)}
          onFinish={handleFinishTour}
        />

        {/* Floating Toast: Tekan sekali lagi untuk keluar */}
        {exitToast && (
          <div className="fixed bottom-7 left-1/2 -translate-x-1/2 z-100 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-slate-900/95 text-white text-xs font-semibold shadow-2xl backdrop-blur-md border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-none select-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span className="tracking-wide">Tekan sekali lagi untuk keluar</span>
          </div>
        )}
      </div>
    </div>
  );
}
