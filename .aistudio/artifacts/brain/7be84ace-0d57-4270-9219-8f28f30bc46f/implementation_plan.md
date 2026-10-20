# Rencana Arsitektur Sinkronisasi Real-Time & Anti-Hilang Data Transaksi (Multi-User)

Perbaikan fundamental pada arsitektur data persistence dan sinkronisasi Firestore untuk mengatasi masalah data transaksi yang hilang atau tidak terbaca saat reload, pergantian status, atau antar-perangkat kasir/owner.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Berdasarkan Klarifikasi Pengguna**:
> 1. **Data Tidak Menentu / Kadang Hilang**: Teridentifikasi disebabkan oleh pemfilteran agresif pada `fetchTransaksiAktif` yang menimpa (`overwrite`) state lokal dengan mengecualikan transaksi yang sudah berstatus 'Diambil'. Perbaikan akan mempertahankan data transaksi lengkap (aktif + arsip bulan berjalan) sehingga laporan keuangan dan catatan kerja staf tidak terhapus.
> 2. **Pemisahan Arsip vs Laporan Keuangan**: Transaksi yang telah diambil/lunas tetap tampil di halaman **Arsip** dan disaring dari antrean pengerjaan harian, namun **seluruh nilai finansial dan rekam kerja staf tetap terbaca utuh** di menu Laporan, Buku Kas, dan Analisis Keuangan.
> 3. **Sinkronisasi Multi-User Instan**: Menghapus pembatasan *cooldown* 3 menit dan menerapkan Firestore `onSnapshot` (real-time listener) pada cabang aktif. Setiap ada transaksi baru dari kasir A, HP kasir B dan owner langsung terupdate dalam hitungan milidetik.

---

### 1. Overview & Core Concept

- **Apa yang Dibangun**: Sistem sinkronisasi transaksi real-time (*multi-tenant & multi-user live sync*) berbasis Firestore `onSnapshot` yang dipadukan dengan *local-first persistence* (IndexedDB + LocalStorage).
- **Target Pengguna**: Pemilik laundry dan kasir multi-cabang/multi-karyawan yang mengoperasikan sistem kasir dari berbagai HP atau PC secara bersamaan.
- **Nilai Utama**: Jaminan 100% data transaksi anti-hilang, pendapatan harian/bulanan tidak mendadak nol, dan kolaborasi antar-karyawan sinkron otomatis seketika.

---

### 2. User Experience & Visual Design

- **Alur Pengguna Tanpa Gangguan**:
  1. Kasir membuat transaksi baru atau mengubah status menjadi *Proses*, *Selesai*, atau *Diambil*.
  2. Kartu transaksi langsung berpindah tab di Dashboard tanpa delay.
  3. Pemilik laundry yang membuka dashboard dari tempat lain melihat daftar transaksi dan total kas terbarui otomatis tanpa perlu me-refresh halaman.
  4. Menu Laporan dan Buku Kas menampilkan angka omzet dan riwayat secara konsisten, bahkan setelah aplikasi ditutup dan dibuka kembali.
- **Visual Identity & Theme**:
  - Mempertahankan tema khas Kafelas Laundry: Deep Crimson/Maroon (`#800000`), Slate Canvas (`#F8FAFC`), dan aksen Emerald (`#047857`) untuk transaksi lunas.
  - Tabular numerals (`font-mono tabular-nums`) pada seluruh nominal uang dan nomor invoice agar tidak terjadi pergeseran layout.
- **Feedback & Status Interaktif**:
  - Penambahan badge status sinkronisasi halus di header:
    - `🟢 Cloud Tersinkron (Live)`: Koneksi Firestore aktif dan real-time.
    - `🟡 Menyimpan Cadangan...`: Sedang memproses simpan ke Cloud.
    - `⚪ Mode Offline (Tersimpan di HP)`: Bekerja tanpa internet dan otomatis tersinkron saat kembali online.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Stop Overwrite Menghapus Transaksi 'Diambil'**:
  - *Pendekatan*: Transaksi dengan status 'Diambil' tetap disimpan dalam database lokal (IndexedDB) dan diikutsertakan dalam agregasi finansial (Laporan & Buku Kas). Hanya tampilan antrean Dashboard utama yang menyaring `t.status !== 'Diambil'`.
  - *Alasan*: Menghilangkan akar penyebab "data tiba-tiba hilang", karena sebelumnya `fetchTransaksiAktif` menimpa array lokal dengan data yang mengecualikan 'Diambil'.
