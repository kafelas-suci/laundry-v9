import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, X, Lock, Building2, User as UserIcon, ShieldCheck, Users } from 'lucide-react';
import { User, Laundry, OperationalStaff } from '../types';
import { useToast, useConfirm } from '../components/NotificationContext';
import { getLaundryLimits, isProTier } from '../utils/subscription';

interface KelolaKasirViewProps {
  onBack: () => void;
  staffList: User[];
  laundries: Laundry[];
  currentTier?: string | null;
  operationalStaffList: OperationalStaff[];
  activeLaundryId: string;
  onAddKasir: (nama: string, email: string, pass: string, laundryId: string) => void;
  onDeleteKasir: (uid: string) => void;
  onAddOperationalStaff: (nama: string, laundryId: string) => void;
  onDeleteOperationalStaff: (id: string) => void;
  onOpenUpgradeModal?: (reason?: string) => void;
}

export const KelolaKasirView: React.FC<KelolaKasirViewProps> = ({
  onBack,
  staffList,
  laundries,
  currentTier,
  operationalStaffList,
  activeLaundryId,
  onAddKasir,
  onDeleteKasir,
  onAddOperationalStaff,
  onDeleteOperationalStaff,
  onOpenUpgradeModal,
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  
  // Kasir Form State
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Operational staff state
  const [selectedBranchForOp, setSelectedBranchForOp] = useState(activeLaundryId || laundries[0]?.id || '');
  const [opStaffName, setOpStaffName] = useState('');

  const cashiers = staffList.filter((u) => u.role === 'admin' || u.role === 'karyawan');
  const availableBranch = laundries.find((l) => !cashiers.some((c) => c.laundryId === l.id));
  const [selectedBranchId, setSelectedBranchId] = useState(availableBranch?.id || laundries[0]?.id || '');

  const handleSaveKasir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim() || !password.trim()) {
      toast.warning('Semua data kasir wajib diisi.');
      return;
    }
    if (password.length < 6) {
      toast.warning('Password minimal 6 karakter.');
      return;
    }

    const limits = getLaundryLimits(currentTier);
    if (limits.tier === 'newcomer' || limits.maxCashiers <= 0) {
      toast.warning('Fitur pembuatan akun kasir tambahan hanya untuk Paket Basic / Pro.');
      return;
    }

    const existingInBranch = cashiers.find((c) => c.laundryId === selectedBranchId);
    if (existingInBranch) {
      const branchName = laundries.find((l) => l.id === selectedBranchId)?.namaLaundry || 'Cabang terpilih';
      toast.warning(`${branchName} sudah memiliki admin kasir (${existingInBranch.displayName}).`);
      return;
    }

    const inputClean = email.trim().toLowerCase();
    const phoneDigits = inputClean.replace(/[^0-9]/g, '');

    const isDuplicate = staffList.some((s) => {
      const sEmail = s.emailOrPhone?.toLowerCase();
      const sPhone = (s.nomorTelepon || s.emailOrPhone)?.replace(/[^0-9]/g, '');
      return sEmail === inputClean || (phoneDigits && sPhone && sPhone === phoneDigits);
    });

    if (isDuplicate) {
      toast.error(`Email atau No. WhatsApp '${email}' sudah digunakan.`);
      return;
    }

    onAddKasir(nama.trim(), email.trim(), password.trim(), selectedBranchId);
    setNama('');
    setEmail('');
    setPassword('');
    toast.success(`Akun kasir '${nama}' berhasil dibuat!`);
  };

  const limits = getLaundryLimits(currentTier);
  const isNewcomer = limits.tier === 'newcomer';
  const isAtLimit = isNewcomer || cashiers.length >= laundries.length;

  const handleAddOpStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!limits.canAssignStaff) {
      toast.warning('Fitur penugasan staf operasional hanya untuk Paket Basic / Pro.');
      return;
    }
    if (!opStaffName.trim()) {
      toast.warning('Nama staf operasional wajib diisi.');
      return;
    }
    const branchOpStaff = operationalStaffList.filter((s) => s.laundryId === selectedBranchForOp);
    if (branchOpStaff.length >= 10) {
      toast.warning('Batas maksimal 10 staf per outlet tercapai.');
      return;
    }
    onAddOperationalStaff(opStaffName.trim(), selectedBranchForOp);
    setOpStaffName('');
    toast.success(`Staf '${opStaffName}' berhasil ditambahkan!`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 pb-16">
      
      {/* Header Utama */}
      <header className="bg-[#800000] text-white shadow-md sticky top-0 z-30 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-1 -ml-1 rounded-full hover:bg-white/10 transition cursor-pointer">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-sm tracking-wide leading-tight">Kelola Kasir & Staf</h1>
            <span className="text-[10px] text-rose-200">Manajemen Akses Outlet</span>
          </div>
        </div>
      </header>

      {/* Main Container - Compact Grid Layout */}
      <main className="flex-1 p-3 md:p-5 space-y-4 max-w-4xl mx-auto w-full">
        
        {/* GRID UTAMA: Kolom Kiri (Kasir Login + Form Tambah Inline) & Kolom Kanan (Staf Tanpa Login) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* KOLOM 1: AKUN KASIR LOGIN & FORM TAMBAH */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#800000]" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Akun Kasir (Login)</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isNewcomer
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-sky-100 text-sky-800'
                }`}>
                  {isNewcomer
                    ? '0/0 Newcomer'
                    : `${cashiers.length}/${laundries.length} Kasir`}
                </span>
              </div>

              {/* Form Tambah Kasir Inline / Lock Notice */}
              {isNewcomer ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Akun Kasir Dinonaktifkan</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">Newcomer</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Paket Newcomer (Gratis) dibatasi hanya untuk 1 Owner dan tidak ada akun kasir tambahan. Operasional kasir dijalankan langsung oleh Owner.
                  </p>
                  <button
                    type="button"
                    onClick={() => toast.warning('Fitur pembuatan akun kasir tambahan hanya untuk Paket Basic / Pro.')}
                    className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Fitur Hanya untuk Paket Basic / Pro</span>
                  </button>
                </div>
              ) : isAtLimit ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                  <p className="text-[11px] text-amber-900">Batas maksimal kasir akun login telah tercapai.</p>
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                </div>
              ) : (
                <form onSubmit={handleSaveKasir} className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <div className="text-[11px] font-bold text-slate-700">Tambah Akun Kasir Baru:</div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Nama Lengkap Kasir"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-[#800000]"
                    />
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email / No. WhatsApp (Login)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-medium bg-white focus:outline-none focus:ring-1 focus:ring-[#800000]"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (Min. 6 Karakter)"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-[#800000]"
                    />
                    <div className="flex gap-2">
                      <select
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold bg-white focus:outline-none"
                      >
                        {laundries.map((l) => {
                          const existingAdmin = cashiers.find((c) => c.laundryId === l.id);
                          return (
                            <option key={l.id} value={l.id} disabled={!!existingAdmin}>
                              {l.namaLaundry} {existingAdmin ? `(Sudah ada admin)` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-[#800000] hover:bg-[#660000] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Simpan</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* List Akun Kasir Terdaftar */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {cashiers.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-[11px] text-slate-400 italic">
                    Belum ada kasir terdaftar.
                  </div>
                ) : (
                  cashiers.map((admin) => {
                    const branch = laundries.find((l) => l.id === admin.laundryId);
                    return (
                      <div key={admin.uid} className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5 truncate">
                          <div className="font-bold text-slate-900 truncate text-[11px]">{admin.displayName}</div>
                          <div className="text-[10px] text-slate-500 truncate">{admin.emailOrPhone}</div>
                          <div className="text-[9px] text-blue-600 font-semibold flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{branch ? branch.namaLaundry : 'Semua Cabang'}</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Hapus Kasir',
                              message: `Hapus akun '${admin.displayName}'?`,
                              confirmText: 'Hapus',
                              isDestructive: true,
                            });
                            if (ok) {
                              onDeleteKasir(admin.uid);
                              toast.success('Kasir dihapus.');
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* KOLOM 2: STAF OPERASIONAL TANPA LOGIN */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-3 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Staf Tanpa Login</span>
                </div>
                {!isProTier(currentTier) ? (
                  <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">PRO ONLY</span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">Maks 5/outlet</span>
                )}
              </div>

              {!limits.canAssignStaff ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2">
                  <p className="text-[11px] text-amber-900">Fitur penugasan staf operasional hanya untuk Paket Basic / Pro.</p>
                  <button
                    type="button"
                    onClick={() => toast.warning('Fitur penugasan staf operasional hanya untuk Paket Basic / Pro.')}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
                  >
                    Info
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAddOpStaffSubmit} className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedBranchForOp}
                      onChange={(e) => setSelectedBranchForOp(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-bold bg-slate-50 focus:outline-none"
                    >
                      {laundries.map((l) => (
                        <option key={l.id} value={l.id}>{l.namaLaundry}</option>
                      ))}
                    </select>

                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={opStaffName}
                        onChange={(e) => setOpStaffName(e.target.value)}
                        placeholder="Nama Staf"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-[11px] font-medium focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 bg-[#800000] hover:bg-[#660000] text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer flex items-center justify-center"
                        title="Tambah Staf"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* List Staf Operasional Cabang Terpilih */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {operationalStaffList.filter((s) => s.laundryId === selectedBranchForOp).length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-[11px] text-slate-400 italic">
                    Belum ada staf operasional di cabang ini.
                  </div>
                ) : (
                  operationalStaffList
                    .filter((s) => s.laundryId === selectedBranchForOp)
                    .map((stf) => (
                      <div key={stf.id} className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-semibold text-slate-800 text-[11px]">{stf.nama}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteOperationalStaff(stf.id);
                            toast.success(`Staf '${stf.nama}' dihapus.`);
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};