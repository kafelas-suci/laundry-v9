import React, { useState, useEffect } from 'react';
import { Transaksi } from '../types';
import { IndexedDbService } from '../utils/indexedDb';
import { FirebaseSyncService } from '../utils/firebaseSync';
import { X, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from './NotificationContext';

interface SyncManagerModalProps {
  onClose: () => void;
}

export function SyncManagerModal({ onClose }: SyncManagerModalProps) {
  const [outbox, setOutbox] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadOutbox = async () => {
    const list = await IndexedDbService.getOutbox();
    setOutbox(list);
  };

  useEffect(() => {
    loadOutbox();
  }, []);

  const handleRetryAll = async () => {
    setLoading(true);
    await FirebaseSyncService.syncPendingOutbox();
    await loadOutbox();
    setLoading(false);
    toast.show('Sinkronisasi selesai', 'success');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">Manajer Sinkronisasi</h2>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {outbox.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={40} />
              <p>Semua data sudah tersinkronisasi!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-amber-600 flex items-center">
                <AlertTriangle size={16} className="mr-1" />
                {outbox.length} nota tertunda kirim.
              </p>
              {outbox.map(trx => (
                <div key={trx.id} className="p-3 border rounded-lg bg-gray-50">
                  <p className="font-medium">Nota: {trx.nomorTransaksi || 'Tanpa No'}</p>
                  <p className="text-xs text-gray-500">
                    {trx.namaPelanggan} - Rp{trx.totalHarga.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button 
            onClick={handleRetryAll}
            disabled={loading || outbox.length === 0}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Mengirim...' : 'Coba Lagi Semua'}
          </button>
        </div>
      </div>
    </div>
  );
}
