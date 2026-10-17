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
  const proConfig = LAUNDRY_TIER_CONFIG.pro;

  const handleContactWhatsApp = (targetTier: string = 'Paket Pro') => {
    const text = encodeURIComponent(
      `Halo Tim Kafelas Laundry, saya tertarik untuk aktivasi *${targetTier}* untuk laundry saya. Mohon informasi aktivasi lisensi resminya. Terima kasih!`
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
      pro: 'Rp 57.000 / bln',
      highlightPro: true,
    },
    {
      feature: 'Akun Owner Outlet',
      desc: 'Kepemilikan dan kontrol penuh bisnis',
      icon: ShieldCheck,
      newcomer: '1 Owner Mandiri',
      basic: '1 Owner Mandiri',
      pro: '1 Owner/Outlet (Maks. 3)',
      highlightPro: false,
    },
    {
      feature: 'Akun Kasir (Login)',
      desc: 'Akses staf kasir per cabang',
      icon: Users,
      newcomer: 'Tidak Ada Kasir (Terkunci)',
      basic: '1 Kasir Mandiri',
      pro: '1 Kasir/Outlet (Maks. 3)',
      highlightPro: true,
      lockedInNewcomer: true,
    },
    {
      feature: 'Staf Operasional',
      desc: 'Penugasan cucian (cuci/setrika/packing)',
      icon: Sparkles,
      newcomer: 'Tidak Ada Staf (Terkunci)',
      basic: 'Tidak Ada Staf (Terkunci)',
      pro: 'Penugasan Staf Lengkap',
      highlightPro: true,
      lockedInNewcomer: true,
      lockedInBasic: true,
    },
    {
      feature: 'Data Pelanggan',
      desc: 'Buku kontak pelanggan & riwayat',
      icon: Users,
      newcomer: 'Maks. 50 Pelanggan',
      basic: 'Hingga 500 Pelanggan',
      pro: 'Pelanggan Kapasitas Besar',
      highlightPro: true,
    },
    {
      feature: 'Nota Transaksi per Bulan',
      desc: 'Kapasitas input pesanan cucian baru',
      icon: Receipt,
      newcomer: '50 Transaksi / Bulan',
      basic: '300 Transaksi / Bulan',
      pro: '1.500 Transaksi / Bulan',
      highlightPro: true,
    },
    {
      feature: 'Jumlah Jenis Layanan',
      desc: 'Katalog harga kiloan & satuan',
      icon: Building2,
      newcomer: 'Maks. 5 Layanan',
      basic: 'Hingga 30 Layanan',
      pro: 'Layanan Kapasitas Penuh',
      highlightPro: true,
    },
    {
      feature: 'Laporan Pro (Excel & PDF)',
      desc: 'Ekspor .xlsx & cetak PDF resmi A4 siap audit',
      icon: FileSpreadsheet,
      newcomer: 'Terkunci',
      basic: 'Terkunci',
      pro: 'Excel & PDF Resmi A4',
      highlightPro: true,
      lockedInNewcomer: true,
      lockedInBasic: true,
    },
    {
      feature: 'Analisis Komparasi Pertumbuhan',
      desc: 'Grafik evaluasi MoM & YoY laba omzet',
      icon: TrendingUp,
      newcomer: 'Terkunci',
      basic: 'Terkunci',
      pro: 'Grafik Historis Lengkap',
      highlightPro: true,
      lockedInNewcomer: true,
      lockedInBasic: true,
    },
    {
      feature: 'Jumlah Cabang Outlet',
      desc: 'Ekspansi jaringan multi-outlet',
      icon: Building2,
      newcomer: '1 Cabang Utama',
      basic: '1 Cabang Utama',
      pro: 'Hingga 3 Cabang Outlet',
      highlightPro: true,
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
                <span>Pilihan Paket Langganan</span>
                <span className="text-white/40">·</span>
                <span className="text-slate-300">Kafelas Laundry</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Paket Newcomer, Basic & Pro Resmi
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
              <span className="font-bold">Batas / Fitur Terkunci:</span> {triggerReason}. Tingkatkan paket untuk langsung membuka fitur ini.
            </div>
          </div>
        )}

        {/* Anti-Bot Security Notice */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Kebijakan Proteksi Anti-Bot:</strong> Kuota terukur (1 owner per outlet, batas kuota transaksi & pelanggan) diterapkan untuk menjamin stabilitas server dan performa aplikasi.
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Active Simulation Switcher */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">
                Mode Simulasi Paket Aktif:{' '}
                <span
                  className={
                    activeTier === 'pro'
                      ? 'text-amber-400 font-black'
                      : activeTier === 'basic'
                      ? 'text-sky-300 font-black'
                      : 'text-emerald-400 font-black'
                  }
                >
                  {activeTier === 'pro'
                    ? 'Paket Pro'
                    : activeTier === 'basic'
                    ? 'Paket Basic'
                    : 'Paket Newcomer (Gratis)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Beralih antar paket untuk menguji batasan kuota (50 transaksi, 5 layanan, kasir & laporan).
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => onSwitchTier?.('newcomer')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeTier === 'newcomer'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gift className="w-3 h-3" />
                <span>Newcomer</span>
              </button>
              <button
                type="button"
                onClick={() => onSwitchTier?.('basic')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTier === 'basic'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paket Basic
              </button>
              <button
                type="button"
                onClick={() => onSwitchTier?.('pro')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                  activeTier === 'pro'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Crown className="w-3 h-3 text-slate-950" />
                <span>Paket Pro</span>
              </button>
            </div>
          </div>

          {/* Tier Overview Cards - 3 Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Card Newcomer */}
            <div
              className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                activeTier === 'newcomer'
                  ? 'bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-slate-200">{newcomerConfig.label}</h3>
                  </div>
                  {activeTier === 'newcomer' && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md">
                      Aktif Sekarang
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xl font-black text-emerald-400 font-mono tabular-nums">
                  Gratis
                  <span className="text-xs font-normal text-slate-400 ml-1">/ selamanya</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {newcomerConfig.tagline}
                </p>

                <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 space-y-1.5">
                  {newcomerConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => onSwitchTier?.('newcomer')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    activeTier === 'newcomer'
                      ? 'bg-slate-700 text-slate-300 cursor-default'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                  }`}
                >
                  {activeTier === 'newcomer' ? 'Sedang Digunakan' : 'Pilih Newcomer (Gratis)'}
                </button>
              </div>
            </div>

            {/* Card Basic */}
            <div
              className={`rounded-2xl border p-4 flex flex-col justify-between transition ${
                activeTier === 'basic'
                  ? 'bg-slate-800/90 border-sky-500 shadow-md ring-1 ring-sky-500'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">{basicConfig.label}</h3>
                  {activeTier === 'basic' && (
                    <span className="text-[10px] font-bold text-sky-300 bg-sky-500/20 px-2 py-0.5 rounded-md">
                      Aktif Sekarang
                    </span>
                  )}
                </div>
                <div className="mt-2 text-xl font-black text-white font-mono tabular-nums">
                  {formatRupiah(basicConfig.priceMonthly)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ bulan</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {basicConfig.tagline}
                </p>

                <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 space-y-1.5">
                  {basicConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchTier?.('basic');
                  }}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                    activeTier === 'basic'
                      ? 'bg-slate-700 text-slate-300 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-xs'
                  }`}
                >
                  {activeTier === 'basic' ? 'Sedang Digunakan' : 'Pilih Paket Basic'}
                </button>
              </div>
            </div>

            {/* Card Pro */}
            <div
              className={`rounded-2xl border p-4 flex flex-col justify-between relative overflow-hidden transition ${
                activeTier === 'pro'
                  ? 'bg-gradient-to-b from-[#800000]/30 to-slate-800/90 border-amber-500/80 shadow-lg ring-1 ring-amber-500'
                  : 'bg-gradient-to-b from-[#800000]/15 to-slate-800/60 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white">{proConfig.label}</h3>
                    <span className="text-[9px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Maks. 3 Cabang
                    </span>
                  </div>
                  {activeTier === 'pro' && (
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-md">
                      Aktif Sekarang
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xl font-black text-amber-300 font-mono tabular-nums">
                  {formatRupiah(proConfig.priceMonthly)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ bulan</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {proConfig.tagline}
                </p>

                <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 space-y-1.5">
                  {proConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium text-[11px] leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={() => handleContactWhatsApp('Paket Pro')}
                  className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-slate-950" />
                  <span>Aktivasi Pro ({formatRupiah(proConfig.priceMonthly)}/bln)</span>
                </button>
              </div>
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
                <div className="col-span-5 sm:col-span-4">Fitur & Batasan</div>
                <div className="col-span-2 sm:col-span-2 text-center text-emerald-400 font-bold">Newcomer (Rp 0)</div>
                <div className="col-span-2 sm:col-span-3 text-center text-sky-300 font-bold">Basic ({formatRupiah(basicConfig.priceMonthly)})</div>
                <div className="col-span-3 sm:col-span-3 text-center text-amber-300 font-black">Pro ({formatRupiah(proConfig.priceMonthly)})</div>
              </div>

              {/* Table Rows */}
              {comparisonRows.map((row, idx) => {
                const IconComponent = row.icon;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 p-2.5 sm:p-3 items-center hover:bg-slate-700/30 transition"
                  >
                    <div className="col-span-5 sm:col-span-4 flex items-center gap-2 min-w-0 pr-2">
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
                    <div className="col-span-2 sm:col-span-2 text-center text-slate-300 text-[10px] sm:text-[11px]">
                      {row.lockedInNewcomer ? (
                        <span className="inline-flex items-center gap-0.5 text-slate-500">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Kunci</span>
                        </span>
                      ) : (
                        <span>{row.newcomer}</span>
                      )}
                    </div>

                    {/* Basic col */}
                    <div className="col-span-2 sm:col-span-3 text-center text-slate-300 text-[10px] sm:text-[11px]">
                      {row.lockedInBasic ? (
                        <span className="inline-flex items-center gap-0.5 text-slate-500">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Kunci</span>
                        </span>
                      ) : (
                        <span>{row.basic}</span>
                      )}
                    </div>

                    {/* Pro col */}
                    <div className="col-span-3 sm:col-span-3 text-center font-bold text-amber-300 text-[10px] sm:text-[11px]">
                      <span className="inline-flex items-center gap-1 justify-center">
                        <Check className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>{row.pro}</span>
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
              onClick={() => handleContactWhatsApp('Paket Pro')}
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
