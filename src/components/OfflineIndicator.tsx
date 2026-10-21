import React, { useEffect, useState, useCallback } from 'react';
import { WifiOff, Wifi, CloudUpload, RotateCw } from 'lucide-react';
import { IndexedDbService } from '../utils/indexedDb';
import { FirebaseSyncService } from '../utils/firebaseSync';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Periksa sisa antrean outbox di IndexedDB
  const checkPendingOutbox = useCallback(async () => {
    try {
      const count = await IndexedDbService.getOutboxCount();
      setPendingCount(count);
    } catch {
      // ignore
    }
  }, []);

  // Jalankan sinkronisasi senyap ke Cloud Firestore
  const triggerSilentSync = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await FirebaseSyncService.syncPendingOutbox();
    } finally {
      setIsSyncing(false);
      checkPendingOutbox();
    }
  }, [checkPendingOutbox]);

  useEffect(() => {
    checkPendingOutbox();

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      triggerSilentSync();
      const timer = setTimeout(() => setShowReconnected(false), 2500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      checkPendingOutbox();
    };

    const handleOutboxUpdate = () => {
      checkPendingOutbox();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        triggerSilentSync();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && typeof navigator !== 'undefined' && navigator.onLine) {
        triggerSilentSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('kafelas-outbox-updated', handleOutboxUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Heartbeat otomatis setiap 12 detik jika masih ada antrean dan perangkat online
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        IndexedDbService.getOutboxCount().then((count) => {
          setPendingCount(count);
          if (count > 0) {
            triggerSilentSync();
          }
        }).catch(() => {});
      }
    }, 12000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('kafelas-outbox-updated', handleOutboxUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [checkPendingOutbox, triggerSilentSync]);

  return (
    <>
      {/* 1. Toast status pemulihan koneksi singkat */}
      {showReconnected && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in pointer-events-none">
          <Wifi className="w-3.5 h-3.5" />
          <span>Terhubung kembali ke jaringan</span>
        </div>
      )}

      {/* 2. Banner strip saat sedang offline murni */}
      {!isOnline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-medium text-white shadow-lg pointer-events-none">
          <WifiOff className="w-3.5 h-3.5 animate-pulse" />
          <span>Mode Offline — Data tersimpan aman di HP</span>
        </div>
      )}

      {/* 3. Floating Badge Nota Tertunda (Outbox Queue) */}
      {pendingCount > 0 && (
        <div className="fixed bottom-20 md:bottom-5 right-4 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            onClick={triggerSilentSync}
            title="Klik untuk langsung mencoba mengirim nota tertunda ke Cloud Firestore"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl backdrop-blur-xs cursor-pointer active:scale-95 transition select-none group hover:border-amber-400"
          >
            <div className="relative flex items-center justify-center shrink-0">
              {isSyncing ? (
                <RotateCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>

            <div className="text-left min-w-0 pr-1">
              <div className="text-xs font-bold text-amber-300 font-mono tabular-nums leading-tight">
                {pendingCount} Nota Tertunda
              </div>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate max-w-[160px] sm:max-w-none">
                {isSyncing
                  ? 'Sedang mengirim ke Cloud...'
                  : isOnline
                  ? 'Menyinkronkan otomatis...'
                  : 'Tersimpan di HP · Menunggu sinyal'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
