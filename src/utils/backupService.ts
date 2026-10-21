import { StorageService } from './storage';
import { IndexedDbService } from './indexedDb';
import { FirebaseSyncService } from './firebaseSync';
import {
  Transaksi,
  Pelanggan,
  Layanan,
  Pengeluaran,
  ArusKas,
  SettingsData,
  Laundry,
  OperationalStaff,
  User,
} from '../types';

export interface BackupPayload {
  app: string;
  backupVersion: number;
  exportedAt: string;
  exportedTimestamp: number;
  exportedBy?: string;
  laundryId?: string;
  laundryName?: string;
  stats: {
    totalTransaksi: number;
    totalPelanggan: number;
    totalLayanan: number;
    totalPengeluaran: number;
  };
  data: {
    settings: SettingsData;
    laundries: Laundry[];
    layanan: Layanan[];
    pelanggan: Pelanggan[];
    transaksi: Transaksi[];
    pengeluaran: Pengeluaran[];
    manual_cash_logs: ArusKas[];
    operational_staff: OperationalStaff[];
    staff: User[];
  };
}

export class BackupService {
  private static STORAGE_LAST_BACKUP_KEY = 'last_manual_backup_meta';

  /**
   * Mengumpulkan seluruh data operasional dari LocalStorage dan IndexedDB (Aktif + Arsip)
   */
  static async createBackupData(currentUser?: User | null, activeLaundryId?: string): Promise<BackupPayload> {
    const settings = StorageService.get<SettingsData>('settings', {} as any);
    const laundries = StorageService.get<Laundry[]>('laundries', []);
    const layanan = StorageService.get<Layanan[]>('layanan', []);
    const pelanggan = StorageService.get<Pelanggan[]>('pelanggan', []);
    const pengeluaran = StorageService.get<Pengeluaran[]>('pengeluaran', []);
    const manualCashLogs = StorageService.get<ArusKas[]>('manual_cash_logs', []);
    const operationalStaff = StorageService.get<OperationalStaff[]>('operational_staff', []);
    const staff = StorageService.get<User[]>('staff', []);

    // Ambil seluruh transaksi dari LocalStorage + IndexedDB (termasuk arsip bulan lalu)
    const localTrx = StorageService.get<Transaksi[]>('transaksi', []);
    let idbTrx: Transaksi[] = [];
    try {
      if (activeLaundryId) {
        idbTrx = await IndexedDbService.getAllLaundryTransaksi(activeLaundryId);
      }
    } catch (e) {
      console.warn('IDB fetch warning during backup:', e);
    }

    // Merge transaksi tanpa duplikat
    const trxMap = new Map<string, Transaksi>();
    idbTrx.forEach((t) => trxMap.set(t.id, t));
    localTrx.forEach((t) => trxMap.set(t.id, t));
    const allTransaksi = Array.from(trxMap.values()).sort((a, b) => b.tanggalMasuk - a.tanggalMasuk);

    const activeLaundry = laundries.find((l) => l.id === activeLaundryId) || laundries[0];
    const laundryName = typeof activeLaundry?.namaLaundry === 'string'
      ? activeLaundry.namaLaundry
      : (activeLaundry?.namaLaundry as any)?.namaLaundry || "Kafela's Laundry";

    const now = new Date();
    const payload: BackupPayload = {
      app: "Kafela's Laundry",
      backupVersion: 2,
      exportedAt: now.toISOString(),
      exportedTimestamp: now.getTime(),
      exportedBy: currentUser?.displayName || currentUser?.emailOrPhone || 'Owner',
      laundryId: activeLaundryId || 'lnd-1',
      laundryName,
      stats: {
        totalTransaksi: allTransaksi.length,
        totalPelanggan: pelanggan.length,
        totalLayanan: layanan.length,
        totalPengeluaran: pengeluaran.length,
      },
      data: {
        settings,
        laundries,
        layanan,
        pelanggan,
        transaksi: allTransaksi,
        pengeluaran,
        manual_cash_logs: manualCashLogs,
        operational_staff: operationalStaff,
        staff,
      },
    };

    // Simpan metadata waktu cadangan terakhir
    this.recordLastBackup(payload.exportedTimestamp, payload.stats.totalTransaksi);

    return payload;
  }

