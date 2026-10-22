import React, { useState } from 'react';
import { ArrowLeft, Plus, Search, Phone, MapPin, Edit3, Trash2, Award, UserPlus, X, Lock } from 'lucide-react';
import { Pelanggan, SettingsData } from '../types';
import { useToast, useConfirm } from '../components/NotificationContext';
import { isProTier, getLaundryLimits } from '../utils/subscription';

interface KelolaPelangganViewProps {
  onBack: () => void;
  pelangganList: Pelanggan[];
  settings: SettingsData;
  activeLaundryId: string;
  currentTier?: string | null;
  onSavePelanggan: (pelanggan: Pelanggan) => void;
  onDeletePelanggan: (pelangganId: string) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const KelolaPelangganView: React.FC<KelolaPelangganViewProps> = ({
  onBack,
  pelangganList,
  settings,
  activeLaundryId,
  currentTier,
  onSavePelanggan,
  onDeletePelanggan,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPelanggan, setEditingPelanggan] = useState<Pelanggan | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states for modal
  const [nama, setNama] = useState('');
  const [telepon, setTelepon] = useState('62');
  const [alamat, setAlamat] = useState('');
  const [alamatLengkap, setAlamatLengkap] = useState('');
  const [catatani, setCatatani] = useState('');

  const isPro = isProTier(currentTier);
  const limits = getLaundryLimits(currentTier);
  const isCustomerLimitReached = pelangganList.length >= limits.maxCustomers;

  const openAddModal = () => {
    if (isCustomerLimitReached) {
      toast.warning(`Batas ${limits.maxCustomers} data pelanggan telah tercapai. Fitur kapasitas pelanggan lebih besar hanya untuk Paket Premium.`);
      return;
    }
    setEditingPelanggan(null);
    setNama('');
    setTelepon('62');
    setAlamat('');
    setAlamatLengkap('');
    setCatatani('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: Pelanggan) => {
    setEditingPelanggan(p);
    setNama(p.nama);
    setTelepon(p.nomorTelepon || '62');
    setAlamat(p.alamat || '');
    setAlamatLengkap(p.alamatLengkap || '');
    setCatatani(p.catatani || '');
    setIsAddModalOpen(true);
  };

  const handleSave = () => {
    if (!nama.trim()) {
      toast.warning('Nama pelanggan tidak boleh kosong.');
      return;
    }

    if (!editingPelanggan && isCustomerLimitReached) {
      toast.warning(`Batas ${limits.maxCustomers} data pelanggan telah tercapai. Fitur kapasitas pelanggan lebih besar hanya untuk Paket Premium.`);
      return;
    }

    const payload: Pelanggan = {
      id: editingPelanggan ? editingPelanggan.id : `pel-${Date.now()}`,
      laundryId: activeLaundryId,
      nama: nama.trim(),
      nomorTelepon: telepon.trim() || null,
      alamat: alamat.trim() || null,
      alamatLengkap: alamatLengkap.trim() || null,
      catatani: catatani.trim() || null,
      poin: editingPelanggan ? editingPelanggan.poin : 0,
    };

    onSavePelanggan(payload);
    setIsAddModalOpen(false);
  };

  const filtered = pelangganList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.nama.toLowerCase().includes(q) ||
      (p.nomorTelepon && p.nomorTelepon.includes(q)) ||
      (p.alamat && p.alamat.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide">Kelola Pelanggan</h1>
            <div className="text-[10px] text-rose-200">
              {limits.tier === 'newcomer'
                ? `${pelangganList.length}/${limits.maxCustomers} Pelanggan (Newcomer)`
                : limits.tier === 'premium'
                ? `${pelangganList.length}/${limits.maxCustomers} Pelanggan (Premium)`
                : `${pelangganList.length} Pelanggan (Pro)`}
            </div>
          </div>
        </div>
        <button
          onClick={openAddModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
            isCustomerLimitReached
              ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
        >
          {isCustomerLimitReached ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
          <span>{isCustomerLimitReached ? 'Batas Penuh' : 'Tambah'}</span>
        </button>
      </header>

      {/* Search Bar */}
      <div className="p-3 md:px-6 md:pt-5 max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama / nomor telepon pelanggan..."
            className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-9 pr-4 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Customer Count Badge */}
      <div className="px-4 md:px-6 py-1 text-xs font-bold text-slate-500 flex justify-between items-center max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
        <span>Total Terdaftar: {pelangganList.length} Pelanggan</span>
      </div>

 <main className="flex-1 px-2 md:px-1 space-y-1 overflow-y-auto max-w-xl md:max-w-4xl lg:max-w-5xl mx-auto w-full">
  {filtered.length === 0 ? (
    <div className="p-8 bg-white rounded-2xl text-center text-xs text-slate-400 border border-slate-200 italic">
      Belum ada pelanggan ditemukan.
    </div>
  ) : (
    filtered.map((p) => (
      <div
        key={p.id}
        className="bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
      >
        {/* KOLOM KIRI: Informasi Pelanggan (Nama, Telepon, Alamat/Catatan) */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Baris Atas: Nama Pelanggan di Kiri, Nomor Telepon di Kanannya */}
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="font-bold text-xs text-slate-900 truncate">{p.nama}</span>
            {p.nomorTelepon && (
              <div className="flex items-center gap-1 text-xs text-slate-600 shrink-0 font-medium">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{p.nomorTelepon}</span>
              </div>
            )}
          </div>

          {/* Baris Bawah: Alamat atau Catatan */}
          <div className="min-w-0 truncate pt-0.5 border-t border-slate-100">
            {p.catatani ? (
              <p className="text-[10px] text-amber-700 italic truncate">
                Catatan: {p.catatani}
              </p>
            ) : p.alamat ? (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{p.alamat}</span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-300 italic">Tidak ada alamat/catatan</span>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Tombol Aksi (Edit & Delete) */}
  {/* KOLOM KANAN: Tombol Aksi (Diperbesar & Efek Inset) */}
        <div className="flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-100">
          <button
            onClick={() => openEditModal(p)}
            className="p-2.5 rounded-xl text-slate-600 hover:text-[#800000] hover:bg-rose-50 border border-slate-200 bg-slate-50 shadow-inner transition active:scale-95 flex items-center justify-center"
            title="Edit Pelanggan"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              const ok = await confirm({
                title: 'Hapus Pelanggan',
                message: `Yakin ingin menghapus data pelanggan '${p.nama}'?`,
                confirmText: 'Ya, Hapus',
                isDestructive: true,
              });
              if (ok) {
                onDeletePelanggan(p.id);
                toast.success(`Pelanggan '${p.nama}' berhasil dihapus.`);
              }
            }}
            className="p-2.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 bg-slate-50 shadow-inner transition active:scale-95 flex items-center justify-center cursor-pointer"
            title="Hapus Pelanggan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    ))
  )}
</main>

      {/* Add / Edit Customer Dialog (Matches dialog_add_edit_pelanggan.xml) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#800000] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">
                {editingPelanggan ? 'Ubah Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 rounded-full hover:bg-white/20 transition">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nama Pelanggan *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama lengkap..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nomor Telepon (awali dengan 62)
                </label>
                <input
                  type="text"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  placeholder="62812..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Alamat Singkat (Opsional)
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Mawar No. 12"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Alamat Lengkap (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={alamatLengkap}
                  onChange={(e) => setAlamatLengkap(e.target.value)}
                  placeholder="Perumahan, Blok, RT/RW, Patokan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Catatan Khusus Pelanggan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatani}
                  onChange={(e) => setCatatani(e.target.value)}
                  placeholder="Catatan kebiasaan cucian pelanggan..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-xs font-bold text-white shadow-xs transition"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
