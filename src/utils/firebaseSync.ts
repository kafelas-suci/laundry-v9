import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
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

export class FirebaseSyncService {
  static async getOrCreateUserProfile(firebaseUser: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
    username?: string | null;
    namaLaundry?: string | null;
  }): Promise<User> {
    const defaultLaundryId = `lnd-${firebaseUser.uid}`;
    const branchName = firebaseUser.namaLaundry?.trim() || firebaseUser.displayName?.trim() || "Laundry";
    const userName = firebaseUser.displayName?.trim() || firebaseUser.username?.trim() || 'Owner';
    const phone = firebaseUser.phoneNumber?.trim() || '';

    const newUser: User = {
      uid: firebaseUser.uid,
      emailOrPhone: firebaseUser.email || phone || '',
      username: userName,
      displayName: userName,
      nomorTelepon: phone,
      role: 'owner',
      laundryId: defaultLaundryId,
      laundries: { [defaultLaundryId]: branchName },
      walletBalance: 0,
      createdAt: Date.now(),
      subscriptionType: 'newcomer',
      subscriptionEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const user = snap.data() as User;
        StorageService.set('active_user', user);
        return user;
      }

      await setDoc(userDocRef, newUser);
      StorageService.set('active_user', newUser);

      // Create initial branch dengan nama laundry dan nomor HP yang dimasukkan user
      const branchRef = doc(db, 'laundries', defaultLaundryId);
      const initialBranch: Laundry = {
        id: defaultLaundryId,
        ownerId: firebaseUser.uid,
        namaLaundry: branchName,
        alamat: 'Bandung',
        nomorTelepon: phone,
      };
      await setDoc(branchRef, initialBranch);

      // Inisialisasi pengaturan struk dengan nama laundry dan no telepon yang didaftarkan
      const settingsRef = doc(db, 'laundries', defaultLaundryId, 'settings', 'main');
      const customSettings: SettingsData = {
        ...defaultSettings,
        headerStruk: branchName,
        appTitle: branchName,
        phoneNumber: phone || defaultSettings.phoneNumber,
      };
      await setDoc(settingsRef, customSettings);
      StorageService.set('settings', customSettings);

      // Create initial services
      for (const lay of defaultLayananList) {
        const layDoc = doc(db, 'laundries', defaultLaundryId, 'layanan', lay.id);
        await setDoc(layDoc, { ...lay, laundryId: defaultLaundryId });
      }

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
    const path = `users/${user.uid}`;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, user, { merge: true });
    } catch (e) {
      console.warn('Gagal sinkron profil user ke Firestore:', e);
    }
  }

  // 2. Fetch Laundries for User (Strict ownerId validation)
  static async fetchLaundries(ownerId: string, cached: Laundry[] = [], forceSync = false): Promise<Laundry[]> {
    if (!auth.currentUser) {
      return cached.filter((l) => l.ownerId === ownerId);
    }
    const validCached = cached.filter((l) => l.ownerId === ownerId && l.id !== 'lnd-1' && l.id !== 'demo-lnd-1');
    if (!forceSync && validCached.length > 0) {
      return validCached;
    }
    const laundriesRef = collection(db, 'laundries');
    try {
      const q = query(laundriesRef, where('ownerId', '==', ownerId), limit(10));
      const snap = await getDocs(q);
      const list: Laundry[] = [];
      snap.forEach((d) => {
        const data = d.data() as Laundry;
        if (data.ownerId === ownerId) {
          list.push(data);
        }
      });
      return list.length > 0 ? list : validCached;
    } catch (e) {
      console.warn('Gagal fetch laundries dari server, gunakan cache:', e);
      return validCached;
    }
  }

  // 3. FETCH TRANSAKSI AKTIF (HEMAT KUOTA MAKSIMAL)
  // Hanya mengambil transaksi yang BELUM DIAMBIL (status != 'Diambil')
  // Transaksi arsip 1000+ dokumen TIDAK AKAN PERNAH tersentuh saat startup/reload!
  static async fetchTransaksiAktif(
    laundryId: string,
    existingList: Transaksi[] = [],
    forceFullSync = false
  ): Promise<Transaksi[]> {
    const path = `laundries/${laundryId}/transaksi`;
    const syncKey = `last_sync_active_trx_${laundryId}`;
    const lastSync = StorageService.get<number>(syncKey, 0);

    // 3.1 Coba baca dari IndexedDB lokal terlebih dahulu
    let localList = existingList.filter((t) => t.laundryId === laundryId && t.status !== 'Diambil');
    if (localList.length === 0) {
      const idbList = await IndexedDbService.getActiveTransaksi(laundryId);
      if (idbList.length > 0) {
        localList = idbList;
      }
    }

    // Cooldown 3 menit: Jika sudah tersinkron baru saja dan tidak dipaksa, 0 READS FIRESTORE!
    if (!forceFullSync && localList.length > 0 && lastSync > 0 && Date.now() - lastSync < 3 * 60 * 1000) {
      console.log('⚡ Menggunakan Transaksi Aktif dari Cache Lokal (0 Reads Firestore)');
      return localList;
    }

    if (!auth.currentUser) {
      return localList;
    }

    try {
      // 3.2 DELTA SYNC: Jika ada data lokal, hanya cari data yang berubah dalam rentang waktu terakhir
      if (localList.length > 0 && lastSync > 0 && !forceFullSync) {
        const cutoffTime = Math.max(0, lastSync - 120000);
        const deltaQuery = query(
          collection(db, path),
          where('terakhirDieditPada', '>=', cutoffTime)
        );

        const snap = await getDocs(deltaQuery);
        // Jika tidak ada yang diedit sejak sync terakhir: 0 DOKUMEN READS DITAMBAHKAN!
        if (snap.empty) {
          StorageService.set(syncKey, Date.now());
          return localList;
        }

        const map = new Map<string, Transaksi>();
        localList.forEach((t) => map.set(t.id, t));

        snap.forEach((d) => {
          const data = d.data() as Partial<Transaksi>;
          const trxItem: Transaksi = {
            id: data.id || d.id,
            laundryId: data.laundryId || laundryId,
            namaPelanggan: data.namaPelanggan || 'Pelanggan',
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
            tanggalStatusSelesai: data.tanggalStatusSelesai || null,
            tanggalPengambilan: data.tanggalPengambilan || null,
            tanggalPelunasan: data.tanggalPelunasan || null,
            terakhirDieditPada: data.terakhirDieditPada || Date.now(),
          };

          // Jika statusnya sekarang sudah Diambil, pindahkan ke arsip lokal
          if (trxItem.status === 'Diambil') {
            map.delete(trxItem.id);
            IndexedDbService.moveToArchive(laundryId, trxItem).catch(console.error);
          } else {
            map.set(trxItem.id, trxItem);
          }
        });

        const updated = Array.from(map.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);
        StorageService.set(syncKey, Date.now());
        IndexedDbService.saveActiveTransaksi(laundryId, updated).catch(console.error);
        return updated;
      }

      // 3.3 COLD START / FIRST LOAD: HANYA QUERY TRANSAKSI AKTIF (STATUS IN ['Diterima', 'Proses', 'Selesai'])
      // Mencegah query membaca 1000+ dokumen arsip!
      let snap;
      try {
        const qActive = query(
          collection(db, path),
          where('status', 'in', ['Diterima', 'Proses', 'Selesai']),
          limit(250)
        );
        snap = await getDocs(qActive);
      } catch (err) {
        // Fallback jika database belum ada index status: ambil query tanpa orderBy
        try {
          const qFallback = query(collection(db, path), limit(150));
          snap = await getDocs(qFallback);
        } catch (e2) {
          console.warn('Fallback query error:', e2);
          return localList;
        }
      }

      const activeList: Transaksi[] = [];
      const archiveList: Transaksi[] = [];

      snap.forEach((d) => {
        const data = d.data() as Partial<Transaksi>;
        const trxItem: Transaksi = {
          id: data.id || d.id,
          laundryId: data.laundryId || laundryId,
          namaPelanggan: data.namaPelanggan || 'Pelanggan',
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
          tanggalStatusSelesai: data.tanggalStatusSelesai || null,
          tanggalPengambilan: data.tanggalPengambilan || null,
          tanggalPelunasan: data.tanggalPelunasan || null,
          terakhirDieditPada: data.terakhirDieditPada || Date.now(),
        };

        if (trxItem.status === 'Diambil') {
          archiveList.push(trxItem);
        } else {
          activeList.push(trxItem);
        }
      });

      // Simpan arsip yang kebetulan ikut terbawa ke IndexedDB arsip
      if (archiveList.length > 0) {
        IndexedDbService.saveArchiveTransaksi(laundryId, archiveList).catch(console.error);
      }

      const sortedActive = activeList.sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);
      StorageService.set(syncKey, Date.now());
      IndexedDbService.saveActiveTransaksi(laundryId, sortedActive).catch(console.error);
      return sortedActive;
    } catch (e) {
      console.warn('Gagal sync transaksi aktif dari cloud, menggunakan data lokal:', e);
      return localList.length > 0 ? localList : [];
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

    if (cachedArsip.length > 0 && isSynced && !forceRefresh) {
      console.log(`⚡ Menggunakan Arsip Bulan ${monthKey} dari IndexedDB Lokal (0 Reads Firestore)`);
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

  // 6. SAVE TRANSAKSI - Selalu sertakan terakhirDieditPada agar Delta Sync bekerja sempurna
  static async saveTransaksi(trx: Transaksi): Promise<void> {
    const path = `laundries/${trx.laundryId}/transaksi/${trx.id}`;
    const payload: Transaksi = {
      ...trx,
      terakhirDieditPada: Date.now(),
    };

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

    try {
      await setDoc(doc(db, 'laundries', trx.laundryId, 'transaksi', trx.id), payload);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // 7. DELETE TRANSAKSI
  static async deleteTransaksi(laundryId: string, trxId: string): Promise<void> {
    const path = `laundries/${laundryId}/transaksi/${trxId}`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'laundries', laundryId, 'transaksi', trxId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  // 8. FETCH PELANGGAN LANGSUNG DARI SERVER (Multi-user sync)
  static async fetchPelanggan(laundryId: string, cached: Pelanggan[] = []): Promise<Pelanggan[]> {
    if (!auth.currentUser) {
      return cached;
    }
    const path = `laundries/${laundryId}/pelanggan`;
    try {
      const q = query(collection(db, path), limit(150));
      const snap = await getDocs(q);
      const list: Pelanggan[] = [];
      snap.forEach((d) => list.push(d.data() as Pelanggan));
      return list;
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

  // 9. FETCH LAYANAN LANGSUNG DARI SERVER (Multi-user sync)
  static async fetchLayanan(laundryId: string, cached: Layanan[] = []): Promise<Layanan[]> {
    if (!auth.currentUser) {
      return cached;
    }
    const path = `laundries/${laundryId}/layanan`;
    try {
      const snap = await getDocs(collection(db, path));
      const list: Layanan[] = [];
      snap.forEach((d) => list.push(d.data() as Layanan));
      return list.sort((a, b) => a.urutan - b.urutan);
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
    const path = `laundries/${laundryId}/settings/main`;
    try {
      const snap = await getDoc(doc(db, 'laundries', laundryId, 'settings', 'main'));
      if (snap.exists()) {
        return snap.data() as SettingsData;
      }
      return cached;
    } catch (e) {
      console.warn('Gagal fetch settings:', e);
      return cached;
    }
  }

  static async saveSettings(laundryId: string, settings: SettingsData): Promise<void> {
    const path = `laundries/${laundryId}/settings/main`;
    if (!auth.currentUser) {
      return;
    }
    try {
      await setDoc(doc(db, 'laundries', laundryId, 'settings', 'main'), settings);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }
}
