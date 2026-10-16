import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, UserCheck, X } from 'lucide-react';
import { User, Laundry } from '../types';

interface KelolaKasirViewProps {
  onBack: () => void;
  staffList: User[];
  laundries: Laundry[];
  onAddKasir: (nama: string, email: string, pass: string, laundryId: string) => void;
  onDeleteKasir: (uid: string) => void;
}

export const KelolaKasirView: React.FC<KelolaKasirViewProps> = ({
  onBack,
  staffList,
  laundries,
  onAddKasir,
  onDeleteKasir,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState(laundries[0]?.id || '');

  const cashiers = staffList.filter((u) => u.role === 'admin' || u.role === 'karyawan');

  const handleSave = () => {
    if (!nama.trim() || !email.trim() || !password.trim()) {
      alert('Semua data wajib diisi.');
      return;
    }
    if (password.length < 6) {
      alert('Password minimal 6 karakter.');
      return;
    }

    // Cek duplikasi email atau nomor WhatsApp agar login kasir tidak tertukar
    const inputClean = email.trim().toLowerCase();
    const phoneDigits = inputClean.replace(/[^0-9]/g, '');

    const isDuplicate = staffList.some((s) => {
      const sEmail = s.emailOrPhone?.toLowerCase();
      const sPhone = (s.nomorTelepon || s.emailOrPhone)?.replace(/[^0-9]/g, '');
      const matchEmail = sEmail === inputClean;
      const matchPhone = phoneDigits && sPhone && (sPhone === phoneDigits || sPhone.endsWith(phoneDigits) || phoneDigits.endsWith(sPhone));
      return matchEmail || matchPhone;
    });

    if (isDuplicate) {
      alert(`Email atau No. WhatsApp '${email}' sudah digunakan oleh akun lain. Silakan masukkan Email atau No. WhatsApp kasir yang berbeda.`);
      return;
    }

    onAddKasir(nama.trim(), email.trim(), password.trim(), selectedBranchId);
    setIsModalOpen(false);
    setNama('');
    setEmail('');
    setPassword('');
    alert(`Akun kasir '${nama}' berhasil dibuat!`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-bold text-base tracking-wide">Kelola Kasir / Admin Cabang</h1>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Kasir</span>
        </button>
      </header>

      <main className="flex-1 p-3 md:p-6 space-y-2.5 overflow-y-auto max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        {cashiers.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl text-center text-xs text-slate-400 border border-slate-200 italic">
            Belum ada akun kasir terdaftar. Tekan tombol (+ Kasir) di kanan atas.
          </div>
        ) : (
          cashiers.map((admin) => {
            const branch = laundries.find((l) => l.id === admin.laundryId);
            return (
              <div
                key={admin.uid}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900">{admin.displayName}</div>
                  <div className="text-xs text-slate-500">{admin.emailOrPhone}</div>
                  <div className="text-[11px] text-blue-600 font-bold">
                    📍 {branch ? branch.namaLaundry : 'Semua Cabang'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Hapus akun kasir '${admin.displayName}'? Akun tidak akan bisa login lagi.`)) {
                      onDeleteKasir(admin.uid);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="Hapus Kasir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </main>

      {/* Add Cashier Modal (Matches dialog_tambah_admin.xml) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">Tambah Akun Kasir Cabang</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Lengkap Kasir
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Email atau No. WhatsApp (Untuk Login Kasir)
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Contoh: 08123456789 atau kasir@gmail.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Password (min. 6 karakter)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-[#800000] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Tugaskan di Cabang
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
              >
                {laundries.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.namaLaundry}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs"
              >
                Simpan Akun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
