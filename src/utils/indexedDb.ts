import { Transaksi } from '../types';

const DB_NAME = 'kafelas_laundry_v2';
const DB_VERSION = 1;

export class IndexedDbService {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: Transaksi Aktif (Diterima, Proses, Selesai)
        if (!db.objectStoreNames.contains('transaksi_aktif')) {
          const store = db.createObjectStore('transaksi_aktif', { keyPath: 'id' });
          store.createIndex('laundryId', 'laundryId', { unique: false });
          store.createIndex('tanggalMasuk', 'tanggalMasuk', { unique: false });
        }

        // Store 2: Transaksi Arsip (Diambil / Selesai masa lalu)
        if (!db.objectStoreNames.contains('transaksi_arsip')) {
          const store = db.createObjectStore('transaksi_arsip', { keyPath: 'id' });
          store.createIndex('laundryId', 'laundryId', { unique: false });
          store.createIndex('monthKey', 'monthKey', { unique: false });
          store.createIndex('laundry_month', ['laundryId', 'monthKey'], { unique: false });
          store.createIndex('nomorTransaksi', 'nomorTransaksi', { unique: false });
        }

        // Store 3: Metadata sinkronisasi & cache tracker
        if (!db.objectStoreNames.contains('meta_cache')) {
          db.createObjectStore('meta_cache', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  // Helper helper month key generator (format: YYYY-MM)
  static getMonthKey(timestamp: number): string {
    const d = new Date(timestamp);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${month}`;
  }

  // --- ACTIVE TRANSACTIONS ---
  static async saveActiveTransaksi(laundryId: string, list: Transaksi[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transaksi_aktif', 'readwrite');
      const store = tx.objectStore('transaksi_aktif');

      // Bersihkan transaksi aktif lama untuk laundryId ini
      const index = store.index('laundryId');
      const req = index.getAllKeys(IDBKeyRange.only(laundryId));
      req.onsuccess = () => {
        const keys = req.result;
        keys.forEach((k) => store.delete(k));
        // Masukkan data baru
        list.forEach((trx) => {
          if (trx.status !== 'Diambil') {
            store.put({ ...trx, laundryId });
          }
        });
      };

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Gagal simpan transaksi aktif ke IndexedDB:', e);
    }
  }

  static async getActiveTransaksi(laundryId: string): Promise<Transaksi[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transaksi_aktif', 'readonly');
      const store = tx.objectStore('transaksi_aktif');
      const index = store.index('laundryId');
      const request = index.getAll(IDBKeyRange.only(laundryId));

      return new Promise<Transaksi[]>((resolve) => {
        request.onsuccess = () => {
          const list = (request.result || []) as Transaksi[];
          resolve(list.sort((a, b) => b.tanggalMasuk - a.tanggalMasuk));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- ARCHIVE TRANSACTIONS ---
  static async saveArchiveTransaksi(laundryId: string, list: Transaksi[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transaksi_arsip', 'readwrite');
      const store = tx.objectStore('transaksi_arsip');

      list.forEach((trx) => {
        const time = trx.tanggalPengambilan || trx.tanggalMasuk || Date.now();
        const monthKey = this.getMonthKey(time);
        store.put({
          ...trx,
          laundryId,
          monthKey,
          status: 'Diambil',
        });
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Gagal simpan arsip ke IndexedDB:', e);
    }
  }

  static async getArchiveByMonth(laundryId: string, monthKey: string): Promise<Transaksi[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transaksi_arsip', 'readonly');
      const store = tx.objectStore('transaksi_arsip');
      const index = store.index('laundry_month');
      const request = index.getAll(IDBKeyRange.only([laundryId, monthKey]));

      return new Promise<Transaksi[]>((resolve) => {
        request.onsuccess = () => {
          const list = (request.result || []) as Transaksi[];
          resolve(list.sort((a, b) => (b.tanggalPengambilan || b.tanggalMasuk) - (a.tanggalPengambilan || a.tanggalMasuk)));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  static async searchArchive(laundryId: string, queryText: string): Promise<Transaksi[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('transaksi_arsip', 'readonly');
      const store = tx.objectStore('transaksi_arsip');
      const index = store.index('laundryId');
      const request = index.getAll(IDBKeyRange.only(laundryId));

      const q = queryText.toLowerCase().trim();
      return new Promise<Transaksi[]>((resolve) => {
        request.onsuccess = () => {
          const list = (request.result || []) as Transaksi[];
          const filtered = list.filter((t) => {
            return (
              t.namaPelanggan?.toLowerCase().includes(q) ||
              t.nomorTransaksi?.toLowerCase().includes(q) ||
              t.nomorTelepon?.includes(q)
            );
          });
          resolve(filtered.slice(0, 50));
        };
        request.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- MOVE BETWEEN ACTIVE & ARCHIVE ---
  static async moveToArchive(laundryId: string, trx: Transaksi): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['transaksi_aktif', 'transaksi_arsip'], 'readwrite');
      tx.objectStore('transaksi_aktif').delete(trx.id);

      const time = trx.tanggalPengambilan || Date.now();
      const monthKey = this.getMonthKey(time);
      tx.objectStore('transaksi_arsip').put({
        ...trx,
        laundryId,
        monthKey,
        status: 'Diambil',
        tanggalPengambilan: time,
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Gagal memindahkan transaksi ke arsip:', e);
    }
  }

  static async restoreToActive(laundryId: string, trx: Transaksi): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['transaksi_aktif', 'transaksi_arsip'], 'readwrite');
      tx.objectStore('transaksi_arsip').delete(trx.id);

      tx.objectStore('transaksi_aktif').put({
        ...trx,
        laundryId,
        status: 'Diterima',
        tanggalPengambilan: null,
      });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Gagal memulihkan transaksi ke antrean aktif:', e);
    }
  }

  // --- METADATA CACHE HELPERS ---
  static async getMeta(key: string, defaultValue: any = null): Promise<any> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('meta_cache', 'readonly');
      const store = tx.objectStore('meta_cache');
      const request = store.get(key);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          resolve(request.result?.value ?? defaultValue);
        };
        request.onerror = () => resolve(defaultValue);
      });
    } catch {
      return defaultValue;
    }
  }

  static async setMeta(key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('meta_cache', 'readwrite');
      const store = tx.objectStore('meta_cache');
      store.put({ key, value, updatedAt: Date.now() });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.warn('Gagal simpan meta cache:', e);
    }
  }
}
