import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Check,
  ChevronDown,
  Printer,
  History,
} from 'lucide-react';
import { formatRupiah, formatNumberOnly } from '../utils/formatters';

export interface TransitionPickupData {
  namaPelanggan: string;
  noNotaLama?: string;
  nomorTelepon?: string;
  catatan?: string;
  nominal: number;
  isLunas: boolean;
  isTransfer: boolean;
  metodePembayaran: 'Tunai' | 'Non-Tunai';
  metodePembayaranDetail?: string;
  bukaStruk: boolean;
  sudahLunasLama?: boolean;
  sisaNominal?: number;
}

interface QuickTransitionPickupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransitionPickupData) => void;
  initialQuery?: string;
  existingCustomers?: { nama: string; nomorTelepon?: string | null }[];
}

const BANK_OPTIONS = [
  'QRIS',
  'Transfer BCA',
  'Transfer BRI',
  'Transfer Mandiri',
  'Transfer BNI',
  'Transfer BSI',
  'Transfer Lainnya',
];

export const QuickTransitionPickupModal: React.FC<QuickTransitionPickupModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuery = '',
  existingCustomers = [],
}) => {
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [noNotaLama, setNoNotaLama] = useState('');
  const [nomorTelepon, setNomorTelepon] = useState('');
  const [catatan, setCatatan] = useState('');
  
  // Pembayaran: Kolom nominal & tombol Lunas
  const [nominalInput, setNominalInput] = useState<number>(0);
  const [nominalDisplay, setNominalDisplay] = useState('');
  const [isLunas, setIsLunas] = useState<boolean>(true);
  const [isTransfer, setIsTransfer] = useState<boolean>(false);
  const [transferDetail, setTransferDetail] = useState<string>('QRIS');
  const [isTransferDropdownOpen, setIsTransferDropdownOpen] = useState(false);
  const [bukaStruk, setBukaStruk] = useState(true);

  // Toggle sembunyikan selain nama pelanggan & pembayaran pelunasan
  const [showExtraDetails, setShowExtraDetails] = useState<boolean>(false);

  // Autocomplete Pelanggan
  const [customerSuggestions, setCustomerSuggestions] = useState<{ nama: string; nomorTelepon?: string | null }[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputNamaRef = useRef<HTMLInputElement>(null);

  // Close dropdown bank when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsTransferDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initialize form state when modal opens
  useEffect(() => {
    if (isOpen) {
      const clean = initialQuery.trim();
      const isNotaQuery = Boolean(clean && /^#?\d+$/.test(clean));

      if (isNotaQuery) {
        setNoNotaLama(clean);
        setNamaPelanggan('');
        setShowExtraDetails(true); // Tampilkan jika mencari nomor nota spesifik
      } else {
        setNoNotaLama('');
        setNamaPelanggan(clean);
        setShowExtraDetails(false);
      }

      setNomorTelepon('');
      setCatatan('');
      setNominalInput(0);
      setNominalDisplay('');
      setIsLunas(true);
      setIsTransfer(false);
      setTransferDetail('QRIS');
      setIsTransferDropdownOpen(false);
      setBukaStruk(true);
      setCustomerSuggestions([]);

      setTimeout(() => {
        inputNamaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const handleCustomerNameChange = (val: string) => {
    setNamaPelanggan(val);
    if (!val.trim()) {
      setCustomerSuggestions([]);
      return;
    }
    const filtered = existingCustomers.filter((c) =>
      c.nama.toLowerCase().includes(val.toLowerCase())
    );
    setCustomerSuggestions(filtered.slice(0, 5));
  };

  const handleSelectCustomer = (c: { nama: string; nomorTelepon?: string | null }) => {
    setNamaPelanggan(c.nama);
    if (c.nomorTelepon) {
      setNomorTelepon(c.nomorTelepon);
    }
    setCustomerSuggestions([]);
  };

  const handleNominalChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      setNominalInput(0);
      setNominalDisplay('');
      return;
    }
    const val = parseInt(digits, 10);
    setNominalInput(val);
    setNominalDisplay(formatNumberOnly(val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPelanggan.trim()) {
      return;
    }

    const finalNominal = Math.max(0, nominalInput || 0);

    onSave({
      namaPelanggan: namaPelanggan.trim(),
      noNotaLama: noNotaLama.trim() || undefined,
      nomorTelepon: nomorTelepon.trim() || undefined,
      catatan: catatan.trim() || undefined,
      nominal: finalNominal,
      isLunas,
      isTransfer,
      metodePembayaran: isTransfer ? 'Non-Tunai' : 'Tunai',
      metodePembayaranDetail: isTransfer ? transferDetail : 'Tunai',
      bukaStruk,
      sudahLunasLama: isLunas && finalNominal === 0,
      sisaNominal: finalNominal,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#800000]/10 text-[#800000] flex items-center justify-center shrink-0">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Ambil Cucian (Transisi Aplikasi)
              </h2>
              <p className="text-[11px] text-slate-500">
                Input cepat serah terima dari aplikasi lama
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-1">
          
          {/* BARIS UTAMA: NAMA PELANGGAN, NOMINAL PEMBAYARAN, & TOMBOL LUNAS BERSEBELAHAN */}
          <div className=" rounded-2xl p-0 space-y-2">
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end">
              
              {/* 1. Kolom Nama Pelanggan */}
              <div className="col-span-6 sm:col-span-6 relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Pelanggan <span className="text-[#800000]">*</span>
                </label>
                <input
                  ref={inputNamaRef}
                  type="text"
                  required
                  value={namaPelanggan}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  placeholder="Ketik nama..."
                  className="w-full px-2.5 sm:px-3 py-2 h-10 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />

                {/* Autocomplete Suggestions */}
                {customerSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {customerSuggestions.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectCustomer(p)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-rose-50 flex justify-between items-center transition cursor-pointer"
                      >
                        <span className="font-bold text-slate-800">{p.nama}</span>
                        {p.nomorTelepon && (
                          <span className="text-[10px] text-slate-400">{p.nomorTelepon}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Kolom Nominal Pembayaran Bersebelahan */}
              <div className="col-span-4 sm:col-span-4 relative">
                <label className="block text-[11px] font-bold text-slate-700 mb-1 truncate">
                  Nominal Bayar
                </label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 select-none pointer-events-none">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={nominalDisplay}
                    onChange={(e) => handleNominalChange(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                    className={`w-full pl-6 sm:pl-7 pr-2 h-10 rounded-xl border text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none text-right ${
                      isLunas && nominalInput === 0
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : 'border-slate-300'
                    }`}
                  />
                </div>
              </div>

              {/* 3. Tombol Lunas Bersebelahan */}
              <div className="col-span-2 sm:col-span-4 relative">
                <label className="block text-[11px] font-bold text-transparent mb-1 select-none">
                  Status
                </label>
                <button
                  type="button"
                  onClick={() => setIsLunas(!isLunas)}
                  className={`w-full h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                    isLunas
                      ? 'bg-[#800000] border-[#800000] text-white shadow-2xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                  title={isLunas ? 'Klik untuk ubah ke Belum Lunas' : 'Klik untuk tandai Lunas'}
                >
                  <span>{isLunas ? 'Lunas' : 'Belum'}</span>
                </button>
              </div>
            </div>

            {/* Info Keterangan Pembayaran Ringkas */}
            <div className="text-[10px] pt-0.5">
              {nominalInput > 0 ? (
                <span className="text-emerald-700 font-bold">
                  • Pembayaran {isTransfer ? transferDetail : 'Tunai'} sebesar {formatRupiah(nominalInput)} dicatat ke Buku Kas hari ini.
                </span>
              ) : isLunas ? (
                <span className="text-slate-500 italic">
                  • Nominal Rp 0 (sudah lunas di nota lama, saldo kas tetap aman).
                </span>
              ) : (
                <span className="text-amber-700 font-bold">
                  • Status Belum Lunas (diserahkan dengan sisa tagihan dicatat sebagai piutang).
                </span>
              )}
            </div>
          </div>

          {/* TOMBOL TOGGLE UNTUK MENAMPILKAN / MENYEMBUNYIKAN OPSI LAINNYA */}
          <button
            type="button"
            onClick={() => setShowExtraDetails(!showExtraDetails)}
            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 transition cursor-pointer select-none"
          >
            <span className="flex items-center gap-1.5">
              <span className="text-[#800000] font-black">{showExtraDetails ? '−' : '+'}</span>
              <span>
                {showExtraDetails
                  ? 'Sembunyikan Opsi Tambahan'
                  : 'Opsi Tambahan (No. Struk, WA, Non-Tunai, Catatan)'}
              </span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                showExtraDetails ? 'rotate-180 text-slate-600' : ''
              }`}
            />
          </button>

          {/* OPSI TAMBAHAN YANG DISEMBUNYIKAN: HANYA MUNCUL SAAT DIKLIK */}
          {showExtraDetails && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-3 animate-in fade-in duration-150">
              
              {/* 1. Pilihan Metode Non-Tunai (Transfer / QRIS) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600">
                    Metode Pembayaran
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsTransfer(!isTransfer)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isTransfer
                        ? 'bg-[#800000] border-[#800000] text-white shadow-2xs'
                        : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{isTransfer ? '✓ Non-Tunai Aktif' : '+ Ubah ke Non-Tunai'}</span>
                  </button>
                </div>

                {isTransfer && (
                  <div className="relative pt-1 animate-in fade-in duration-100" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsTransferDropdownOpen((prev) => !prev)}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center justify-between gap-1 cursor-pointer h-10 ${
                        isTransferDropdownOpen
                          ? 'border-[#800000] ring-2 ring-[#800000]/20 bg-rose-50/20 text-[#800000]'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400'
                      }`}
                    >
                      <span className="truncate">{transferDetail}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform shrink-0 text-slate-400 ${
                          isTransferDropdownOpen ? 'rotate-180 text-[#800000]' : ''
                        }`}
                      />
                    </button>

                    {isTransferDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-1 space-y-0.5">
                        {BANK_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              setTransferDetail(opt);
                              setIsTransferDropdownOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                              transferDetail === opt
                                ? 'bg-rose-50 text-[#800000] font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. No. Struk Lama & No. WhatsApp */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    No. Struk (Opsional)
                  </label>
                  <input
                    type="text"
                    value={noNotaLama}
                    onChange={(e) => setNoNotaLama(e.target.value)}
                    placeholder="Contoh: #1082"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    No. WhatsApp (Opsional)
                  </label>
                  <input
                    type="tel"
                    value={nomorTelepon}
                    onChange={(e) => setNomorTelepon(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Catatan / Layanan */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Catatan / Layanan (Opsional)
                </label>
                <input
                  type="text"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Cth: Cuci Setrika / 3 Kg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              {/* 4. Opsi Buka Struk Pengambilan */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bukaStruk}
                    onChange={(e) => setBukaStruk(e.target.checked)}
                    className="w-4 h-4 rounded text-[#800000] focus:ring-[#800000] cursor-pointer"
                  />
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Buka Struk Pengambilan setelah simpan</span>
                </label>
              </div>
            </div>
          )}

          {/* TOMBOL AKSI: BATAL & SIMPAN */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!namaPelanggan.trim()}
              className="w-full py-2.5 px-3 rounded-xl bg-[#800000] hover:bg-[#660000] disabled:bg-slate-300 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Simpan & Selesai</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
