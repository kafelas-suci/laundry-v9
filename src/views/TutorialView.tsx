import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import {
  Printer,
  Share2,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Activity,
  Store,
  RotateCcw,
  Settings as SettingsIcon,
  Search,
  Plus,
  DollarSign,
  FileText,
  ArrowLeft,
  Check,
  X,
  CheckCheck,
  Send,
  HelpCircle,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { DEFAULT_KAFELA_LOGO_BASE64 } from '../utils/defaultLogo';

interface TutorialViewProps {
  onOpenKasir?: () => void;
  onStartDemo?: (role?: 'owner' | 'karyawan') => void;
  onOpenLandingPage?: () => void;
}

export interface CalloutItem {
  id: string;
  num: number;
  side: 'left' | 'right';
  title: string;
  handwrittenNote: string;
  desc: string;
  targetCategory?: string;
}

export type LineStyle = 'bezier' | 'orthogonal' | 'straight';

export const TutorialView: React.FC<TutorialViewProps> = ({
  onOpenKasir,
  onStartDemo,
  onOpenLandingPage,
}) => {
  // Screen Tabs
  const [activeScreenTab, setActiveScreenTab] = useState<'screen1' | 'screen2' | 'screen3' | 'screen4'>('screen1');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showAllLines, setShowAllLines] = useState<boolean>(true);
  const [animatedLines, setAnimatedLines] = useState<boolean>(true);
  const [lineStyle, setLineStyle] = useState<LineStyle>('bezier');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // References for measuring SVG connector lines
  const containerRef = useRef<HTMLDivElement>(null);
  const cardPinRefs = useRef<Record<string, HTMLElement | null>>({});
  const targetPinRefs = useRef<Record<string, HTMLElement | null>>({});

  // Computed lines state: Array of { id, num, x1, y1, x2, y2, side }
  const [lineCoords, setLineCoords] = useState<
    Array<{
      id: string;
      num: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      side: 'left' | 'right';
    }>
  >([]);

  // Function to register card pin ref
  const setCardPinRef = (id: string, el: HTMLElement | null) => {
    cardPinRefs.current[id] = el;
  };

  // Function to register target pin ref
  const setTargetPinRef = (id: string, el: HTMLElement | null) => {
    targetPinRefs.current[id] = el;
  };

  // ==========================================
  // DEFINISI CALLOUT TIAP SCREEN
  // Terurut presisi vertikal dari atas ke bawah
  // Sisi Kiri (1 - 4) & Sisi Kanan (5 - 8)
  // Tidak ada garis menyilang (Zero Cross-over)
  // ==========================================

  // Screen 1: Dashboard Kasir
  const screen1Callouts: CalloutItem[] = [
    {
      id: 's1_arsip',
      num: 1,
      side: 'left',
      title: 'Ikon Arsip / Laci Toko',
      handwrittenNote: 'Buka riwayat transaksi lama & nota yang sudah diambil',
      desc: 'Membuka arsip transaksi bulan lalu, pencarian nota masa lampau, dan filter status arsip.',
    },
    {
      id: 's1_search',
      num: 2,
      side: 'left',
      title: 'Kotak Cari Pelanggan & Nota',
      handwrittenNote: 'Ketik nama pelanggan untuk langsung temukan cucian',
      desc: 'Pencarian instan berdasarkan nama pelanggan atau 6 digit nomor nota transaksi.',
    },
    {
      id: 's1_status',
      num: 3,
      side: 'left',
      title: 'Status Lunas vs Belum Lunas',
      handwrittenNote: 'Hijau = Lunas. Merah = ada sisa tagihan saat ambil',
      desc: 'Memudahkan kasir membedakan mana pakaian yang sudah bayar dan mana yang masih berhutang.',
    },
    {
      id: 's1_bottom_nav',
      num: 4,
      side: 'left',
      title: 'Bilah Navigasi Cepat',
      handwrittenNote: 'Bilah bawah untuk menu: Status, Keuangan, Kas, & Laporan',
      desc: 'Navigasi satu jempol untuk berpindah antar fungsi utama operasional laundry.',
    },
    {
      id: 's1_settings',
      num: 5,
      side: 'right',
      title: 'Sinkron Cloud & Pengaturan',
      handwrittenNote: 'Ikon putar = sinkron data. Roda gigi = tarif & profil toko',
      desc: 'Konfigurasi lengkap nama toko, printer Bluetooth, logo struk, dan harga layanan per kilo/pcs.',
    },
    {
      id: 's1_badges',
      num: 6,
      side: 'right',
      title: 'Lencana Antrean Cucian',
      handwrittenNote: 'Angka 2 merah = 2 nota cucian sedang dalam pengerjaan',
      desc: 'Indikator beban kerja cucian di outlet secara real-time tanpa perlu membuka buku catatan.',
    },
    {
      id: 's1_rekap_laba',
      num: 7,
      side: 'right',
      title: 'Kartu Rekapitulasi Laba Harian',
      handwrittenNote: 'Otomatis hitung omzet, belanja kasir, & laba bersih hari ini',
      desc: 'Owner dan kasir langsung mengetahui omzet harian bersih (Rp 17.000) tanpa hitung manual.',
    },
    {
      id: 's1_plus_btn',
      num: 8,
      side: 'right',
      title: 'Tombol Tambah Transaksi (+)',
      handwrittenNote: 'Tombol bulat merah di tengah untuk buat nota baru kilat',
      desc: 'Pintu utama kasir memasukkan pesanan cucian kiloan atau satuan dengan cepat saat pelanggan datang.',
    },
  ];

  // Screen 2: Formulir Transaksi Baru
  const screen2Callouts: CalloutItem[] = [
    {
      id: 's2_nama',
      num: 1,
      side: 'left',
      title: 'Nama Pelanggan & Alamat',
      handwrittenNote: 'Ketik nama pelanggan (misal: Iqbal). Alamat untuk antar jemput',
      desc: 'Sistem otomatis mengingat data pelanggan langganan yang pernah mencuci sebelumnya.',
    },
    {
      id: 's2_layanan',
      num: 2,
      side: 'left',
      title: 'Pilih Layanan & Tambah (+)',
      handwrittenNote: 'Pilih paket di dropdown, isi berat (Kg/pcs), lalu klik tombol hijau (+)',
      desc: 'Bisa pilih Cuci Setrika, Setrika Saja, Cuci Kering, Jas, Bedcover, Karpet, dll.',
    },
    {
      id: 's2_daftar_item',
      num: 3,
      side: 'left',
      title: 'Daftar Item Multi-Layanan',
      handwrittenNote: 'Bisa gabung Kiloan (14 Kg) + Satuan Jas (1 pcs) dalam 1 nota!',
      desc: 'Setiap item memiliki subtotal harga dan rincian pengerjaan yang transparan.',
    },
    {
      id: 's2_catatan',
      num: 4,
      side: 'left',
      title: 'Catatan Khusus Pakaian',
      handwrittenNote: 'Tulis pesan: "Parfum mawar", "Baju putih pisah", "Kancing lepas"',
      desc: 'Catatan ini otomatis tercetak di struk pengerjaan karyawan agar tidak keliru di bagian cuci.',
    },
    {
      id: 's2_total_tagihan',
      num: 5,
      side: 'right',
      title: 'Total Tagihan Otomatis',
      handwrittenNote: 'Total dihitung seketika Rp 99.000, bebas salah hitung kasir',
      desc: 'Menjumlahkan semua kiloan dan satuan secara presisi hingga digit terakhir.',
    },
    {
      id: 's2_status_lunas',
      num: 6,
      side: 'right',
      title: 'Centang Status Pelunasan',
      handwrittenNote: 'Centang "Lunas" jika pelanggan langsung bayar di depan',
      desc: 'Jika tidak dicentang, nota otomatis berstatus Belum Lunas dan tercatat sebagai piutang.',
    },
    {
      id: 's2_metode_qris',
      num: 7,
      side: 'right',
      title: 'Metode Non-Tunai / QRIS',
      handwrittenNote: 'Centang Non-Tunai untuk scan QRIS atau transfer bank BCA/Mandiri',
      desc: 'Memisahkan pembukuan uang fisik di laci dengan uang digital di rekening bank pemilik.',
    },
    {
      id: 's2_btn_simpan',
      num: 8,
      side: 'right',
      title: 'Tombol Simpan Transaksi',
      handwrittenNote: 'Klik untuk simpan ke cloud & langsung buka lembar struk cetak!',
      desc: 'Proses penyimpanan kilat dengan sinkronisasi offline-first otomatis.',
    },
  ];

  // Screen 3: Lembar Struk & Cetak Bluetooth
  const screen3Callouts: CalloutItem[] = [
    {
      id: 's3_kop_toko',
      num: 1,
      side: 'left',
      title: 'Kop Struk & Logo Resmi',
      handwrittenNote: 'Logo Kafela, nama toko, nomor telepon, & alamat outlet tercetak di atas',
      desc: 'Membuat tampilan struk sangat profesional dan dipercaya oleh pelanggan.',
    },
    {
      id: 's3_nomor_nota',
      num: 2,
      side: 'left',
      title: 'Nomor Nota Transaksi',
      handwrittenNote: 'Kode unik 261015/1 untuk penanda gantungan rak cucian',
      desc: 'Memudahkan karyawan mencari pakaian saat pelanggan datang mengambil.',
    },
    {
      id: 's3_waktu_terima',
      num: 3,
      side: 'left',
      title: 'Jadwal Terima & Jadi',
      handwrittenNote: 'Mencatat jam masuk cucian & tanggal estimasi siap diambil',
      desc: 'Menghindari komplain keterlambatan dan menjaga ketepatan waktu pengerjaan.',
    },
    {
      id: 's3_btn_bluetooth',
      num: 4,
      side: 'left',
      title: 'Tombol Cetak Bluetooth (58mm)',
      handwrittenNote: 'Tombol merah utama: langsung cetak ke thermal printer 1 detik!',
      desc: 'Mendukung printer Bluetooth mini portabel (RPP02N, PT-210, Panda, VSC, dll) tanpa kabel.',
    },
    {
      id: 's3_nama_status',
      num: 5,
      side: 'right',
      title: 'Nama & Teks BELUM LUNAS',
      handwrittenNote: 'Dicetak TEBAL: "BELUM LUNAS Rp. 7.000,-" agar kasir tidak lupa tagih',
      desc: 'Peringatan sangat kontras di tengah lembar nota agar uang kas selalu aman.',
    },
    {
      id: 's3_rincian_biaya',
      num: 6,
      side: 'right',
      title: 'Rincian Transaksi & Sisa Bayar',
      handwrittenNote: 'Kalkulasi rinci tarif per kilo, total tagihan, dan sisa belum lunas',
      desc: 'Transparansi harga yang membuat pelanggan puas dan percaya dengan hitungan toko.',
    },
    {
      id: 's3_aturan_toko',
      num: 7,
      side: 'right',
      title: 'Peraturan Pengambilan Cucian',
      handwrittenNote: 'Aturan: "Pakaian tidak diambil lebih dari 3 bulan akan disedekahkan"',
      desc: 'Melindungi pemilik laundry dari tumpukan pakaian mati yang ditinggalkan pemiliknya.',
    },
    {
      id: 's3_btn_bagikan',
      num: 8,
      side: 'right',
      title: 'Tombol Bagikan Struk WhatsApp',
      handwrittenNote: 'Kirim nota digital langsung ke nomor WhatsApp pelanggan',
      desc: 'Hemat kertas thermal, ramah lingkungan, dan pelanggan selalu punya arsip digital di HP.',
    },
  ];

  // Screen 4: Status Pengerjaan & Serah Terima
  const screen4Callouts: CalloutItem[] = [
    {
      id: 's4_tab_status',
      num: 1,
      side: 'left',
      title: 'Tab Status Pengerjaan',
      handwrittenNote: 'Filter cepat: Antrean, Cuci, Kering, Setrika, Selesai, & Diambil',
      desc: 'Memantau posisi seluruh pakaian di setiap pos kerja laundry secara akurat.',
    },
    {
      id: 's4_info_pelanggan',
      num: 2,
      side: 'left',
      title: 'Kartu Cucian & Rincian Item',
      handwrittenNote: 'Lihat daftar pakaian pelanggan, berat cucian, dan catatan parfum',
      desc: 'Informasi lengkap bagi karyawan bagian produksi tanpa perlu bolak-balik tanya kasir.',
    },
    {
      id: 's4_estimasi_waktu',
      num: 3,
      side: 'left',
      title: 'Indikator Batas Waktu (SLA)',
      handwrittenNote: 'Tanda jam kuning/merah jika cucian mendekati batas waktu',
      desc: 'Mencegah pakaian terlambat dicuci atau disetrika sehingga pelanggan tetap puas.',
    },
    {
      id: 's4_btn_next_step',
      num: 4,
      side: 'left',
      title: 'Tombol Naikkan Status Cucian',
      handwrittenNote: 'Klik tombol hijau untuk memindahkan: Cuci -> Kering -> Setrika',
      desc: 'Memperbarui progres cucian secara seketika dan tercatat di timeline pengerjaan.',
    },
    {
      id: 's4_outlet_badge',
      num: 5,
      side: 'right',
      title: 'Lencana Posisi Outlet',
      handwrittenNote: 'Penanda lokasi cabang workshop cucian yang sedang aktif',
      desc: 'Mendukung multi-cabang sehingga pemilik dapat memfilter cucian berdasarkan outlet produksi.',
    },
    {
      id: 's4_status_badge',
      num: 6,
      side: 'right',
      title: 'Lencana Tahap Pengerjaan',
      handwrittenNote: 'Label kuning terang menandakan pakaian sedang di mesin cuci',
      desc: 'Karyawan langsung mengenali pos cucian: Cuci (kuning), Kering (biru), Setrika (oranye), Siap (hijau).',
    },
    {
      id: 's4_pilih_staff',
      num: 7,
      side: 'right',
      title: 'Pilih Kasir / Staff Bertugas',
      handwrittenNote: 'Catat siapa karyawan yang mencuci atau menyetrika cucian ini',
      desc: 'Menciptakan akuntabilitas kerja staf: siapa yang mengerjakan dan bertanggung jawab.',
    },
    {
      id: 's4_btn_wa_selesai',
      num: 8,
      side: 'right',
      title: 'Kirim WA "Cucian Siap Diambil"',
      handwrittenNote: 'Otomatis kirim pesan WhatsApp ke pelanggan bahwa cucian siap',
      desc: 'Pelanggan segera datang mengambil dan melunasi pembayaran tanpa perlu ditelepon manual.',
    },
  ];

  const screenCallouts = {
    screen1: screen1Callouts,
    screen2: screen2Callouts,
    screen3: screen3Callouts,
    screen4: screen4Callouts,
  };

  const currentCallouts = screenCallouts[activeScreenTab];

  // ==========================================
  // KALKULASI PRESISI KOORDINAT GARIS PENGHUBUNG
  // Mengukur titik tengah persis (center to center)
  // dari dot kartu ke pin target di layar telepon
  // ==========================================
  const updateLinePositions = () => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newCoords: Array<{
      id: string;
      num: number;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      side: 'left' | 'right';
    }> = [];

    const activeList = screenCallouts[activeScreenTab] || [];

    activeList.forEach((item) => {
      const cardPin = cardPinRefs.current[item.id];
      const targetPin = targetPinRefs.current[item.id];

      if (cardPin && targetPin) {
        const cardPinRect = cardPin.getBoundingClientRect();
        const targetPinRect = targetPin.getBoundingClientRect();

        // Titik pusat persis pin kartu
        const x1 = cardPinRect.left + cardPinRect.width / 2 - containerRect.left;
        const y1 = cardPinRect.top + cardPinRect.height / 2 - containerRect.top;

        // Titik pusat persis pin target
        const x2 = targetPinRect.left + targetPinRect.width / 2 - containerRect.left;
        const y2 = targetPinRect.top + targetPinRect.height / 2 - containerRect.top;

        newCoords.push({
          id: item.id,
          num: item.num,
          x1,
          y1,
          x2,
          y2,
          side: item.side,
        });
      }
    });

    setLineCoords(newCoords);
  };

  // Re-sync saat tab ganti, window resize, atau container di-resize
  useLayoutEffect(() => {
    // Jalankan segera
    updateLinePositions();

    // Jalankan ulang setelah rendering selesai & font siap
    const timer1 = setTimeout(updateLinePositions, 50);
    const timer2 = setTimeout(updateLinePositions, 200);

    const handleResize = () => {
      updateLinePositions();
    };

    window.addEventListener('resize', handleResize);

    // ResizeObserver untuk mendeteksi perubahan ukuran kontainer secara real-time
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateLinePositions();
      });
      resizeObserver.observe(containerRef.current);
    }

    if (document.fonts) {
      document.fonts.ready.then(updateLinePositions);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [activeScreenTab]);

  // Efek toast feedback interaktif
  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback((curr) => (curr === msg ? null : curr));
    }, 2800);
  };

  // Render SVG Path sesuai gaya (Bézier, Orthogonal/Siku, Straight)
  const getPathData = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    side: 'left' | 'right'
  ): string => {
    if (lineStyle === 'straight') {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    if (lineStyle === 'orthogonal') {
      // Siku horizontal lalu vertikal lalu horizontal
      const midX = (x1 + x2) / 2;
      return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    }

    // Default: Bézier Halus Organik
    const dx = Math.abs(x2 - x1);
    const curvature = Math.min(dx * 0.5, 140);
    const cp1x = side === 'left' ? x1 + curvature : x1 - curvature;
    const cp1y = y1;
    const cp2x = side === 'left' ? x2 - curvature : x2 + curvature;
    const cp2y = y2;
    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  };

  return (
    <div className="min-h-screen bg-stone-100 text-slate-800 font-sans selection:bg-[#800000] selection:text-white">
      {/* Google Web Fonts for Handwritten Callout Style */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Kalam:wght@700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      {/* 1. TOP HEADER NAVIGATION */}
      <header className="sticky top-0 z-50 bg-[#800000] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src={`data:image/png;base64,${DEFAULT_KAFELA_LOGO_BASE64}`}
                alt="Logo Kafela's Laundry"
                className="w-full h-full object-contain invert"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base sm:text-xl tracking-tight text-white">
                  Kafelas Laundry
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-white/15 px-2 py-0.5 rounded border border-white/20">
                  Panduan Interaktif
                </span>
              </div>
              <p className="text-xs text-rose-100/80 hidden sm:block">
                Tutorial Garis Penunjuk Presisi & Penjelasan Tiap Tombol Aplikasi Asli
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (onOpenLandingPage) onOpenLandingPage();
                else triggerFeedback('Web Profil Kafela Laundry');
              }}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 rounded-lg transition-colors border border-white/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-amber-300" />
              <span>Web Profil</span>
            </button>
            <button
              onClick={() => {
                if (onStartDemo) onStartDemo('owner');
                else triggerFeedback('Mode Demo Simulasi Aktif');
              }}
              className="hidden md:flex px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-white/20 items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Coba Demo</span>
            </button>
            <button
              onClick={() => {
                if (onOpenKasir) onOpenKasir();
                else triggerFeedback('Membuka Dashboard Kasir Utama');
              }}
              className="px-3.5 sm:px-5 py-2 text-xs sm:text-sm font-black text-[#800000] bg-white hover:bg-stone-100 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Buka Kasir Asli</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO HEADLINE & INSTRUCTIONS */}
      <section className="bg-gradient-to-b from-[#800000] via-[#700000] to-[#590000] text-white py-8 sm:py-10 border-b border-black/10">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-3">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-black/25 border border-amber-300/30 px-3.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Peta Tombol Terkalibrasi & Garis Presisi</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Penjelasan Tombol & Alur Kasir dengan Garis Penunjuk Sesuai
          </h1>

          <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl mx-auto leading-relaxed">
            Setiap kotak penjelasan di kiri dan kanan terhubung secara tepat melalui garis penunjuk ke tombol dan area di layar handphone tanpa saling bersilangan.
          </p>

          {/* Interactive Controls Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5 text-xs">
            {/* Toggle Tampilkan Semua / Hover Saja */}
            <button
              onClick={() => setShowAllLines(!showAllLines)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                showAllLines
                  ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-sm'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showAllLines ? 'Garis: Semua Ditampilkan' : 'Garis: Hanya Saat Dipilih'}</span>
            </button>

            {/* Toggle Animasi Aliran */}
            <button
              onClick={() => setAnimatedLines(!animatedLines)}
              className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                animatedLines
                  ? 'bg-white text-[#800000] border-white shadow-sm'
                  : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{animatedLines ? 'Animasi Aliran: Aktif' : 'Animasi Aliran: Statis'}</span>
            </button>

            {/* Style Garis: Bezier / Siku / Lurus */}
            <div className="inline-flex rounded-lg border border-white/20 bg-black/20 p-0.5">
              <button
                onClick={() => setLineStyle('bezier')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  lineStyle === 'bezier'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Kurva Halus
              </button>
              <button
                onClick={() => setLineStyle('orthogonal')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  lineStyle === 'orthogonal'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Garis Siku
              </button>
              <button
                onClick={() => setLineStyle('straight')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  lineStyle === 'straight'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Garis Lurus
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SCREEN SELECTOR TABS */}
      <nav className="sticky top-16 sm:top-20 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'screen1', label: '1. Layar Dashboard Utama', desc: 'Arsip, Nota, Laba & Tombol (+)' },
              { id: 'screen2', label: '2. Form Transaksi Baru', desc: 'Nama, Kiloan, Satuan & QRIS' },
              { id: 'screen3', label: '3. Struk & Cetak Thermal', desc: 'Thermal 58mm & Bluetooth' },
              { id: 'screen4', label: '4. Status Pengerjaan (SLA)', desc: 'Cuci, Kering, Setrika, Staff' },
            ].map((tab) => {
              const isActive = activeScreenTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveScreenTab(tab.id as any);
                    setHighlightedId(null);
                  }}
                  className={`px-3 sm:px-5 py-2.5 rounded-xl text-left border transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#800000] text-white border-[#800000] shadow-md scale-102 ring-2 ring-[#800000]/30'
                      : 'bg-stone-50 text-slate-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-black">{tab.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-amber-200' : 'text-slate-500'}`}>
                    {tab.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* TOAST FEEDBACK NOTIFICATION */}
      {actionFeedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-amber-400 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs font-bold">{actionFeedback}</span>
        </div>
      )}

      {/* 4. MAIN CANVAS CONTAINER FOR LINES AND PHONE MOCKUP */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div
          ref={containerRef}
          className="relative bg-white rounded-3xl p-4 sm:p-8 border border-stone-300 shadow-xl overflow-visible min-h-[900px]"
        >
          {/* SVG CONNECTOR LINES OVERLAY */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block z-20"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <filter id="line-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              <marker
                id="arrowhead-normal"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <polygon points="0 1, 7 4, 0 7" fill="#800000" />
              </marker>

              <marker
                id="arrowhead-active"
                markerWidth="10"
                markerHeight="10"
                refX="7"
                refY="5"
                orient="auto"
              >
                <polygon points="0 1, 9 5, 0 9" fill="#f59e0b" />
              </marker>
            </defs>

            {lineCoords.map((line) => {
              const isHighlight = highlightedId === line.id;
              const isVisible = showAllLines || isHighlight;
              if (!isVisible) return null;

              const pathData = getPathData(line.x1, line.y1, line.x2, line.y2, line.side);
              const strokeColor = isHighlight ? '#f59e0b' : '#800000';
              const strokeWidth = isHighlight ? 3.5 : 2;
              const opacity = isHighlight ? 1 : showAllLines && highlightedId ? 0.35 : 0.75;

              return (
                <g key={`svg-line-${line.id}`} className="transition-all duration-200">
                  {/* White shadow backdrop for maximum contrast against any element */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={strokeWidth + 4}
                    strokeOpacity={0.9}
                  />

                  {/* Main Connector Line */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeOpacity={opacity}
                    strokeDasharray={animatedLines ? (isHighlight ? '6,4' : '4,3') : undefined}
                    className={animatedLines && isHighlight ? 'animate-pulse' : ''}
                    filter={isHighlight ? 'url(#line-glow)' : undefined}
                    markerEnd={isHighlight ? 'url(#arrowhead-active)' : 'url(#arrowhead-normal)'}
                  />

                  {/* Center Dot at Card pin */}
                  <circle
                    cx={line.x1}
                    cy={line.y1}
                    r={isHighlight ? 5.5 : 4}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />

                  {/* Ring at Target pin */}
                  <circle
                    cx={line.x2}
                    cy={line.y2}
                    r={isHighlight ? 6.5 : 4.5}
                    fill={isHighlight ? '#f59e0b' : '#800000'}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>

          {/* SCREEN HEADER TITLE & SUB-TITLE */}
          <div className="text-center max-w-2xl mx-auto pb-6 border-b border-stone-200">
            <span className="text-xs font-bold text-[#800000] uppercase tracking-wider">
              {activeScreenTab === 'screen1' && 'PETA TOMBOL LAYAR 1'}
              {activeScreenTab === 'screen2' && 'PETA TOMBOL LAYAR 2'}
              {activeScreenTab === 'screen3' && 'PETA TOMBOL LAYAR 3'}
              {activeScreenTab === 'screen4' && 'PETA TOMBOL LAYAR 4'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {activeScreenTab === 'screen1' && 'Layar Utama / Dashboard Kasir & Rekap Laba'}
              {activeScreenTab === 'screen2' && 'Layar Formulir Input Transaksi Baru'}
              {activeScreenTab === 'screen3' && 'Layar Struk Transaksi & Cetak Bluetooth'}
              {activeScreenTab === 'screen4' && 'Layar Status Pengerjaan & Serah Terima'}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              Arahkan mouse atau klik kotak nomor untuk menyorot garis dan letak tombol yang bersangkutan.
            </p>
          </div>

          {/* 3-COLUMN LAYOUT: Left Callouts | Center Phone Mockup | Right Callouts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-6">
            
            {/* LEFT COLUMN: CALLOUTS 1 - 4 */}
            <div className="lg:col-span-3 space-y-4 order-2 lg:order-1 pt-2">
              <div className="text-xs font-black uppercase text-stone-500 tracking-wider flex items-center gap-1.5 pb-1">
                <span className="w-2 h-2 rounded-full bg-[#800000]"></span>
                <span>Fitur Bagian Kiri (1 - 4)</span>
              </div>

              {currentCallouts
                .filter((item) => item.side === 'left')
                .map((item) => {
                  const isHighlighted = highlightedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      onMouseLeave={() => setHighlightedId(null)}
                      onClick={() => setHighlightedId(isHighlighted ? null : item.id)}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-50 border-amber-400 shadow-lg scale-102 ring-2 ring-amber-300'
                          : 'bg-stone-50 border-stone-200 hover:border-[#800000]/40 hover:bg-stone-100/90 shadow-2xs'
                      }`}
                    >
                      {/* Pinned Connector Dot on the Right Edge of Left Card */}
                      <div
                        ref={(el) => setCardPinRef(item.id, el)}
                        className={`hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white items-center justify-center shadow-xs transition-colors z-30 ${
                          isHighlighted ? 'bg-amber-500 ring-4 ring-amber-300/60' : 'bg-[#800000]'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors shadow-xs ${
                            isHighlighted ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300' : 'bg-[#800000] text-white'
                          }`}
                        >
                          {item.num}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {item.title}
                          </h4>
                          <div className="font-['Caveat'] text-base text-[#800000] leading-snug mt-0.5 font-bold">
                            "{item.handwrittenNote}"
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 leading-relaxed pl-8">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
            </div>

            {/* CENTER COLUMN: PHONE MOCKUP SCREEN */}
            <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
              <div className="w-full max-w-[350px] sm:max-w-[375px] bg-slate-900 rounded-[46px] p-3 shadow-2xl border-4 border-slate-700 relative">
                
                {/* Speaker pill & Camera punch-hole */}
                <div className="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                </div>

                {/* ========================================================= */}
                {/* SCREEN 1 PHONE VIEW: DASHBOARD KASIR                     */}
                {/* ========================================================= */}
                {activeScreenTab === 'screen1' && (
                  <div className="rounded-[36px] bg-[#800000] overflow-hidden text-white flex flex-col shadow-inner relative select-none">
                    {/* Status bar */}
                    <div className="px-5 pt-3.5 pb-1 flex justify-between items-center text-[10px] font-semibold text-rose-100">
                      <span>10:46</span>
                      <span>⚡ 74%</span>
                    </div>

                    {/* App Header */}
                    <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-white/10 relative">
                      {/* Target 1: Arsip */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_arsip')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Membuka Laci Arsip Transaksi Lama')}
                        className={`relative p-1.5 rounded-lg transition-all cursor-pointer ${
                          highlightedId === 's1_arsip'
                            ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 scale-105 shadow-lg'
                            : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="1. Ikon Arsip Toko"
                      >
                        {/* Target PIN 1 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_arsip', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          1
                        </div>
                        <Store className="w-4 h-4" />
                      </div>

                      <span className="font-black text-sm tracking-tight text-white">
                        Kafela's Laundry
                      </span>

                      {/* Target 5: Settings & Sync */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_settings')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Membuka Pengaturan Tarif & Sinkron Cloud')}
                        className={`relative flex items-center gap-1.5 p-1 rounded-lg transition-all cursor-pointer ${
                          highlightedId === 's1_settings'
                            ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300 scale-105 shadow-lg'
                            : 'text-white/80 hover:text-white'
                        }`}
                        title="5. Sinkron Cloud & Pengaturan"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <SettingsIcon className="w-4 h-4" />
                        {/* Target PIN 5 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_settings', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          5
                        </div>
                      </div>
                    </div>

                    {/* Phone Body */}
                    <div className="bg-stone-100 text-slate-800 p-3 space-y-2.5 font-sans">
                      {/* Search Bar & Badges Row */}
                      <div className="flex items-center gap-2">
                        {/* Target 2: Search */}
                        <div
                          onMouseEnter={() => setHighlightedId('s1_search')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Ketik nama pelanggan untuk cari')}
                          className={`relative flex-1 bg-white border rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs transition-all cursor-pointer ${
                            highlightedId === 's1_search'
                              ? 'border-amber-500 ring-4 ring-amber-300 shadow-md'
                              : 'border-stone-300 text-slate-400'
                          }`}
                        >
                          {/* Target PIN 2 (Left Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s1_search', el)}
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            2
                          </div>
                          <Search className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Cari pelanggan...</span>
                        </div>

                        {/* Target 6: Badges Antrean */}
                        <div
                          onMouseEnter={() => setHighlightedId('s1_badges')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Antrean: 2 pakaian dalam proses')}
                          className={`relative flex items-center gap-1 text-[11px] transition-all rounded-lg p-0.5 cursor-pointer ${
                            highlightedId === 's1_badges' ? 'bg-amber-200 ring-4 ring-amber-400 scale-105' : ''
                          }`}
                        >
                          <span className="bg-[#800000] text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 2
                          </span>
                          <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full border border-amber-300">0</span>
                          <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full border border-emerald-300">0</span>
                          {/* Target PIN 6 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s1_badges', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            6
                          </div>
                        </div>
                      </div>

                      {/* Target 3: Transaction Card 1 (Basri - Lunas) */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_status')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Nota Basri - Cuci Setrika (1 Kg) - LUNAS')}
                        className={`relative bg-white p-2.5 rounded-2xl border shadow-2xs space-y-1 transition-all cursor-pointer ${
                          highlightedId === 's1_status'
                            ? 'border-emerald-500 ring-4 ring-emerald-300 shadow-md scale-101'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* Target PIN 3 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_status', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          3
                        </div>

                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[9px] text-slate-400">09:45 16 Okt</div>
                            <div className="font-bold text-xs text-slate-900">
                              Basri <span className="text-[9px] text-slate-400 font-normal">261016/1</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Lunas
                            </span>
                            <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                              <Clock className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 italic">
                          Cuci Setrika (1 Kg), Cuci Express (1 Hari) (1 Kg)
                        </div>
                      </div>

                      {/* Transaction Card 2 (Iqbal - Belum Lunas) */}
                      <div
                        onClick={() => setActiveScreenTab('screen3')}
                        className="bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs space-y-1 cursor-pointer hover:border-stone-300 transition-colors"
                        title="Klik untuk lihat struk nota ini"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[9px] text-slate-400">06:44 16 Okt</div>
                            <div className="font-bold text-xs text-slate-900">
                              Iqbal <span className="text-[9px] text-slate-400 font-normal">261015/1</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                              7.000
                            </span>
                            <div className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center">
                              <Clock className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 italic">
                          Cuci Setrika (1 Kg)
                        </div>
                      </div>

                      <div className="text-center text-[9px] text-slate-400 py-0.5">
                        Menampilkan 1 - 2 dari 2 transaksi
                      </div>

                      {/* Target 7: Rekapitulasi Laba Hari Ini */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_rekap_laba')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Laba Hari Ini: Omzet Rp 17.000 - Pengeluaran Rp 0 = Rp 17.000')}
                        className={`relative bg-white p-3 rounded-2xl border shadow-2xs space-y-2 text-xs transition-all cursor-pointer ${
                          highlightedId === 's1_rekap_laba'
                            ? 'border-amber-500 ring-4 ring-amber-300 shadow-lg scale-101'
                            : 'border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        {/* Target PIN 7 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_rekap_laba', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          7
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-700 pb-1 border-b border-stone-100">
                          <span>Jumat, 16 Okt 26</span>
                          <span className="text-slate-500">iqbal ▾</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="p-1.5 bg-stone-50 rounded-lg">
                            <span className="text-slate-400 block text-[8px]">Pemasukan</span>
                            <span className="font-bold text-emerald-700">Rp 17.000</span>
                          </div>
                          <div className="p-1.5 bg-stone-50 rounded-lg">
                            <span className="text-slate-400 block text-[8px]">Pengeluaran</span>
                            <span className="font-bold text-red-600">Rp 0</span>
                          </div>
                        </div>
                        <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl flex justify-between items-center">
                          <span className="font-bold text-emerald-900 text-[11px]">Total Laba Hari Ini:</span>
                          <span className="font-black text-emerald-800 text-xs">Rp 17.000</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Nav Bar */}
                    <div className="bg-[#800000] text-white py-2 px-3 flex justify-between items-center text-[9px] relative">
                      {/* Target 4: Bottom Nav (Left) */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_bottom_nav')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Menu Navigasi Bawah')}
                        className={`relative flex flex-col items-center pl-3 py-1 rounded transition-all cursor-pointer ${
                          highlightedId === 's1_bottom_nav' ? 'ring-2 ring-amber-300 bg-white/20' : ''
                        }`}
                      >
                        {/* Target PIN 4 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_bottom_nav', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          4
                        </div>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Status</span>
                      </div>

                      <div className="flex flex-col items-center text-rose-200">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Keuangan</span>
                      </div>

                      {/* Target 8: Central Plus Button */}
                      <div
                        onMouseEnter={() => setHighlightedId('s1_plus_btn')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => {
                          setActiveScreenTab('screen2');
                          triggerFeedback('Beralih ke Formulir Transaksi Baru!');
                        }}
                        className={`-mt-7 w-12 h-12 rounded-full bg-[#800000] border-2 border-white text-white flex items-center justify-center shadow-xl cursor-pointer transition-all ${
                          highlightedId === 's1_plus_btn'
                            ? 'scale-125 ring-4 ring-amber-300 bg-amber-500 text-slate-950'
                            : 'hover:scale-110'
                        }`}
                        title="8. Tombol Tambah Transaksi (+) - Klik untuk buka Form"
                      >
                        <Plus className="w-6 h-6 stroke-[3]" />
                        {/* Target PIN 8 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s1_plus_btn', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          8
                        </div>
                      </div>

                      <div className="flex flex-col items-center text-rose-200">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Catat Kas</span>
                      </div>
                      <div className="flex flex-col items-center text-rose-200">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Laporan</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* SCREEN 2 PHONE VIEW: FORM TRANSAKSI BARU                  */}
                {/* ========================================================= */}
                {activeScreenTab === 'screen2' && (
                  <div className="rounded-[36px] bg-[#800000] overflow-hidden text-white flex flex-col shadow-inner select-none">
                    {/* Status bar */}
                    <div className="px-5 pt-3.5 pb-1 flex justify-between items-center text-[10px] font-semibold text-rose-100">
                      <span>12:32</span>
                      <span>⚡ 64%</span>
                    </div>

                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreenTab('screen1')}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 text-white" />
                        </button>
                        <span className="font-bold text-sm tracking-tight text-white">Transaksi Baru</span>
                      </div>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold">Nota Baru</span>
                    </div>

                    <div className="bg-stone-100 text-slate-800 p-3 space-y-2.5 font-sans text-xs">
                      {/* Target 1: Customer Info */}
                      <div
                        onMouseEnter={() => setHighlightedId('s2_nama')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Form Nama Pelanggan & Alamat')}
                        className={`relative bg-white p-2.5 rounded-xl border space-y-1 transition-all cursor-pointer ${
                          highlightedId === 's2_nama' ? 'border-amber-500 ring-4 ring-amber-300 shadow-md' : 'border-stone-200'
                        }`}
                      >
                        {/* Target PIN 1 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s2_nama', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          1
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] font-bold text-slate-600">Nama Pelanggan *</span>
                            <div className="p-1.5 bg-stone-50 border border-stone-300 rounded font-bold text-slate-900">
                              Iqbal
                            </div>
                          </div>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-600">Alamat (Opsional)</span>
                            <div className="p-1.5 bg-stone-50 border border-stone-300 rounded text-slate-400 text-[10px] truncate">
                              Jl. Mawar No. 12
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Target 2: Service selector */}
                      <div
                        onMouseEnter={() => setHighlightedId('s2_layanan')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Pilih Layanan & Masukkan Berat/Pcs')}
                        className={`relative bg-white p-2.5 rounded-xl border space-y-2 transition-all cursor-pointer ${
                          highlightedId === 's2_layanan' ? 'border-amber-500 ring-4 ring-amber-300 shadow-md' : 'border-stone-200'
                        }`}
                      >
                        {/* Target PIN 2 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s2_layanan', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          2
                        </div>

                        <div className="grid grid-cols-12 gap-1.5 items-end">
                          <div className="col-span-7">
                            <span className="block text-[10px] font-bold text-slate-600 mb-0.5">Layanan</span>
                            <div className="p-1.5 bg-stone-50 border border-stone-300 rounded font-bold text-[10px] text-slate-800 flex justify-between">
                              <span>Cuci Jas / Blazer</span>
                              <span>▾</span>
                            </div>
                          </div>
                          <div className="col-span-3">
                            <span className="block text-[10px] font-bold text-slate-600 mb-0.5">(pcs)</span>
                            <div className="p-1.5 bg-stone-50 border border-stone-300 rounded font-bold text-center">
                              1
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="py-1.5 bg-emerald-600 text-white rounded font-bold text-center">
                              +
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between text-[9px] text-slate-400">
                          <span>Tarif: Rp 25.000/pcs</span>
                          <span>Est: 2 Hari</span>
                        </div>
                      </div>

                      {/* Target 3: List items */}
                      <div
                        onMouseEnter={() => setHighlightedId('s2_daftar_item')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Daftar Item: Setrika (Rp 4.000), Kering (Rp 70.000), Jas (Rp 25.000)')}
                        className={`relative bg-white p-2.5 rounded-xl border space-y-1.5 transition-all cursor-pointer ${
                          highlightedId === 's2_daftar_item' ? 'border-amber-500 ring-4 ring-amber-300 shadow-md' : 'border-stone-200'
                        }`}
                      >
                        {/* Target PIN 3 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s2_daftar_item', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          3
                        </div>

                        <div className="p-1.5 bg-stone-50 rounded-lg flex justify-between items-center text-[11px]">
                          <div>
                            <div className="font-bold text-slate-900">Setrika Saja</div>
                            <div className="text-[9px] text-slate-500">1 Kg x Rp 4.000</div>
                          </div>
                          <span className="font-bold">Rp 4.000</span>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded-lg flex justify-between items-center text-[11px]">
                          <div>
                            <div className="font-bold text-slate-900">Cuci Kering Saja</div>
                            <div className="text-[9px] text-slate-500">14 Kg x Rp 5.000</div>
                          </div>
                          <span className="font-bold">Rp 70.000</span>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded-lg flex justify-between items-center text-[11px]">
                          <div>
                            <div className="font-bold text-slate-900">Cuci Jas / Blazer</div>
                            <div className="text-[9px] text-slate-500">1 pcs x Rp 25.000</div>
                          </div>
                          <span className="font-bold">Rp 25.000</span>
                        </div>
                      </div>

                      {/* Target 4: Catatan Khusus Pakaian (Disusun rapi di bawah item) */}
                      <div
                        onMouseEnter={() => setHighlightedId('s2_catatan')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Catatan Khusus: "Pakai parfum mawar"')}
                        className={`relative p-2 bg-white rounded-xl border transition-all cursor-pointer ${
                          highlightedId === 's2_catatan'
                            ? 'border-amber-500 bg-amber-50/70 ring-4 ring-amber-300 shadow-md'
                            : 'border-stone-200'
                        }`}
                      >
                        {/* Target PIN 4 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s2_catatan', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          4
                        </div>

                        <span className="block text-[9px] font-bold text-slate-500">Catatan Khusus Pakaian:</span>
                        <div className="text-[11px] font-bold text-[#800000] flex items-center gap-1.5 mt-0.5">
                          <span>🌸</span>
                          <span>Pakai parfum mawar</span>
                        </div>
                      </div>

                      {/* Payment Options Box */}
                      <div className="bg-white p-2.5 rounded-xl border border-stone-200 space-y-2">
                        {/* Target 5: Total Tagihan Otomatis */}
                        <div
                          onMouseEnter={() => setHighlightedId('s2_total_tagihan')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Total Tagihan Otomatis: Rp 99.000')}
                          className={`relative flex justify-between items-center p-1.5 rounded-lg transition-all cursor-pointer ${
                            highlightedId === 's2_total_tagihan' ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-stone-50'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-600">Total Tagihan:</span>
                          <span className="text-base font-black text-slate-900">Rp 99.000</span>
                          {/* Target PIN 5 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s2_total_tagihan', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            5
                          </div>
                        </div>

                        {/* Target 6: Status Pelunasan */}
                        <div
                          onMouseEnter={() => setHighlightedId('s2_status_lunas')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Centang Lunas')}
                          className={`relative flex items-center gap-1.5 p-1.5 rounded-lg border transition-all cursor-pointer ${
                            highlightedId === 's2_status_lunas'
                              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300'
                              : 'border-stone-200 bg-stone-50'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                          <span className="font-bold text-[11px]">Lunas</span>
                          {/* Target PIN 6 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s2_status_lunas', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            6
                          </div>
                        </div>

                        {/* Target 7: Metode QRIS */}
                        <div
                          onMouseEnter={() => setHighlightedId('s2_metode_qris')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Metode Pembayaran Non-Tunai / QRIS')}
                          className={`relative flex items-center justify-between p-1.5 rounded-lg border transition-all cursor-pointer ${
                            highlightedId === 's2_metode_qris'
                              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
                              : 'border-stone-200 bg-stone-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                            <span className="font-bold text-[11px]">Non-Tunai (QRIS)</span>
                          </div>
                          {/* Target PIN 7 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s2_metode_qris', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            7
                          </div>
                        </div>
                      </div>

                      {/* Target 8: Tombol Simpan Transaksi */}
                      <div
                        onMouseEnter={() => setHighlightedId('s2_btn_simpan')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => {
                          setActiveScreenTab('screen3');
                          triggerFeedback('Transaksi disimpan! Buka lembar struk.');
                        }}
                        className={`relative w-full py-2.5 bg-[#800000] text-white font-bold rounded-xl text-center text-xs shadow-md cursor-pointer transition-all ${
                          highlightedId === 's2_btn_simpan'
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-102'
                            : 'hover:bg-[#700000]'
                        }`}
                      >
                        <span>Simpan Transaksi</span>
                        {/* Target PIN 8 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s2_btn_simpan', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          8
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* SCREEN 3 PHONE VIEW: STRUK & CETAK BLUETOOTH              */}
                {/* ========================================================= */}
                {activeScreenTab === 'screen3' && (
                  <div className="rounded-[36px] bg-[#800000] overflow-hidden text-white flex flex-col shadow-inner relative select-none">
                    {/* Status bar */}
                    <div className="px-5 pt-3.5 pb-1 flex justify-between items-center text-[10px] font-semibold text-rose-100">
                      <span>10:46</span>
                      <span>⚡ 74%</span>
                    </div>

                    <div className="px-4 py-2 flex justify-between items-center border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreenTab('screen1')}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 text-white" />
                        </button>
                        <div>
                          <div className="font-bold text-xs text-white">Struk Transaksi</div>
                          <div className="text-[10px] text-rose-200">Nota: 261015/1</div>
                        </div>
                      </div>
                      <X
                        onClick={() => setActiveScreenTab('screen1')}
                        className="w-4 h-4 text-white/80 cursor-pointer hover:text-white"
                      />
                    </div>

                    {/* Receipt paper area */}
                    <div className="bg-stone-300 p-2.5 flex flex-col items-center">
                      <div className="w-full bg-white rounded-xl shadow p-3 text-slate-900 font-mono text-[10px] relative border border-stone-300 space-y-1">
                        
                        {/* Target 1: Kop Toko & Logo */}
                        <div
                          onMouseEnter={() => setHighlightedId('s3_kop_toko')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Kop Struk Resmi Kafela Laundry')}
                          className={`relative text-center pb-1 p-1 rounded transition-all cursor-pointer ${
                            highlightedId === 's3_kop_toko' ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                          }`}
                        >
                          {/* Target PIN 1 (Left Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s3_kop_toko', el)}
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            1
                          </div>

                          <div className="w-7 h-7 rounded-full border border-stone-400 mx-auto flex items-center justify-center text-[7px] font-bold mb-0.5">
                            kafelas
                          </div>
                          <div className="font-bold text-xs">KAFELA'S LAUNDRY</div>
                          <div className="text-[9px] text-slate-500">0812-3456-7890 · Jl. Utama, Bandung</div>
                        </div>

                        <div className="border-t border-dashed border-stone-400 my-1" />

                        {/* Order Metadata Rows */}
                        <div className="space-y-0.5 text-[9px]">
                          {/* Target 2: Nomor Nota Transaksi */}
                          <div
                            onMouseEnter={() => setHighlightedId('s3_nomor_nota')}
                            onMouseLeave={() => setHighlightedId(null)}
                            onClick={() => triggerFeedback('Nomor Nota Unik: 261015/1')}
                            className={`relative flex justify-between p-0.5 rounded cursor-pointer ${
                              highlightedId === 's3_nomor_nota' ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                            }`}
                          >
                            {/* Target PIN 2 (Left Anchor) */}
                            <div
                              ref={(el) => setTargetPinRef('s3_nomor_nota', el)}
                              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                            >
                              2
                            </div>
                            <span>No. Nota</span>
                            <span className="font-bold">261015/1</span>
                          </div>

                          {/* Target 3: Jadwal Terima & Selesai */}
                          <div
                            onMouseEnter={() => setHighlightedId('s3_waktu_terima')}
                            onMouseLeave={() => setHighlightedId(null)}
                            onClick={() => triggerFeedback('Jadwal: Terima 16 Okt, Selesai 19 Okt')}
                            className={`relative space-y-0.5 p-0.5 rounded cursor-pointer ${
                              highlightedId === 's3_waktu_terima' ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                            }`}
                          >
                            {/* Target PIN 3 (Left Anchor) */}
                            <div
                              ref={(el) => setTargetPinRef('s3_waktu_terima', el)}
                              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                            >
                              3
                            </div>
                            <div className="flex justify-between"><span>Terima</span><span>Jumat, 16 Okt 06.44</span></div>
                            <div className="flex justify-between"><span>Selesai</span><span>Senin, 19 Okt 2026</span></div>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-stone-400 my-1" />

                        {/* Target 5: Nama & Status Belum Lunas */}
                        <div
                          onMouseEnter={() => setHighlightedId('s3_nama_status')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Pelanggan Iqbal: BELUM LUNAS Rp 7.000')}
                          className={`relative text-center py-1 p-1 rounded transition-all cursor-pointer ${
                            highlightedId === 's3_nama_status' ? 'bg-red-50 ring-2 ring-red-400' : ''
                          }`}
                        >
                          {/* Target PIN 5 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s3_nama_status', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            5
                          </div>
                          <div className="font-black text-sm tracking-wider">IQBAL</div>
                          <div className="font-black text-red-600 text-xs">BELUM LUNAS</div>
                          <div className="font-black text-red-600 text-xs">Rp. 7.000,-</div>
                        </div>

                        <div className="border-t border-dashed border-stone-400 my-1" />

                        {/* Target 6: Rincian Transaksi & Sisa Bayar */}
                        <div
                          onMouseEnter={() => setHighlightedId('s3_rincian_biaya')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Rincian Transaksi: Cuci Setrika 1 Kg x 7.000')}
                          className={`relative text-[9px] space-y-0.5 p-1 rounded transition-all cursor-pointer ${
                            highlightedId === 's3_rincian_biaya' ? 'bg-amber-100 ring-2 ring-amber-400' : ''
                          }`}
                        >
                          {/* Target PIN 6 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s3_rincian_biaya', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            6
                          </div>
                          <div className="font-bold">Cuci Setrika</div>
                          <div className="flex justify-between text-slate-600">
                            <span>1 Kg x 7.000</span>
                            <span>= 7.000</span>
                          </div>
                          <div className="flex justify-between font-bold pt-1">
                            <span>Total Transaksi</span>
                            <span>Rp 7.000</span>
                          </div>
                          <div className="flex justify-between font-bold text-red-600">
                            <span>Sisa Pembayaran</span>
                            <span>Rp 7.000</span>
                          </div>
                        </div>

                        <div className="border-t border-dashed border-stone-400 my-1" />

                        {/* Target 7: Peraturan Toko (Disusun rapi di bagian bawah struk) */}
                        <div
                          onMouseEnter={() => setHighlightedId('s3_aturan_toko')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Aturan: Pakaian tidak diambil > 3 bulan disedekahkan')}
                          className={`relative text-center text-[8px] text-slate-500 leading-tight p-1 rounded cursor-pointer ${
                            highlightedId === 's3_aturan_toko' ? 'bg-amber-100 ring-2 ring-amber-400 text-slate-900 font-bold' : ''
                          }`}
                        >
                          {/* Target PIN 7 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s3_aturan_toko', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            7
                          </div>
                          Barang yang tidak diambil lebih dari 3 bulan akan disedekahkan.<br />
                          Terima kasih atas kepercayaan Anda!
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons: Cetak Bluetooth (Kiri) & Bagikan (Kanan) */}
                    <div className="bg-white p-2.5 border-t border-stone-200 flex gap-2 font-sans">
                      {/* Target 4: Tombol Cetak Bluetooth (Sisi Kiri) */}
                      <div
                        onMouseEnter={() => setHighlightedId('s3_btn_bluetooth')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Mencetak struk ke printer thermal Bluetooth 58mm...')}
                        className={`relative flex-1 py-2 bg-[#800000] text-white rounded-lg text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all ${
                          highlightedId === 's3_btn_bluetooth'
                            ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-102'
                            : 'hover:bg-[#700000]'
                        }`}
                      >
                        {/* Target PIN 4 (Left Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s3_btn_bluetooth', el)}
                          className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          4
                        </div>
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Bluetooth</span>
                      </div>

                      {/* Target 8: Tombol Bagikan WhatsApp (Sisi Kanan) */}
                      <div
                        onMouseEnter={() => setHighlightedId('s3_btn_bagikan')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Membuka tautan kirim struk via WhatsApp')}
                        className={`relative px-3 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          highlightedId === 's3_btn_bagikan'
                            ? 'bg-emerald-500 ring-4 ring-emerald-300 scale-105'
                            : 'hover:bg-emerald-800'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Bagikan</span>
                        {/* Target PIN 8 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s3_btn_bagikan', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          8
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================= */}
                {/* SCREEN 4 PHONE VIEW: STATUS PENGERJAAN & SLA              */}
                {/* ========================================================= */}
                {activeScreenTab === 'screen4' && (
                  <div className="rounded-[36px] bg-[#800000] overflow-hidden text-white flex flex-col shadow-inner select-none">
                    {/* Status bar */}
                    <div className="px-5 pt-3.5 pb-1 flex justify-between items-center text-[10px] font-semibold text-rose-100">
                      <span>14:15</span>
                      <span>⚡ 82%</span>
                    </div>

                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveScreenTab('screen1')}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4 text-white" />
                        </button>
                        <span className="font-bold text-sm tracking-tight text-white">Status Pengerjaan</span>
                      </div>

                      {/* Target 5: Outlet Badge */}
                      <div
                        onMouseEnter={() => setHighlightedId('s4_outlet_badge')}
                        onMouseLeave={() => setHighlightedId(null)}
                        onClick={() => triggerFeedback('Posisi Cabang: Outlet Utama')}
                        className={`relative text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          highlightedId === 's4_outlet_badge' ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300' : ''
                        }`}
                      >
                        {/* Target PIN 5 (Right Anchor) */}
                        <div
                          ref={(el) => setTargetPinRef('s4_outlet_badge', el)}
                          className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                        >
                          5
                        </div>
                        <span>Outlet Utama</span>
                      </div>
                    </div>

                    {/* Target 1: Tab Status Pengerjaan */}
                    <div
                      onMouseEnter={() => setHighlightedId('s4_tab_status')}
                      onMouseLeave={() => setHighlightedId(null)}
                      onClick={() => triggerFeedback('Filter Posisi: Semua, Cuci, Kering, Setrika')}
                      className={`relative bg-[#700000] p-1.5 flex gap-1 text-[10px] overflow-x-auto no-scrollbar transition-all cursor-pointer ${
                        highlightedId === 's4_tab_status' ? 'ring-4 ring-amber-300' : ''
                      }`}
                    >
                      {/* Target PIN 1 (Left Anchor) */}
                      <div
                        ref={(el) => setTargetPinRef('s4_tab_status', el)}
                        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                      >
                        1
                      </div>

                      <span className="bg-white/15 px-2 py-1 rounded">Semua (2)</span>
                      <span className="bg-white text-[#800000] font-black px-2 py-1 rounded shadow-xs">Cuci (1)</span>
                      <span className="bg-white/15 px-2 py-1 rounded">Kering (0)</span>
                      <span className="bg-white/15 px-2 py-1 rounded">Setrika (1)</span>
                    </div>

                    <div className="bg-stone-100 text-slate-800 p-3 space-y-2.5 font-sans text-xs">
                      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                        {/* Target 2: Customer Order Info Card */}
                        <div
                          onMouseEnter={() => setHighlightedId('s4_info_pelanggan')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Detail: Iqbal (261015/1) - Cuci Setrika 1 Kg')}
                          className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                            highlightedId === 's4_info_pelanggan'
                              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
                              : 'border-stone-100 bg-stone-50'
                          }`}
                        >
                          {/* Target PIN 2 (Left Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s4_info_pelanggan', el)}
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            2
                          </div>

                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-black text-sm text-slate-900">Iqbal (261015/1)</div>
                              <div className="text-[10px] text-slate-500">Cuci Setrika · 1 Kg</div>
                              <div className="text-[9px] text-[#800000] font-bold">Catatan: Parfum Mawar</div>
                            </div>

                            {/* Target 6: Status Badge Sedang Dicuci */}
                            <div
                              onMouseEnter={() => setHighlightedId('s4_status_badge')}
                              onMouseLeave={() => setHighlightedId(null)}
                              className={`relative bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-300 ${
                                highlightedId === 's4_status_badge' ? 'ring-2 ring-amber-400 bg-amber-200' : ''
                              }`}
                            >
                              {/* Target PIN 6 (Right Anchor) */}
                              <div
                                ref={(el) => setTargetPinRef('s4_status_badge', el)}
                                className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                              >
                                6
                              </div>
                              <span>Sedang Dicuci</span>
                            </div>
                          </div>
                        </div>

                        {/* Target 3: SLA Target Row */}
                        <div
                          onMouseEnter={() => setHighlightedId('s4_estimasi_waktu')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Target Selesai: Senin, 19 Okt 2026')}
                          className={`relative flex items-center justify-between p-1.5 bg-stone-50 rounded-lg border transition-all cursor-pointer ${
                            highlightedId === 's4_estimasi_waktu' ? 'border-amber-500 ring-2 ring-amber-300' : 'border-stone-200'
                          }`}
                        >
                          {/* Target PIN 3 (Left Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s4_estimasi_waktu', el)}
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            3
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Target: Senin, 19 Okt 2026 (Sisa 2 Hari)</span>
                          </div>
                        </div>

                        {/* Target 7: Staff Assignment Row */}
                        <div
                          onMouseEnter={() => setHighlightedId('s4_pilih_staff')}
                          onMouseLeave={() => setHighlightedId(null)}
                          onClick={() => triggerFeedback('Staff Penanggung Jawab: Siti Rahma')}
                          className={`relative flex items-center justify-between p-1.5 bg-stone-50 rounded-lg border transition-all cursor-pointer ${
                            highlightedId === 's4_pilih_staff' ? 'border-amber-500 ring-2 ring-amber-300' : 'border-stone-200'
                          }`}
                        >
                          <span className="text-[10px] font-bold text-slate-600">Staff Penanggung Jawab:</span>
                          <span className="text-[10px] font-black bg-stone-200 px-2 py-0.5 rounded text-slate-800">
                            Siti Rahma ▾
                          </span>
                          {/* Target PIN 7 (Right Anchor) */}
                          <div
                            ref={(el) => setTargetPinRef('s4_pilih_staff', el)}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                          >
                            7
                          </div>
                        </div>

                        {/* Action buttons: Lanjut Status (Kiri) & WA Pelanggan (Kanan) */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {/* Target 4: Tombol Naikkan Status (Sisi Kiri) */}
                          <div
                            onMouseEnter={() => setHighlightedId('s4_btn_next_step')}
                            onMouseLeave={() => setHighlightedId(null)}
                            onClick={() => triggerFeedback('Status dinaikkan menjadi: Siap Disetrika!')}
                            className={`relative py-2 bg-emerald-700 text-white rounded-lg text-center font-bold text-[11px] shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              highlightedId === 's4_btn_next_step' ? 'bg-emerald-500 ring-4 ring-emerald-300 scale-102' : 'hover:bg-emerald-800'
                            }`}
                          >
                            {/* Target PIN 4 (Left Anchor) */}
                            <div
                              ref={(el) => setTargetPinRef('s4_btn_next_step', el)}
                              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                            >
                              4
                            </div>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Lanjut: Kering</span>
                          </div>

                          {/* Target 8: Tombol WA Pelanggan (Sisi Kanan) */}
                          <div
                            onMouseEnter={() => setHighlightedId('s4_btn_wa_selesai')}
                            onMouseLeave={() => setHighlightedId(null)}
                            onClick={() => triggerFeedback('Kirim pesan: "Halo Kak Iqbal, cucian sudah wangi & siap diambil!"')}
                            className={`relative py-2 bg-[#800000] text-white rounded-lg text-center font-bold text-[11px] shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all ${
                              highlightedId === 's4_btn_wa_selesai' ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-300 scale-102' : 'hover:bg-[#700000]'
                            }`}
                          >
                            <Send className="w-3 h-3" />
                            <span>WA Pelanggan</span>
                            {/* Target PIN 8 (Right Anchor) */}
                            <div
                              ref={(el) => setTargetPinRef('s4_btn_wa_selesai', el)}
                              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#800000] text-amber-300 border-2 border-white text-[9px] font-black flex items-center justify-center shadow-md z-30"
                            >
                              8
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: CALLOUTS 5 - 8 */}
            <div className="lg:col-span-3 space-y-4 order-3 pt-2">
              <div className="text-xs font-black uppercase text-stone-500 tracking-wider flex items-center gap-1.5 pb-1">
                <span className="w-2 h-2 rounded-full bg-[#800000]"></span>
                <span>Fitur Bagian Kanan (5 - 8)</span>
              </div>

              {currentCallouts
                .filter((item) => item.side === 'right')
                .map((item) => {
                  const isHighlighted = highlightedId === item.id;
                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => setHighlightedId(item.id)}
                      onMouseLeave={() => setHighlightedId(null)}
                      onClick={() => setHighlightedId(isHighlighted ? null : item.id)}
                      className={`relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                        isHighlighted
                          ? 'bg-amber-50 border-amber-400 shadow-lg scale-102 ring-2 ring-amber-300'
                          : 'bg-stone-50 border-stone-200 hover:border-[#800000]/40 hover:bg-stone-100/90 shadow-2xs'
                      }`}
                    >
                      {/* Pinned Connector Dot on the Left Edge of Right Card */}
                      <div
                        ref={(el) => setCardPinRef(item.id, el)}
                        className={`hidden lg:flex absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white items-center justify-center shadow-xs transition-colors z-30 ${
                          isHighlighted ? 'bg-amber-500 ring-4 ring-amber-300/60' : 'bg-[#800000]'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-colors shadow-xs ${
                            isHighlighted ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300' : 'bg-[#800000] text-white'
                          }`}
                        >
                          {item.num}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {item.title}
                          </h4>
                          <div className="font-['Caveat'] text-base text-[#800000] leading-snug mt-0.5 font-bold">
                            "{item.handwrittenNote}"
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 leading-relaxed pl-8">
                        {item.desc}
                      </p>
                    </div>
                  );
                })}
            </div>

          </div>
        </div>
      </main>

      {/* 5. QUICK TUTORIAL WORKFLOW */}
      <section className="py-12 bg-stone-200/70 border-t border-stone-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold text-[#800000] uppercase tracking-wider">
              Langkah Penggunaan Praktis
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Cara Pakai Kasir Kafela Dalam 4 Langkah Sederhana
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Dari pelanggan datang menimbang cucian hingga struk thermal tercetak rapi.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '1',
                title: 'Pelanggan Datang',
                desc: 'Timbang pakaian kotor pelanggan. Klik tombol bulat merah (+) di tengah layar kasir.',
              },
              {
                step: '2',
                title: 'Input Kiloan / Satuan',
                desc: 'Ketik nama pelanggan, pilih paket layanan, masukkan berat (Kg), lalu centang jika sudah lunas atau bayar QRIS.',
              },
              {
                step: '3',
                title: 'Simpan & Cetak Struk',
                desc: 'Klik tombol Simpan Transaksi. Tekan "Cetak Bluetooth" untuk mencetak ke printer thermal 58mm atau bagikan via WhatsApp.',
              },
              {
                step: '4',
                title: 'Update & Serah Terima',
                desc: 'Pindahkan status dari Cuci ke Kering dan Setrika. Saat pakaian selesai, kirim notifikasi WA dan serahkan pakaian ke pelanggan.',
              },
            ].map((card) => (
              <div key={card.step} className="bg-white p-4 rounded-2xl border border-stone-300 shadow-xs space-y-2">
                <div className="w-8 h-8 rounded-full bg-[#800000] text-amber-300 font-black text-sm flex items-center justify-center">
                  {card.step}
                </div>
                <h4 className="font-bold text-sm text-slate-900">{card.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="py-14 sm:py-16 bg-[#800000] text-white text-center">
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <h3 className="text-2xl sm:text-3xl font-black">
            Buka Aplikasi Kasir Kafela's Laundry
          </h3>
          <p className="text-rose-100 text-xs sm:text-sm">
            Gunakan sekarang langsung di peramban web di alamat <strong>kafelaslaundry.web.app</strong> atau coba dengan data simulasi gratis.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                if (onOpenKasir) onOpenKasir();
                else triggerFeedback('Membuka Kasir Kafela');
              }}
              className="px-7 py-3 bg-white text-[#800000] font-black rounded-xl text-xs sm:text-sm shadow-md hover:bg-stone-100 transition cursor-pointer"
            >
              Buka Kasir Sekarang
            </button>
            <button
              onClick={() => {
                if (onOpenLandingPage) onOpenLandingPage();
                else triggerFeedback('Membuka Profil Toko');
              }}
              className="px-5 py-3 bg-black/25 text-white font-bold rounded-xl text-xs sm:text-sm border border-white/20 hover:bg-black/35 transition cursor-pointer"
            >
              Lihat Web Profil Toko
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-stone-900 text-stone-400 py-6 text-xs border-t border-stone-800 text-center">
        <p>&copy; 2026 Kafela's Laundry — Sistem Kasir POS & Manajemen Operasional Laundry Indonesia.</p>
      </footer>
    </div>
  );
};
