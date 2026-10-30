import React from 'react';
import { AlertCircle, CheckCircle, Truck } from 'lucide-react';
import { Transaksi } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface DashboardPickupConfirmModalProps {
  transaksi: Transaksi;
  alamat: string;
  onCancel: () => void;
  onConfirm: (trx: Transaksi) => void;
}

export const DashboardPickupConfirmModal: React.FC<DashboardPickupConfirmModalProps> = ({
  transaksi,
  alamat,
  onCancel,
  onConfirm,
}) => {
  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisa = Math.max(0, transaksi.totalHarga - (transaksi.jumlahDp || 0));
  const servicesDesc =
    Array.isArray(transaksi.items) && transaksi.items.length > 0
      ? transaksi.items
          .map((it) => `${it?.namaLayanan || 'Layanan'} (${it?.berat || 0} ${it?.satuan || ''})`)
          .join(', ')
      : 'Layanan Laundry';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Truck className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-black text-slate-900 text-center tracking-tight">
          Benar mau diambil?
        </h3>
        <p className="text-xs text-slate-500 text-center mt-1">
          Konfirmasi penyerahan cucian ke pelanggan
        </p>

        <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mt-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Pelanggan:</span>
            <span className="font-bold text-slate-900 truncate max-w-[190px]">
              {transaksi.namaPelanggan}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Alamat:</span>
            <span className="font-medium text-slate-700 truncate max-w-[190px]">
              {alamat}
            </span>
          </div>
          <div className="flex justify-between items-start gap-2">
            <span className="text-slate-500 shrink-0">Layanan:</span>
            <span className="text-slate-800 font-medium text-right line-clamp-2">
              {servicesDesc}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
            <span className="text-slate-500 font-semibold">Total Tagihan:</span>
            <span className="font-extrabold text-slate-900 text-sm tabular-nums">
              {formatRupiah(transaksi.totalHarga)}
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-dashed border-slate-200">
            <span className="text-slate-500">Status Pembayaran:</span>
            {isLunas || sisa <= 0 ? (
              <span className="px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800 text-[11px]">
                LUNAS
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full font-black bg-rose-100 text-rose-800 text-[11px] tabular-nums">
                SISA {formatRupiah(sisa)}
              </span>
            )}
          </div>
        </div>

        {!isLunas && sisa > 0 ? (
          <div className="mt-3.5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Masih terdapat sisa tagihan sebesar{' '}
              <strong className="font-bold text-rose-700">{formatRupiah(sisa)}</strong>. Jika Anda
              konfirmasi <strong>"Ya, Benar Diambil"</strong>, transaksi ini otomatis ditandai{' '}
              <strong>LUNAS</strong> dan diserahkan.
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Cucian sudah lunas dan siap diserahkan kepada pelanggan. Data akan otomatis masuk ke
              arsip cucian selesai diambil.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 font-bold text-xs text-slate-700 transition active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(transaksi)}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black text-xs text-white shadow-md transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Ya, Benar Diambil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPickupConfirmModal;
