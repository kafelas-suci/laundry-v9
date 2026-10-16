import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Tag,
  Search,
  Sparkles,
  Scale,
  Clock,
  Zap,
  Shirt,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Layanan } from '../types';
import { formatRupiah } from '../utils/formatters';

interface KelolaLayananViewProps {
  onBack: () => void;
  layananList: Layanan[];
  activeLaundryId: string;
  onSaveLayanan: (layanan: Layanan) => void;
  onDeleteLayanan: (layananId: string) => void;
  onReorderLayanan: (reorderedList: Layanan[]) => void;
}

// Preset standard services that owners frequently use
const PRESET_STANDAR_LAUNDRY: Omit<Layanan, 'id' | 'laundryId' | 'urutan'>[] = [
  { nama: 'Cuci Setrika Reguler', harga: 7000, satuanHarga: 'Kg', durasi: '3 Hari', satuanDurasi: 'Hari', hitungBebanKerja: true },
  { nama: 'Cuci Setrika Kilat', harga: 10000, satuanHarga: 'Kg', durasi: '1 Hari', satuanDurasi: 'Hari', hitungBebanKerja: true },
  { nama: 'Cuci Kering Lipat', harga: 5000, satuanHarga: 'Kg', durasi: '2 Hari', satuanDurasi: 'Hari', hitungBebanKerja: true },
  { nama: 'Setrika Saja', harga: 4000, satuanHarga: 'Kg', durasi: '2 Hari', satuanDurasi: 'Hari', hitungBebanKerja: true },
  { nama: 'Cuci Bedcover Besar', harga: 25000, satuanHarga: 'pcs', durasi: '3 Hari', satuanDurasi: 'Hari', hitungBebanKerja: false },
  { nama: 'Cuci Bedcover Sedang', harga: 20000, satuanHarga: 'pcs', durasi: '3 Hari', satuanDurasi: 'Hari', hitungBebanKerja: false },
  { nama: 'Cuci Selimut Tebal', harga: 15000, satuanHarga: 'pcs', durasi: '2 Hari', satuanDurasi: 'Hari', hitungBebanKerja: false },
  { nama: 'Cuci Sepatu Premium', harga: 25000, satuanHarga: 'Pasang', durasi: '3 Hari', satuanDurasi: 'Hari', hitungBebanKerja: false },
  { nama: 'Cuci Karpet', harga: 15000, satuanHarga: 'Meter', durasi: '4 Hari', satuanDurasi: 'Hari', hitungBebanKerja: false },
];