- **Keputusan 2: Firestore Real-Time Listener (`onSnapshot`) vs Polling Cooldown**:
  - *Pendekatan*: Mengganti polling manual dengan listener `onSnapshot` terbatas pada cabang aktif (`laundries/{laundryId}/transaksi`).
  - *Alasan*: Kebutuhan mutlak multi-user kasir & owner agar input data dari satu HP langsung terlihat di HP lain tanpa delay.
- **Keputusan 3: Penjaminan Otomatis Dokumen Cabang (`laundries/{laundryId}`)**:
  - *Pendekatan*: Memastikan pembuatan awal cabang (`setDoc(branchRef)`) selalu tereksekusi sebelum operasi transaksi, mencegah kegagalan izin Firestore (`permission-denied`).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KAFELAS LAUNDRY MULTI-USER                      │
└────────────────────────────────────────────────────────────────────────┘
          │                                            │
   [ Kasir HP 1 ]                                [ Owner / Kasir HP 2 ]
          │                                            │
          ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FIRESTORE CLUSTER (CLOUD)                         │
│  Collection: laundries/{laundryId}/transaksi                           │
│  - Real-time onSnapshot Stream                                         │
│  - Server Timestamp validation & Delta changes                         │
└────────────────────────────────────────────────────────────────────────┘
          │                                            │
          ▼                                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    CLIENT REAL-TIME DATA ENGINE                        │
│                                                                        │
│   ┌────────────────────────┐         ┌───────────────────────────────┐ │
│   │   Reactive State Store │ ◄─────► │   IndexedDB Local Cache       │ │
│   │   (React transaksiList)│         │   (kafelas_laundry_v2)        │ │
│   └────────────────────────┘         └───────────────────────────────┘ │
│                │                                                       │
│                ▼                                                       │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                      VIEW CONSUMERS                              │ │
│   │  • Dashboard: Saring antrean aktif (Diterima/Proses/Selesai)     │ │
│   │  • LaporanView: Hitung omzet & beban kerja (Aktif + Diambil)    │ │
│   │  • BukuKasView: Hitung arus kas masuk (DP + Pelunasan)           │ │
│   │  • ArsipView: Tampilkan riwayat pesanan yang sudah Diambil       │ │
│   └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

#### Alur Eksekusi Perbaikan:
1. **Perbaikan `src/utils/firebaseSync.ts`**:
   - Tambahkan fungsi listener real-time `subscribeTransaksi(laundryId, callback)` menggunakan `onSnapshot`.
   - Modifikasi `fetchTransaksiAktif` dan pemuatan data agar tidak menghapus transaksi 'Diambil' dari IndexedDB dan state riwayat.
   - Pastikan setiap penyimpanan transaksi menulis timestamp pembaruan yang seragam.
2. **Pembaruan `src/App.tsx`**:
   - Pasang subscription `onSnapshot` saat cabang aktif terpilih, sehingga mutasi transaksi dari kasir lain langsung ter-update di layar.
   - Perbaiki fungsi `updateTransaksiList` agar melakukan *smart merge* (menggabungkan pembaruan tanpa menghapus data transaksi tersimpan lainnya).
   - Pastikan pembuatan akun/cabang selalu mendaftarkan dokumen `/laundries/{laundryId}` ke Firestore.
3. **Pembaruan `src/views/LaporanView.tsx` & `src/views/BukuKasView.tsx`**:
   - Pastikan kalkulasi omzet dan rekapitulasi transaksi mencakup seluruh transaksi cabang (baik yang masih di antrean maupun yang sudah berstatus 'Diambil' di arsip).
4. **Verifikasi & Uji Kompilasi**:
   - Jalankan `compile_applet` dan `lint_applet` untuk memastikan kode bebas dari galat kompilasi atau TypeScript error.
