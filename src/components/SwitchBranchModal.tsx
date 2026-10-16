import React from 'react';
import { X, Building2, Check } from 'lucide-react';
import { Laundry } from '../types';

interface SwitchBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  laundries: Laundry[];
  activeLaundryId: string;
  onSelectBranch: (laundryId: string) => void;
  onManageBranches: () => void;
}

export const SwitchBranchModal: React.FC<SwitchBranchModalProps> = ({
  isOpen,
  onClose,
  laundries,
  activeLaundryId,
  onSelectBranch,
  onManageBranches,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-white" />
            <h3 className="font-bold text-sm">Pilih Cabang Laundry</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">
            Pilih cabang outlet yang sedang aktif Anda kelola:
          </p>

          <div className="space-y-2">
            {laundries.map((lnd) => {
              const isActive = lnd.id === activeLaundryId;
              return (
                <button
                  key={lnd.id}
                  onClick={() => {
                    onSelectBranch(lnd.id);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border flex items-center justify-between transition ${
                    isActive
                      ? 'border-[#800000] bg-rose-50/70 text-[#800000] font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-sm">{lnd.namaLaundry}</div>
                    {lnd.alamat && <div className="text-[11px] text-slate-500 font-normal">{lnd.alamat}</div>}
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-[#800000] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                onClose();
                onManageBranches();
              }}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Kelola Semua Cabang (+ Cabang Baru)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
