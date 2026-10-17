# Fitur Ekspor Excel, Cetak PDF, dan Analisis Laporan Keuangan Komparatif Pro

Menyediakan sistem pelaporan keuangan tingkat lanjut (*Pro Financial Reports*) untuk membandingkan performa usaha dengan periode sebelumnya (MoM & YoY) serta fitur ekspor berkas Excel (.xlsx) komprehensif dan dokumen PDF siap cetak, langsung aktif penuh tanpa hambatan paket langganan.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Terkonfirmasi Berdasarkan Pilihan Anda:**
> 1. **Tanpa Kunci Paket Langganan**: Fitur Analisis Komparasi Laporan Pro, Ekspor Excel (XLSX), dan Cetak PDF langsung aktif 100% untuk semua pemilik toko tanpa biaya tambahan atau batasan paket pro.
> 2. **Format Ekspor Ganda**: Menyediakan dua opsi ekspor utama di menu laporan:
>    - **File Excel (.xlsx)**: Berisi lembar kerja terstruktur (Ringkasan Eksekutif, Daftar Transaksi, Rincian Pengeluaran, Rekap Layanan, dan Tabel Harian).
>    - **Dokumen PDF Siap Cetak**: Tata letak rapi standar dokumen A4 formal lengkap dengan kop surat nama laundry, periode laporan, tabel komparasi laba rugi, dan kolom tanda tangan pengesahan pemilik.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**:
  1. **Panel Analisis Komparatif Historis (Bulan Ini vs Bulan Lalu & Tahun Ini vs Tahun Lalu)**:
     - Perhitungan otomatis metrik pertumbuhan (Growth Rate %): Omzet, Uang Masuk, Total Pengeluaran, Laba Bersih, Jumlah Transaksi Cucian, dan Total Berat Cucian (Kg).
     - Indikator tren visual naik (hijau) atau turun (merah) yang intuitif dengan selisih nominal rupiah (`+Rp ...` atau `-Rp ...`).
     - Deteksi performa layanan terlaris periode ini dibanding periode lalu untuk mengetahui perubahan minat pelanggan.
  2. **Ekspor Excel (.xlsx)**:
     - Tombol 1-klik untuk mengunduh seluruh data laporan periode terpilih ke dalam format spreadsheet Excel resmi.
     - Penataan kolom rapi dengan format angka mata uang rupiah, tanggal terstandar, dan tabulasi bersih.
  3. **Cetak & Ekspor PDF Formal**:
     - Format laporan cetak A4 yang elegan dengan header brand toko, ringkasan perbandingan laba rugi, breakdown operasional, serta kolom tanda tangan.
- **Target Pengguna**: Pemilik bisnis laundry (Owner) yang ingin memantau kesehatan finansial usaha secara akurat dan membagikan laporan ke mitra bisnis atau investor.
- **Nilai Utama**: Mempermudah evaluasi bisnis tanpa hitung manual di kalkulator, mengetahui apakah usaha sedang bertumbuh atau menurun dibanding bulan lalu, serta kemudahan arsip data ke Excel.

---

## 2. User Experience & Visual Design

- **Alur Pengguna (User Flow)**:
  1. Masuk ke menu **Laporan** dari Dashboard utama atau Sidebar PC.
  2. Memilih filter **Bulan** dan **Tahun** yang ingin ditinjau.
  3. Di bagian atas, muncul tab beralih mode:
     - **Ringkasan Periode Ini**: Tampilan laporan standar yang sudah ada.
     - **Analisis Komparasi (Bulan Lalu vs Sekarang)**: Tampilan komparatif berdampingan (*side-by-side*) dengan kartu metrik selisih pertumbuhan.
  4. Pada bilah atas laporan, tersedia dua tombol aksi utama:
     - 📗 **Ekspor Excel (.xlsx)**: Mengunduh berkas spreadsheet dengan nama `Laporan_Laundry_[Bulan]_[Tahun].xlsx`.
     - 📄 **Cetak / PDF**: Membuka dialog pratinjau cetak browser / simpan sebagai PDF beresolusi tinggi dengan tata letak dokumen formal.
