import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  where,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  User,
  Laundry,
  Transaksi,
  Pelanggan,
  Layanan,
  Pengeluaran,
  SettingsData,
} from '../types';
import { defaultLayananList, defaultSettings, StorageService } from './storage';
import { IndexedDbService } from './indexedDb';

export interface PendingSignUpInfo {
  namaLaundry?: string;
  phoneNumber?: string;
  displayName?: string;
  email?: string;
}

const PENDING_SIGNUP_SESSION_KEY = 'kafelas_pending_signup';

function cleanPlaceholder(val?: string | null): string {
  if (!val || typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed || trimmed === '-' || trimmed === '0812-3456-7890') return '';
  return trimmed;
}

export class FirebaseSyncService {
  private static authFlowActive = false;
  private static pendingSignUp: PendingSignUpInfo | null = null;

  static beginAuthFlow(pending?: PendingSignUpInfo): void {
    this.authFlowActive = true;
    if (pending) {
      this.pendingSignUp = pending;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(PENDING_SIGNUP_SESSION_KEY, JSON.stringify(pending));
        } catch {
          // ignore storage error
        }
      }
    }
  }

  static endAuthFlow(): void {
    this.authFlowActive = false;
    this.pendingSignUp = null;
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(PENDING_SIGNUP_SESSION_KEY);
      } catch {
        // ignore storage error
      }
    }
  }

  static isAuthFlowActive(): boolean {
    return this.authFlowActive;
  }

  private static getPendingSignUp(email?: string | null): PendingSignUpInfo | null {
    if (this.pendingSignUp) return this.pendingSignUp;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(PENDING_SIGNUP_SESSION_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PendingSignUpInfo;
          if (!email || !parsed.email || parsed.email.toLowerCase() === email.toLowerCase()) {
            return parsed;
          }
        }
      } catch {
        // ignore parse error
      }
    }
    return null;
  }

  static async getOrCreateUserProfile(firebaseUser: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
    username?: string | null;
    namaLaundry?: string | null;
    isSignUp?: boolean;
  }): Promise<User> {
    const pending = this.getPendingSignUp(firebaseUser.email);
    const defaultLaundryId = `lnd-${firebaseUser.uid}`;

    const explicitLaundryName = cleanPlaceholder(firebaseUser.namaLaundry) || cleanPlaceholder(pending?.namaLaundry);
    const explicitPhone = cleanPlaceholder(firebaseUser.phoneNumber) || cleanPlaceholder(pending?.phoneNumber);
    const explicitOwnerName =
      cleanPlaceholder(firebaseUser.displayName) ||
      cleanPlaceholder(firebaseUser.username) ||
      cleanPlaceholder(pending?.displayName);
    const emailStr = (firebaseUser.email || pending?.email || '').trim();

    const branchName = explicitLaundryName || explicitOwnerName || "Kafela's Laundry";
    const userName = explicitOwnerName || explicitLaundryName || 'Owner';
    const phone = explicitPhone;

    const newUser: User = {
      uid: firebaseUser.uid,
      emailOrPhone: emailStr || phone || '',
      username: userName,
      displayName: userName,
      nomorTelepon: phone,
      role: 'owner',
      laundryId: defaultLaundryId,
      laundries: { [defaultLaundryId]: branchName },
      walletBalance: 0,
      createdAt: Date.now(),
      subscriptionType: 'newcomer',
      subscriptionEndDate: null, // Newcomer aktif gratis selamanya berbasis kuota
    };

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);

      // Jika bukan proses signup baru dan dokumen user sudah ada di Firestore
      if (snap.exists() && !firebaseUser.isSignUp) {
        const rawUser = snap.data() as any;
        let resolvedDisplayName = rawUser.displayName;
        while (typeof resolvedDisplayName === 'object' && resolvedDisplayName !== null) {
          resolvedDisplayName =
            resolvedDisplayName.namaLaundry || resolvedDisplayName.displayName || resolvedDisplayName.name || 'Owner';
        }

        const existingLaundryId = rawUser.laundryId || defaultLaundryId;
        const existingBranchName = cleanPlaceholder(rawUser.laundries?.[existingLaundryId]);
        const existingPhone = cleanPlaceholder(rawUser.nomorTelepon);

        const healedBranchName =
          (!existingBranchName || existingBranchName === 'Laundry') && explicitLaundryName
            ? explicitLaundryName
            : existingBranchName || branchName;
        const healedPhone = !existingPhone && explicitPhone ? explicitPhone : existingPhone;
        const healedDisplayName =
          typeof resolvedDisplayName === 'string' && resolvedDisplayName.trim() && resolvedDisplayName !== 'Owner'
            ? resolvedDisplayName.trim()
            : explicitOwnerName ||
              (typeof resolvedDisplayName === 'string' && resolvedDisplayName.trim() ? resolvedDisplayName.trim() : 'Owner');

        const isNewcomerProfile = !rawUser.subscriptionType || rawUser.subscriptionType === 'newcomer';
        const user: User = {
          ...rawUser,
          uid: firebaseUser.uid,
          emailOrPhone: rawUser.emailOrPhone || emailStr || healedPhone || '',
          nomorTelepon: healedPhone,
          laundryId: existingLaundryId,
          laundries: {
            ...(rawUser.laundries || {}),
            [existingLaundryId]: healedBranchName,
          },
          subscriptionEndDate: isNewcomerProfile ? null : rawUser.subscriptionEndDate,
          displayName: healedDisplayName,
          username: rawUser.username || healedDisplayName,
        };

        // Jika ada data kosong yang berhasil dilengkapi dari input eksplisit, simpan perbaikannya ke Firestore
        const needsHeal =
          healedPhone !== existingPhone ||
          healedBranchName !== existingBranchName ||
          healedDisplayName !== resolvedDisplayName;
        if (needsHeal) {
          await setDoc(userDocRef, user, { merge: true }).catch(console.warn);
          if (explicitLaundryName || explicitPhone) {
            await setDoc(
              doc(db, 'laundries', existingLaundryId),
              {
                id: existingLaundryId,
                ownerId: firebaseUser.uid,
                namaLaundry: healedBranchName,
                nomorTelepon: healedPhone,
              },
              { merge: true }
            ).catch(console.warn);
            await setDoc(
              doc(db, 'laundries', existingLaundryId, 'settings', 'main'),
              {
                headerStruk: healedBranchName,
                appTitle: healedBranchName,
                phoneNumber: healedPhone,
              },
              { merge: true }
            ).catch(console.warn);
          }
        }

        StorageService.set('active_user', user);
        return user;
      }

      // Pendaftaran akun baru (atau pemulihan paksa saat isSignUp = true):
      // Bersihkan sisa state lokal akun sebelumnya agar tidak mencemari akun baru
      const initialBranch: Laundry = {
        id: defaultLaundryId,
        ownerId: firebaseUser.uid,
        namaLaundry: branchName,
        alamat: '',
        nomorTelepon: phone,
      };

      const customSettings: SettingsData = {
        ...defaultSettings,
        headerStruk: branchName,
        appTitle: branchName,
        address: '',
        phoneNumber: phone,
        useLogo: false,
        logoPath: null,
        logoSize: 'sedang',
      };

      const seededLayanan: Layanan[] = defaultLayananList.map((lay) => ({
        ...lay,
        laundryId: defaultLaundryId,
      }));

      StorageService.set('transaksi', []);
      StorageService.set('pelanggan', []);
      StorageService.set('pengeluaran', []);
      StorageService.set('manual_cash_logs', []);
      StorageService.set('staff', []);
      StorageService.set('has_customized_settings', false);
      StorageService.set('active_user', newUser);
      StorageService.set('laundries', [initialBranch]);
      StorageService.set('current_laundry_id', defaultLaundryId);
      StorageService.set('settings', customSettings);
      StorageService.set('layanan', seededLayanan);

      // 1. Simpan dokumen profil user & cabang utama terlebih dahulu (memenuhi syarat kepemilikan rules subkoleksi)
      await setDoc(userDocRef, newUser, { merge: true });
      const branchRef = doc(db, 'laundries', defaultLaundryId);
      await setDoc(branchRef, initialBranch, { merge: true });

      // 2. Simpan pengaturan struk & 10 layanan awal secara atomik dalam 1 batch
      const batch = writeBatch(db);
      const settingsRef = doc(db, 'laundries', defaultLaundryId, 'settings', 'main');
      batch.set(settingsRef, customSettings, { merge: true });
      for (const lay of seededLayanan) {
        const layDoc = doc(db, 'laundries', defaultLaundryId, 'layanan', lay.id);
        batch.set(layDoc, lay);
      }
      await batch.commit();

      return newUser;
    } catch (e) {
      console.warn('Gagal membaca/menyimpan profil di Firestore (izin terbatas), menggunakan profil lokal:', e);
      StorageService.set('active_user', newUser);
      return newUser;
    }
  }

  // 1.1 Update user profile (sinkronisasi saldo dompet & status langganan ke Firestore)
  static async updateUserProfile(user: User): Promise<void> {
    if (!user || !user.uid || !auth.currentUser) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, user, { merge: true });
    } catch (e) {
      console.warn('Gagal sinkron profil user ke Firestore:', e);
    }
  }

  // 2. Fetch Laundries for User (Strict ownerId validation + direct doc fallback)
  static async fetchLaundries(ownerId: string, cached: Laundry[] = [], forceSync = false): Promise<Laundry[]> {
    if (!auth.currentUser) {
      return cached.filter((l) => l.ownerId === ownerId);
    }
    const validCached = cached.filter(
      (l) => l.ownerId === ownerId && l.id !== 'lnd-1' && l.id !== 'demo-lnd-1' && l.namaLaundry !== '-'
    );
    if (!forceSync && validCached.length > 0) {
      return validCached;
    }
    const laundriesRef = collection(db, 'laundries');
    try {
      const q = query(laundriesRef, where('ownerId', '==', ownerId), limit(10));
      const snap = await getDocs(q);
      const list: Laundry[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (data.ownerId === ownerId) {
          let nama = data.namaLaundry;
          while (typeof nama === 'object' && nama !== null) {
            nama = nama.namaLaundry || nama.name || "Kafela's Laundry";
          }
          const cleanName = cleanPlaceholder(typeof nama === 'string' ? nama : '');
          list.push({
            ...data,
            id: data.id || d.id,
            ownerId,
            namaLaundry: cleanName || "Kafela's Laundry",
            alamat: cleanPlaceholder(data.alamat),
            nomorTelepon: cleanPlaceholder(data.nomorTelepon),
          });
        }
      });

      // Fallback pembacaan dokumen langsung (strong consistency) jika query index belum mengembalikan cabang utama
      if (list.length === 0) {
        const directSnap = await getDoc(doc(db, 'laundries', `lnd-${ownerId}`)).catch(() => null);
        if (directSnap && directSnap.exists()) {
          const data = directSnap.data() as any;
          if (!data.ownerId || data.ownerId === ownerId) {
            const cleanName = cleanPlaceholder(typeof data.namaLaundry === 'string' ? data.namaLaundry : '');
            list.push({
              ...data,
              id: directSnap.id,
              ownerId,
              namaLaundry: cleanName || "Kafela's Laundry",
              alamat: cleanPlaceholder(data.alamat),
              nomorTelepon: cleanPlaceholder(data.nomorTelepon),
            });
          }
        }
      }

      return list.length > 0 ? list : validCached;
    } catch (e) {
      console.warn('Gagal fetch laundries dari server, gunakan cache:', e);
      return validCached;
    }
  }

  // Helper parser dokumen transaksi seragam
  static parseTransaksiDoc(id: string, laundryId: string, data: Partial<Transaksi>): Transaksi {
    return {
      id: data.id || id,
      laundryId: data.laundryId || laundryId,
      namaPelanggan: data.namaPelanggan || 'Pelanggan',
      namaPelanggan_lowercase: data.namaPelanggan_lowercase || (data.namaPelanggan || 'Pelanggan').toLowerCase(),
      totalHarga: typeof data.totalHarga === 'number' ? data.totalHarga : 0,
      jumlahDp: typeof data.jumlahDp === 'number' ? data.jumlahDp : 0,
      tanggalMasuk: typeof data.tanggalMasuk === 'number' ? data.tanggalMasuk : Date.now(),
      tanggalSelesai: data.tanggalSelesai || null,
      status: (data.status as any) || 'Diterima',
      statusPembayaran: (data.statusPembayaran as any) || 'Belum Lunas',
      items: Array.isArray(data.items) ? data.items : [],
      nomorTransaksi: data.nomorTransaksi || null,
      nomorTelepon: data.nomorTelepon || null,
      alamat: data.alamat || null,
      catatan: data.catatan || null,
      metodePembayaran: data.metodePembayaran || null,
      metodePembayaranDetail: data.metodePembayaranDetail || null,
      dikerjakanOleh: data.dikerjakanOleh || null,
      tanggalDitugaskan: data.tanggalDitugaskan || null,
      tanggalStatusSelesai: data.tanggalStatusSelesai || null,
      tanggalPengambilan: data.tanggalPengambilan || null,
      tanggalPelunasan: data.tanggalPelunasan || null,
      terakhirDieditPada: data.terakhirDieditPada || Date.now(),
      isTransisi: data.isTransisi || false,
      noNotaLama: data.noNotaLama || undefined,
    };
  }

  // 3.0 SINKRONISASI REAL-TIME MULTI-USER (FIRESTORE ONSNAPSHOT)
  // Setiap ada input transaksi baru dari Kasir A, HP Kasir B & Owner langsung terupdate otomatis!
  static subscribeTransaksi(
    laundryId: string,
    onUpdate: (list: Transaksi[]) => void,
    onError?: (error: any) => void
  ): () => void {
    if (!laundryId) return () => {};

    const path = `laundries/${laundryId}/transaksi`;
    if (!auth.currentUser) {
      return () => {};
    }

    let unsub: (() => void) | null = null;
    let isFallback = false;

    const attachListener = (useOrderBy = true) => {
      try {
        const q = useOrderBy
          ? query(collection(db, path), orderBy('tanggalMasuk', 'desc'), limit(300))
          : query(collection(db, path), limit(300));

        unsub = onSnapshot(
          q,
          async (snapshot) => {
            const serverList: Transaksi[] = [];
            snapshot.forEach((d) => {
              serverList.push(FirebaseSyncService.parseTransaksiDoc(d.id, laundryId, d.data() as Partial<Transaksi>));
            });

            // Rekonsiliasi Anti-Glitches: Pertahankan transaksi lokal di antrean Outbox
            // agar nota offline tidak pernah hilang atau berkedip saat snapshot server masuk
            let pendingOutbox: Transaksi[] = [];
            try {
              pendingOutbox = await IndexedDbService.getOutbox();
            } catch (e) {
              console.warn('Gagal membaca outbox saat onSnapshot:', e);
            }

            const map = new Map<string, Transaksi>();
            // 1. Masukkan data dari server
            serverList.forEach((trx) => map.set(trx.id, trx));
            // 2. Pertahankan transaksi outbox lokal untuk cabang ini dengan timestamp guard
            pendingOutbox.forEach((trx) => {
              if (trx.laundryId === laundryId) {
                const existing = map.get(trx.id);
                if (!existing || (trx.terakhirDieditPada || 0) >= (existing.terakhirDieditPada || 0)) {
                  map.set(trx.id, trx);
                }
              }
            });

            const mergedList = Array.from(map.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);

            // Simpan otomatis ke IndexedDB (Single Source of Truth)
            IndexedDbService.saveAllTransaksi(laundryId, mergedList).catch(console.warn);

            onUpdate(mergedList);
          },
          (error) => {
            console.warn('Firestore subscription onSnapshot error:', error);
            if (useOrderBy && !isFallback) {
              isFallback = true;
              attachListener(false);
            } else if (onError) {
              onError(error);
            }
          }
        );
      } catch (e) {
        console.warn('Gagal attach onSnapshot:', e);
        if (useOrderBy && !isFallback) {
          isFallback = true;
          attachListener(false);
        } else if (onError) {
          onError(e);
        }
      }
    };

    attachListener(true);

    return () => {
      if (unsub) {
        try {
          unsub();
        } catch {
          // ignore
        }
      }
    };
  }

  // 3.1 FETCH TRANSAKSI (ANTI-HILANG & FULL AUDIT RETENTION)
  // Mengambil transaksi aktif dan riwayat terkini tanpa pernah menghapus transaksi 'Diambil'!
  static async fetchTransaksiAktif(
    laundryId: string,
    existingList: Transaksi[] = [],
    forceFullSync = false
  ): Promise<Transaksi[]> {
    const path = `laundries/${laundryId}/transaksi`;
    const syncKey = `last_sync_active_trx_${laundryId}`;

    // Coba baca dari IndexedDB lokal terlebih dahulu (lengkap aktif + arsip)
    let localList = existingList.filter((t) => t.laundryId === laundryId);
    if (localList.length === 0) {
      const idbList = await IndexedDbService.getAllLaundryTransaksi(laundryId);
      if (idbList.length > 0) {
        localList = idbList;
      }
    }

    if (!auth.currentUser) {
      return localList;
    }

    try {
      let snap;
      try {
        const q = query(
          collection(db, path),
          orderBy('tanggalMasuk', 'desc'),
          limit(300)
        );
        snap = await getDocs(q);
      } catch (err) {
        // Fallback jika belum ter-index tanggalMasuk
        try {
          const qFallback = query(collection(db, path), limit(300));
          snap = await getDocs(qFallback);
        } catch (e2) {
          console.warn('Fallback getDocs error:', e2);
          return localList;
        }
      }

      const map = new Map<string, Transaksi>();
      // Masukkan localList dulu agar tidak ada data yang tercecer
      localList.forEach((t) => map.set(t.id, t));

      // Timpa / tambahkan dari server Firestore
      snap.forEach((d) => {
        const trxItem = FirebaseSyncService.parseTransaksiDoc(d.id, laundryId, d.data() as Partial<Transaksi>);
        map.set(trxItem.id, trxItem);
      });

      const allList = Array.from(map.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);
      StorageService.set(syncKey, Date.now());
      IndexedDbService.saveAllTransaksi(laundryId, allList).catch(console.error);
      return allList;
    } catch (e) {
      console.warn('Gagal sync transaksi dari cloud, gunakan data lokal:', e);
      return localList.length > 0 ? localList : [];
    }
  }

  // 3.1b SMART DELTA SYNC TRANSAKSI (SUPER HEMAT KUOTA FIRESTORE)
  // Hanya mengambil transaksi yang baru dibuat atau diubah sejak `sinceTimestamp`
  static async fetchTransaksiDelta(
    laundryId: string,
    sinceTimestamp = 0,
    existingList: Transaksi[] = []
  ): Promise<{ updatedList: Transaksi[]; newOrUpdatedCount: number }> {
    if (!laundryId) {
      return { updatedList: existingList, newOrUpdatedCount: 0 };
    }

    // Siapkan list data lokal terlebih dahulu
    let localList = existingList.filter((t) => t.laundryId === laundryId);
    if (localList.length === 0) {
      const idbList = await IndexedDbService.getAllLaundryTransaksi(laundryId);
      if (idbList.length > 0) {
        localList = idbList;
      }
    }

    if (!auth.currentUser) {
      return { updatedList: localList, newOrUpdatedCount: 0 };
    }

    const path = `laundries/${laundryId}/transaksi`;
    let newOrUpdatedCount = 0;

    try {
      let snap;
      // Jika ada timestamp sinkronisasi sebelumnya (> 0), gunakan Delta Query berbasis terakhirDieditPada
      if (sinceTimestamp > 0) {
        try {
          const qDelta = query(
            collection(db, path),
            where('terakhirDieditPada', '>', sinceTimestamp),
            limit(150)
          );
          snap = await getDocs(qDelta);
        } catch (eDelta) {
          console.warn('Delta query filter terakhirDieditPada fallback:', eDelta);
          // Fallback query standar jika index komposit belum siap
          const qStandard = query(collection(db, path), orderBy('tanggalMasuk', 'desc'), limit(150));
          snap = await getDocs(qStandard).catch(async () => {
            return await getDocs(query(collection(db, path), limit(150)));
          });
        }
      } else {
        // First-time sync: ambil batch terbaru
        try {
          const qInit = query(collection(db, path), orderBy('tanggalMasuk', 'desc'), limit(200));
          snap = await getDocs(qInit);
        } catch {
          snap = await getDocs(query(collection(db, path), limit(200)));
        }
      }

      const map = new Map<string, Transaksi>();
      localList.forEach((t) => map.set(t.id, t));

      if (snap && !snap.empty) {
        snap.forEach((d) => {
          const trxItem = FirebaseSyncService.parseTransaksiDoc(
            d.id,
            laundryId,
            d.data() as Partial<Transaksi>
          );
          map.set(trxItem.id, trxItem);
          newOrUpdatedCount++;
        });
      }

      const mergedList = Array.from(map.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);
      IndexedDbService.saveAllTransaksi(laundryId, mergedList).catch(console.error);

      return {
        updatedList: mergedList,
        newOrUpdatedCount,
      };
    } catch (err) {
      console.warn('Gagal fetchTransaksiDelta, gunakan data lokal:', err);
      return { updatedList: localList, newOrUpdatedCount: 0 };
    }
  }

  // 3.2 PASTIKAN DOKUMEN CABANG TERDAFTAR DI FIRESTORE (Mencegah permission-denied)
  static async saveLaundry(laundry: Laundry): Promise<void> {
    if (!laundry || !laundry.id || !auth.currentUser) return;
    if (laundry.id === 'lnd-1' || laundry.id === 'demo-lnd-1') return;
    try {
      const resolvedOwnerId =
        !laundry.ownerId || laundry.ownerId === 'own-1' || laundry.ownerId === 'demo-owner-1'
          ? auth.currentUser.uid
          : laundry.ownerId;
      const branchRef = doc(db, 'laundries', laundry.id);
      await setDoc(
        branchRef,
        {
          id: laundry.id,
          ownerId: resolvedOwnerId,
          namaLaundry: laundry.namaLaundry || "Kafela's Laundry",
          alamat: laundry.alamat ?? '',
          nomorTelepon: laundry.nomorTelepon ?? '',
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Gagal memastikan dokumen cabang di Firestore:', e);
    }
  }

  // 4. FETCH ARSIP BULANAN ON-DEMAND (HEMAT 100% KUOTA JIKA SUDAH DI-CACHE)
  // Hanya dipanggil saat pengguna sengaja membuka halaman Arsip!
  static async fetchArsipBulan(
    laundryId: string,
    year: number,
    month: number, // 0 = Jan, 11 = Des
    forceRefresh = false
  ): Promise<Transaksi[]> {
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // 4.1 Cek apakah bulan ini sudah ada di IndexedDB lokal
    const cachedArsip = await IndexedDbService.getArchiveByMonth(laundryId, monthKey);
    const isSynced = await IndexedDbService.getMeta(`archive_synced_${laundryId}_${monthKey}`, false);

    if (isSynced && !forceRefresh) {
      return cachedArsip;
    }

    if (!auth.currentUser) {
      return cachedArsip;
    }

    // 4.2 Query Firestore HANYA untuk bulan ini yang statusnya 'Diambil'
    const path = `laundries/${laundryId}/transaksi`;
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0).getTime();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();

    try {
      // 1. Query arsip yang tanggal masuknya di bulan ini
      const qMasuk = query(
        collection(db, path),
        where('status', '==', 'Diambil'),
        where('tanggalMasuk', '>=', startOfMonth),
        where('tanggalMasuk', '<=', endOfMonth),
        limit(150)
      );

      // 2. Query arsip yang diambil / dilunasi pada bulan ini (meskipun masuk di bulan sebelumnya)
      const qAmbil = query(
        collection(db, path),
        where('status', '==', 'Diambil'),
        where('tanggalPengambilan', '>=', startOfMonth),
        where('tanggalPengambilan', '<=', endOfMonth),
        limit(150)
      );

      const [snapMasuk, snapAmbil] = await Promise.all([
        getDocs(qMasuk).catch(() => null),
        getDocs(qAmbil).catch(() => null),
      ]);

      const mapDocs = new Map<string, Transaksi>();

      const processDoc = (d: any) => {
        const data = d.data() as Partial<Transaksi>;
        const tItem: Transaksi = {
          id: data.id || d.id,
          laundryId: data.laundryId || laundryId,
          namaPelanggan: data.namaPelanggan || 'Pelanggan',
          totalHarga: typeof data.totalHarga === 'number' ? data.totalHarga : 0,
          jumlahDp: typeof data.jumlahDp === 'number' ? data.jumlahDp : 0,
          tanggalMasuk: typeof data.tanggalMasuk === 'number' ? data.tanggalMasuk : Date.now(),
          tanggalSelesai: data.tanggalSelesai || null,
          status: 'Diambil',
          statusPembayaran: (data.statusPembayaran as any) || 'Lunas',
          items: Array.isArray(data.items) ? data.items : [],
          nomorTransaksi: data.nomorTransaksi || null,
          nomorTelepon: data.nomorTelepon || null,
          alamat: data.alamat || null,
          catatan: data.catatan || null,
          metodePembayaran: data.metodePembayaran || null,
          metodePembayaranDetail: data.metodePembayaranDetail || null,
          dikerjakanOleh: data.dikerjakanOleh || null,
          tanggalStatusSelesai: data.tanggalStatusSelesai || null,
          tanggalPengambilan: data.tanggalPengambilan || data.tanggalMasuk || Date.now(),
          tanggalPelunasan: data.tanggalPelunasan || null,
          terakhirDieditPada: data.terakhirDieditPada || Date.now(),
        };
        mapDocs.set(tItem.id, tItem);
      };

      if (snapMasuk) snapMasuk.forEach(processDoc);
      if (snapAmbil) snapAmbil.forEach(processDoc);

      const list = Array.from(mapDocs.values());

      // Simpan ke IndexedDB untuk bulan ini
      if (list.length > 0) {
        await IndexedDbService.saveArchiveTransaksi(laundryId, list);
      }
      await IndexedDbService.setMeta(`archive_synced_${laundryId}_${monthKey}`, true);

      // Gabungkan dengan cache lokal jika ada
      const map = new Map<string, Transaksi>();
      cachedArsip.forEach((t) => map.set(t.id, t));
      list.forEach((t) => map.set(t.id, t));

      return Array.from(map.values()).sort(
        (a, b) => (b.tanggalPengambilan || b.tanggalMasuk) - (a.tanggalPengambilan || a.tanggalMasuk)
      );
    } catch (e) {
      console.warn(`Gagal fetch arsip bulan ${monthKey}:`, e);
      return cachedArsip;
    }
  }

  // 5. CARI ARSIP DENGAN HEMAT KUOTA (Local-first)
  static async searchArsip(laundryId: string, queryText: string): Promise<Transaksi[]> {
    if (!queryText.trim()) return [];

    // Cek di IndexedDB lokal dulu (0 Reads)
    const localMatches = await IndexedDbService.searchArchive(laundryId, queryText);
    if (localMatches.length > 0 || !auth.currentUser) {
      return localMatches;
    }

    // Jika tidak ada di lokal dan query adalah nomor nota spesifik, cari di Cloud dengan limit 5
    if (queryText.includes('/') || queryText.length >= 4) {
      try {
        const path = `laundries/${laundryId}/transaksi`;
        const q = query(
          collection(db, path),
          where('nomorTransaksi', '==', queryText.trim()),
          limit(5)
        );
        const snap = await getDocs(q);
        const list: Transaksi[] = [];
        snap.forEach((d) => {
          const t = d.data() as Transaksi;
          list.push(t);
        });
        if (list.length > 0) {
          IndexedDbService.saveArchiveTransaksi(laundryId, list).catch(console.error);
        }
        return list;
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Membersihkan objek secara rekursif dari nilai `undefined`
   * agar Firestore setDoc() tidak error 'Unsupported field value: undefined'
   */
  static sanitizeForFirestore<T>(data: T): T {
    if (data === null || data === undefined) {
      return null as any;
    }
    if (Array.isArray(data)) {
      return data.map((item) => FirebaseSyncService.sanitizeForFirestore(item)) as any;
    }
    if (typeof data === 'object' && !(data instanceof Date)) {
      const clean: any = {};
      for (const [key, val] of Object.entries(data)) {
        if (val === undefined) {
          continue;
        }
        clean[key] = FirebaseSyncService.sanitizeForFirestore(val);
      }
      return clean;
    }
    return data;
  }

  // 6. SAVE TRANSAKSI - Selalu sertakan terakhirDieditPada agar Delta Sync bekerja sempurna
  static async saveTransaksi(trx: Transaksi): Promise<void> {
    const payload: Transaksi = FirebaseSyncService.sanitizeForFirestore({
      ...trx,
      terakhirDieditPada: Date.now(),
    });

    // Update penyimpanan lokal IndexedDB
    if (trx.status === 'Diambil') {
      IndexedDbService.moveToArchive(trx.laundryId, payload).catch(console.error);
    } else {
      IndexedDbService.putSingleActiveTransaksi(trx.laundryId, payload).catch(console.error);
    }

    // Jika user belum login dengan Firebase Auth, simpan lokal saja (tidak memicu permission error)
    if (!auth.currentUser) {
      return;
    }

    // Jika perangkat sedang offline, langsung simpan ke Outbox antrean background sync
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      await IndexedDbService.addToOutbox(payload);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then((reg: any) => reg.sync?.register('sync-laundry-trx'))
          .catch(() => {});
      }
      return;
    }

    try {
      await setDoc(doc(db, 'laundries', trx.laundryId, 'transaksi', trx.id), payload);
      // Hapus dari outbox jika sebelumnya pernah tertunda
      await IndexedDbService.removeFromOutbox(trx.id);
    } catch (e: any) {
      console.warn('Gagal setDoc ke Firestore langsung (koneksi terputus/ditolak):', e);
      if (e?.code === 'permission-denied') {
        console.warn('Izin ditolak oleh Firestore Security Rules, nota disimpan secara lokal saja.');
        await IndexedDbService.removeFromOutbox(trx.id);
        return;
      }
      await IndexedDbService.addToOutbox(payload);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready
          .then((reg: any) => reg.sync?.register('sync-laundry-trx'))
          .catch(() => {});
      }
    }
  }

  static async saveBatchTransaksi(list: Transaksi[]): Promise<void> {
    if (!list || list.length === 0) return;

    for (const trx of list) {
      const payload: Transaksi = FirebaseSyncService.sanitizeForFirestore({
        ...trx,
        terakhirDieditPada: Date.now(),
      });
      if (trx.status === 'Diambil') {
        IndexedDbService.moveToArchive(trx.laundryId, payload).catch(console.error);
      } else {
        IndexedDbService.putSingleActiveTransaksi(trx.laundryId, payload).catch(console.error);
      }
    }

    if (!auth.currentUser) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      for (const trx of list) {
        await IndexedDbService.addToOutbox(FirebaseSyncService.sanitizeForFirestore(trx));
      }
      return;
    }

    try {
      const batch = writeBatch(db);
      for (const trx of list) {
        const payload = FirebaseSyncService.sanitizeForFirestore({
          ...trx,
          terakhirDieditPada: Date.now(),
        });
        batch.set(doc(db, 'laundries', trx.laundryId, 'transaksi', trx.id), payload);
      }
      await batch.commit();
      for (const trx of list) {
        await IndexedDbService.removeFromOutbox(trx.id);
      }
    } catch {
      for (const trx of list) {
        await FirebaseSyncService.saveTransaksi(trx);
      }
    }
  }

  // 6.1 SINKRONISASI ANTREAN OUTBOX SAAT ONLINE KEMBALI (BACKGROUND SYNC)
  private static isSyncingOutbox = false;

  static async syncPendingOutbox(): Promise<{ synced: number; remaining: number }> {
    if (this.isSyncingOutbox) return { synced: 0, remaining: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) return { synced: 0, remaining: 0 };
    if (!auth.currentUser) return { synced: 0, remaining: 0 };

    this.isSyncingOutbox = true;
    let synced = 0;

    try {
      const pendingList = await IndexedDbService.getOutbox();
      if (pendingList.length === 0) {
        this.isSyncingOutbox = false;
        return { synced: 0, remaining: 0 };
      }

      console.log(`⚡ Background Sync: Menemukan ${pendingList.length} nota tertunda, memulai sinkronisasi ke Firestore...`);

      for (const trx of pendingList) {
        try {
          const payload: Transaksi = FirebaseSyncService.sanitizeForFirestore({
            ...trx,
            terakhirDieditPada: trx.terakhirDieditPada || Date.now(),
          });
          await setDoc(doc(db, 'laundries', trx.laundryId, 'transaksi', trx.id), payload);
          await IndexedDbService.removeFromOutbox(trx.id);
          synced++;
        } catch (err: any) {
          console.warn(`Gagal sinkronkan nota ${trx.id} saat background sync:`, err);
          if (err?.code === 'permission-denied') {
            // Hapus dari antrean jika ditolak otorisasi agar tidak macet selamanya
            await IndexedDbService.removeFromOutbox(trx.id);
          }
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            break;
          }
        }
      }

      const remaining = await IndexedDbService.getOutboxCount();
      console.log(`✅ Background Sync selesai: ${synced} terkirim, ${remaining} tersisa.`);
      return { synced, remaining };
    } catch (err) {
      console.warn('Terjadi kesalahan saat syncPendingOutbox:', err);
      return { synced, remaining: await IndexedDbService.getOutboxCount() };
    } finally {
      this.isSyncingOutbox = false;
    }
  }

  // 7. DELETE TRANSAKSI (Hanya diizinkan untuk akun Owner)
  static async deleteTransaksi(laundryId: string, trxId: string): Promise<void> {
    const path = `laundries/${laundryId}/transaksi/${trxId}`;
    // Hapus seketika dari IndexedDB lokal agar UI dan cache langsung bersih
    IndexedDbService.deleteTransaksiFromLocal(trxId).catch(console.warn);

    if (!auth.currentUser) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'laundries', laundryId, 'transaksi', trxId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  // 8. FETCH PELANGGAN LANGSUNG DARI SERVER (Multi-user sync & smart merge)
  static async fetchPelanggan(laundryId: string, cached: Pelanggan[] = []): Promise<Pelanggan[]> {
    if (!auth.currentUser) {
      return cached;
    }
    const path = `laundries/${laundryId}/pelanggan`;
    try {
      const q = query(collection(db, path), limit(150));
      const snap = await getDocs(q);
      const map = new Map<string, Pelanggan>();
      cached.forEach((p) => map.set(p.id, p));
      snap.forEach((d) => {
        const item = d.data() as Pelanggan;
        map.set(item.id, item);
      });
      return Array.from(map.values());
    } catch (e) {
      console.warn('Gagal fetch pelanggan:', e);
      return cached;
    }
  }

  static async savePelanggan(pel: Pelanggan): Promise<void> {
    const path = `laundries/${pel.laundryId}/pelanggan/${pel.id}`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await setDoc(doc(db, 'laundries', pel.laundryId, 'pelanggan', pel.id), pel);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // 9. FETCH LAYANAN LANGSUNG DARI SERVER (Multi-user sync & smart merge)
  static async fetchLayanan(laundryId: string, cached: Layanan[] = []): Promise<Layanan[]> {
    if (!auth.currentUser) {
      return cached;
    }
    const path = `laundries/${laundryId}/layanan`;
    try {
      const snap = await getDocs(collection(db, path));
      if (snap.empty) {
        return cached.length > 0 ? cached : defaultLayananList;
      }
      const map = new Map<string, Layanan>();
      cached.forEach((l) => map.set(l.id, l));
      snap.forEach((d) => {
        const item = d.data() as Layanan;
        map.set(item.id, item);
      });
      return Array.from(map.values()).sort((a, b) => (a.urutan ?? 999) - (b.urutan ?? 999));
    } catch (e) {
      console.warn('Gagal fetch layanan:', e);
      return cached;
    }
  }

  static async saveLayanan(lay: Layanan): Promise<void> {
    const path = `laundries/${lay.laundryId}/layanan/${lay.id}`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await setDoc(doc(db, 'laundries', lay.laundryId, 'layanan', lay.id), lay);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async deleteLayanan(laundryId: string, layId: string): Promise<void> {
    const path = `laundries/${laundryId}/layanan/${layId}`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'laundries', laundryId, 'layanan', layId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  // 10. FETCH PENGELUARAN LANGSUNG DARI SERVER (Multi-user sync)
  static async fetchPengeluaran(laundryId: string, cached: Pengeluaran[] = []): Promise<Pengeluaran[]> {
    if (!auth.currentUser) {
      return cached;
    }
    const path = `laundries/${laundryId}/pengeluaran`;
    try {
      let snap;
      try {
        const q = query(collection(db, path), orderBy('tanggal', 'desc'), limit(100));
        snap = await getDocs(q);
      } catch {
        const qFallback = query(collection(db, path), limit(100));
        snap = await getDocs(qFallback);
      }
      const list: Pengeluaran[] = [];
      if (snap) {
        snap.forEach((d) => list.push(d.data() as Pengeluaran));
      }
      return list.sort((a, b) => b.tanggal - a.tanggal);
    } catch (e) {
      console.warn('Gagal fetch pengeluaran:', e);
      return cached;
    }
  }

  static async savePengeluaran(peng: Pengeluaran): Promise<void> {
    const path = `laundries/${peng.laundryId}/pengeluaran/${peng.id}`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await setDoc(doc(db, 'laundries', peng.laundryId, 'pengeluaran', peng.id), peng);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // 11. FETCH SETTINGS LANGSUNG DARI SERVER (Multi-user sync)
  static async fetchSettings(laundryId: string, cached: SettingsData | null = null): Promise<SettingsData | null> {
    if (!auth.currentUser) {
      return cached;
    }
    try {
      const snap = await getDoc(doc(db, 'laundries', laundryId, 'settings', 'main'));
      if (snap.exists()) {
        const st = snap.data() as any;
        let header = st?.headerStruk;
        while (typeof header === 'object' && header !== null) {
          header = header.namaLaundry || header.headerStruk || "Kafela's Laundry";
        }
        const cleanLogoPath =
          typeof st?.logoPath === 'string' && st.logoPath.trim() ? st.logoPath.trim() : null;
        return {
          ...defaultSettings,
          ...st,
          headerStruk: typeof header === 'string' && header.trim() ? header : "Kafela's Laundry",
          logoPath: cleanLogoPath,
          useLogo: Boolean(st?.useLogo && cleanLogoPath),
          logoSize: st?.logoSize === 'kecil' || st?.logoSize === 'besar' ? st.logoSize : 'sedang',
        } as SettingsData;
      }
      return cached;
    } catch (e) {
      console.warn('Gagal fetch settings:', e);
      return cached;
    }
  }

  static async saveSettings(laundryId: string, settings: SettingsData): Promise<void> {
    const path = `laundries/${laundryId}/settings/main`;
    if (!auth.currentUser || !laundryId || laundryId === 'lnd-1' || laundryId === 'demo-lnd-1') {
      return;
    }
    try {
      const cleanLogoPath =
        typeof settings.logoPath === 'string' && settings.logoPath.trim()
          ? settings.logoPath.trim()
          : null;
      const cleanPayload = FirebaseSyncService.sanitizeForFirestore({
        ...settings,
        logoPath: cleanLogoPath,
        useLogo: Boolean(settings.useLogo && cleanLogoPath),
        logoSize: settings.logoSize || 'sedang',
        updatedAt: Date.now(),
      });
      await setDoc(doc(db, 'laundries', laundryId, 'settings', 'main'), cleanPayload, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}
