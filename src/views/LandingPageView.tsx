import React, { useState } from 'react';
import {
  Printer,
  Smartphone,
  Share2,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowLeft,
  ArrowRight,
  Download,
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  MessageCircle,
  Layers,
  ChevronDown,
  Monitor,
  WifiOff,
  Database,
  ExternalLink,
  Plus,
  Search,
  Check,
  FileText,
  DollarSign,
  Users,
  Building2,
  Play,
  RotateCcw,
  Copy,
  Sliders,
  Settings,
  UserCheck,
} from 'lucide-react';
import { DEFAULT_KAFELA_LOGO_BASE64 } from '../utils/defaultLogo';
import { formatNumberOnly } from '../utils/formatters';

interface LandingPageViewProps {
  onOpenKasir: () => void;
  onStartDemo: (role?: 'owner' | 'karyawan') => void;
  onOpenApkModal?: () => void;
  onInstallPwa?: () => void;
  isInstallable?: boolean;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onOpenKasir,
  onStartDemo,
  onOpenApkModal,
  onInstallPwa,
  isInstallable = false,
}) => {
  // Active Tutorial Module
  const [activeTutorial, setActiveTutorial] = useState<
    'transaksi' | 'status' | 'whatsapp' | 'bukukas' | 'laporan'
  >('transaksi');

  // Interactive Screen 1 Simulator States (Transaksi Baru & Struk)
  const [simPelanggan, setSimPelanggan] = useState('Ibu Sarah Amanda');
  const [simLayanan, setSimLayanan] = useState('Cuci Kering Setrika');
  const [simHargaPerKg, setSimHargaPerKg] = useState(8000);
  const [simBerat, setSimBerat] = useState(4.5);
  const [simBayarLunas, setSimBayarLunas] = useState(false);
  const [simDp, setSimDp] = useState(20000);
  const [simMetode, setSimMetode] = useState<'Tunai' | 'QRIS' | 'Transfer'>('Tunai');
  const [simShowStrukModal, setSimShowStrukModal] = useState(false);
  const [simStrukPrinted, setSimStrukPrinted] = useState(false);
  const [simWaCopied, setSimWaCopied] = useState(false);

  // Interactive Screen 2 Simulator States (Pelacakan Status Cuci)
  const [simStatusStep, setSimStatusStep] = useState<number>(1); // 0: Diterima, 1: Cuci, 2: Kering, 3: Setrika, 4: Siap Ambil, 5: Selesai
  const [simStaffName, setSimStaffName] = useState('Siti (Operasional)');

  // Interactive Screen 3 Simulator States (Buku Kas & Pengeluaran)
  const [simKategoriPengeluaran, setSimKategoriPengeluaran] = useState('Deterjen & Pewangi');
  const [simNominalPengeluaran, setSimNominalPengeluaran] = useState(65000);
  const [simCatatanPengeluaran, setSimCatatanPengeluaran] = useState('Beli Rinso Matic 5 Liter & Molto');
  const [simPengeluaranAdded, setSimPengeluaranAdded] = useState(false);

  // Perhitungan Keuangan Simulator
  const simTotalTagihan = Math.round(simBerat * simHargaPerKg);
  const simDpAktual = simBayarLunas ? simTotalTagihan : Math.min(simDp, simTotalTagihan);
  const simSisaBayar = Math.max(0, simTotalTagihan - simDpAktual);

  const statusTahapList = [
    { id: 0, label: 'Diterima', desc: 'Cucian ditimbang & nota dibuat kasir', color: 'bg-slate-100 text-slate-700' },
    { id: 1, label: 'Dicuci', desc: 'Masuk drum mesin cuci utama', color: 'bg-blue-100 text-blue-800' },
    { id: 2, label: 'Pengeringan', desc: 'Proses mesin dryer 45 menit', color: 'bg-amber-100 text-amber-800' },
    { id: 3, label: 'Penyetrikaan', desc: 'Setrika uap boiler & packing rapi', color: 'bg-purple-100 text-purple-800' },
    { id: 4, label: 'Siap Ambil', desc: 'Cucian selesai, pelanggan dinotifikasi', color: 'bg-emerald-100 text-emerald-800' },
    { id: 5, label: 'Selesai / Lunas', desc: 'Pakaian diambil & tagihan lunas', color: 'bg-teal-100 text-teal-800' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 font-sans selection:bg-red-950 selection:text-white">
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-950 p-1 flex items-center justify-center shadow-sm shrink-0">
              <img
                src={`data:image/png;base64,${DEFAULT_KAFELA_LOGO_BASE64}`}
                alt="Logo Kafelas Laundry"
                className="w-full h-full object-contain invert"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-xl tracking-tight text-slate-900">
                  Kafelas Laundry
                </span>
                <span className="text-[10px] font-bold text-red-950 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                  Panduan Kasir & Tutorial
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Tutorial Interaktif & Pratinjau Tampilan Asli Aplikasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenKasir}
              className="px-2.5 sm:px-3 py-2 text-xs font-bold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 flex items-center gap-1.5 cursor-pointer"
              title="Kembali ke Layar Login"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Login</span>
            </button>
            <button
              onClick={() => onStartDemo('owner')}
              className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors border border-stone-300 flex items-center gap-1.5 cursor-pointer"
              title="Coba aplikasi dengan data simulasi langsung"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Coba Demo</span>
            </button>
            <button
              onClick={onOpenKasir}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-red-950 hover:bg-red-900 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Kasir POS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION: INTRO TO TUTORIAL & REAL APPLICATION */}
      <section className="bg-gradient-to-b from-white via-stone-50 to-stone-100 pt-10 pb-12 sm:pt-14 sm:pb-16 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-red-950 bg-red-50 border border-red-200/80 px-3.5 py-1 rounded-full">
            <Play className="w-3.5 h-3.5 text-red-800 fill-red-800" />
            <span>Pusat Tutorial & Panduan Praktis Kasir Laundry</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            Pelajari Cara Menggunakan Kafelas Laundry Langsung dari Layar Aslinya.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Halaman ini mendemonstrasikan langkah demi langkah penggunaan kasir: mulai dari input cucian kiloan/satuan, cetak struk Bluetooth thermal 58mm, kirim nota otomatis ke WhatsApp pelanggan, hingga pembukuan kas laci.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenKasir}
              className="px-6 py-3 bg-red-950 hover:bg-red-900 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2"
            >
              <span>Masuk ke Aplikasi Kasir Asli</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStartDemo('owner')}
              className="px-5 py-3 bg-white hover:bg-stone-100 text-slate-800 font-bold text-sm rounded-xl border border-stone-300 shadow-sm transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Buka Demo Interaktif dengan Data Contoh</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE TUTORIAL MODULE SELECTOR (5 MODUL UTAMA) */}
      <section className="sticky top-16 sm:top-20 z-40 bg-stone-100/95 backdrop-blur-md border-b border-stone-200 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 sm:justify-center">
            {[
              { id: 'transaksi', label: '1. Input Kasir & Cetak Struk', icon: Receipt },
              { id: 'status', label: '2. Pelacakan Cuci & Staf', icon: Layers },
              { id: 'whatsapp', label: '3. Kirim Nota WhatsApp', icon: Share2 },
              { id: 'bukukas', label: '4. Catat Pengeluaran & Kas Laci', icon: DollarSign },
              { id: 'laporan', label: '5. Ekspor Excel & Laporan A4', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTutorial === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTutorial(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all border shrink-0 ${
                    isActive
                      ? 'bg-red-950 text-white border-red-950 shadow-sm'
                      : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. MAIN INTERACTIVE SIMULATOR & STEP-BY-STEP WORKFLOW */}
      <section className="py-10 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ============================================================ */}
        {/* TUTORIAL 1: INPUT TRANSAKSI BARU & CETAK STRUK BLUETOOTH */}
        {/* ============================================================ */}
        {activeTutorial === 'transaksi' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Step Instructions */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Tutorial Modul 1
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Cara Menginput Pesanan & Mencetak Struk Thermal
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Langkah cepat kasir saat pelanggan datang membawa cucian kotor ke outlet.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">
                      1
                    </span>
                    <span>Timbang Cucian & Masukkan Nama Pelanggan</span>
                  </div>
                  <p className="text-slate-600 pl-8 leading-relaxed text-xs">
                    Ketik nama pelanggan dan nomor WhatsApp. Masukkan berat timbangan dalam kilogram desimal (misal <strong>4.5 kg</strong>) atau jumlah biji satuan.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">
                      2
                    </span>
                    <span>Tentukan Status Pembayaran (Lunas vs DP)</span>
                  </div>
                  <p className="text-slate-600 pl-8 leading-relaxed text-xs">
                    Jika pelanggan langsung melunasi, pilih <strong>Lunas</strong>. Jika membayar uang muka sebagian, masukkan nominal DP dan sistem otomatis mencatat sisa tagihan saat cucian diambil nanti.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">
                      3
                    </span>
                    <span>Simpan & Tekan "Cetak Struk Bluetooth"</span>
                  </div>
                  <p className="text-slate-600 pl-8 leading-relaxed text-xs">
                    Printer thermal Bluetooth (RPP02N / PT-210) akan langsung mencetak struk fisik 58mm berisi logo toko, rincian biaya, dan stempel status pelunasan.
                  </p>
                </div>
              </div>

              {/* Action Trigger */}
              <div className="pt-2">
                <button
                  onClick={() => setSimShowStrukModal(true)}
                  className="w-full py-3 px-4 bg-red-950 hover:bg-red-900 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>Lihat Simulasi Struk Hasil Input Ini</span>
                </button>
              </div>
            </div>

            {/* Right: Realistic Screen Mockup (Formulir Input Kasir) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-7 relative overflow-hidden">
              {/* App Screen Header Bar */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-slate-600 ml-2">
                    Layar Kasir: Tambah Transaksi Baru
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Koneksi Cloud Online
                </span>
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                {/* Pelanggan */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Nama Pelanggan & Kontak
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={simPelanggan}
                      onChange={(e) => setSimPelanggan(e.target.value)}
                      className="py-2 px-3 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-red-950 font-semibold"
                      placeholder="Nama pelanggan..."
                    />
                    <input
                      type="text"
                      defaultValue="081234567890"
                      className="py-2 px-3 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:border-red-950"
                      placeholder="No. WhatsApp..."
                    />
                  </div>
                </div>

                {/* Layanan & Berat */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Item Layanan Cuci</span>
                    <span className="text-[11px] text-slate-500">Kiloan / Satuan</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <select
                        value={simLayanan}
                        onChange={(e) => {
                          setSimLayanan(e.target.value);
                          if (e.target.value.includes('Express')) setSimHargaPerKg(12000);
                          else if (e.target.value.includes('Lipat')) setSimHargaPerKg(6000);
                          else setSimHargaPerKg(8000);
                        }}
                        className="w-full py-2 px-2.5 text-xs bg-white border border-stone-300 rounded-lg font-medium"
                      >
                        <option value="Cuci Kering Setrika">Cuci Kering Setrika (Rp 8.000/kg)</option>
                        <option value="Cuci Kering Lipat">Cuci Kering Lipat (Rp 6.000/kg)</option>
                        <option value="Cuci Kilat Express 1 Hari">Cuci Kilat Express 1 Hari (Rp 12.000/kg)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          value={simBerat}
                          onChange={(e) => setSimBerat(Math.max(0.1, parseFloat(e.target.value) || 0))}
                          className="w-full py-2 px-2.5 text-xs bg-white border border-stone-300 rounded-l-lg font-bold text-right"
                        />
                        <span className="bg-stone-200 text-slate-700 px-2.5 py-2 text-xs font-bold rounded-r-lg border-y border-r border-stone-300">
                          Kg
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-stone-200 text-xs">
                    <span className="text-slate-600">Subtotal Item:</span>
                    <span className="font-bold text-slate-900">
                      {simBerat} kg x Rp {formatNumberOnly(simHargaPerKg)} = <span className="text-red-950 font-black">Rp {formatNumberOnly(simTotalTagihan)}</span>
                    </span>
                  </div>
                </div>

                {/* Status Pembayaran */}
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800">Pembayaran</span>
                    <div className="flex gap-1.5">
                      {(['Tunai', 'QRIS', 'Transfer'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSimMetode(m)}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                            simMetode === m
                              ? 'bg-slate-800 text-white'
                              : 'bg-white text-slate-600 border border-stone-300'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSimBayarLunas(true)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                        simBayarLunas
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                          : 'bg-white text-slate-700 border-stone-300'
                      }`}
                    >
                      Langsung Lunas (Rp {formatNumberOnly(simTotalTagihan)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimBayarLunas(false)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                        !simBayarLunas
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-stone-300'
                      }`}
                    >
                      Bayar DP Sebagian
                    </button>
                  </div>

                  {!simBayarLunas && (
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <span className="text-slate-600 font-medium">Jumlah DP:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Rp</span>
                        <input
                          type="number"
                          step="5000"
                          value={simDp}
                          onChange={(e) => setSimDp(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-28 py-1.5 px-2 bg-white border border-stone-300 rounded font-bold text-right text-xs"
                        />
                      </div>
                      <span className="text-red-700 font-bold">
                        Sisa: Rp {formatNumberOnly(simSisaBayar)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSimShowStrukModal(true);
                      setSimStrukPrinted(false);
                    }}
                    className="flex-1 py-3 bg-red-950 hover:bg-red-900 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-amber-300" />
                    <span>Simpan & Buka Struk Kasir</span>
                  </button>
                </div>
              </div>

              {/* MODAL STRUK SIMULATOR OVERLAY */}
              {simShowStrukModal && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-20 flex items-center justify-center p-3 animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl max-w-xs w-full p-4 shadow-2xl border border-stone-300 font-mono text-xs max-h-[92%] overflow-y-auto">
                    {/* Struk Header */}
                    <div className="text-center pb-2">
                      <div className="font-bold text-xs tracking-wider">KAFELAS LAUNDRY</div>
                      <div className="text-[10px] text-slate-500">Jl. KH Wahid Hasyim No. 45</div>
                      <div className="text-[10px] text-slate-500">Nota No: TR-20261017-089</div>
                    </div>

                    <div className="border-t border-dashed border-stone-400 my-1.5" />

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between">
                        <span>Pelanggan:</span>
                        <span className="font-bold">{simPelanggan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tgl:</span>
                        <span>17/10/2026 14:30</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-stone-400 my-1.5" />

                    <div className="text-[10px] space-y-1">
                      <div className="font-bold">{simLayanan}</div>
                      <div className="flex justify-between text-slate-600">
                        <span>{simBerat} kg x {formatNumberOnly(simHargaPerKg)}</span>
                        <span className="font-bold text-slate-900">= {formatNumberOnly(simTotalTagihan)}</span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-stone-400 my-1.5" />

                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between font-bold text-xs">
                        <span>Total:</span>
                        <span>Rp {formatNumberOnly(simTotalTagihan)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bayar ({simMetode}):</span>
                        <span>Rp {formatNumberOnly(simDpAktual)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Sisa:</span>
                        <span className={simSisaBayar === 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {simSisaBayar === 0 ? 'LUNAS' : `Rp ${formatNumberOnly(simSisaBayar)}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 py-1 border border-dashed rounded text-center text-[10px] font-black uppercase">
                      {simSisaBayar === 0 ? (
                        <span className="text-emerald-700">★ SUDAH LUNAS ★</span>
                      ) : (
                        <span className="text-amber-800">BELUM LUNAS (SISA Rp {formatNumberOnly(simSisaBayar)})</span>
                      )}
                    </div>

                    {/* Struk Actions */}
                    <div className="mt-3 pt-2 border-t border-stone-200 space-y-1.5 font-sans">
                      <button
                        onClick={() => setSimStrukPrinted(true)}
                        className={`w-full py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                          simStrukPrinted
                            ? 'bg-emerald-700 text-white'
                            : 'bg-red-950 text-white hover:bg-red-900'
                        }`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{simStrukPrinted ? '✓ Terkirim ke Printer Bluetooth' : 'Uji Cetak Bluetooth 58mm'}</span>
                      </button>

                      <button
                        onClick={() => setSimShowStrukModal(false)}
                        className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        Tutup Struk
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TUTORIAL 2: PELACAKAN STATUS CUCIAN & PENUGASAN STAF */}
        {/* ============================================================ */}
        {activeTutorial === 'status' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Tutorial Modul 2
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Memperbarui Status Cuci & Menugaskan Staf
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Pantau setiap tahap pengerjaan cucian pelanggan secara berurutan agar pakaian tidak tertukar dan tepat waktu.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>5 Tahap Pengerjaan Resmi</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Setiap transaksi otomatis memiliki indikator status: <strong>Diterima &rarr; Dicuci &rarr; Pengeringan &rarr; Penyetrikaan &rarr; Siap Diambil &rarr; Selesai</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Tugaskan Nama Karyawan / Staf</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Kasir atau owner dapat memilih siapa karyawan yang mencuci atau menyetrika. Memudahkan evaluasi jika ada komplain cucian kusut atau kurang wangi.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Notifikasi Siap Diambil</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Saat status berpindah ke <strong>"Siap Diambil"</strong>, nomor nota akan disorot hijau di kasir untuk memudahkan penyerahan saat pelanggan datang.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Status Tracker Interactive UI Mockup */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-7 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">Nota: TR-20261017-001 (Ibu Ratna Dewi)</div>
                  <div className="text-[11px] text-slate-500">4.5 kg Cuci Kering Setrika · Target: 19 Okt 2026</div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusTahapList[simStatusStep].color}`}>
                    {statusTahapList[simStatusStep].label}
                  </span>
                </div>
              </div>

              {/* Step Progress Visual Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Progres Pengerjaan:</span>
                  <span>{Math.round(((simStatusStep) / 5) * 100)}% Selesai</span>
                </div>

                <div className="grid grid-cols-6 gap-1.5">
                  {statusTahapList.map((st, i) => (
                    <div
                      key={st.id}
                      onClick={() => setSimStatusStep(i)}
                      className={`h-2.5 rounded-full cursor-pointer transition-all ${
                        i <= simStatusStep ? 'bg-red-950' : 'bg-stone-200 hover:bg-stone-300'
                      }`}
                      title={st.label}
                    />
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      Tahap Saat Ini: <span className="text-red-950">{statusTahapList[simStatusStep].label}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {statusTahapList[simStatusStep].desc}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimStatusStep((prev) => Math.min(5, prev + 1))}
                    disabled={simStatusStep >= 5}
                    className="px-3.5 py-2 bg-red-950 text-white rounded-lg text-xs font-bold hover:bg-red-900 disabled:opacity-40 transition flex items-center gap-1"
                  >
                    <span>Lanjut Tahap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Staff Assignment Box */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-slate-600" />
                    <span>Petugas / Staf yang Mengerjakan</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Aktif: {simStaffName}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['Siti (Operasional)', 'Ahmad (Dryer)', 'Budi (Setrika)'].map((stf) => (
                    <button
                      key={stf}
                      onClick={() => setSimStaffName(stf)}
                      className={`py-2 px-2.5 rounded-lg font-bold border transition ${
                        simStaffName === stf
                          ? 'bg-red-950 text-white border-red-950'
                          : 'bg-white text-slate-700 border-stone-300 hover:bg-stone-100'
                      }`}
                    >
                      {stf}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TUTORIAL 3: KIRIM NOTA DIGITAL KE WHATSAPP PELANGGAN */}
        {/* ============================================================ */}
        {activeTutorial === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Tutorial Modul 3
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Kirim Nota Struk WhatsApp Otomatis Sekali Klik
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Tidak perlu lagi mengetik rincian nota satu per satu secara manual di WhatsApp.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Buka Transaksi & Tekan "Kirim WA"</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Di setiap nota, ada tombol hijau <strong>"Kirim WA"</strong>. Begitu diklik, aplikasi langsung mengonversi data transaksi menjadi pesan nota WhatsApp resmi.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Teks Rapi Siap Kirim</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Aplikasi WhatsApp di HP atau WhatsApp Web di PC langsung terbuka dengan nomor telepon tujuan dan pesan yang terisi lengkap tanpa salah ketik.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Simulated WhatsApp Chat Message */}
            <div className="lg:col-span-7 bg-[#EFEAE2] rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-7 relative overflow-hidden">
              <div className="flex items-center gap-3 pb-3 mb-4 border-b border-stone-300/80 bg-white/80 -mx-5 -mt-5 px-5 pt-4">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  KL
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Kafelas Laundry Official</div>
                  <div className="text-[10px] text-emerald-700">Online · Layanan WhatsApp Pelanggan</div>
                </div>
              </div>

              {/* Chat Bubble Simulation */}
              <div className="max-w-md ml-auto bg-white rounded-2xl rounded-tr-xs p-4 shadow-sm font-mono text-xs text-slate-800 space-y-2 border border-emerald-100">
                <div className="font-bold text-sm text-slate-900">
                  🧺 *NOTA ELEKTRONIK KAFELAS LAUNDRY*
                </div>
                <div className="text-slate-500 text-[11px]">
                  Halo *Ibu Ratna Dewi*, terima kasih telah mencuci di Kafelas Laundry!
                </div>
                <div className="border-t border-dashed border-stone-300 my-1.5" />
                
                <div className="space-y-1 text-[11px]">
                  <div>📄 *No. Transaksi:* TR-20261017-001</div>
                  <div>📅 *Tgl Masuk:* 17 Oktober 2026 10:30</div>
                  <div>⏳ *Estimasi Selesai:* 19 Oktober 2026</div>
                </div>

                <div className="border-t border-dashed border-stone-300 my-1.5" />

                <div className="text-[11px] space-y-0.5">
                  <div>*Rincian Layanan:*</div>
                  <div>• Cuci Kering Setrika (4.5 kg x Rp 8.000) = *Rp 36.000*</div>
                  <div>• Bed Cover Besar (1 pcs x Rp 25.000) = *Rp 25.000*</div>
                </div>

                <div className="border-t border-dashed border-stone-300 my-1.5" />

                <div className="space-y-1 text-xs">
                  <div>💰 *Total Tagihan:* Rp 61.000</div>
                  <div>💵 *Pembayaran Awal:* Rp 61.000 (Lunas)</div>
                  <div className="text-emerald-700 font-bold">✅ *STATUS: SUDAH LUNAS*</div>
                </div>

                <div className="text-[10px] text-slate-500 pt-2 border-t border-stone-200">
                  _Simpan nota elektronik ini sebagai bukti pengambilan cucian._<br />
                  Lokasi: Jl. KH Wahid Hasyim No. 45
                </div>

                <div className="text-right text-[9px] text-slate-400 pt-1">
                  10:31 ✓✓
                </div>
              </div>

              {/* Interactive Copy Simulation */}
              <div className="mt-4 pt-3 flex justify-end">
                <button
                  onClick={() => {
                    setSimWaCopied(true);
                    setTimeout(() => setSimWaCopied(false), 2000);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{simWaCopied ? 'Teks WhatsApp Tersalin!' : 'Salin Format Teks WhatsApp'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TUTORIAL 4: PEMBUKUAN ARUS KAS & PENGELUARAN HARIAN */}
        {/* ============================================================ */}
        {activeTutorial === 'bukukas' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Tutorial Modul 4
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Pencatatan Buku Kas & Pengeluaran Harian
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Menjaga agar uang fisik di laci kasir selalu cocok dengan pembukuan sistem tanpa ada uang yang raib.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Kas Masuk Otomatis dari Transaksi</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Setiap pelanggan membayar cucian tunai atau DP, nominalnya langsung masuk ke catatan kas harian tanpa perlu dicatat manual.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Catat Biaya Operasional Toko</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Jika ada pembelian deterjen, pewangi, plastik kresek, gas elpiji, token listrik, atau uang makan karyawan, kasir cukup membuka menu <strong>"Atur Kas"</strong> &rarr; <strong>"Catat Pengeluaran"</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">3</span>
                    <span>Tutup Shift & Hitung Sisa Kas</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Di akhir hari atau pergantian shift kasir, sistem menyajikan rekapitulasi: Total Masuk - Total Keluar = Sisa Kas Riil Laci.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Buku Kas UI Mockup */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="text-xs font-bold text-slate-900">Buku Kas Harian: 17 Oktober 2026</div>
                <span className="text-[10px] font-bold text-slate-600 bg-stone-100 px-2 py-0.5 rounded">
                  Shift Pagi - Siang
                </span>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] font-bold text-emerald-800 uppercase">Total Masuk</div>
                  <div className="text-sm sm:text-base font-black text-emerald-900 mt-1">Rp 480.000</div>
                  <div className="text-[10px] text-emerald-700">12 Transaksi</div>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[10px] font-bold text-rose-800 uppercase">Total Keluar</div>
                  <div className="text-sm sm:text-base font-black text-rose-900 mt-1">
                    Rp {formatNumberOnly(simPengeluaranAdded ? 65000 + 40000 : 40000)}
                  </div>
                  <div className="text-[10px] text-rose-700">{simPengeluaranAdded ? '2 Pengeluaran' : '1 Pengeluaran'}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 text-white">
                  <div className="text-[10px] font-bold text-amber-400 uppercase">Kas Laci Riil</div>
                  <div className="text-sm sm:text-base font-black text-white mt-1">
                    Rp {formatNumberOnly(480000 - (simPengeluaranAdded ? 65000 + 40000 : 40000))}
                  </div>
                  <div className="text-[10px] text-slate-300">Siap Setor</div>
                </div>
              </div>

              {/* Input Pengeluaran Simulation Form */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <div className="text-xs font-bold text-slate-900">Uji Coba Form Catat Pengeluaran:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-bold">Kategori:</label>
                    <select
                      value={simKategoriPengeluaran}
                      onChange={(e) => setSimKategoriPengeluaran(e.target.value)}
                      className="w-full py-1.5 px-2.5 bg-white border border-stone-300 rounded font-medium"
                    >
                      <option value="Deterjen & Pewangi">Deterjen & Pewangi</option>
                      <option value="Plastik & Hanger">Plastik Packing & Hanger</option>
                      <option value="Listrik & Air">Listrik, Gas & Air</option>
                      <option value="Operasional / Staf">Uang Makan / Staf</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1 font-bold">Nominal (Rp):</label>
                    <input
                      type="number"
                      step="5000"
                      value={simNominalPengeluaran}
                      onChange={(e) => setSimNominalPengeluaran(parseInt(e.target.value) || 0)}
                      className="w-full py-1.5 px-2.5 bg-white border border-stone-300 rounded font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 mb-1 font-bold">Keterangan Belanja:</label>
                  <input
                    type="text"
                    value={simCatatanPengeluaran}
                    onChange={(e) => setSimCatatanPengeluaran(e.target.value)}
                    className="w-full py-1.5 px-2.5 bg-white border border-stone-300 rounded text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSimPengeluaranAdded(true)}
                  className="w-full py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>{simPengeluaranAdded ? '✓ Pengeluaran Tersimpan di Kas' : 'Simpan Pengeluaran Ini'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TUTORIAL 5: EKSPOR LAPORAN EXCEL & CETAK PDF A4 RESMI */}
        {/* ============================================================ */}
        {activeTutorial === 'laporan' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-red-950 uppercase tracking-wider">
                  Tutorial Modul 5
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Ekspor Laporan Excel (.xlsx) & Cetak PDF A4
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  Laporan keuangan rapi berstandar akuntansi untuk arsip bulanan, laporan ke mitra usaha, atau audit pajak.
                </p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">1</span>
                    <span>Ekspor File Excel (.xlsx) Resmi</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Sistem meng-generate file spreadsheet Excel asli yang memuat daftar nota, berat kiloan, pendapatan kotor, daftar pengeluaran, dan laba bersih per tanggal.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1.5">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-950 flex items-center justify-center text-xs shrink-0">2</span>
                    <span>Cetak PDF Laporan A4 Siap Tanda Tangan</span>
                  </div>
                  <p className="text-slate-600 pl-8 text-xs leading-relaxed">
                    Format cetak PDF berukuran kertas A4 lengkap dengan kop surat resmi laundry, rekapitulasi performa layanan terlaris, dan kolom tanda tangan Pemilik Toko & Kasir.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Laporan Preview Mockup */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-300 shadow-lg p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="text-xs font-bold text-slate-900">Pratinjau Dokumen Laporan Keuangan</div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <FileSpreadsheet className="w-3 h-3 text-emerald-700" />
                    <span>Excel Ready</span>
                  </span>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-rose-700" />
                    <span>PDF A4</span>
                  </span>
                </div>
              </div>

              {/* Table Preview Simulation */}
              <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-slate-700 font-bold border-b border-stone-200 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">No. Nota</th>
                      <th className="py-2 px-3">Pelanggan</th>
                      <th className="py-2 px-3">Layanan</th>
                      <th className="py-2 px-3 text-right">Total</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-[11px] text-slate-700">
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">TR-261017-001</td>
                      <td className="py-2 px-3">Ibu Ratna Dewi</td>
                      <td className="py-2 px-3">Cuci Kering Setrika (4.5kg)</td>
                      <td className="py-2 px-3 text-right font-bold">Rp 61.000</td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-bold">Lunas</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">TR-261017-002</td>
                      <td className="py-2 px-3">Pak Hendra</td>
                      <td className="py-2 px-3">Bed Cover King (2pcs)</td>
                      <td className="py-2 px-3 text-right font-bold">Rp 50.000</td>
                      <td className="py-2 px-3 text-center text-amber-700 font-bold">DP 25rb</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-mono font-bold">TR-261017-003</td>
                      <td className="py-2 px-3">Mbak Fitri</td>
                      <td className="py-2 px-3">Cuci Kering Lipat (6kg)</td>
                      <td className="py-2 px-3 text-right font-bold">Rp 36.000</td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-bold">Lunas</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Download buttons simulation */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={onOpenKasir}
                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>Unduh Contoh Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenKasir}
                  className="py-2.5 px-3 bg-red-950 hover:bg-red-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4 text-amber-200" />
                  <span>Cetak PDF Laporan A4</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </section>

      {/* 5. CHEAT SHEET: 5 MENIT MAHIR UNTUK KASIR BARU */}
      <section className="py-14 sm:py-20 bg-white border-t border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-950 mb-2">
              Panduan Pegawai & Kasir
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Panduan Cepat Kasir Baru: 5 Menit Langsung Bisa
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Bimbingan kilat untuk karyawan baru di outlet Anda agar langsung percaya diri melayani pelanggan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-950 flex items-center justify-center font-bold text-xs">
                A
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pelanggan Baru Datang
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Timbang cucian &rarr; Buka "+ Transaksi Baru" &rarr; Masukkan nama & nomor WA &rarr; Pilih layanan & berat &rarr; Tekan "Simpan & Cetak".
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-950 flex items-center justify-center font-bold text-xs">
                B
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pelanggan Ambil Cucian
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ketik nama pelanggan di kolom pencarian &rarr; Cek sisa pembayaran &rarr; Terima uang pelunasan &rarr; Tekan tombol "Ambil / Lunas".
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-950 flex items-center justify-center font-bold text-xs">
                C
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Kertas Thermal Habis / Cetak Ulang
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Buka transaksi di dashboard &rarr; Klik tombol ikon printer &rarr; Struk akan otomatis dicetak ulang tanpa mengulang transaksi.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-100 text-red-950 flex items-center justify-center font-bold text-xs">
                D
              </div>
              <h3 className="font-bold text-slate-900 text-sm">
                Jika Internet / Listrik Mati
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tetap input pesanan seperti biasa! Aplikasi bekerja 100% offline via IndexedDB. Begitu internet aktif, data otomatis tersinkron ke cloud.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PANDUAN KONEKSI HARDWARE PRINTER BLUETOOTH */}
      <section className="py-14 sm:py-20 bg-stone-100 border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-red-950">
              Hardware Setup
            </h2>
            <p className="text-2xl sm:text-3xl font-black text-slate-900">
              Panduan Menghubungkan Printer Bluetooth Thermal
            </p>
            <p className="text-xs sm:text-sm text-slate-600">
              Kompatibel dengan semua printer thermal ukuran 58mm & 80mm yang umum di pasaran (RPP02N, PT-210, Panda, ZJ-58, MPT-II, Iware).
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-300 shadow-sm space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <ol className="list-decimal list-inside space-y-2.5">
              <li>
                <strong>Nyalakan Printer:</strong> Pastikan baterai terisi atau kabel adaptor terhubung, dan kertas struk terpasang menghadap ke atas.
              </li>
              <li>
                <strong>Pairing Bluetooth:</strong> Buka pengaturan Bluetooth di HP atau laptop kasir Anda, cari nama printer (misal <em>RPP02N</em>, <em>MPT-II</em>, atau <em>Bluetooth Printer</em>), lalu masukkan PIN pairing (biasanya <strong>0000</strong> atau <strong>1234</strong>).
              </li>
              <li>
                <strong>Buka Kafelas Laundry:</strong> Masuk ke aplikasi, buka transaksi apa saja, lalu klik tombol <strong>"Cetak Bluetooth"</strong>.
              </li>
              <li>
                <strong>Pilih Printer:</strong> Dialog browser akan memunculkan printer yang aktif. Pilih printer Anda sekali saja. Selanjutnya, sistem akan mengingat printer dan otomatis mencetak instan tanpa perlu pairing ulang!
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CALL TO ACTION */}
      <section className="py-16 sm:py-20 bg-red-950 text-white text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <h2 className="text-2xl sm:text-4xl font-black">
            Mulai Gunakan Kafelas Laundry Sekarang
          </h2>
          <p className="text-stone-300 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Akses langsung melalui peramban web di kafelaslaundry.web.app tanpa instalasi berbayar, atau gunakan file APK Android untuk outlet Anda.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onOpenKasir}
              className="px-8 py-3.5 bg-white text-red-950 font-black rounded-xl shadow-lg hover:bg-stone-100 transition text-sm"
            >
              Buka Aplikasi Kasir Sekarang
            </button>
            <button
              onClick={() => onStartDemo('owner')}
              className="px-6 py-3.5 bg-red-900/60 hover:bg-red-900 text-white border border-red-800 font-bold rounded-xl transition text-sm"
            >
              Uji Coba Data Demo
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-stone-900 text-stone-400 py-8 text-xs border-t border-stone-800 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; 2026 Kafelas Laundry — Sistem POS, Kasir, & Manajemen Operasional Laundry Indonesia.</p>
        </div>
      </footer>
    </div>
  );
};
