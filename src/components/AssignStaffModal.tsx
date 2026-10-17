import React, { useState, useEffect } from 'react';
import { X, UserCheck, User as UserIcon, Check } from 'lucide-react';
import { User, Transaksi } from '../types';
import { useToast } from './NotificationContext';

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: User[];
  currentUser?: User | null;
  transaksi: Transaksi | null;
  onAssign: (staffName: string) => void;
}

export const AssignStaffModal: React.FC<AssignStaffModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentUser,
  transaksi,
  onAssign,
}) => {
  const toast = useToast();
  const loginUserName = currentUser?.displayName || 'Kasir';
  const [selectedStaff, setSelectedStaff] = useState<string>(loginUserName);

  // Sync selected staff whenever modal opens for a transaction
  useEffect(() => {
    if (isOpen) {
      if (transaksi?.dikerjakanOleh) {
        setSelectedStaff(transaksi.dikerjakanOleh);
      } else {
        setSelectedStaff(loginUserName);
      }
    }
  }, [isOpen, transaksi, loginUserName]);

  if (!isOpen || !transaksi) return null;

  const handleSave = () => {
    if (!selectedStaff.trim()) {
      toast.warning('Pilih siapa yang mengerjakan pesanan terlebih dahulu.');
      return;
    }
    onAssign(selectedStaff.trim());
    toast.success(`Pesanan ditugaskan ke ${selectedStaff.trim()}.`);
    onClose();
  };

  // Build candidate options: logged-in user + registered staff (filter duplicates)
  const staffCandidates = staffList.filter((s) => {
    const sName = s.displayName || 'Kasir';
    return sName.trim().toLowerCase() !== loginUserName.trim().toLowerCase();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm">Pilih Petugas Pengerjaan</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <p className="text-xs text-slate-500">
              Pilih siapa yang mengerjakan pesanan <strong className="text-slate-800">{transaksi.nomorTransaksi || 'ini'}</strong>:
            </p>
            <div className="text-[11px] font-bold text-[#800000] mt-0.5 truncate">
              Konsumen: {transaksi.namaPelanggan}
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
            {/* OPSI 1: User yang sedang Login (Username Akun Aktif) */}
            <label
              onClick={() => setSelectedStaff(loginUserName)}
              className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all ${
                selectedStaff === loginUserName
                  ? 'border-[#800000] bg-rose-50/80 text-[#800000] shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedStaff === loginUserName
                      ? 'bg-[#800000] text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{loginUserName}</div>
                  <div className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-100/70 text-[#800000] font-semibold text-[9px]">
                      Akun Login (Saya)
                    </span>
                  </div>
                </div>
              </div>
              <input
                type="radio"
                name="staff_selection"
                checked={selectedStaff === loginUserName}
                onChange={() => setSelectedStaff(loginUserName)}
                className="accent-[#800000] w-4 h-4 cursor-pointer"
              />
            </label>

            {/* OPSI 2..n: Staf yang Terdaftar */}
            {staffCandidates.length > 0 && (
              <div className="pt-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5">
                  Pilihan Staf Terdaftar
                </div>
                <div className="space-y-2">
                  {staffCandidates.map((staf) => {
                    const candidateName = staf.displayName;
                    const isSelected = selectedStaff === candidateName;
                    return (
                      <label
                        key={staf.uid}
                        onClick={() => setSelectedStaff(candidateName)}
                        className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-semibold cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#800000] bg-rose-50/80 text-[#800000] shadow-xs'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#800000] text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-xs truncate">{candidateName}</div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {staf.role === 'admin' ? 'Kasir / Admin' : 'Karyawan'}
                            </div>
                          </div>
                        </div>
                        <input
                          type="radio"
                          name="staff_selection"
                          checked={isSelected}
                          onChange={() => setSelectedStaff(candidateName)}
                          className="accent-[#800000] w-4 h-4 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan & Kerjakan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
