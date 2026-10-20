import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { FirebaseSyncService } from './utils/firebaseSync';
import { StorageService, defaultSettings, defaultOwnerUser } from './utils/storage';
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
import { LandingPageView } from './views/LandingPageView';

import { AturKasModal } from './components/AturKasModal';
import { SwitchBranchModal } from './components/SwitchBranchModal';
import { ApkPlaystoreModal } from './components/ApkPlaystoreModal';
import { LimitTransaksiModal } from './components/LimitTransaksiModal';
import { AssignStaffModal } from './components/AssignStaffModal';
import { ReceiptModal } from './components/ReceiptModal';
import { UpgradePlanModal } from './components/UpgradePlanModal';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { TransitionPickupData } from './components/QuickTransitionPickupModal';
import { LaundryTier, normalizeTier, getLaundryLimits, EXTRA_BRANCH_PRICE } from './utils/subscription';
import { formatRupiah, formatLocalInvoiceDateKey } from './utils/formatters';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DesktopSidebar } from './components/DesktopSidebar';
import { DemoBanner } from './components/DemoBanner';
import {
  demoOwnerUser,
  demoKasirUser,
  demoLaundries,
  demoSettings,
  demoLayananList,
  demoPelangganList,
  getDemoTransaksiList,
  getDemoPengeluaranList,
  getDemoManualCashLogs,
} from './utils/demoService';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import { Lock } from 'lucide-react';
import { useToast } from './components/NotificationContext';

type ViewType =
  | 'splash'
  | 'auth'
  | 'landing'
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

