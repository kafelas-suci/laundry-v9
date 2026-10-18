import React from 'react';
import {
  X,
  Crown,
  Check,
  Lock,
  Building2,
  Users,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Gift,
} from 'lucide-react';
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
  const basicConfig = LAUNDRY_TIER_CONFIG.basic;

  const handleContactWhatsApp = (targetTier: string = 'Paket Basic') => {
    const text = encodeURIComponent(
      `Halo Tim Kafelas Laundry, saya tertarik untuk aktivasi *${targetTier}* seharga Rp 27.000/bulan untuk laundry saya. Mohon informasi aktivasi lisensi resminya. Terima kasih!`
    );
    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${text}`, '_blank');
  };

  const comparisonRows = [
    {
      feature: 'Biaya Langganan',
      desc: 'Investasi operasional software',
      icon: Gift,
      newcomer: 'Gratis (Rp 0)',
      basic: 'Rp 27.000 / bln',
    },
    {
      feature: 'Akun Owner Outlet',
      desc: 'Kepemilikan dan kontrol penuh bisnis',
      icon: ShieldCheck,
      newcomer: '1 Owner Mandiri',
      basic: '1 Owner per Outlet',
    },
    {
      feature: 'Akun Kasir (Login)',
      desc: 'Akses login staf kasir per cabang',
      icon: Users,
      newcomer: 'Tidak Ada Kasir (Terkunci)',
      basic: '1 Kasir per Outlet',
      lockedInNewcomer: true,
    },
    {
      feature: 'Penugasan Staf Operasional',
      desc: 'Penugasan cucian (cuci/setrika/packing)',
      icon: Sparkles,
      newcomer: 'Terkunci',
      basic: 'Penugasan Staf Aktif',
      lockedInNewcomer: true,
    },
    {
      feature: 'Data Pelanggan',
      desc: 'Buku kontak pelanggan & riwayat transaksi',
      icon: Users,
      newcomer: 'Maks. 50 Pelanggan',
      basic: 'Hingga 1.000 Pelanggan',
    },
    {
      feature: 'Nota Transaksi per Bulan',
      desc: 'Kapasitas input pesanan cucian baru per bulan',
      icon: Receipt,
      newcomer: '50 Transaksi / Bulan',
      basic: '400 Transaksi / Bulan',
    },
    {
      feature: 'Jumlah Jenis Layanan',
      desc: 'Katalog tarif kiloan & satuan',
      icon: Building2,
      newcomer: 'Maks. 5 Layanan',
      basic: 'Hingga 50 Layanan',
    },
    {
      feature: 'Ekspor Pembukuan Excel (.xlsx)',
      desc: 'Unduh rekapitulasi data keuangan ke spreadsheet',
      icon: FileSpreadsheet,
      newcomer: 'Terkunci',
      basic: 'Excel Lengkap (.xlsx)',
      lockedInNewcomer: true,
    },
    {
      feature: 'Cetak Laporan Resmi PDF A4',
      desc: 'Dokumen laporan keuangan resmi siap audit',
      icon: FileSpreadsheet,
      newcomer: 'Terkunci',
      basic: 'PDF Resmi A4 Siap Cetak',
      lockedInNewcomer: true,
    },
    {
      feature: 'Grafik Analisis Komparasi Pertumbuhan',
      desc: 'Evaluasi grafik tren laba & omzet (MoM & YoY)',
      icon: TrendingUp,
      newcomer: 'Terkunci',
      basic: 'Grafik Komparasi Aktif',
      lockedInNewcomer: true,
    },
    {
      feature: 'Logo & TTD di Struk Thermal',
      desc: 'Branding logo toko & tanda tangan di nota',
      icon: Receipt,
      newcomer: 'Terkunci',
      basic: 'Logo & TTD Resmi Aktif',
      lockedInNewcomer: true,
    },
    {
      feature: 'Jumlah Cabang Outlet',
      desc: 'Ekspansi cabang outlet baru',
      icon: Building2,
      newcomer: '1 Cabang Utama (+ Rp 25.000/cabang)',
      basic: '1 Cabang Utama (+ Rp 25.000/cabang)',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#800000] via-[#991B1B] to-slate-900 p-4 sm:p-5 flex items-start justify-between border-b border-red-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Langganan</span>
                <span className="text-white/40">·</span>
                <span className="text-slate-300">Kafelas Laundry</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Upgrade ke Paket Basic Resmi
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition shrink-0 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trigger Context Notice (If triggered by clicking a locked feature) */}
        {triggerReason && (
          <div className="bg-amber-950/60 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-200 flex items-center gap-2 shrink-0">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold">Batas / Fitur Terkunci:</span> {triggerReason}. Tingkatkan ke Paket Basic untuk langsung membuka fitur ini.
            </div>
          </div>
        )}


        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Status Akun & Alur Upgrade */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>Status Paket Akun:</span>
                <span
                  className={`px-2 py-0.5 rounded-md font-black text-xs ${
                    activeTier === 'basic'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  {activeTier === 'basic' ? 'Paket Basic (Aktif)' : 'Paket Newcomer (Starter Otomatis)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {activeTier === 'newcomer'
                  ? 'Paket Newcomer aktif otomatis saat baru mendaftar. Saat batasan tercapai, akun ditingkatkan ke Paket Basic dan tidak dapat kembali ke Newcomer.'
                  : 'Akun Anda telah di-upgrade ke Paket Basic dengan akses penuh seluruh fitur operasional, staf, dan laporan keuangan.'}
              </p>
            </div>

            {activeTier === 'newcomer' && (
              <button
                type="button"
                onClick={() => onSwitchTier?.('basic')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-black text-xs shadow-md transition active:scale-95 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>Tingkatkan ke Basic</span>
              </button>
            )}
          </div>

          {/* Tier Overview Cards - 2 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 2: Basic (Pilihan Utama Upgrade) */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between relative overflow-hidden transition ${
                activeTier === 'basic'
                  ? 'bg-gradient-to-b from-[#800000]/30 to-slate-800/90 border-sky-400 shadow-xl ring-1 ring-sky-400'
                  : 'bg-gradient-to-b from-[#800000]/20 to-slate-800/90 border-amber-400 shadow-xl ring-1 ring-amber-400'
              }`}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-xs uppercase tracking-wider flex items-center gap-1">
                <Crown className="w-3 h-3 text-white" />
                <span>Tujuan Upgrade Resmi</span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-white">{basicConfig.label}</h3>
                  </div>
                  {activeTier === 'basic' && (
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 border border-sky-400/30 px-2 py-0.5 rounded-md mr-28">
                      Sedang Digunakan
                    </span>
                  )}
                </div>
                <div className="mt-2 text-2xl font-black text-white font-mono tabular-nums">
                  {formatRupiah(basicConfig.priceMonthly)}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">/ bulan</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {basicConfig.tagline}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                  {basicConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                      <Check className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <span className="font-medium leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/60 space-y-2">
                {activeTier === 'newcomer' ? (
                  <button
                    type="button"
                    onClick={() => onSwitchTier?.('basic')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg active:scale-98 cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-300" />
                    <span>Tingkatkan ke Paket Basic Sekarang</span>
                  </button>
                ) : (
                  <div className="w-full py-2.5 px-4 rounded-xl text-xs font-black text-center bg-sky-600/30 border border-sky-400/40 text-sky-200">
                    ✓ Paket Basic Sedang Aktif
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleContactWhatsApp('Paket Basic')}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
                  <span>Aktivasi Resmi via WhatsApp ({formatRupiah(basicConfig.priceMonthly)}/bln)</span>
                </button>
              </div>
            </div>
          </div>
            {/* Card 1: Newcomer (Tidak Bisa Dipilih, Hanya Status Akun Baru) */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between transition ${
                activeTier === 'newcomer'
                  ? 'bg-slate-800/90 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-base font-bold text-slate-200">{newcomerConfig.label}</h3>
                  </div>
                  {activeTier === 'newcomer' ? (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      Starter Aktif
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-700/60 border border-slate-600 px-2 py-0.5 rounded-md">
                      Starter Selesai
                    </span>
                  )}
                </div>
                <div className="mt-2 text-2xl font-black text-emerald-400 font-mono tabular-nums">
                  Gratis (Rp 0)
                  <span className="text-xs font-normal text-slate-400 ml-1.5">/ starter awal</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {newcomerConfig.tagline}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-2">
                  {newcomerConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-700/60">
                {activeTier === 'newcomer' ? (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 border border-emerald-500/30 text-emerald-300 text-xs text-center font-bold">
                    ✓ Aktif Otomatis untuk Akun Baru
                  </div>
                ) : (
                  <div className="w-full py-2.5 px-3 rounded-xl bg-slate-900/50 border border-slate-700/60 text-slate-400 text-xs text-center font-medium">
                    Hanya untuk Akun Baru (Tidak Dapat Dipilih Kembali)
                  </div>
                )}
              </div>
            </div>

    

          {/* Detailed Feature Comparison Table */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Matriks Perbandingan Fitur Resmi</span>
              <span className="text-[11px] text-slate-400 font-normal">Kafelas Laundry</span>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden divide-y divide-slate-700/60 text-xs">
              {/* Table Header */}
              <div className="grid grid-cols-12 p-3 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <div className="col-span-6 sm:col-span-5">Fitur & Batasan</div>
                <div className="col-span-3 sm:col-span-3 text-center text-emerald-400 font-bold">Newcomer (Rp 0)</div>
                <div className="col-span-3 sm:col-span-4 text-center text-sky-300 font-bold">Basic ({formatRupiah(basicConfig.priceMonthly)})</div>
              </div>

              {/* Table Rows */}
              {comparisonRows.map((row, idx) => {
                const IconComponent = row.icon;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 p-2.5 sm:p-3 items-center hover:bg-slate-700/30 transition"
                  >
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-700/60 text-slate-300 flex items-center justify-center shrink-0">
                        <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 truncate text-[11px] sm:text-xs">{row.feature}</div>
                        <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                          {row.desc}
                        </div>
                      </div>
                    </div>

                    {/* Newcomer col */}
                    <div className="col-span-3 sm:col-span-3 text-center text-slate-300 text-[10px] sm:text-[11px]">
                      {row.lockedInNewcomer ? (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Terkunci</span>
                        </span>
                      ) : (
                        <span>{row.newcomer}</span>
                      )}
                    </div>

                    {/* Basic col */}
                    <div className="col-span-3 sm:col-span-4 text-center font-bold text-sky-300 text-[10px] sm:text-[11px]">
                      <span className="inline-flex items-center gap-1 justify-center">
                        <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>{row.basic}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Garansi aktivasi lisensi resmi & data laundry aman</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => handleContactWhatsApp('Paket Basic')}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Hubungi Admin WhatsApp</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
