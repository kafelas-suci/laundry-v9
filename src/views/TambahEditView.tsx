import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, CheckCircle2, User, MapPin, Tag } from 'lucide-react';
import { Transaksi, LayananItem, Layanan, Pelanggan, SettingsData } from '../types';
import { formatRupiah, calculateCompletionDate } from '../utils/formatters';

interface TambahEditViewProps {
  onBack: () => void;
  layananList: Layanan[];
  pelangganList: Pelanggan[];
  settings: SettingsData;
  activeLaundryId: string;
  transaksiToEdit?: Transaksi | null;
  onSave: (transaksi: Omit<Transaksi, 'id'> & { id?: string }, items: LayananItem[]) => void;
}

export const TambahEditView: React.FC<TambahEditViewProps> = ({
  onBack,
  layananList,
  pelangganList,
  settings,
  activeLaundryId,
  transaksiToEdit,
  onSave,
}) => {
  const isEditMode = !!transaksiToEdit;

  // Form states
  const [namaPelanggan, setNamaPelanggan] = useState(transaksiToEdit?.namaPelanggan || '');
  const [alamat, setAlamat] = useState(transaksiToEdit?.alamat || '');
  const [nomorTelepon, setNomorTelepon] = useState(transaksiToEdit?.nomorTelepon || '');
  const [catatan, setCatatan] = useState(transaksiToEdit?.catatan || '');

  // Service item adder
  const [selectedLayananId, setSelectedLayananId] = useState<string>(layananList[0]?.id || '');
  const [beratInput, setBeratInput] = useState<string>('1');
  const [items, setItems] = useState<LayananItem[]>(transaksiToEdit?.items || []);

  // Customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<Pelanggan[]>([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(null);

  // Payment states
  const [isLunas, setIsLunas] = useState<boolean>(transaksiToEdit?.statusPembayaran === 'Lunas');
  const [isTransfer, setIsTransfer] = useState<boolean>(transaksiToEdit?.metodePembayaran === 'Non-Tunai');
  const [transferDetail, setTransferDetail] = useState<string>(transaksiToEdit?.metodePembayaranDetail || 'QRIS');
  const [dpInput, setDpInput] = useState<number>(transaksiToEdit?.jumlahDp || 0);

  // Selected Service Details
  const currentLayanan = layananList.find((l) => l.id === selectedLayananId);

  // Total calculation (points discount disabled)
  const totalHargaAsli = items.reduce((sum, it) => sum + it.subtotal, 0);
  const totalSetelahDiskon = totalHargaAsli;

  useEffect(() => {
    if (isLunas) {
      setDpInput(totalHargaAsli);
    }
  }, [isLunas, totalHargaAsli]);

  // Customer lookup
  const handleCustomerNameChange = (val: string) => {
    setNamaPelanggan(val);
    if (val.trim().length >= 1) {
      const filtered = pelangganList.filter((p) => p.nama.toLowerCase().includes(val.toLowerCase()));
      setCustomerSuggestions(filtered);
    } else {
      setCustomerSuggestions([]);
    }
  };

  const handleSelectCustomer = (p: Pelanggan) => {
    setNamaPelanggan(p.nama);
    setAlamat(p.alamat || '');
    setNomorTelepon(p.nomorTelepon || '');
    setSelectedPelanggan(p);
    setCustomerSuggestions([]);
  };

  const handleAddItem = () => {
    if (!currentLayanan) return;
    const berat = parseFloat(beratInput.replace(',', '.'));
    if (isNaN(berat) || berat <= 0) {
      alert('Masukkan jumlah/berat yang valid.');
      return;
    }

    const newItem: LayananItem = {
      namaLayanan: currentLayanan.nama,
      berat,
      hargaPerKg: currentLayanan.harga,
      hargaSatuan: currentLayanan.harga,
      satuan: currentLayanan.satuanHarga,
      subtotal: Math.round(berat * currentLayanan.harga),
    };

    setItems([...items, newItem]);
    setBeratInput('1');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!namaPelanggan.trim()) {
      alert('Nama pelanggan wajib diisi.');
      return;
    }
    if (items.length === 0) {
      alert('Tambahkan minimal 1 item layanan cucian.');
      return;
    }

    const finalDp = isLunas ? totalSetelahDiskon : Math.min(totalSetelahDiskon, dpInput || 0);
    const now = Date.now();
    const estDate = calculateCompletionDate(
      now,
      items.map((it) => ({
        namaLayanan: it.namaLayanan,
        durasi: layananList.find((l) => l.nama === it.namaLayanan)?.durasi,
      }))
    );

    const dataToSave: Omit<Transaksi, 'id'> & { id?: string } = {
      ...(transaksiToEdit ? { id: transaksiToEdit.id } : {}),
      laundryId: activeLaundryId,
      namaPelanggan: namaPelanggan.trim(),
      namaPelanggan_lowercase: namaPelanggan.trim().toLowerCase(),
      nomorTelepon: nomorTelepon.trim() || null,
      alamat: alamat.trim() || null,
      totalHarga: totalHargaAsli,
      jumlahDp: finalDp,
      tanggalMasuk: transaksiToEdit?.tanggalMasuk || now,
      tanggalSelesai: estDate,
      status: transaksiToEdit?.status || 'Diterima',
      statusPembayaran: isLunas ? 'Lunas' : 'Belum Lunas',
      catatan: catatan.trim() || null,
      metodePembayaran: isTransfer ? 'Non-Tunai' : 'Tunai',
      metodePembayaranDetail: isTransfer ? transferDetail : null,
      dikerjakanOleh: transaksiToEdit?.dikerjakanOleh || null,
      tanggalStatusSelesai: transaksiToEdit?.tanggalStatusSelesai || null,
      terakhirDieditPada: isEditMode ? now : null,
      items,
    };

    onSave(dataToSave, items);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Bar */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-base tracking-wide">
          {isEditMode ? 'Edit Transaksi' : 'Transaksi Baru'}
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-2 md:p-6 space-y-2 md:space-y-4 overflow-y-auto max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        {/* Customer Section Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2  shadow-2xs space-y-1 relative">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
         
          </div>

            {/* Mengubah grid-cols-1 menjadi grid-cols-2 agar di HP & PC selalu 2 kolom berdampingan */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Tambahkan relative di sini agar dropdown tepat berada di bawah input Nama Pelanggan */}
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Pelanggan *
              </label>
              <input
                type="text"
                value={namaPelanggan}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder="Ketik nama..."
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />

              {/* Suggestions dropdown */}
              {customerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {customerSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectCustomer(p)}
                      className="w-full text-left px-3 py-3 text-xs hover:bg-rose-50 flex justify-between items-center transition"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{p.nama}</div>
                        {p.alamat && <div className="text-[10px] text-slate-400">{p.alamat}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Alamat (Opsional)
              </label>
              <input
                type="text"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Jl. Mawar No. 12"
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>
          </div>


          {selectedPelanggan?.catatani && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl italic">
              <strong>Catatan Pelanggan:</strong> {selectedPelanggan.catatani}
            </div>
          )}
        </div>

        {/* Add Items Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-3">
 
          <div className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-8">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Layanan
              </label>
              <select
                value={selectedLayananId}
                onChange={(e) => setSelectedLayananId(e.target.value)}
                className="w-full px-1 py-3 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
              >
                {layananList.map((lay) => (
                  <option key={lay.id} value={lay.id}>
                    {lay.nama} 
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ({currentLayanan?.satuanHarga || 'jumlah'})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={beratInput}
                onChange={(e) => setBeratInput(e.target.value)}
                className="w-full px-2 py-3 rounded-xl border border-slate-300 text-xs text-center font-bold focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>

            <div className="col-span-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs transition active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {currentLayanan && (
            <div className="text-[11px] text-slate-500 flex justify-between px-1 mb-0">
              <span>
                Tarif: <strong>{formatRupiah(currentLayanan.harga)}</strong>/{currentLayanan.satuanHarga}
              </span>
              <span>
                Est. pengerjaan: <strong>{currentLayanan.durasi}</strong>
              </span>
            </div>
          )}

          {/* Table of Temporary Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 mt-1">
            {items.length === 0 ? (
              <div className="p-2 text-center text-xs text-slate-400 italic">
                Belum ada layanan yang ditambahkan.
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-bold text-slate-800">{item.namaLayanan}</div>
                    <div className="text-[11px] text-slate-500">
                      {item.berat} {item.satuan} x {formatRupiah(item.hargaPerKg)}
                    </div>
                  </div>
                  <div className="text-right font-extrabold text-slate-900 pr-3">
                    {formatRupiah(item.subtotal)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>


        {/* Payment & Totals Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs space-y-1">
          <div className="flex justify-between items-center px-5">
            <span className="text-xs font-medium text-slate-600">Total Tagihan</span>
            <span className="text-lg font-black text-slate-900">
              {formatRupiah(totalSetelahDiskon)}
            </span>
          </div>

          {/* Payment Status & Method Switches */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isLunas}
                onChange={(e) => setIsLunas(e.target.checked)}
                className="w-4 h-4 accent-[#800000]"
              />
              <span className="font-bold text-slate-800">Lunas</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isTransfer}
                onChange={(e) => setIsTransfer(e.target.checked)}
                className="w-4 h-4 accent-[#800000]"
              />
              <span className="font-bold text-slate-800">Non-Tunai (Transfer)</span>
            </label>
          </div>

          {/* Transfer Method Selector */}
          {isTransfer && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Jenis Pembayaran Non-Tunai
              </label>
              <select
                value={transferDetail}
                onChange={(e) => setTransferDetail(e.target.value)}
                className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
              >
                <option value="QRIS">QRIS</option>
                <option value="BCA">BCA</option>
                <option value="BRI">BRI</option>
                <option value="Mandiri">Bank Mandiri</option>
                <option value="Lainnya">Lainnya / E-Wallet</option>
              </select>
            </div>
          )}

        {/* DP Input if not lunas - Horizontal */}
{/* DP Input if not lunas - 1 Baris Horizontal */}
{/* DP Input if not lunas - Clean Horizontal */}
{!isLunas && (
  <div className="flex items-center justify-between gap-3 p-2 rounded-xl border border-slate-200 bg-white shadow-2xs">
    {/* Label & Info */}
    <div className="flex flex-col">
      <span className="text-[10px] text-slate-400">Nominal DP</span>
    </div>

    {/* Input & Sisa Tagihan */}
    <div className="flex items-center gap-2">
      <div className="w-28">
        <input
          type="number"
          min="0"
          max={totalSetelahDiskon}
          value={dpInput || ''}
          onChange={(e) => setDpInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
          placeholder="0"
          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none text-right"
        />
      </div>
      
      <div className="px-2.5 py-2 rounded-lg bg-red-50 border border-red-100 text-[11px] font-bold text-red-600 whitespace-nowrap text-right min-w-[95px]">
        - {formatRupiah(Math.max(0, totalSetelahDiskon - (dpInput || 0)))}
      </div>
    </div>
  </div>
)}

          {/* Catatan Tambahan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500">
              Catatan (Opsional)
            </label>
            <textarea
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Contoh: Jangan pakai pewangi mawar / baju sutra jangan disikat"
              className="w-full px-3 py-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#800000] focus:outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-sm shadow-md transition active:scale-98"
        >
          {isEditMode ? 'Simpan Perubahan Transaksi' : 'Simpan Transaksi'}
        </button>
      </main>
    </div>
  );
};
