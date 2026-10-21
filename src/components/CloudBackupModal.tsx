import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Cloud,
  HardDrive,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  FileJson,
  ExternalLink,
  RefreshCw,
  FolderUp,
} from 'lucide-react';
import { BackupService, BackupPayload } from '../utils/backupService';
import { User, Laundry } from '../types';
import { useToast } from './NotificationContext';
import { formatDateIndo } from '../utils/formatters';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User;
  activeLaundry?: Laundry;
  onRestoreCompleted?: () => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeLaundry,
  onRestoreCompleted,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [backupStats, setBackupStats] = useState<{
    totalTransaksi: number;
    totalPelanggan: number;
    totalLayanan: number;
    totalPengeluaran: number;
  } | null>(null);

  const [lastBackup, setLastBackup] = useState<{
    timestamp: number;
    count: number;
  } | null>(null);

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreStats, setRestoreStats] = useState<any | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDriveGuide, setShowDriveGuide] = useState(false);

  // Load initial statistics and last backup info
  useEffect(() => {
    if (isOpen) {
      loadStats();
      setLastBackup(BackupService.getLastBackupInfo());
    }
  }, [isOpen]);

  const loadStats = async () => {
    try {
      const data = await BackupService.createBackupData(currentUser, activeLaundry?.id);
      setBackupStats(data.stats);
    } catch (e) {
      console.warn('Failed to calculate backup stats:', e);
    }
  };

  if (!isOpen) return null;

  // Handle Save to Google Drive / Cloud via Web Share API
  const handleSaveToDrive = async () => {
    setIsLoading(true);
    try {
      const payload = await BackupService.createBackupData(currentUser, activeLaundry?.id);
      const result = await BackupService.shareOrUploadToGoogleDrive(payload);

      setLastBackup(BackupService.getLastBackupInfo());

      if (result.sharedViaNative) {
        toast.success('Cadangan data berhasil dibuka! Silakan pilih Google Drive atau Cloud.');
      } else {
        toast.success(`File ${result.fileName} tersimpan! Anda dapat menyimpannya ke Google Drive.`);
        setShowDriveGuide(true);
      }
    } catch (err: any) {
      console.error('Backup error:', err);
      toast.error('Gagal membuat cadangan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Direct JSON Download
  const handleDownloadJson = async () => {
    setIsLoading(true);
    try {
      const payload = await BackupService.createBackupData(currentUser, activeLaundry?.id);
      const fileName = BackupService.downloadBackupJson(payload);
      setLastBackup(BackupService.getLastBackupInfo());
      toast.success(`Berkas ${fileName} berhasil diunduh ke perangkat Anda!`);
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error('Gagal mengunduh file cadangan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle File Input Change for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Mohon pilih file cadangan berformat .json');
      return;
    }

    setRestoreFile(file);

    // Read file temporarily to show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.stats || parsed.data) {
          setRestoreStats({
            app: parsed.app || "Kafela's Laundry",
            exportedAt: parsed.exportedAt,
            totalTransaksi: parsed.stats?.totalTransaksi ?? parsed.data?.transaksi?.length ?? 0,
            totalPelanggan: parsed.stats?.totalPelanggan ?? parsed.data?.pelanggan?.length ?? 0,
          });
        }
      } catch {
        toast.warning('Format berkas tidak sesuai standar cadangan Kafela.');
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreFile) return;

    const confirmRestore = window.confirm(
      'PERINGATAN: Memulihkan data cadangan akan memperbarui transaksi dan data lokal di perangkat ini dengan isi berkas cadangan. Lanjutkan?'
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    try {
      const result = await BackupService.restoreBackupFromFile(restoreFile);
      if (result.success) {
        toast.success(result.message);
        if (onRestoreCompleted) {
          onRestoreCompleted();
        } else {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
        onClose();
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      toast.error('Gagal memulihkan data: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3.5 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#800000] to-[#5a0000] text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-amber-300 border border-white/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Pencadangan Data ke Google Drive
              </h3>
              <p className="text-[11px] text-rose-200">
                Amankan seluruh nota, pelanggan & keuangan ke cloud
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 text-xs">
          {/* Status Box & Ringkasan Data */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Data Siap Dicadangkan
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                100% Lengkap (Aktif + Arsip)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Transaksi</div>
                <div className="text-sm font-black text-[#800000]">
                  {backupStats ? backupStats.totalTransaksi : '...'}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Pelanggan</div>
                <div className="text-sm font-black text-slate-900">
                  {backupStats ? backupStats.totalPelanggan : '...'}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Layanan</div>
                <div className="text-sm font-black text-slate-900">
                  {backupStats ? backupStats.totalLayanan : '...'}
                </div>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                <div className="text-[10px] text-slate-400 font-medium">Pengeluaran</div>
                <div className="text-sm font-black text-slate-900">
                  {backupStats ? backupStats.totalPengeluaran : '...'}
                </div>
              </div>
            </div>

            {/* Riwayat Pencadangan Terakhir */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/70">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Pencadangan Terakhir:
              </span>
              <span className="font-semibold text-slate-700">
                {lastBackup
                  ? `${formatDateIndo(lastBackup.timestamp)} (${lastBackup.count} nota)`
                  : 'Belum pernah dicadangkan'}
              </span>
            </div>
          </div>

          {/* OPSI 1: TOMBOL UTAMA CADANGKAN KE GOOGLE DRIVE / CLOUD */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
              <span>Pilihan 1: Simpan ke Google Drive / Cloud</span>
              <span className="text-emerald-700 text-[10px] font-semibold">Direkomendasikan</span>
            </label>

            <button
              type="button"
              onClick={handleSaveToDrive}
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-98 text-white rounded-2xl font-bold shadow-md flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sedang Menyiapkan Berkas...</span>
                </>
              ) : (
                <>
                  <FolderUp className="w-5 h-5 text-amber-200" />
                  <span className="text-xs sm:text-sm">Simpan ke Google Drive / Cloud Lainnya</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-slate-500 px-1 leading-relaxed">
              Membuka dialog penyimpanan perangkat (Android/iOS/PC). Anda dapat memilih <strong>Google Drive</strong>, <strong>iCloud</strong>, <strong>OneDrive</strong>, atau kirim berkas ke WhatsApp pribadi untuk arsip aman.
            </p>
          </div>

          {/* OPSI 2: UNDUH BERKAS JSON KE PERANGKAT */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={handleDownloadJson}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 active:scale-98 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
            >
              <Download className="w-4 h-4 text-[#800000]" />
              <span>Unduh Berkas Cadangan (.JSON) ke Komputer / HP</span>
            </button>
          </div>

          {/* PANDUAN GOOGLE DRIVE COLLAPSIBLE */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-[11px] text-amber-950 space-y-2">
            <button
              type="button"
              onClick={() => setShowDriveGuide(!showDriveGuide)}
              className="w-full flex items-center justify-between font-bold text-amber-900 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <span>💡</span> Cara Menyimpan & Mengunggah ke Google Drive
              </span>
              <span className="text-xs">{showDriveGuide ? '▲ Tutup' : '▼ Lihat Panduan'}</span>
            </button>

            {showDriveGuide && (
              <div className="pt-2 border-t border-amber-200/80 space-y-1.5 text-[10.5px] leading-relaxed text-slate-700">
                <p>
                  <strong>Di HP Android:</strong> Saat Anda menekan tombol hijau di atas, jendela berbagi sistem akan muncul. Pilih ikon <strong>"Google Drive"</strong> (atau <em>Simpan ke Drive</em>), pilih folder yang diinginkan, lalu klik <strong>Simpan</strong>.
                </p>
                <p>
                  <strong>Di Laptop / PC:</strong> Tekan tombol "Unduh Berkas Cadangan", lalu buka <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold">drive.google.com</a> di browser dan seret (drag-and-drop) file <code>backup_kafelas_laundry_*.json</code> ke dalam Google Drive Anda.
                </p>
                <p>
                  <strong>Di iPhone / iPad:</strong> Tekan tombol Simpan ke Cloud, pilih <strong>"Simpan ke File"</strong> lalu pilih <em>Google Drive</em> atau <em>iCloud Drive</em>.
                </p>
              </div>
            )}
          </div>

          {/* SECTION PULIHKAN (RESTORE) DATA */}
          <div className="pt-2 border-t border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-[#800000]" />
                Pulihkan (Restore) Data Dari File Cadangan
              </span>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed">
              Gunakan fitur ini jika Anda baru saja mengganti perangkat HP/Laptop, atau ingin mengembalikan data transaksi lama dari Google Drive.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            {!restoreFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 border border-dashed border-slate-300 text-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Pilih Berkas Cadangan (.JSON) dari Google Drive / HP</span>
              </button>
            ) : (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-900 truncate text-[11px]">
                      {restoreFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreFile(null);
                      setRestoreStats(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    Ganti
                  </button>
                </div>

                {restoreStats && (
                  <div className="text-[10px] text-emerald-900 bg-white/70 p-2 rounded-xl border border-emerald-200 space-y-0.5">
                    <div>
                      <strong>Asal Aplikasi:</strong> {restoreStats.app}
                    </div>
                    <div>
                      <strong>Waktu Dibuat:</strong>{' '}
                      {restoreStats.exportedAt ? formatDateIndo(restoreStats.exportedAt) : '-'}
                    </div>
                    <div>
                      <strong>Isi Data:</strong> {restoreStats.totalTransaksi} Transaksi,{' '}
                      {restoreStats.totalPelanggan} Pelanggan
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleExecuteRestore}
                  disabled={isRestoring}
                  className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isRestoring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sedang Memulihkan Data...</span>
                    </>
                  ) : (
                    <span>Konfirmasi & Pulihkan Data Sekarang</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition cursor-pointer active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