export default function App() {
  const toast = useToast();
  // Application State
  const [activeView, setActiveView] = useState<ViewType>(() => {
    const hasSeenSplash = typeof window !== 'undefined' && sessionStorage.getItem('has_seen_splash');
    const storedUser = StorageService.get<User | null>('active_user', null);
    if (hasSeenSplash) {
      return storedUser ? 'dashboard' : 'auth';
    }
    return 'splash';
  });
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() =>
    StorageService.get<boolean>('is_demo_mode', false)
  );
  const [initialSignUpMode, setInitialSignUpMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    StorageService.get<User | null>('active_user', null)
  );

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
    const isDemo = StorageService.get<boolean>('is_demo_mode', false);
    const user = StorageService.get<User | null>('active_user', null);
    if (!isDemo && user && user.uid && !user.uid.startsWith('demo')) {
      const filtered = raw.filter(l => l.id !== 'lnd-1' && l.id !== 'demo-lnd-1');
      return filtered.length > 0 ? filtered : raw;
    }
    return raw;
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

  // Initialize sample data if first load and hydrate from IndexedDB
  useEffect(() => {
    StorageService.initData();
    IndexedDbService.getActiveTransaksi(activeLaundryId).then((idbList) => {
      if (idbList && idbList.length > 0 && transaksiList.length === 0) {
        setTransaksiList(idbList);
      }
    }).catch(console.warn);
  }, [activeLaundryId]);

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

  // Subscription Tier state (Basic vs Pro)
  const [activeTier, setActiveTier] = useState<LaundryTier>(() => {
    const saved = StorageService.get<string | null>('active_subscription_tier', null);
    if (saved) return normalizeTier(saved);
    return normalizeTier(currentUser?.subscriptionType);
  });
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [upgradeTriggerReason, setUpgradeTriggerReason] = useState<string | undefined>(undefined);

  // Otomatis tampilkan layar habis hari langganan jika akun telah kedaluwarsa (1x per sesi)
  useEffect(() => {
    if (!currentUser || activeTier === 'newcomer') return;
    const now = Date.now();
    const subEnd = currentUser.subscriptionEndDate || 0;
    if (subEnd > 0 && subEnd <= now) {
      const hasPrompted = sessionStorage.getItem('expired_sub_prompted');
      if (!hasPrompted) {
        setIsExpiredModalOpen(true);
        sessionStorage.setItem('expired_sub_prompted', '1');
      }
    }
  }, [currentUser, activeTier]);

  const handleOpenUpgradeModal = (reason?: string) => {
    if (activeTier === 'newcomer' && reason) {
      toast.warning(`Fitur ini hanya untuk Paket Basic / Pro.`);
      return;
    }
    setUpgradeTriggerReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleSwitchTier = (newTier: LaundryTier) => {
    if (newTier === 'newcomer') {
      toast.warning('Paket Newcomer adalah paket awal otomatis untuk akun baru dan tidak dapat dipilih kembali.');
      return;
    }
    setActiveTier('basic');
    StorageService.set('active_subscription_tier', 'basic');
    if (currentUser) {
      const updatedUser = { ...currentUser, subscriptionType: 'basic' };
      setCurrentUser(updatedUser);
      StorageService.set('active_user', updatedUser);
      FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);
    }
    toast.success('Selamat! Akun Anda telah ditingkatkan ke Paket Basic!');
  };

  // Toast & Double-Tap to Exit state saat berada di menu utama (Dashboard)
  const [exitToast, setExitToast] = useState(false);
  const lastBackTimeRef = useRef<number>(0);
  const exitToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Ref tracking state aktif untuk popstate event listener
  const navStateRef = useRef({
    activeView,
    isAturKasOpen,
    isSwitchBranchOpen,
    isApkModalOpen,
    isLimitModalOpen,
    isUpgradeModalOpen,
    hasTrxForAssignStaff: !!trxForAssignStaff,
    hasReceiptModalTrx: !!receiptModalTrx,
  });

  useEffect(() => {
    navStateRef.current = {
      activeView,
      isAturKasOpen,
      isSwitchBranchOpen,
      isApkModalOpen,
      isLimitModalOpen,
      isUpgradeModalOpen,
      hasTrxForAssignStaff: !!trxForAssignStaff,
      hasReceiptModalTrx: !!receiptModalTrx,
    };
  }, [
    activeView,
    isAturKasOpen,
    isSwitchBranchOpen,
    isApkModalOpen,
    isLimitModalOpen,
    isUpgradeModalOpen,
    trxForAssignStaff,
    receiptModalTrx,
  ]);

  // Synchronize history navigation (Sub-menu kembali ke Dashboard, Dashboard minta tekan sekali lagi untuk keluar)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.history.state) {
      window.history.replaceState({ view: 'root' }, '');
    }

    const handlePopState = () => {
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
      if (state.hasTrxForAssignStaff) {
        setTrxForAssignStaff(null);
        window.history.pushState({ view: state.activeView }, '');
        return;
      }

      // Jika di halaman landing page, kembali ke auth (login)
      if (state.activeView === 'landing') {
        setActiveView('auth');
        window.history.pushState({ view: 'auth' }, '');
        return;
      }

      // 2. Jika sedang berada di sub menu manapun, kembalikan langsung ke menu utama (dashboard)
      if (
        state.activeView !== 'dashboard' &&
        state.activeView !== 'splash' &&
        state.activeView !== 'auth'
      ) {
        setActiveView('dashboard');
        setSelectedTransaksiId(null);
        setTransaksiToEdit(null);
        window.history.pushState({ view: 'dashboard' }, '');
        return;
      }

      // 3. Jika sudah berada di menu utama (dashboard), minta tekan sekali lagi untuk keluar
      if (state.activeView === 'dashboard') {
        const now = Date.now();
        if (now - lastBackTimeRef.current < 2000) {
          // Tekanan kedua dalam 2 detik -> Izinkan keluar
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          if (win.MesinPrint?.keluarAplikasi) {
            win.MesinPrint.keluarAplikasi();
            return;
          }
          window.history.back();
        } else {
          // Tekanan pertama -> Tahan dan tampilkan toast "Tekan sekali lagi untuk keluar"
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

  // Setiap kali berganti halaman (selain splash & auth), dorong riwayat navigasi
  useEffect(() => {
    if (typeof window !== 'undefined' && activeView !== 'splash' && activeView !== 'auth') {
      window.history.pushState({ view: activeView }, '');
    }
  }, [activeView]);

  // Active branch entity - selalu pastikan id konsisten dengan activeLaundryId
  const activeLaundry = useMemo(() => {
    const found = laundries.find((l) => l.id === activeLaundryId);
    if (found) return found;
    if (laundries.length > 0) {
      return { ...laundries[0], id: activeLaundryId };
    }
    return {
      id: activeLaundryId || 'lnd-1',
      ownerId: currentUser?.uid || 'own-1',
      namaLaundry: settings.headerStruk || "Kafela's Laundry",
      alamat: settings.address,
      nomorTelepon: settings.phoneNumber,
    };
  }, [laundries, activeLaundryId, currentUser?.uid, settings.headerStruk, settings.address, settings.phoneNumber]);

  // Sync state helpers
  const updateSettings = (newSettings: SettingsData) => {
    setSettings(newSettings);
    StorageService.set('settings', newSettings);
    if (!isDemoMode && activeLaundryId) {
      FirebaseSyncService.saveSettings(activeLaundryId, newSettings).catch(console.error);
    }
  };

  const updateTransaksiList = (newList: Transaksi[]) => {
    const safeList = (Array.isArray(newList) ? newList : []).map((t) => ({
      ...t,
      items: Array.isArray(t?.items) ? t.items : [],
    }));
    setTransaksiList(safeList);
    StorageService.set('transaksi', safeList);
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

  // Load real user and real Firestore data when authenticated (DENGAN PENGHEMATAN KUOTA OTOMATIS)
  const loadFirestoreData = async (user: User, forceSync = false) => {
    if (isDemoMode || !auth.currentUser) {
      return;
    }
    // Cooldown Guard: Jika data lokal sudah ada dan baru saja tersinkron < 3 menit lalu,
    // jangan panggil server Firestore berulang-ulang saat reload halaman!
    const now = Date.now();
    const lastGlobalSync = StorageService.get<number>('last_global_sync', 0);
    const hasLocalData = transaksiList.length > 0 || StorageService.get<Transaksi[]>('transaksi', []).length > 0;

    if (!forceSync && hasLocalData && now - lastGlobalSync < 3 * 60 * 1000) {
      console.log('⚡ Penghematan Kuota Aktif: Menggunakan cache lokal (0 Reads Firestore)');
      return;
    }

    try {
      const userLaundries = await FirebaseSyncService.fetchLaundries(user.uid, laundries);
      const cleanLaundries = !isDemoMode && user && user.uid && !user.uid.startsWith('demo')
        ? userLaundries.filter(l => l.id !== 'lnd-1' && l.id !== 'demo-lnd-1')
        : userLaundries;
      const finalLaundries = cleanLaundries.length > 0 ? cleanLaundries : userLaundries;
      const targetLaundryId = finalLaundries[0]?.id || user.laundryId || `lnd-${user.uid}`;
      if (finalLaundries.length > 0) {
        updateLaundries(finalLaundries);
      } else {
        const defaultBranch: Laundry = {
          id: targetLaundryId,
          ownerId: user.uid,
          namaLaundry: settings.headerStruk || user.displayName || (user as any).namaLaundry || "Kafela's Laundry",
          alamat: settings.address || '',
          nomorTelepon: settings.phoneNumber || user.nomorTelepon || '',
        };
        updateLaundries([defaultBranch]);
      }
      setActiveLaundryId(targetLaundryId);
      StorageService.set('current_laundry_id', targetLaundryId);

      // 1. Delta Sync transaksi AKTIF saja (0 Reads jika sudah di-cache / tidak ada perubahan)
      const currentCachedTrx = transaksiList.length > 0 ? transaksiList : StorageService.get<Transaksi[]>('transaksi', []);
      const trxs = await FirebaseSyncService.fetchTransaksiAktif(targetLaundryId, currentCachedTrx, forceSync);
      updateTransaksiList(trxs);

      // 2. Cached Sync Pelanggan (0 reads jika sudah ada di cache)
      const custs = await FirebaseSyncService.fetchPelanggan(targetLaundryId, pelangganList);
      if (custs && custs.length > 0) {
        updatePelangganList(custs);
      }

      // 3. Cached Sync Layanan
      const lays = await FirebaseSyncService.fetchLayanan(targetLaundryId, layananList);
      if (lays && lays.length > 0) {
        updateLayananList(lays);
      }

      // 4. Cached Sync Pengeluaran (hanya ambil riwayat terbaru, max 100)
      const exps = await FirebaseSyncService.fetchPengeluaran(targetLaundryId, pengeluaranList);
      if (exps && exps.length > 0) {
        updatePengeluaranList(exps);
      }

      // 5. Cached Sync Settings
      const st = await FirebaseSyncService.fetchSettings(targetLaundryId, settings);
      if (st) {
        setSettings(st);
        StorageService.set('settings', st);
      }

      StorageService.set('last_global_sync', now);
    } catch (err) {
      console.error('Error loading Firestore data:', err);
    }
  };

  // Firebase Auth Observer
  useEffect(() => {
    StorageService.initData();
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await FirebaseSyncService.getOrCreateUserProfile({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            phoneNumber: fbUser.phoneNumber,
          });
          setCurrentUser(profile);
          StorageService.set('active_user', profile);
          await loadFirestoreData(profile);
        } catch (err) {
          console.warn('Gagal memuat data pengguna pada onAuthStateChanged:', err);
        }
      } else {
        const stored = StorageService.get<User | null>('active_user', null);
        if (!stored) {
          setCurrentUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Handlers
  const handleSelectBranch = (laundryId: string) => {
    setActiveLaundryId(laundryId);
    StorageService.set('current_laundry_id', laundryId);
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
      if (!isDemoMode) {
        FirebaseSyncService.saveTransaksi(updatedTrx).catch(console.error);
      }
      setSelectedTransaksiId(data.id);
      setReceiptModalTrx(updatedTrx);
      setActiveView('dashboard');
    } else {
      // Create new - check monthly quota
      const limits = getLaundryLimits(activeTier);
      if (currentMonthTransactions.length >= limits.maxMonthlyTransactions) {
        toast.warning(
          `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai. Fitur kuota transaksi lebih banyak hanya untuk Paket Basic / Pro.`
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
      if (!isDemoMode) {
        FirebaseSyncService.saveTransaksi(newTrx).catch(console.error);
      }

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
            if (!isDemoMode) {
              FirebaseSyncService.savePelanggan(newCust).catch(console.error);
            }
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
          if (!isDemoMode) {
            FirebaseSyncService.savePelanggan(updatedCust).catch(console.error);
          }
        }
      }

      setSelectedTransaksiId(newTrx.id);
      setReceiptModalTrx(newTrx);
      setActiveView('dashboard');
    }
  };

  const handleDeleteTransaction = (transaksiId: string) => {
    updateTransaksiList(transaksiList.filter((t) => t.id !== transaksiId));
    FirebaseSyncService.deleteTransaksi(activeLaundryId, transaksiId).catch(console.error);
    setActiveView('dashboard');
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
    list.forEach((t) => {
      FirebaseSyncService.saveTransaksi({
        ...t,
        status: 'Diambil',
        statusPembayaran: 'Lunas',
        tanggalPengambilan: now,
        tanggalPelunasan: t.statusPembayaran === 'Lunas' ? (t.tanggalPelunasan || t.tanggalMasuk) : now,
      }).catch(console.error);
    });
  };

  const handleSaveTransitionPickup = (data: TransitionPickupData) => {
    const now = Date.now();
    const nominal = data.nominal !== undefined
      ? Math.max(0, data.nominal)
      : (data.sudahLunasLama ? 0 : Math.max(0, data.sisaNominal || 0));

    const cleanNota = data.noNotaLama?.trim();
    const nomorTrx = cleanNota || `TRANSISI-${String(now).slice(-5)}`;
    const isLunasStatus = data.isLunas !== false;

    const newTrx: Transaksi = {
      id: `trx-transisi-${now}`,
      userId: currentUser?.uid,
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
    if (!isDemoMode) {
      FirebaseSyncService.saveTransaksi(newTrx).catch(console.error);
    }

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
          if (!isDemoMode) {
            FirebaseSyncService.savePelanggan(newCust).catch(console.error);
          }
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
        `Batas transaksi bulanan (${limits.maxMonthlyTransactions} transaksi/bulan) telah tercapai. Fitur kuota transaksi lebih banyak hanya untuk Paket Basic / Pro.`
      );
      return;
    }
    if (activeUncollectedTrx.length >= 300) {
      setIsLimitModalOpen(true);
    } else {
      setTransaksiToEdit(null);
      setActiveView('tambah_edit');
    }
  };

  const handleProceedCreateNewFromLimit = () => {
    if (activeUncollectedTrx.length >= 400) {
      toast.warning(
        'Transaksi aktif telah mencapai batas maksimal (400 pesanan). Harap arsipkan pesanan terlebih dahulu sebelum membuat transaksi baru.'
      );
      return;
    }
    setIsLimitModalOpen(false);
    setTransaksiToEdit(null);
    setActiveView('tambah_edit');
  };

  const handleSaveCustomer = (cust: Pelanggan) => {
    const limits = getLaundryLimits(activeTier);
    const exists = pelangganList.some((p) => p.id === cust.id);
    if (!exists && pelangganList.length >= limits.maxCustomers) {
      toast.warning(
        `Batas maksimal ${limits.maxCustomers} data pelanggan telah tercapai. Fitur kapasitas pelanggan lebih besar hanya untuk Paket Basic / Pro.`
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
        `Batas maksimal ${limits.maxServices} jenis layanan telah tercapai. Fitur penambahan layanan lebih banyak hanya untuk Paket Basic / Pro.`
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

      // Record in subscription history
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
    };
    updateLaundries([...laundries, newLnd]);

    // Copy services if requested
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
    updateLaundries(laundries.map((l) => (l.id === lnd.id ? lnd : l)));
  };

  const handleDeleteLaundry = (laundryId: string) => {
    if (laundries.length <= 1) return;
    const remaining = laundries.filter((l) => l.id !== laundryId);
    updateLaundries(remaining);
    if (activeLaundryId === laundryId) {
      setActiveLaundryId(remaining[0].id);
    }
  };

  const handleAddKasir = (nama: string, email: string, pass: string, laundryId: string) => {
    const limits = getLaundryLimits(activeTier);

    if (limits.tier === 'newcomer' || limits.maxCashiers <= 0) {
      toast.warning('Fitur pembuatan akun kasir tambahan hanya untuk Paket Basic / Pro.');
      return;
    }

    // Cek batas per outlet: 1 admin per outlet
    const branchAdmins = staffList.filter(
      (s) => s.laundryId === laundryId && (s.role === 'admin' || s.role === 'karyawan')
    );
    if (branchAdmins.length >= limits.maxAdminPerOutlet) {
      toast.warning('Cabang outlet ini sudah memiliki 1 admin kasir. Sistem membatasi 1 admin & 1 owner per outlet untuk keamanan dan proteksi bot.');
      return;
    }

    // Cek total kasir berdasarkan cabang yang dimiliki (1 admin kasir per cabang)
    const totalCashiers = staffList.filter((s) => s.role === 'admin' || s.role === 'karyawan').length;
    if (totalCashiers >= laundries.length) {
      toast.warning(
        'Semua cabang laundry yang Anda kelola sudah memiliki 1 admin kasir. Silakan tambah cabang baru untuk menambah akun kasir.'
      );
      return;
    }

    const isPhone = !email.includes('@');
    const newKasir: User = {
      uid: `usr-${Date.now()}`,
      emailOrPhone: email,
      nomorTelepon: isPhone ? email : null,
      username: nama,
      displayName: nama,
      role: 'admin',
      laundryId,
      laundries: {},
      walletBalance: 0,
    };
    updateStaffList([...staffList, newKasir]);
  };

  const handleDeleteKasir = (uid: string) => {
    updateStaffList(staffList.filter((u) => u.uid !== uid));
  };

  const handleTopUpWallet = (nominal: number) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      walletBalance: currentUser.walletBalance + nominal,
    };
    setCurrentUser(updatedUser);
    StorageService.set('active_user', updatedUser);

    const historyItem: SubscriptionHistory = {
      id: `sub-${Date.now()}`,
      ownerId: currentUser.uid,
      purchaseDate: Date.now(),
      packageName: `Top Up Saldo (${nominal.toLocaleString('id-ID')})`,
      cost: nominal,
      durationDays: 0,
      newExpiryDate: currentUser.subscriptionEndDate || 0,
      laundries: [activeLaundryId],
    };
    const newHist = [historyItem, ...subscriptionHistory];
    setSubscriptionHistory(newHist);
    StorageService.set('subscription_history', newHist);

    // Sinkronisasi saldo dompet ke Firestore
    FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);
  };

  const handleExtendSubscription = (packageName: string, cost: number, days: number) => {
    if (!currentUser) return;
    const currentEnd = Math.max(Date.now(), currentUser.subscriptionEndDate || Date.now());
    const newEnd = currentEnd + days * 24 * 60 * 60 * 1000;

    const updatedUser = {
      ...currentUser,
      walletBalance: Math.max(0, currentUser.walletBalance - cost),
      subscriptionEndDate: newEnd,
      subscriptionType: 'basic',
    };
    setCurrentUser(updatedUser);
    StorageService.set('active_user', updatedUser);
    setActiveTier('basic');
    StorageService.set('active_subscription_tier', 'basic');

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

    // Sinkronisasi perpanjangan & sisa saldo ke Firestore
    FirebaseSyncService.updateUserProfile(updatedUser).catch(console.error);
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
    if (!isDemoMode) {
      FirebaseSyncService.savePengeluaran(newPeng).catch(console.error);
    }
    toast.success('Pengeluaran berhasil dicatat!');
  };

  const handleSavePemasukan = (pem: ArusKas) => {
    const updated = [pem, ...manualCashLogs];
    setManualCashLogs(updated);
    StorageService.set('manual_cash_logs', updated);
    toast.success('Pemasukan manual berhasil dicatat!');
  };

  // Demo Mode Handlers for Prospective Trial Users
  const handleStartDemo = (role: 'owner' | 'karyawan') => {
    setIsDemoMode(true);
    StorageService.set('is_demo_mode', true);
    const demoUser = role === 'owner' ? demoOwnerUser : demoKasirUser;
    setCurrentUser(demoUser);
    StorageService.set('active_user', demoUser);
    setLaundries(demoLaundries);
    StorageService.set('laundries', demoLaundries);
    setActiveLaundryId(demoLaundries[0].id);
    StorageService.set('current_laundry_id', demoLaundries[0].id);
    setSettings(demoSettings);
    StorageService.set('settings', demoSettings);
    setLayananList(demoLayananList);
    StorageService.set('layanan', demoLayananList);
    setPelangganList(demoPelangganList);
    StorageService.set('pelanggan', demoPelangganList);
    const dTrx = getDemoTransaksiList();
    setTransaksiList(dTrx);
    StorageService.set('transaksi', dTrx);
    const dExp = getDemoPengeluaranList();
    setPengeluaranList(dExp);
    StorageService.set('pengeluaran', dExp);
    const dCash = getDemoManualCashLogs();
    setManualCashLogs(dCash);
    StorageService.set('manual_cash_logs', dCash);
    setActiveView('dashboard');
  };

  const handleResetDemoData = () => {
    setLaundries(demoLaundries);
    StorageService.set('laundries', demoLaundries);
    setActiveLaundryId(demoLaundries[0].id);
    StorageService.set('current_laundry_id', demoLaundries[0].id);
    setSettings(demoSettings);
    StorageService.set('settings', demoSettings);
    setLayananList(demoLayananList);
    StorageService.set('layanan', demoLayananList);
    setPelangganList(demoPelangganList);
    StorageService.set('pelanggan', demoPelangganList);
    const dTrx = getDemoTransaksiList();
    setTransaksiList(dTrx);
    StorageService.set('transaksi', dTrx);
    const dExp = getDemoPengeluaranList();
    setPengeluaranList(dExp);
    StorageService.set('pengeluaran', dExp);
    const dCash = getDemoManualCashLogs();
    setManualCashLogs(dCash);
    StorageService.set('manual_cash_logs', dCash);
  };

  const handleSwitchDemoRole = (role: 'owner' | 'karyawan') => {
    const demoUser = role === 'owner' ? demoOwnerUser : demoKasirUser;
    setCurrentUser(demoUser);
    StorageService.set('active_user', demoUser);
  };

  const handleExitDemo = () => {
    setIsDemoMode(false);
    StorageService.set('is_demo_mode', false);
    setCurrentUser(null);
    StorageService.set('active_user', null);
    setActiveView('auth');
  };

  const handleSwitchToRealRegister = () => {
    setIsDemoMode(false);
    StorageService.set('is_demo_mode', false);
    setCurrentUser(null);
    StorageService.set('active_user', null);
    setInitialSignUpMode(true);
    setActiveView('auth');
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
    activeView !== 'landing' &&
    !!currentUser;

  const handleLogoutUser = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
    StorageService.set('active_user', null);
    StorageService.clearAllDummyData();
    setActiveView('auth');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start text-slate-800 antialiased selection:bg-[#800000] selection:text-white">
      {/* Offline Toast */}
      <OfflineIndicator />

      {/* Demo Trial Banner for Prospective Users */}
      {isDemoMode &&
        currentUser &&
        activeView !== 'splash' &&
        activeView !== 'auth' &&
        activeView !== 'landing' && (
          <DemoBanner
            currentUser={currentUser}
            onResetDemoData={handleResetDemoData}
            onSwitchToRealRegister={handleSwitchToRealRegister}
            onExitDemo={handleExitDemo}
            onSwitchDemoRole={handleSwitchDemoRole}
          />
        )}

      {/* Main Container: Full Web App Shell with Sidebar on PC/Tablet, Original Container on HP */}
      <div
        className={
          activeView === 'landing'
            ? 'w-full min-h-screen bg-stone-50'
            : showDesktopSidebar
            ? 'w-full h-screen overflow-hidden bg-slate-100 flex flex-row'
            : `w-full max-w-6xl bg-slate-100 ${
                activeView === 'dashboard' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
              } relative flex flex-col overflow-x-hidden`
        }
      >
        {showDesktopSidebar && currentUser && (
          <DesktopSidebar
            activeView={activeView}
            onSelectView={(v) => setActiveView(v)}
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
              if (typeof window !== 'undefined') {
                sessionStorage.setItem('has_seen_splash', '1');
              }
              if (currentUser) {
                setActiveView('dashboard');
              } else {
                setActiveView('auth');
              }
            }}
          />
        )}

        {activeView === 'auth' && (
          <AuthView
            ownerUser={defaultOwnerUser}
            staffList={staffList}
            initialSignUp={initialSignUpMode}
            onStartDemo={handleStartDemo}
            onOpenLandingPage={() => setActiveView('landing')}
            onLoginSuccess={async (user) => {
              setIsDemoMode(false);
              StorageService.set('is_demo_mode', false);
              setInitialSignUpMode(false);
              setCurrentUser(user);
              StorageService.set('active_user', user);
              await loadFirestoreData(user);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'landing' && (
          <LandingPageView
            onOpenKasir={() => setActiveView('auth')}
            onStartDemo={(role) => handleStartDemo(role || 'owner')}
            onOpenApkModal={() => setIsApkModalOpen(true)}
          />
        )}

        {activeView === 'dashboard' && currentUser && (
          <DashboardView
            transaksiList={transaksiList}
            settings={settings}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            activeLaundryId={activeLaundryId}
            laundries={laundries}
            pengeluaranList={pengeluaranList}
            isMobile={isEffectiveMobile}
            deviceInfo={device}
            currentTier={activeTier}
            onOpenUpgradeModal={handleOpenUpgradeModal}
            onOpenExpiredModal={() => setIsExpiredModalOpen(true)}
            onOpenNewTransaksi={handleRequestNewTransaksi}
            onOpenLimitModal={() => setIsLimitModalOpen(true)}
            onOpenDetailTransaksi={(id) => {
              setSelectedTransaksiId(id);
              setActiveView('detail_transaksi');
            }}
            onOpenArsip={() => setActiveView('arsip')}
            onOpenSettings={() => setActiveView('settings')}
            onOpenStatusPengerjaan={() => setActiveView('status_pengerjaan')}
            onOpenBukuKas={() => setActiveView('buku_kas')}
            onOpenLaporan={() => setActiveView('laporan')}
            onOpenAturKas={() => setIsAturKasOpen(true)}
            onOpenSwitchBranch={() => setIsSwitchBranchOpen(true)}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenKelolaPelanggan={() => setActiveView('kelola_pelanggan')}
            onOpenKelolaLayanan={() => setActiveView('kelola_layanan')}
            onOpenKelolaOwner={() => setActiveView('kelola_owner')}
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
          !transaksiToEdit && activeUncollectedTrx.length >= 400 ? (
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
                    onClick={() => setActiveView('dashboard')}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition active:scale-95"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <TambahEditView
              onBack={() => setActiveView('dashboard')}
              layananList={layananList}
              pelangganList={pelangganList}
              settings={settings}
              activeLaundryId={activeLaundryId}
              transaksiToEdit={transaksiToEdit}
              onSave={handleSaveTransaction}
            />
          )
        )}

        {activeView === 'detail_transaksi' && currentSelectedTransaksi && currentUser && (
          <DetailTransaksiView
            onBack={() => setActiveView('dashboard')}
            transaksi={currentSelectedTransaksi}
            settings={settings}
            currentUser={currentUser}
            pelanggan={pelangganList.find(
              (p) =>
                p.nama.toLowerCase() ===
                currentSelectedTransaksi.namaPelanggan.toLowerCase()
            )}
            onEdit={(trx) => {
              setTransaksiToEdit(trx);
              setActiveView('tambah_edit');
            }}
            onDelete={handleDeleteTransaction}
            onAmbil={(trx) => {
              handleAmbilTransaksi(trx);
              setActiveView('dashboard');
            }}
          />
        )}

        {activeView === 'status_pengerjaan' && (
          <StatusPengerjaanView
            onBack={() => setActiveView('dashboard')}
            transaksiList={transaksiList}
            semuaLayanan={layananList}
            staffList={staffList}
            operationalStaffList={operationalStaffList}
            currentUser={currentUser}
            settings={settings}
            activeLaundryId={activeLaundryId}
            onOpenDetail={(id) => {
              setSelectedTransaksiId(id);
              setActiveView('detail_transaksi');
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
            onBack={() => setActiveView('dashboard')}
            transaksiList={transaksiList}
            pengeluaranList={pengeluaranList}
            manualCashLogs={manualCashLogs}
            activeLaundryId={activeLaundryId}
            onOpenDetailTransaksi={(id) => {
              setSelectedTransaksiId(id);
              setActiveView('detail_transaksi');
            }}
          />
        )}

        {activeView === 'laporan' && (
          <LaporanView
            onBack={() => setActiveView('dashboard')}
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
        )}

        {activeView === 'arsip' && (
          <ArsipView
            onBack={() => setActiveView('dashboard')}
            transaksiList={transaksiList}
            activeLaundryId={activeLaundryId}
            onOpenDetailTransaksi={(id) => {
              setSelectedTransaksiId(id);
              setActiveView('detail_transaksi');
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
          <KelolaPelangganView
            onBack={() => setActiveView('dashboard')}
            pelangganList={pelangganList}
            settings={settings}
            activeLaundryId={activeLaundryId}
            onSavePelanggan={handleSaveCustomer}
            onDeletePelanggan={handleDeleteCustomer}
          />
        )}

        {activeView === 'kelola_layanan' && (
          <KelolaLayananView
            onBack={() => setActiveView('dashboard')}
            layananList={layananList}
            activeLaundryId={activeLaundryId}
            settings={settings}
            onSaveLayanan={handleSaveLayanan}
            onDeleteLayanan={handleDeleteLayanan}
            onReorderLayanan={updateLayananList}
          />
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
                  onClick={() => setActiveView('dashboard')}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : (
            <KelolaOwnerView
              onBack={() => setActiveView('dashboard')}
              currentUser={currentUser}
              laundries={laundries}
              activeLaundryId={activeLaundryId}
              subscriptionHistory={subscriptionHistory}
              onSelectLaundry={handleSelectBranch}
              onAddLaundry={handleAddLaundry}
              onUpdateLaundry={handleUpdateLaundry}
              onDeleteLaundry={handleDeleteLaundry}
              onTopUpWallet={handleTopUpWallet}
              onExtendSubscription={handleExtendSubscription}
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
                  onClick={() => setActiveView('dashboard')}
                  className="w-full py-2.5 rounded-xl bg-[#800000] text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          ) : (
            <KelolaKasirView
              onBack={() => setActiveView('dashboard')}
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
            onBack={() => setActiveView('dashboard')}
            settings={settings}
            currentUser={currentUser}
            activeLaundry={activeLaundry}
            currentTier={activeTier}
            onUpdateSettings={updateSettings}
            onOpenKelolaPelanggan={() => setActiveView('kelola_pelanggan')}
            onOpenKelolaLayanan={() => setActiveView('kelola_layanan')}
            onOpenKelolaOwner={() => setActiveView('kelola_owner')}
            onOpenKelolaKasir={() => setActiveView('kelola_kasir')}
            onOpenApkModal={() => setIsApkModalOpen(true)}
            onOpenUpgradeModal={handleOpenUpgradeModal}
            onTopUpWallet={handleTopUpWallet}
            onUpdateOwnerProfile={handleUpdateOwnerProfile}
            onLogout={handleLogoutUser}
          />
        )}
        </div>

        {/* Global Modals */}
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
          onManageBranches={() => setActiveView('kelola_owner')}
          onOpenUpgradeModal={handleOpenUpgradeModal}
        />

        {/* Modal Komparasi Paket Newcomer & Paket Basic */}
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentTier={activeTier}
          triggerReason={upgradeTriggerReason}
          onSwitchTier={handleSwitchTier}
        />

        {/* Modal / Halaman Habis Hari Langganan (Lihat Saldo, Isi Saldo & Perpanjang) */}
        {currentUser && (
          <SubscriptionExpiredModal
            isOpen={isExpiredModalOpen}
            onClose={() => setIsExpiredModalOpen(false)}
            currentUser={currentUser}
            onTopUpWallet={handleTopUpWallet}
            onExtendSubscription={handleExtendSubscription}
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

        {/* Modal Batas Transaksi Aktif (Peringatan di 300, Kunci di 400) */}
        <LimitTransaksiModal
          isOpen={isLimitModalOpen}
          onClose={() => setIsLimitModalOpen(false)}
          uncollectedList={activeUncollectedTrx}
          onArsipSemua={handleAmbilBanyakTransaksi}
          onArsipTigaBulan={handleAmbilBanyakTransaksi}
          onArsipLunas={handleAmbilBanyakTransaksi}
          onOpenStatusPengerjaan={() => {
            setIsLimitModalOpen(false);
            setActiveView('status_pengerjaan');
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