- **Identitas Visual & Tema**:
  - Warna aksen utama: Marun khas Kafelas Laundry (`#800000`).
  - Indikator pertumbuhan: Emerald green (`#16A34A`) untuk kenaikan omzet/laba, dan Rose crimson (`#E11D48`) untuk penurunan performa atau kenaikan pengeluaran yang membengkak.
  - Tipografi data finansial: Memakai angka tabular monospace (`tabular-nums font-mono`) agar angka rata dan sejajar vertikal.
  - Desain responsif: Tampilan kartu komparasi ringkas 1-kolom di layar HP (Mobile), dan tata letak perbandingan dua kolom (*split comparison grid*) di layar Komputer/Laptop (PC).

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Strategi Paket Pro vs Langsung Aktif**:
  - *Pilihan*: Langsung aktifkan semua fitur tanpa batasan paket.
  - *Alasan*: Sesuai preferensi Anda, memberikan akses instan tanpa friksi paywall membuat kasir dan pemilik toko dapat langsung menikmati kemudahan analisis bisnis sejak hari pertama.
- **Keputusan 2: Pemrosesan Data Komparasi di Sisi Klien (Client-Side Memory & IndexedDB)**:
  - *Pilihan*: Menghitung komparasi langsung di browser dengan memanfaatkan arsip IndexedDB lokal yang sudah ada (`fetchArsipBulan`).
  - *Alasan*: Nol biaya query Firestore tambahan (*0 read cost*), perbandingan instan tanpa jeda loading server, dan bekerja cepat bahkan saat koneksi lambat.
- **Keputusan 3: Mesin Pembuatan Berkas Excel (.xlsx)**:
  - *Pilihan*: Menggunakan pustaka standar industri `xlsx` (SheetJS) yang terpasang di client untuk menghasilkan berkas binary `.xlsx` murni (kompatibel penuh dengan Microsoft Excel, Google Sheets, dan WPS Office).

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                       LaporanView                           │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  Filter Bulan & Tahun │       │ Tombol Ekspor Excel   │  │
│  │  (Periode Aktif)      │       │ & Tombol Cetak PDF    │  │
│  └───────────┬───────────┘       └───────────┬───────────┘  │
│              ▼                               ▼              │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │ Periode Aktif vs      │       │ Generator XLSX/PDF    │  │
│  │ Periode Sebelumnya    │       │ (SheetJS + Print CSS) │  │
│  └───────────┬───────────┘       └───────────────────────┘  │
└──────────────┼──────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Data Pipeline & Storage                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  IndexedDbService & Local Storage                     │  │
│  │  - Transaksi Bulan Berjalan                           │  │
│  │  - Transaksi Arsip Bulan Lalu (fetchArsipBulan)       │  │
│  │  - Pengeluaran & Arus Kas                             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Struktur Logika Komparasi**:
  - Menghitung agregat periode berjalan: $M_0 = \{\text{Omzet}, \text{Uang Masuk}, \text{Pengeluaran}, \text{Laba}, \text{Total Trx}, \text{Total Kg}\}$.
  - Mengambil dan menghitung data periode pembanding (bulan sebelumnya atau tahun sebelumnya): $M_{-1}$.
  - Menghitung Delta Selisih: $\Delta = M_0 - M_{-1}$ dan Persentase Pertumbuhan: $\% = \frac{M_0 - M_{-1}}{M_{-1}} \times 100\%$.
- **Format Spreadsheet Excel (.xlsx)**:
  - Lembar 1 (*Ringkasan Keuangan*): Rincian omzet, uang masuk, total beban operasional, laba bersih, dan metrik komparasi.
  - Lembar 2 (*Daftar Transaksi*): No transaksi, nama pelanggan, tanggal masuk, tanggal selesai, total harga, DP, status pembayaran, dan layanan.
  - Lembar 3 (*Rincian Pengeluaran*): Tanggal, kategori biaya, keterangan, dan nominal pengeluaran.
  - Lembar 4 (*Rekap Harian*): Pembukuan tanggal per tanggal dalam satu bulan.
- **Format Dokumen PDF / Cetak Laporan**:
  - CSS `@media print` khusus laporan keuangan (`#printable-report`) yang sudah terpasang di `index.css`, dipercantik dengan header formal brand, tabel bergaris, dan footer pengesahan.