export const KelolaLayananView: React.FC<KelolaLayananViewProps> = ({
  onBack,
  layananList,
  activeLaundryId,
  onSaveLayanan,
  onDeleteLayanan,
  onReorderLayanan,
}) => {
  const [editingLayanan, setEditingLayanan] = useState<Layanan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'kg' | 'satuan' | 'beban'>('all');

  // Form states
  const [nama, setNama] = useState('');
  const [harga, setHarga] = useState<number>(7000);
  const [satuanHarga, setSatuanHarga] = useState('Kg');
  const [durasiAngka, setDurasiAngka] = useState('3');
  const [durasiSatuan, setDurasiSatuan] = useState('Hari');
  const [hitungBebanKerja, setHitungBebanKerja] = useState(true);

  // Filter & Search Logic
  const filteredList = useMemo(() => {
    return layananList.filter((lay) => {
      const matchSearch =
        lay.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lay.harga.toString().includes(searchQuery) ||
        lay.satuanHarga.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (activeFilter === 'kg') return lay.satuanHarga.toLowerCase() === 'kg';
      if (activeFilter === 'satuan') return lay.satuanHarga.toLowerCase() !== 'kg';
      if (activeFilter === 'beban') return lay.hitungBebanKerja;
      return true;
    });
  }, [layananList, searchQuery, activeFilter]);

  const openAddModal = () => {
    setEditingLayanan(null);
    setNama('');
    setHarga(7000);
    setSatuanHarga('Kg');
    setDurasiAngka('3');
    setDurasiSatuan('Hari');
    setHitungBebanKerja(true);
    setIsModalOpen(true);
  };

  const openEditModal = (lay: Layanan) => {
    setEditingLayanan(lay);
    setNama(lay.nama);
    setHarga(lay.harga);
    setSatuanHarga(lay.satuanHarga);

    const parts = lay.durasi.split(' ');
    setDurasiAngka(parts[0] || '1');
    setDurasiSatuan(parts[1] || 'Hari');
    setHitungBebanKerja(lay.hitungBebanKerja);
    setIsModalOpen(true);
  };

  const applyPreset = (preset: typeof PRESET_STANDAR_LAUNDRY[0]) => {
    setNama(preset.nama);
    setHarga(preset.harga);
    setSatuanHarga(preset.satuanHarga);
    const parts = preset.durasi.split(' ');
    setDurasiAngka(parts[0] || '1');
    setDurasiSatuan(parts[1] || 'Hari');
    setHitungBebanKerja(preset.hitungBebanKerja);
  };

  const handleSave = () => {
    if (!nama.trim()) {
      alert('Nama layanan wajib diisi.');
      return;
    }
    if (harga <= 0) {
      alert('Harga harus lebih dari Rp 0.');
      return;
    }

    const payload: Layanan = {
      id: editingLayanan ? editingLayanan.id : `lay-${Date.now()}`,
      laundryId: activeLaundryId,
      nama: nama.trim(),
      harga,
      satuanHarga,
      durasi: `${durasiAngka} ${durasiSatuan}`,
      satuanDurasi: durasiSatuan,
      hitungBebanKerja,
      urutan: editingLayanan ? editingLayanan.urutan : layananList.length,
    };

    onSaveLayanan(payload);
    setIsModalOpen(false);
  };

  const handleToggleBeban = (lay: Layanan) => {
    onSaveLayanan({
      ...lay,
      hitungBebanKerja: !lay.hitungBebanKerja,
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= layananList.length) return;

    const updated = [...layananList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    const reordered = updated.map((it, idx) => ({ ...it, urutan: idx }));
    onReorderLayanan(reordered);
  };

  const handleResetToStandard = () => {
    if (
      confirm(
        'Tambahkan 9 paket layanan standar laundry lengkap (Cuci Setrika, Bedcover, Sepatu, dll.)?'
      )
    ) {
      PRESET_STANDAR_LAUNDRY.forEach((preset, idx) => {
        const item: Layanan = {
          ...preset,
          id: `lay-${Date.now()}-${idx}`,
          laundryId: activeLaundryId,
          urutan: layananList.length + idx,
        };
        onSaveLayanan(item);
      });
    }
  };

  // Quick nominal adjustment buttons
  const addNominal = (amt: number) => {
    setHarga((prev) => Math.max(0, prev + amt));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-20">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-lg sticky top-0 z-30 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-1 rounded-xl hover:bg-white/10 active:scale-95 transition"
            title="Kembali ke Pengaturan"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-black text-base tracking-tight leading-tight">Kelola Daftar Harga</h1>
            <p className="text-[11px] text-white/80 font-medium">
              {layananList.length} Layanan Aktif di Kasir
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#800000] hover:bg-amber-50 font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Tambah Layanan</span>
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-3 md:px-6 py-3 md:py-6 space-y-3">
        {/* Search & Filter Controls */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama layanan, tarif, atau satuan..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000] transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-[11px] ${
                activeFilter === 'all'
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({layananList.length})
            </button>
            <button
              onClick={() => setActiveFilter('kg')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-[11px] flex items-center gap-1 ${
                activeFilter === 'kg'
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Scale className="w-3 h-3" />
              <span>Kiloan (Kg)</span>
            </button>
            <button
              onClick={() => setActiveFilter('satuan')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-[11px] flex items-center gap-1 ${
                activeFilter === 'satuan'
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Shirt className="w-3 h-3" />
              <span>Satuan / Pcs</span>
            </button>
            <button
              onClick={() => setActiveFilter('beban')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition text-[11px] flex items-center gap-1 ${
                activeFilter === 'beban'
                  ? 'bg-[#800000] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Beban Staf Aktif</span>
            </button>
          </div>
        </div>

        {/* Action helper bar */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span className="font-medium text-[11px]">
            Menampilkan <strong className="text-slate-800">{filteredList.length}</strong> dari {layananList.length} layanan
          </span>
          <button
            onClick={handleResetToStandard}
            className="flex items-center gap-1 text-[11px] font-bold text-[#800000] hover:text-[#660000] transition hover:underline"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>+ Paket Standar Laundry</span>
          </button>
        </div>

        {/* Services List Card Stack */}
        <main className="space-y-2.5">
          {filteredList.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">
                  {searchQuery ? 'Layanan Tidak Ditemukan' : 'Belum Ada Layanan Terdaftar'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  {searchQuery
                    ? `Tidak ada layanan yang cocok dengan "${searchQuery}". Coba kata kunci lain.`
                    : 'Tambahkan paket layanan laundry baru atau muat paket standar lengkap.'}
                </p>
              </div>
              <div className="pt-1 flex flex-wrap gap-2 justify-center">
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  + Tambah Layanan Baru
                </button>
                <button
                  onClick={handleResetToStandard}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Muat Preset Standar</span>
                </button>
              </div>
            </div>
          ) : (
            filteredList.map((lay, idx) => {
              const isKg = lay.satuanHarga.toLowerCase() === 'kg';
              const isExpress = lay.durasi.toLowerCase().includes('jam') || lay.durasi.toLowerCase().includes('1 hari');

              return (
                <div
                  key={lay.id}
                >
<div className="flex flex-col gap-1 px-2 py-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
  {/* Baris 1: Nama Layanan & Harga (Tulisan diperkecil) */}
  <div className="flex items-center justify-between gap-3 min-w-0">
    <h4 className="font-bold text-xs text-slate-900 truncate">{lay.nama}</h4>
    <div className="text-right shrink-0">
      <span className="text-sm font-black text-[#800000] tracking-tight">{formatRupiah(lay.harga)}</span>
      <span className="text-[9px] font-medium text-slate-400 ml-1">/ {lay.satuanHarga}</span>
    </div>
  </div>

  {/* Baris 2: Tag Info & Tombol Aksi (Garis lebih dekat ke atas dengan -mt-1) */}
  <div className="flex items-center justify-between gap-2 pt-1 -mt-1 border-t border-slate-100 flex-wrap">
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Duration Pill */}
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
        isExpress ? 'bg-amber-100/80 text-amber-800' : 'bg-slate-100 text-slate-600'
      }`}>
        {isExpress ? <Zap className="w-3 h-3 text-amber-600" /> : <Clock className="w-3 h-3 text-slate-400" />}
        <span>{lay.durasi}</span>
      </span>

      {/* Staff workload indicator toggle */}
      <button
        type="button"
        onClick={() => handleToggleBeban(lay)}
        title="Klik untuk mengubah status hitungan beban staf"
        className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
          lay.hitungBebanKerja
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${lay.hitungBebanKerja ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        <span>{lay.hitungBebanKerja ? 'Beban Staf Aktif' : 'Tanpa Beban'}</span>
      </button>
    </div>

    {/* Action Buttons */}
    <div className="flex items-center gap-1.5">
      <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <button
          disabled={idx === 0}
          onClick={() => moveItem(idx, 'up')}
          title="Pindah ke atas"
          className="px-1.5 py-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition flex items-center justify-center border-r border-slate-200"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          disabled={idx === layananList.length - 1}
          onClick={() => moveItem(idx, 'down')}
          title="Pindah ke bawah"
          className="px-1.5 py-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-20 transition flex items-center justify-center"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        onClick={() => openEditModal(lay)}
        className="p-1.5 rounded-xl text-slate-600 hover:text-[#800000] hover:bg-rose-50 border border-slate-200 bg-white shadow-2xs transition active:scale-95 flex items-center justify-center"
        title="Edit Layanan"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => {
          if (confirm(`Yakin ingin menghapus layanan '${lay.nama}'?`)) {
            onDeleteLayanan(lay.id);
          }
        }}
        className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-200 bg-white shadow-2xs transition active:scale-95 flex items-center justify-center"
        title="Hapus Layanan"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</div>
                </div>
              );
            })
          )}
        </main>
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#800000] text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tight">
                    {editingLayanan ? 'Ubah Layanan & Tarif' : 'Tambah Layanan Baru'}
                  </h3>
                  <p className="text-[10px] text-white/80">
                    Atur tarif harga dan durasi untuk nota kasir
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition active:scale-90"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Quick Preset Selector for New Items */}
              {!editingLayanan && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Pilihan Cepat Standar Laundry:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-2xl border border-slate-200">
                    {PRESET_STANDAR_LAUNDRY.map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-[#800000] hover:text-[#800000] text-[11px] font-semibold text-slate-700 transition shadow-2xs"
                      >
                        {p.nama} ({formatRupiah(p.harga)})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Layanan *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Cuci Setrika / Cuci Selimut"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#800000] focus:outline-none transition shadow-2xs"
                />
              </div>

              {/* Price & Unit Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Price Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tarif Harga (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-black text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={harga || ''}
                      onChange={(e) => setHarga(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      placeholder="7000"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-[#800000] focus:ring-2 focus:ring-[#800000] focus:outline-none transition shadow-2xs"
                    />
                  </div>
                  {/* Quick increment buttons */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => addNominal(1000)}
                      className="flex-1 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600"
                    >
                      +1.000
                    </button>
                    <button
                      type="button"
                      onClick={() => addNominal(5000)}
                      className="flex-1 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600"
                    >
                      +5.000
                    </button>
                    <button
                      type="button"
                      onClick={() => setHarga(7000)}
                      className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-[#800000]"
                    >
                      7rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setHarga(10000)}
                      className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-[#800000]"
                    >
                      10rb
                    </button>
                  </div>
                </div>

                {/* Unit Select */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Satuan Hitung
                  </label>
                  <select
                    value={satuanHarga}
                    onChange={(e) => setSatuanHarga(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-[#800000] focus:outline-none transition shadow-2xs"
                  >
                    <option value="Kg">Kg (Kilogram)</option>
                    <option value="pcs">Pcs (Buah / Lembar)</option>
                    <option value="Meter">Meter (Karpet / Tirai)</option>
                    <option value="Pasang">Pasang (Sepatu / Sandal)</option>
                    <option value="Satuan">Satuan</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {satuanHarga === 'Kg' ? 'Dihitung per kilogram berat timbangan' : 'Dihitung per barang satuan'}
                  </p>
                </div>
              </div>

              {/* Duration Settings */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Estimasi Durasi Pengerjaan
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={durasiAngka}
                      onChange={(e) => setDurasiAngka(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-black text-center focus:ring-2 focus:ring-[#800000] focus:outline-none transition shadow-2xs"
                    />
                  </div>
                  <div>
                    <select
                      value={durasiSatuan}
                      onChange={(e) => setDurasiSatuan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-800 focus:ring-2 focus:ring-[#800000] focus:outline-none transition shadow-2xs"
                    >
                      <option value="Hari">Hari</option>
                      <option value="Jam">Jam (Kilat / Express)</option>
                      <option value="Minggu">Minggu</option>
                    </select>
                  </div>
                </div>

                {/* Duration shortcut chips */}
                <div className="flex gap-1.5 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDurasiAngka('3');
                      setDurasiSatuan('Jam');
                    }}
                    className="flex-1 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Zap className="w-2.5 h-2.5 text-amber-600" />
                    <span>3 Jam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurasiAngka('1');
                      setDurasiSatuan('Hari');
                    }}
                    className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                  >
                    1 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurasiAngka('2');
                      setDurasiSatuan('Hari');
                    }}
                    className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                  >
                    2 Hari
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurasiAngka('3');
                      setDurasiSatuan('Hari');
                    }}
                    className="flex-1 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition"
                  >
                    3 Hari
                  </button>
                </div>
              </div>

              {/* Hitung Beban Kerja Staf */}
              <label className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/80 cursor-pointer hover:bg-slate-100/80 transition">
                <input
                  type="checkbox"
                  checked={hitungBebanKerja}
                  onChange={(e) => setHitungBebanKerja(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#800000] rounded cursor-pointer"
                />
                <div>
                  <div className="font-bold text-xs text-slate-800">
                    Hitung Beban Kerja Harian Staf
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                    Aktifkan jika jumlah/berat layanan ini dimasukkan ke hitungan beban operasional kerja staf kasir/cuci.
                  </p>
                </div>
              </label>

              {/* Modal Actions */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl bg-[#800000] hover:bg-[#660000] text-xs font-black text-white shadow-md transition active:scale-98"
                >
                  {editingLayanan ? 'Simpan Perubahan' : 'Tambah Layanan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
