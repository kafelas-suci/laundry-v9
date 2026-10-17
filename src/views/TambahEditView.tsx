import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  Search,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { Transaksi, LayananItem, Layanan, Pelanggan, SettingsData } from '../types';
import { formatRupiah, formatNumberOnly, calculateCompletionDate } from '../utils/formatters';
import { useToast } from '../components/NotificationContext';


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
  activeLaundryId,
  transaksiToEdit,
  onSave,
}) => {
    const toast = useToast();

  const isEditMode = !!transaksiToEdit;

  // Form states
  const [namaPelanggan, setNamaPelanggan] = useState(transaksiToEdit?.namaPelanggan || '');
  const [alamat, setAlamat] = useState(transaksiToEdit?.alamat || '');
  const [nomorTelepon, setNomorTelepon] = useState(transaksiToEdit?.nomorTelepon || '');
  const [catatan, setCatatan] = useState(transaksiToEdit?.catatan || '');

  // Service item adder
  const [selectedLayananId, setSelectedLayananId] = useState<string>(layananList[0]?.id || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [beratInput, setBeratInput] = useState<string>('');
  const [items, setItems] = useState<LayananItem[]>(transaksiToEdit?.items || []);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);

  // Customer suggestions
  const [customerSuggestions, setCustomerSuggestions] = useState<Pelanggan[]>([]);
  const [selectedPelanggan, setSelectedPelanggan] = useState<Pelanggan | null>(null);

  // Payment states
  const [isLunas, setIsLunas] = useState<boolean>(transaksiToEdit?.statusPembayaran === 'Lunas');
  const [isTransfer, setIsTransfer] = useState<boolean>(transaksiToEdit?.metodePembayaran === 'Non-Tunai');
  const [transferDetail, setTransferDetail] = useState<string>(transaksiToEdit?.metodePembayaranDetail || 'QRIS');

  // Custom Transfer Dropdown State & Ref
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState(false);
  const transferDropdownRef = useRef<HTMLDivElement>(null);
  const transferOptions = ['QRIS', 'BCA', 'BRI', 'Mandiri', 'Lainnya'];

  // Nominal DP
  const [dpInput, setDpInput] = useState<number>(transaksiToEdit?.jumlahDp || 0);
  const [dpDisplay, setDpDisplay] = useState<string>(
    transaksiToEdit?.jumlahDp ? formatNumberOnly(transaksiToEdit.jumlahDp) : ''
  );

  // Selected Service Details
  const currentLayanan = layananList.find((l) => l.id === selectedLayananId) || layananList[0];

  // Total calculation
  const totalHargaAsli = items.reduce((sum, it) => sum + it.subtotal, 0);
  const totalSetelahDiskon = totalHargaAsli;

  // Synchronize when isLunas changes
  useEffect(() => {
    if (isLunas) {
      setDpInput(totalHargaAsli);
      setDpDisplay(totalHargaAsli > 0 ? formatNumberOnly(totalHargaAsli) : '');
    }
  }, [isLunas, totalHargaAsli]);

  // Click outside listener for custom dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (transferDropdownRef.current && !transferDropdownRef.current.contains(e.target as Node)) {
        setIsTransferDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered services for dropdown search
  const filteredLayananList = useMemo(() => {
    if (!searchQuery.trim()) return layananList;
    const q = searchQuery.toLowerCase().trim();
    return layananList.filter((l) =>
      l.nama.toLowerCase().includes(q) ||
      l.satuanHarga.toLowerCase().includes(q) ||
      (l.durasi && l.durasi.toLowerCase().includes(q))
    );
  }, [layananList, searchQuery]);

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

  const handleSelectLayanan = (lay: Layanan) => {
    setSelectedLayananId(lay.id);
    setIsDropdownOpen(false);
    setSearchQuery('');
    setTimeout(() => {
      quantityInputRef.current?.focus();
      quantityInputRef.current?.select();
    }, 100);
  };

  const handleAddItem = () => {
    if (!currentLayanan) {
      toast.warning('Pilih layanan cucian terlebih dahulu.');
      return;
    }
    if (!beratInput || !beratInput.trim()) {
      toast.warning(`Silakan masukkan jumlah/berat (${currentLayanan.satuanHarga}) terlebih dahulu.`);
      quantityInputRef.current?.focus();
      return;
    }

    const berat = parseFloat(beratInput.replace(',', '.'));
    if (isNaN(berat) || berat <= 0) {
      toast.error('Masukkan jumlah/berat yang valid (lebih dari 0).');
      quantityInputRef.current?.focus();
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
    setBeratInput('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDpChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setDpInput(0);
      setDpDisplay('');
      return;
    }
    const val = parseInt(digits, 10);
    setDpInput(val);
    setDpDisplay(formatNumberOnly(val));
  };

  const parsedBerat = parseFloat(beratInput.replace(',', '.'));
  const previewSubtotal =
    currentLayanan && !isNaN(parsedBerat) && parsedBerat > 0
      ? Math.round(parsedBerat * currentLayanan.harga)
      : null;

  const handleSave = () => {
    if (!namaPelanggan.trim()) {
      toast.warning('Nama pelanggan wajib diisi.');
      return;
    }
    if (items.length === 0) {
      toast.warning('Tambahkan minimal 1 item layanan cucian.');
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
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-24">
      {/* Top Bar */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center px-4 h-14">
        <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition mr-3 cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="font-bold text-base tracking-wide">
          {isEditMode ? 'Edit Transaksi' : 'Transaksi Baru'}
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-1.5 md:p-6 space-y-2.5 md:space-y-4 overflow-y-auto max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        {/* Customer Section Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs space-y-2 relative">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Pelanggan *
              </label>
              <input
                type="text"
                value={namaPelanggan}
                onChange={(e) => handleCustomerNameChange(e.target.value)}
                placeholder="Ketik nama..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />

              {customerSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {customerSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectCustomer(p)}
                      className="w-full text-left px-3 py-2.5 text-xs hover:bg-rose-50 flex justify-between items-center transition cursor-pointer"
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
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              No. WhatsApp / Telepon (Opsional)
            </label>
            <input
              type="tel"
              value={nomorTelepon}
              onChange={(e) => setNomorTelepon(e.target.value)}
              placeholder="0812xxxxxxxx"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
            />
          </div>

          {selectedPelanggan?.catatani && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] p-2.5 rounded-xl italic">
              <strong>Catatan Pelanggan:</strong> {selectedPelanggan.catatani}
            </div>
          )}
        </div>

        {/* Add Items Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-slate-500">
              Pilih Layanan Cucian *
            </label>
            {items.length > 0 && (
              <span className="text-[11px] font-semibold text-slate-500">
                {items.length} layanan di nota
              </span>
            )}
          </div>

          <div className="flex flex-row items-end gap-1 w-full">
            {/* Dropdown Pilih Layanan */}
            <div className="relative flex-[1.4] min-w-0" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className={`w-full px-2.5 py-1 rounded-xl border text-left transition flex items-center justify-between gap-1 cursor-pointer h-[42px] ${
                  isDropdownOpen
                    ? 'border-[#800000] ring-2 ring-[#800000]/20 bg-rose-50/20'
                    : 'border-slate-300 bg-white hover:border-slate-400'
                }`}
              >
                {currentLayanan ? (
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 text-xs block truncate">
                      {currentLayanan.nama}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400 font-medium truncate">Pilih...</span>
                )}

                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform shrink-0 text-slate-400 ${isDropdownOpen ? 'rotate-180 text-[#800000]' : ''}`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari..."
                      className="w-full text-xs bg-transparent border-none focus:outline-none text-slate-800"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
                    {filteredLayananList.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 italic">Tidak ada.</div>
                    ) : (
                      filteredLayananList.map((lay) => {
                        const isSelected = lay.id === selectedLayananId;
                        return (
                          <button
                            key={lay.id}
                            type="button"
                            onClick={() => handleSelectLayanan(lay)}
                            className={`w-full text-left p-1.5 rounded-lg transition flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected ? 'bg-rose-50 text-[#800000] font-bold' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate leading-snug">
                                {lay.nama}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                                <span>{lay.durasi || 'Standar'}</span>
                                <span>•</span>
                                <span className="font-extrabold text-[#800000] ml-auto">
                                  {formatRupiah(lay.harga)}/{lay.satuanHarga}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Input Berat / Jumlah */}
            <div className="flex-[0.4] min-w-0">
              <div className="relative">
                <input
                  ref={quantityInputRef}
                  type="text"
                  inputMode="decimal"
                  value={beratInput}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^0-9.,]/g, '');
                    setBeratInput(cleaned);
                  }}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddItem();
                    }
                  }}
                  placeholder="0"
                  className="w-full px-2 py-2.5 pr-8 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none h-[42px]"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                  {currentLayanan?.satuanHarga || 'Kg'}
                </span>
              </div>
            </div>

            {/* Tombol Tambah */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer h-[42px]"
                title="Tambah Layanan"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Tambah</span>
              </button>
            </div>
          </div>

          {/* Preview Subtotal */}
          {previewSubtotal !== null && (
            <div className="flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
              <span>Estimasi item:</span>
              <span className="font-extrabold text-emerald-700">
                {formatRupiah(previewSubtotal)} ({beratInput} {currentLayanan?.satuanHarga} × {formatRupiah(currentLayanan?.harga || 0)})
              </span>
            </div>
          )}

          {/* Table Items */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 mt-2">
            {items.length === 0 ? (
              <div className="p-3.5 text-center text-xs text-slate-400 italic bg-slate-50/50 flex flex-col items-center justify-center gap-1">
                <Layers className="w-5 h-5 text-slate-300" />
                <span>Belum ada layanan yang ditambahkan ke nota.</span>
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
                    className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                    title="Hapus item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment & Notes Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2.5 shadow-2xs space-y-2">
          
          {/* ===== 1. HEADER TOTAL TAGIHAN ===== */}
          <div className="px-2 py-0 rounded-xl flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-500">
              Total Tagihan
            </span>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {formatRupiah(totalSetelahDiskon)}
            </span>
          </div>

          {/* ===== 2. GRID BARIS PEMBAYARAN (NOMINAL, LUNAS, NON-TUNAI) ===== */}
          <div className="grid grid-cols-12 gap-1.5 items-center">
            
            {/* Kolom Nominal DP / Indicator Lunas */}
            <div className="col-span-6 relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 select-none z-10">
                Rp
              </span>

              {isLunas ? (
                <div className="w-full pl-7 pr-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-700 text-right h-[36px] flex items-center justify-between">
                  <span className="text-[9px] font-bold text-emerald-800">LUNAS</span>
                  <span>{formatNumberOnly(totalSetelahDiskon)}</span>
                </div>
              ) : (
                <input
                  type="text"
                  inputMode="numeric"
                  value={dpDisplay}
                  onChange={(e) => handleDpChange(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="DP (0)"
                  className="w-full pl-7 pr-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none text-right h-[36px]"
                />
              )}
            </div>

            {/* Tombol Lunas */}
            <button
              type="button"
              onClick={() => setIsLunas(!isLunas)}
              className={`col-span-3 h-[36px] rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                isLunas
                  ? 'bg-[#800000] border-[#800000] text-white shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Check className={`w-3 h-3 ${isLunas ? 'block' : 'hidden'}`} />
              <span>Lunas</span>
            </button>

            {/* Tombol Non-Tunai */}
            <button
              type="button"
              onClick={() => setIsTransfer(!isTransfer)}
              className={`col-span-3 h-[36px] rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 shrink-0 cursor-pointer ${
                isTransfer
                  ? 'bg-[#800000] border-[#800000] text-white shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Non-Tunai</span>
            </button>
          </div>

          {/* ===== 3. BARIS CATATAN & CUSTOM DROPDOWN BANK SERAGAM PC/HP ===== */}
          <div className="grid grid-cols-12 gap-1.5 items-center pt-0.5">
            
            {/* Kolom Catatan */}
            <div className={`${isTransfer ? 'col-span-8' : 'col-span-12'} transition-all duration-150`}>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Catatan khusus (Opsional)..."
                className="w-full px-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-[#800000] focus:outline-none h-[36px]"
              />
            </div>

            {/* Custom Popover Dropdown Bank (Sama persis seperti Dropdown Layanan) */}
            {isTransfer && (
              <div className="col-span-4 relative animate-in fade-in duration-100" ref={transferDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsTransferDropdownOpen((prev) => !prev)}
                  className={`w-full px-2 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer h-[36px] ${
                    isTransferDropdownOpen
                      ? 'border-[#800000] ring-2 ring-[#800000]/20 bg-rose-50/20 text-[#800000]'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                  }`}
                >
                  <span className="truncate">{transferDetail || 'QRIS'}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform shrink-0 text-slate-400 ${
                      isTransferDropdownOpen ? 'rotate-180 text-[#800000]' : ''
                    }`}
                  />
                </button>

                {/* Menu Popover Pilihan Bank */}
                {isTransferDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 z-40 w-full min-w-[110px] bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                    <div className="space-y-0.5">
                      {transferOptions.map((opt) => {
                        const isSelected = opt === transferDetail;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setTransferDetail(opt);
                              setIsTransferDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-rose-50 text-[#800000] font-black'
                                : 'hover:bg-slate-50 text-slate-700 font-semibold'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <Check className="w-3 h-3 text-[#800000] stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-slate-200 p-2.5 shadow-lg">
        <div className="max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 rounded-2xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-sm shadow-md transition active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isEditMode ? 'Simpan Perubahan Transaksi' : 'Simpan Transaksi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};