export interface TourStepDefinition {
  title: string;
  description: string;
  targetSelector: string;
  view: 'dashboard' | 'tambah_edit' | 'detail_transaksi';
}

export const TOUR_STEPS: TourStepDefinition[] = [
  {
    title: '1. Tambah Transaksi Baru',
    description:
      'Selamat datang di Tur Panduan Kasir Kafelas Laundry! Klik tombol "+ Transaksi Baru" untuk mulai mencatat cucian masuk dari pelanggan.',
    targetSelector: '[data-tour="btn-tambah-transaksi"]',
    view: 'dashboard',
  },
  {
    title: '2. Isi Nama & Layanan',
    description:
      'Ketik nama pelanggan dan pilih layanan cuci (misal: Cuci Komplit / Kiloan). Sistem otomatis menghitung total biaya cucian.',
    targetSelector: '[data-tour="form-transaksi"]',
    view: 'tambah_edit',
  },
  {
    title: '3. Status Pembayaran & Simpan',
    description:
      'Pilih status pembayaran (Lunas atau DP) dan metode bayar (Tunai/QRIS), lalu tekan tombol "Simpan Transaksi" untuk membuat nota.',
    targetSelector: '[data-tour="btn-simpan-transaksi"]',
    view: 'tambah_edit',
  },
  {
    title: '4. Pratinjau Nota & Cetak Bluetooth',
    description:
      'Di lembar Detail Transaksi, Anda dapat langsung mencetak struk thermal 58mm ke printer Bluetooth atau membagikan teks nota WhatsApp ke pelanggan.',
    targetSelector: '[data-tour="btn-cetak-nota"]',
    view: 'detail_transaksi',
  },
  {
    title: '5. Kerjakan Cucian di Dashboard',
    description:
      'Di tabel antrean Dashboard, klik tombol proses merah pada pesanan untuk mulai mengerjakannya secara kilat tanpa perlu pindah halaman.',
    targetSelector: '[data-tour="btn-dashboard-kerjakan"]',
    view: 'dashboard',
  },
  {
    title: '6. Penyerahan Cucian ("Diambil")',
    description:
      'Ketika pelanggan datang mengambil pakaian, klik tombol hijau pada tabel. Pesanan otomatis masuk ke arsip dan uang masuk tercatat di Buku Kas.',
    targetSelector: '[data-tour="btn-diambil"]',
    view: 'dashboard',
  },
];
