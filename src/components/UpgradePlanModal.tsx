import React from 'react';
import {
  X,
  Crown,
  Check,
  Lock,
  Building2,
  Users,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  Image as ImageIcon,
  Receipt,
  MessageCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
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
  const basicConfig = LAUNDRY_TIER_CONFIG.basic;
  const proConfig = LAUNDRY_TIER_CONFIG.pro;

  const handleContactWhatsApp = () => {
    const text = encodeURIComponent(
      `Halo Tim Kafelas Laundry, saya tertarik untuk aktivasi *Paket Pro (Rp 57.000/bln)* untuk laundry saya (Hingga 3 Cabang Outlet & 3 Admin). Mohon informasi aktivasi lisensi resminya. Terima kasih!`
    );
    window.open(`https://api.whatsapp.com/send?phone=6285659781477&text=${text}`, '_blank');
  };

  const comparisonRows = [
    {
      feature: 'Jumlah Cabang Outlet',
      desc: 'Pengelolaan multi-outlet terintegrasi',
      icon: Building2,
      basic: '1 Cabang Utama',
      pro: 'Hingga 3 Cabang Outlet',
      highlightPro: true,
    },
    {
      feature: 'Akun Admin Kasir',
      desc: '1 admin kasir per cabang outlet',
      icon: Users,
      basic: '1 Admin Kasir (1 Outlet)',
      pro: '1 Admin/Outlet (Maks. 3)',
      highlightPro: true,
    },
    {
      feature: 'Akun Owner per Outlet',
      desc: 'Kepemilikan legal & pembukuan terpusat',
      icon: ShieldCheck,
      basic: '1 Akun Owner',
      pro: '1 Akun Owner',
      highlightPro: false,
    },
    {
      feature: 'Penugasan Staf Cucian',
      desc: 'Delegasi kru cuci, setrika, & packing',
      icon: Sparkles,
      basic: 'Otomatis Kasir',
      pro: 'Tugaskan per Cucian',
      highlightPro: true,
    },
    {
      feature: 'Ekspor Pembukuan Excel (.xlsx)',
      desc: 'Unduh seluruh database rekap transaksi',
      icon: FileSpreadsheet,
      basic: 'Terkunci',
      pro: 'Unduh Spreadsheet Penuh',
      highlightPro: true,
      lockedInBasic: true,
    },
    {
      feature: 'Cetak Dokumen PDF Resmi A4',
      desc: 'Laporan keuangan kop surat siap audit',
      icon: Printer,
      basic: 'Terkunci',
      pro: 'Cetak & Unduh PDF Resmi',
      highlightPro: true,
      lockedInBasic: true,
    },
    {
      feature: 'Analisis Komparasi Pertumbuhan',
      desc: 'Grafik evaluasi MoM & YoY laba omzet',
      icon: TrendingUp,
      basic: 'Terkunci',
      pro: 'Grafik Historis Lengkap',
      highlightPro: true,
      lockedInBasic: true,
    },
    {
      feature: 'Logo & TTD di Struk Thermal',
      desc: 'Branding visual di printer Bluetooth',
      icon: ImageIcon,
      basic: 'Teks Struk Standar',
      pro: 'Cetak Logo & TTD Fisik',
      highlightPro: true,
    },
    {
      feature: 'Kapasitas Nota Transaksi',
      desc: 'Batas wajar terproteksi anti-bot',
      icon: Receipt,
      basic: '300 Nota / Bulan',
      pro: '1.500 Nota / Bulan',
      highlightPro: true,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
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
                Paket Basic & Paket Pro Resmi
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
              <span className="font-bold">Fitur Khusus Paket Pro:</span> {triggerReason}. Tingkatkan paket untuk langsung membuka fitur ini.
            </div>
          </div>
        )}

        {/* Anti-Bot Security Notice */}
        <div className="bg-slate-950/80 border-b border-slate-800 px-4 py-2 text-[11px] text-slate-400 flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong>Kebijakan Proteksi Anti-Bot:</strong> Kuota terukur (1 owner & 1 admin per outlet, maks. 3 cabang) diterapkan untuk menjamin stabilitas server dan mencegah otomasi bot liar.
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Active Simulation Switcher */}
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-200">
                Mode Simulasi Paket Saat Ini:{' '}
                <span className={activeTier === 'pro' ? 'text-amber-400 font-black' : 'text-slate-200 font-black'}>
                  {activeTier === 'pro' ? 'Paket Pro' : 'Paket Basic'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Anda dapat beralih antara Basic dan Pro untuk menguji langsung batasan dan hak akses fitur.
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-700/80 shrink-0">
              <button
                type="button"
                onClick={() => onSwitchTier?.('basic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTier === 'basic'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Paket Basic
              </button>
              <button
                type="button"
                onClick={() => onSwitchTier?.('pro')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
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

          {/* Tier Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card Basic */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition ${
                activeTier === 'basic'
                  ? 'bg-slate-800/90 border-slate-500 shadow-md ring-1 ring-slate-500'
                  : 'bg-slate-800/40 border-slate-700/60 opacity-80 hover:opacity-100'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200">{basicConfig.label}</h3>
                  {activeTier === 'basic' && (
                    <span className="text-[10px] font-bold text-slate-300 bg-slate-700/80 px-2 py-0.5 rounded-md">
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

                <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 space-y-2">
                  {basicConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60 text-center">
                <span className="text-[11px] text-slate-400 font-semibold">
                  1 Cabang Outlet · 1 Admin Kasir · 300 Nota/bln
                </span>
              </div>
            </div>

            {/* Card Pro */}
            <div
              className={`rounded-2xl border p-4.5 flex flex-col justify-between relative overflow-hidden transition ${
                activeTier === 'pro'
                  ? 'bg-gradient-to-b from-[#800000]/30 to-slate-800/90 border-amber-500/80 shadow-lg ring-1 ring-amber-500'
                  : 'bg-gradient-to-b from-[#800000]/15 to-slate-800/60 border-amber-500/40 hover:border-amber-400'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-black text-white">{proConfig.label}</h3>
                    <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 border border-amber-400/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
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

                <div className="mt-3.5 pt-3.5 border-t border-slate-700/60 space-y-2">
                  {proConfig.highlights.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleContactWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-slate-950" />
                  <span>Aktivasi Paket Pro ({formatRupiah(proConfig.priceMonthly)}/bln)</span>
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
                <div className="col-span-6 sm:col-span-5">Fitur & Kebijakan</div>
                <div className="col-span-3 sm:col-span-3 text-center">Paket Basic ({formatRupiah(basicConfig.priceMonthly)})</div>
                <div className="col-span-3 sm:col-span-4 text-center text-amber-300 font-black">Paket Pro ({formatRupiah(proConfig.priceMonthly)})</div>
              </div>

              {/* Table Rows */}
              {comparisonRows.map((row, idx) => {
                const IconComponent = row.icon;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 p-3 items-center hover:bg-slate-700/30 transition"
                  >
                    <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                      <div className="w-7 h-7 rounded-lg bg-slate-700/60 text-slate-300 flex items-center justify-center shrink-0">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 truncate">{row.feature}</div>
                        <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                          {row.desc}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-3 sm:col-span-3 text-center text-slate-300 text-[11px]">
                      {row.lockedInBasic ? (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Terkunci</span>
                        </span>
                      ) : (
                        <span>{row.basic}</span>
                      )}
                    </div>

                    <div className="col-span-3 sm:col-span-4 text-center font-bold text-amber-300 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-amber-400" />
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
              onClick={handleContactWhatsApp}
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