  /**
   * Format nama file cadangan
   */
  static getBackupFileName(laundryName = 'kafelas_laundry'): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const cleanName = laundryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `backup_${cleanName}_${dateStr}_${timeStr}.json`;
  }

  /**
   * Simpan & Unduh Berkas JSON langsung ke perangkat / disk lokal
   */
  static downloadBackupJson(payload: BackupPayload): string {
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const fileName = this.getBackupFileName(payload.laundryName);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    return fileName;
  }

  /**
   * Berbagi atau Simpan ke Google Drive / Penyimpanan Cloud
   * Menggunakan Web Share API File jika didukung (Android, iOS, macOS),
   * sehingga pengguna bisa langsung memilih tombol "Simpan ke Google Drive"
   */
  static async shareOrUploadToGoogleDrive(payload: BackupPayload): Promise<{ sharedViaNative: boolean; fileName: string }> {
    const jsonStr = JSON.stringify(payload, null, 2);
    const fileName = this.getBackupFileName(payload.laundryName);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const file = new File([blob], fileName, { type: 'application/json' });

    // Cek apakah perangkat mendukung Web Share API dengan berkas
    if (
      typeof navigator !== 'undefined' &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({
          files: [file],
          title: `Cadangan Data ${payload.laundryName}`,
          text: `Berkas cadangan data kasir & transaksi ${payload.laundryName} (${payload.stats.totalTransaksi} nota, ${payload.stats.totalPelanggan} pelanggan). Simpan ke Google Drive atau penyimpanan cloud Anda.`,
        });
        return { sharedViaNative: true, fileName };
      } catch (err: any) {
        // Jika dibatalkan oleh pengguna (AbortError), jangan lempar error kritis
        if (err.name === 'AbortError') {
          return { sharedViaNative: false, fileName };
        }
        console.warn('Native share failed, falling back to download:', err);
      }
    }

    // Fallback: Unduh berkas JSON secara otomatis
    this.downloadBackupJson(payload);
    return { sharedViaNative: false, fileName };
  }

  /**
   * Catat riwayat pencadangan terakhir
   */
  static recordLastBackup(timestamp: number, count: number): void {
    try {
      localStorage.setItem(
        this.STORAGE_LAST_BACKUP_KEY,
        JSON.stringify({ timestamp, count })
      );
    } catch {
      // Abaikan jika storage terbatas
    }
  }

  /**
   * Dapatkan informasi waktu pencadangan terakhir
   */
  static getLastBackupInfo(): { timestamp: number; count: number } | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_LAST_BACKUP_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Return null
    }
    return null;
  }

  /**
   * Validasi dan Pulihkan (Restore) data dari Berkas JSON
   */
  static async restoreBackupFromFile(file: File): Promise<{
    success: boolean;
    message: string;
    stats?: BackupPayload['stats'];
  }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          if (!content) {
            resolve({ success: false, message: 'Berkas cadangan kosong atau tidak dapat dibaca.' });
            return;
          }

          const parsed: BackupPayload = JSON.parse(content);

          if (!parsed.data || typeof parsed.data !== 'object') {
            resolve({ success: false, message: 'Format berkas tidak valid. Tidak ditemukan data cadangan Kafela.' });
            return;
          }

          const {
            settings,
            laundries,
            layanan,
            pelanggan,
            transaksi,
            pengeluaran,
            manual_cash_logs,
            operational_staff,
            staff,
          } = parsed.data;

          // 1. Simpan ke LocalStorage
          if (Array.isArray(transaksi)) StorageService.set('transaksi', transaksi);
          if (Array.isArray(pelanggan)) StorageService.set('pelanggan', pelanggan);
          if (Array.isArray(layanan)) StorageService.set('layanan', layanan);
          if (Array.isArray(pengeluaran)) StorageService.set('pengeluaran', pengeluaran);
          if (Array.isArray(manual_cash_logs)) StorageService.set('manual_cash_logs', manual_cash_logs);
          if (Array.isArray(laundries)) StorageService.set('laundries', laundries);
          if (Array.isArray(operational_staff)) StorageService.set('operational_staff', operational_staff);
          if (Array.isArray(staff)) StorageService.set('staff', staff);
          if (settings && typeof settings === 'object') StorageService.set('settings', settings);

          // 2. Simpan ke IndexedDB (Aktif & Arsip)
          if (Array.isArray(transaksi)) {
            try {
              const targetLaundryId = parsed.laundryId || (Array.isArray(laundries) && laundries[0]?.id) || 'lnd-1';
              await IndexedDbService.saveAllTransaksi(targetLaundryId, transaksi);
            } catch (err) {
              console.warn('IDB restore warning:', err);
            }
          }

          resolve({
            success: true,
            message: `Data berhasil dipulihkan! (${transaksi?.length || 0} transaksi, ${pelanggan?.length || 0} pelanggan).`,
            stats: parsed.stats || {
              totalTransaksi: transaksi?.length || 0,
              totalPelanggan: pelanggan?.length || 0,
              totalLayanan: layanan?.length || 0,
              totalPengeluaran: pengeluaran?.length || 0,
            },
          });
        } catch (err: any) {
          console.error('Restore error:', err);
          resolve({ success: false, message: `Gagal membaca berkas: ${err.message || 'Format JSON rusak.'}` });
        }
      };

      reader.onerror = () => {
        resolve({ success: false, message: 'Gagal membuka berkas cadangan.' });
      };

      reader.readAsText(file);
    });
  }
}
