import React from 'react';
import { X, Crown, Check, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { LaundryTier, LAUNDRY_TIER_CONFIG, normalizeTier } from '../utils/subscription';
import { formatRupiah } from '../utils/formatters';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string | null;
  triggerReason?: string;
  onSwitchTier?: (newTier: LaundryTier) => void;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  triggerReason,
  onSwitchTier,
}) => {
  if (!isOpen) return null;

  const activeTier = normalizeTier(currentTier);
  const newcomerConfig = LAUNDRY_TIER_CONFIG.newcomer;
  const PremiumConfig = LAUNDRY_TIER_CONFIG.Premium;

  const handleContactWhatsApp = (targetTier: string = 'Paket Premium') => {
    const text = encodeURIComponent(
      `Halo Tim Kafelas Laundry, saya tertarik untuk aktivasi *${targetTier}* seharga Rp 27.000/bulan untuk laundry saya. Mohon informasi aktivasi lisensi resminya. Terima kasih!`
    );
    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${text}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mt-4 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Putih Bersih dengan Aksen Branding Maroon */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#800000]">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pilihan Paket Langganan</h2>
              <p className="text-[11px] text-slate-500">Kafelas Laundry Dashboard</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifikasi Fitur Terkunci (Light Amber) */}
        {triggerReason && (
          <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span><strong>Fitur Terkunci:</strong> {triggerReason}</span>
          </div>
        )}

        {/* Konten Utama (Background Putih / Slate Terang) */}
        <div className="flex-1 overflow-y-auto px-4 py-1 space-y-1 bg-slate-50/50">
          
          {/* Grid 2 Kartu Paket */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div className={`p-4 rounded-xl border flex flex-col justify-between bg-white transition ${
              activeTier === 'Premium'
                ? 'border-[#800000] shadow-md ring-1 ring-[#800000]/20'
                : 'border-[#800000]/60 shadow-md'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#800000] flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    {PremiumConfig.label}
                  </span>
                  {activeTier === 'Premium' ? (
                    <span className="text-[9px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded">
                      Aktif
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold text-[#800000] bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      Rekomendasi
                    </span>
                  )}
                </div>
                <div className="mt-1 text-lg font-black text-slate-900">
                  {formatRupiah(PremiumConfig.priceMonthly)}
                  <span className="text-[11px] font-normal text-slate-500"> / bulan</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Akses penuh seluruh fitur tanpa batasan
                </p>

                <div className="mt-1 pt-2 border-t border-slate-100 space-y-1.5">
                              <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Tanpa Batasan 50 Pelanggan</span>
                  </div>
                  <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Tanpa Batasan 5 Layanan</span>
                  </div>
                  <div className="text-[11px] text-slate-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Login Kasir & Penugasan Staf</span>
                  </div>
                  <div className="text-[11px] text-slate-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Export Excel & PDF A4 Resmi</span>
                  </div>
                  <div className="text-[11px] text-slate-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Grafik Komparasi Laba Rugi</span>
                  </div>
             
                </div>
              </div>

              <div className="mt-2 pt-2">
                {activeTier === 'newcomer' ? (
                  <button
                    type="button"
                    onClick={() => onSwitchTier?.('Premium')}
                    className="w-full py-2 px-3 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    Upgrade Sekarang
                  </button>
                ) : (
                  <div className="w-full py-1.5 px-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs text-center font-semibold">
                    ✓ Paket Sedang Digunakan
                  </div>
                )}
              </div>
            </div>
            
            {/* Kartu 1: Newcomer */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between bg-white transition ${
              activeTier === 'newcomer'
                ? 'border-emerald-500 shadow-xs ring-1 ring-emerald-500/30'
                : 'border-slate-200 opacity-70'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900">{newcomerConfig.label}</span>
                  {activeTier === 'newcomer' && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      Aktif
                    </span>
                  )}
                </div>
            
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Maksimal 50 nota / bulan
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>1 Owner Mandiri</span>
                  </div>
                  <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Maks. 50 Pelanggan</span>
                  </div>
                  <div className="text-[11px] text-slate-700 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Maks. 5 Layanan</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 italic">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Tanpa Akun Kasir & Staf</span>
                  </div>
                </div>
              </div>

              <div className="mt-1 pt-2 border-t border-slate-100">
                <div className="text-[10px] text-slate-400 text-center font-medium">
                  {activeTier === 'newcomer' ? 'Starter Otomatis' : 'Paket Awal Selesai'}
                </div>
              </div>
            </div>

            {/* Kartu 2: Premium (Sorotan Utama) */}
          

          </div>

          {/* Catatan / Bantuan */}
          <div className="p-2 bg-white rounded-xl text-center text-[11px] text-slate-500 shadow-2xs">
            Perlu bantuan aktivasi atau penambahan cabang outlet? Silakan hubungi tim CS Kafelas Laundry.
          </div>

        </div>

        {/* Footer Putih Terang */}
        <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Garansi Lisensi Resmi</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleContactWhatsApp('Paket Premium')}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Aktivasi via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};