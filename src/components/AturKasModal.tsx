import React, { useState } from 'react';
import { X, PlusCircle, MinusCircle, Wallet } from 'lucide-react';
import { JenisPengeluaran, JenisPemasukan, Pengeluaran, ArusKas } from '../types';
import { formatRupiah } from '../utils/formatters';

interface AturKasModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPemasukanEnabled: boolean;
  daftarJenisPengeluaran: JenisPengeluaran[];
  daftarJenisPemasukan: JenisPemasukan[];
  onSavePengeluaran: (pengeluaran: Omit<Pengeluaran, 'id'>) => void;
  onSavePemasukan: (pemasukan: ArusKas) => void;
}

export const AturKasModal: React.FC<AturKasModalProps> = ({
  isOpen,
  onClose,
  isPemasukanEnabled,
  daftarJenisPengeluaran,
  daftarJenisPemasukan,
  onSavePengeluaran,
  onSavePemasukan,
}) => {
  const [tipe, setTipe] = useState<'pengeluaran' | 'pemasukan'>('pengeluaran');
  const [keterangan, setKeterangan] = useState('');
  const [hargaSatuan, setHargaSatuan] = useState<number>(0);
  const [qty, setQty] = useState<number>(1);

  if (!isOpen) return null;

  const handleSelectPredefined = (name: string, price: number) => {
    setKeterangan(name);
    setHargaSatuan(price);
  };

  const handleSave = () => {
    if (!keterangan.trim()) {
      alert('Keterangan kas harus diisi.');
      return;
    }
    if (hargaSatuan <= 0 || qty <= 0) {
      alert('Harga dan jumlah (qty) harus lebih besar dari 0.');
      return;
    }

    const total = hargaSatuan * qty;
    const now = Date.now();

    if (tipe === 'pengeluaran') {
      onSavePengeluaran({
        laundryId: 'lnd-1',
        tanggal: now,
        keterangan: keterangan.trim(),
        jumlah: total,
      });
    } else {
      onSavePemasukan({
        timestamp: now,
        keterangan: keterangan.trim(),
        jumlahMasuk: total,
        jumlahKeluar: 0,
        metodePembayaran: 'Tunai',
        logType: null,
      });
    }

    onClose();
    // Reset state
    setKeterangan('');
    setHargaSatuan(0);
    setQty(1);
  };

  const totalCalculated = (hargaSatuan || 0) * (qty || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm">Catat Kas Manual</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {/* Radio Switch: Pengeluaran vs Pemasukan */}
          {isPemasukanEnabled && (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTipe('pengeluaran');
                  setKeterangan('');
                  setHargaSatuan(0);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  tipe === 'pengeluaran' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Pengeluaran Kas
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipe('pemasukan');
                  setKeterangan('');
                  setHargaSatuan(0);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  tipe === 'pemasukan' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Pemasukan Kas
              </button>
            </div>
          )}

          {/* Quick Category Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase">
              Pilihan Cepat {tipe === 'pengeluaran' ? 'Jenis Pengeluaran' : 'Jenis Pemasukan'}:
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {(tipe === 'pengeluaran' ? daftarJenisPengeluaran : daftarJenisPemasukan).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPredefined(item.nama, item.harga)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                    keterangan === item.nama
                      ? 'border-[#800000] bg-rose-50 text-[#800000] font-bold'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.nama}
                </button>
              ))}
            </div>
          </div>

          {/* Input Keterangan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan {tipe === 'pengeluaran' ? 'Pengeluaran' : 'Pemasukan'}
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Gas LPG 3kg / Beli Plastik Kresek"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          {/* Harga Satuan & Qty */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Satuan (Rp)</label>
              <input
                type="number"
                min="0"
                value={hargaSatuan || ''}
                onChange={(e) => setHargaSatuan(Math.max(0, parseInt(e.target.value, 10) || 0))}
                placeholder="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Qty</label>
              <input
                type="number"
                min="1"
                value={qty || 1}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>
          </div>

          {/* Subtotal preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600 font-medium">Total Nominal Kas:</span>
            <span className={`text-base font-bold ${tipe === 'pengeluaran' ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatRupiah(totalCalculated)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-xs font-bold text-white shadow-xs transition"
            >
              Simpan Transaksi Kas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
