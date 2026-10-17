import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, UserCheck, X, Lock, ShieldCheck, ShieldAlert, Building2 } from 'lucide-react';
import { User, Laundry } from '../types';
import { useToast, useConfirm } from '../components/NotificationContext';
import { isProTier, getLaundryLimits } from '../utils/subscription';

interface KelolaKasirViewProps {
  onBack: () => void;
  staffList: User[];
  laundries: Laundry[];
  currentTier?: string | null;
  onAddKasir: (nama: string, email: string, pass: string, laundryId: string) => void;
  onDeleteKasir: (uid: string) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const KelolaKasirView: React.FC<KelolaKasirViewProps> = ({
  onBack,
  staffList,
  laundries,
  currentTier,
  onAddKasir,
  onDeleteKasir,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const cashiers = staffList.filter((u) => u.role === 'admin' || u.role === 'karyawan');
  const limits = getLaundryLimits(currentTier);

  // Cari cabang yang belum memiliki kasir secara default
  const availableBranch = laundries.find((l) => !cashiers.some((c) => c.laundryId === l.id));
  const [selectedBranchId, setSelectedBranchId] = useState(availableBranch?.id || laundries[0]?.id || '');

  const handleSave = () => {
    if (!nama.trim() || !email.trim() || !password.trim()) {
      toast.warning('Semua data kasir wajib diisi.');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password minimal 6 karakter.');
      return;
    }

    // 1. Cek kuota tier total
    if (!isProTier(currentTier) && cashiers.length >= 1) {
      setIsModalOpen(false);
      onOpenUpgradeModal?.('Menambah akun kasir baru (Paket Basic dibatasi 1 Cabang & 1 Akun Kasir)');
      return;
    }

    if (isProTier(currentTier) && cashiers.length >= 3) {
      toast.warning('Batas maksimal 3 admin telah tercapai (1 admin kasir per outlet untuk maksimal 3 cabang).');
      return;
    }

    // 2. Cek aturan ketat: 1 admin per outlet
    const existingInBranch = cashiers.find((c) => c.laundryId === selectedBranchId);
    if (existingInBranch) {
      const branchName = laundries.find((l) => l.id === selectedBranchId)?.namaLaundry || 'Cabang terpilih';
      toast.warning(`${branchName} sudah memiliki 1 admin kasir (${existingInBranch.displayName}). Sistem membatasi maksimal 1 admin & 1 owner per outlet untuk proteksi bot.`);
      return;
    }

    // 3. Cek duplikasi email atau nomor WhatsApp agar login kasir tidak tertukar
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
      toast.error(`Email atau No. WhatsApp '${email}' sudah digunakan oleh akun lain. Silakan gunakan kontak yang berbeda.`);
      return;
    }

    onAddKasir(nama.trim(), email.trim(), password.trim(), selectedBranchId);
    setIsModalOpen(false);
    setNama('');
    setEmail('');
    setPassword('');
    toast.success(`Akun kasir '${nama}' berhasil dibuat untuk cabang terpilih!`);
  };

  const isAtLimit = !isProTier(currentTier) ? cashiers.length >= 1 : cashiers.length >= 3;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base tracking-wide leading-tight">Kelola Kasir Cabang</h1>
            <span className="text-[10px] text-rose-200">
              1 Admin & 1 Owner per Outlet
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!isProTier(currentTier) && cashiers.length >= 1) {
              onOpenUpgradeModal?.('Menambah akun kasir baru (Paket Basic dibatasi 1 Cabang & 1 Akun Kasir). Tingkatkan ke Paket Pro untuk mengelola hingga 3 cabang dan 3 kasir.');
              return;
            }
            if (isProTier(currentTier) && cashiers.length >= 3) {
              toast.warning('Batas maksimal 3 admin telah tercapai (1 admin kasir per outlet untuk maksimal 3 cabang).');
              return;
            }
            // Auto-select cabang yang belum terisi
            if (availableBranch) {
              setSelectedBranchId(availableBranch.id);
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs transition cursor-pointer"
        >
          {isAtLimit ? (
            <Lock className="w-3.5 h-3.5 text-amber-300" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          <span>+ Kasir</span>
        </button>
      </header>

      <main className="flex-1 p-3 md:p-6 space-y-3 overflow-y-auto max-w-xl md:max-w-3xl lg:max-w-4xl mx-auto w-full">
        {/* Info Box: Kebijakan 1 Admin & 1 Owner per Outlet */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-slate-800">
                Alokasi Akun Kasir ({cashiers.length} / {isProTier(currentTier) ? '3 Maksimal' : '1 Kasir'})
              </span>
            </div>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              isProTier(currentTier) ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-700'
            }`}>
              {isProTier(currentTier) ? 'Paket Pro (Maks. 3 Cabang)' : 'Paket Basic (1 Cabang)'}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sistem membatasi <strong>1 admin kasir dan 1 owner per cabang outlet</strong> untuk menjaga keakuratan shift kerja serta proteksi keamanan dari bot dan penyalahgunaan akun.
          </p>

          {/* Ringkasan status cabang */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {laundries.map((lnd) => {
              const assignedKasir = cashiers.find((c) => c.laundryId === lnd.id);
              return (
                <div
                  key={lnd.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    assignedKasir ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/60 border-emerald-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-slate-800 truncate">{lnd.namaLaundry}</div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {assignedKasir ? `Admin: ${assignedKasir.displayName}` : 'Belum ada admin'}
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    assignedKasir ? 'bg-slate-200 text-slate-700' : 'bg-emerald-600 text-white'
                  }`}>
                    {assignedKasir ? '1/1 Terisi' : 'Tersedia'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* List of Cashiers */}
        {cashiers.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl text-center text-xs text-slate-400 border border-slate-200 italic">
            Belum ada akun kasir terdaftar. Tekan tombol (+ Kasir) di kanan atas untuk menambahkan kasir cabang.
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
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>{admin.displayName}</span>
                    <span className="text-[10px] bg-rose-50 text-[#800000] border border-rose-200 font-bold px-2 py-0.2 rounded-md">
                      1 Admin Outlet
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{admin.emailOrPhone}</div>
                  <div className="text-[11px] text-blue-700 font-bold flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-blue-600" />
                    <span>{branch ? branch.namaLaundry : 'Semua Cabang'}</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Hapus Kasir',
                      message: `Hapus akun kasir '${admin.displayName}'? Akun tidak akan bisa login lagi.`,
                      confirmText: 'Ya, Hapus Akun',
                      isDestructive: true,
                    });
                    if (ok) {
                      onDeleteKasir(admin.uid);
                      toast.success(`Akun kasir '${admin.displayName}' berhasil dihapus.`);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                  title="Hapus Kasir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </main>

      {/* Add Cashier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Tambah Akun Kasir Cabang</h3>
                <span className="text-[10px] text-slate-500">Maksimal 1 admin kasir per outlet</span>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Nama Lengkap Kasir *
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
                Email atau No. WhatsApp (Untuk Login Kasir) *
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
                Password (min. 6 karakter) *
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
                Pilih Cabang Outlet (1 Admin per Outlet) *
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:ring-2 focus:ring-[#800000] focus:outline-none"
              >
                {laundries.map((l) => {
                  const existingAdmin = cashiers.find((c) => c.laundryId === l.id);
                  return (
                    <option key={l.id} value={l.id} disabled={!!existingAdmin}>
                      {l.namaLaundry} {existingAdmin ? `(Sudah Ada Admin: ${existingAdmin.displayName})` : '(Tersedia - Belum Ada Admin)'}
                    </option>
                  );
                })}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Cabang yang sudah memiliki admin kasir dinonaktifkan otomatis.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold shadow-xs cursor-pointer"
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
