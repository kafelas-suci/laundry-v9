# Arsitektur & Implementasi Paket Langganan: Basic vs Pro (Kafelas Laundry)

Rencana perancangan sistem tiering langganan (Paket Basic vs Paket Pro) pada aplikasi Kafelas Laundry untuk membedakan hak akses fitur secara elegan, memberikan nilai maksimal bagi UMKM pemula (Basic), dan membuka kapabilitas enterprise (Pro) bagi pengusaha laundry yang bertumbuh.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan sesi tanya-jawab pada fase klarifikasi, keputusan utama arsitektur paket telah disepakati sebagai berikut:

- **Fokus Utama Pembeda**: Batasan jumlah cabang outlet, staf kasir & penugasan cucian, serta ekspor laporan keuangan mendalam.
- **Batasan Cabang Paket Basic**: Terkunci presisi hanya untuk **1 Cabang Utama** (tidak dapat menambah outlet cabang baru).
- **Fitur Laporan & Analitik Eksklusif Pro**: 
  - Ekspor seluruh pembukuan ke file spreadsheet **Excel (.xlsx)**.
  - Pembuatan dokumen cetak **PDF Resmi A4** siap audit dengan kop surat toko.
  - Modul **Grafik Komparasi Historis** (analisis pertumbuhan omzet, laba bersih, transaksi: Bulan Ini vs Bulan Lalu, Tahun Ini vs Tahun Lalu).
- **Staf Kasir & Penugasan**:
  - **Basic**: Maksimal 1 akun kasir, tanpa fitur penugasan staf pengerjaan per pakaian.
  - **Pro**: Kasir tanpa batas + akses modal penugasan staf (*Assign Staff*) ke tahapan cuci, setrika, atau packing.
- **Branding Struk Thermal**:
  - **Basic**: Cetak struk thermal Bluetooth teks standar & kirim WA.
  - **Pro**: Cetak Logo Brand & Tanda Tangan Digital Resmi di fisik struk printer thermal & struk gambar HD.

---

### 1. Overview & Core Concept

- **What It Does**: Memberikan pemisahan tier langganan yang jelas antara **Paket Basic** dan **Paket Pro**. Sistem secara otomatis mendeteksi tier aktif toko dan memberikan akses penuh atau menampilkan modal perbandingan fitur saat pengguna mencoba mengakses kapabilitas Pro.
- **Target Audience / Persona**:
  - *Pemilik Laundry Pemula (Basic)*: Mengoperasikan 1 outlet rumahan, membutuhkan kasir kas harian cepat tanpa kerumitan administrasi.
  - *Pengusaha Laundry Berkembang (Pro)*: Mengelola 2 atau lebih cabang, mempekerjakan banyak kasir/kru pengerjaan, dan memerlukan pelaporan keuangan analitik berkala.
- **Key Value**: Mengubah Kafelas Laundry menjadi platform POS & SaaS siap-monetisasi dengan pengalaman pengguna yang transparan, profesional, dan bebas friksi.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Pengecekan Tier di Dashboard & Sidebar**:
   - Status tier ditampilkan tenang pada Sidebar Desktop dan Halaman Pengaturan (misal: label unboxed `Paket Basic · Aktif` atau `Paket Pro · Aktif`).
2. **Akses Fitur Pro oleh Pengguna Basic**:
   - Jika pengguna Basic mengklik tombol **"Tambah Cabang"** di Modal Switch Branch, tombol **"Ekspor Excel (.xlsx)"** / **"Cetak PDF Resmi"** di Laporan Keuangan, atau mencoba mengunggah Logo/Tanda Tangan Struk, aplikasi tidak melempar error kaku, melainkan membuka **Modal Komparasi & Upgrade Pro**.
3. **Modal Komparasi & Upgrade Paket**:
   - Menyajikan matriks komparasi 2 kolom (Basic vs Pro) yang transparan, berbasis poin riil (bukan klaim samar).
   - Dilengkapi tombol call-to-action langsung ke WhatsApp Admin/Owner untuk aktivasi lisensi Pro.

#### B. Visual Identity & Theme Tokens
- **Palet Warna (60-30-10 Rule)**:
  - *Dominant Canvas (60%)*: Dark slate `#0F172A` / `#090D16` dengan permukaan kartu `#1E293B`.
  - *Structural Surfaces (30%)*: Garis hairline pembatas tipis `rgba(255, 255, 255, 0.08)` dan tipografi muted `#94A3B8`.
  - *Accent Budget (10%)*: Maroon identitas Kafelas Laundry (`#800000` / `#991B1B`) dipadukan aksen emas/amber (`#F59E0B`) khusus indikator tier Pro.
- **Anti-Slop & Zero-Pill Discipline**:
  - Tidak ada badge pill bertumpuk (*no badge sandwich*). Metadata paket disajikan dalam teks tipografi bersih dengan pemisah titik `·`.
  - Angka kuota, nominal omzet, dan jumlah cabang menggunakan angka tabular monospace (`tabular-nums font-mono`).
  - Gembok fitur Pro menggunakan ikon mikro minimalis `Lock` tanpa animasi berlebihan.

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Perombakan Konfigurasi Subscription Laundry-Native
- **Pendekatan Terpilih**: Mengganti konfigurasi lama (yang sebelumnya memiliki sisa atribut studio foto) dengan skema limit khusus laundry:
  ```typescript
  export interface LaundrySubscriptionLimits {
    tier: 'basic' | 'pro';
    maxBranches: number;            // Basic: 1, Pro: Unlimited (999)
    maxCashiers: number;            // Basic: 1, Pro: Unlimited (999)
    canAssignStaff: boolean;        // Basic: false, Pro: true
    canExportExcel: boolean;        // Basic: false, Pro: true
    canExportOfficialPdf: boolean;  // Basic: false, Pro: true
    canViewComparisonGrowth: boolean;// Basic: false, Pro: true
    canUseCustomLogoOnReceipt: boolean; // Basic: false, Pro: true
    canUseSignatureOnReceipt: boolean;  // Basic: false, Pro: true
    maxMonthlyTransactions: number; // Basic: 300, Pro: Unlimited
  }
  ```
- **Alasan**: Menghilangkan inkonsistensi tipe data dan memastikan seluruh guard di aplikasi berbicara dalam bahasa domain bisnis laundry.

#### Decision 2: Guard Halus Berbasis Modal Interaktif (Bukan Menonaktifkan Mati)
- **Pendekatan Terpilih**: Tombol seperti "Ekspor Excel", "Cetak PDF Laporan", dan "Tambah Cabang" tetap terlihat dengan penanda badge gembok Pro mikro. Saat diklik oleh akun Basic, modal penjelasan upgrade langsung muncul.
- **Alasan**: Mendorong konversi (*upselling*) secara alami tanpa membingungkan pengguna baru tentang keberadaan fitur tersebut.

---

### 4. Technical Architecture & Data Strategy

#### A. System & Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     Kafelas Laundry App                      │
└──────────────────────────────┬───────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
    ┌───────────────────────┐       ┌───────────────────────┐
    │     Paket BASIC       │       │       Paket PRO       │
    │  - 1 Cabang Laundry   │       │  - Multi Cabang (∞)   │
    │  - 1 Kasir            │       │  - Kasir & Kru (∞)    │
    │  - POS & Struk Standar│       │  - Ekspor Excel & PDF │
    │  - Arus Kas Harian    │       │  - Analisis Komparasi │
    └──────────┬────────────┘       │  - Logo & TTD Struk   │
               │                    └──────────┬────────────┘
               │ (Trigger fitur Pro)           │ (Akses langsung)
               ▼                               │
    ┌─────────────────────────┐                │
    │ Modal Upgrade &         │◄───────────────┘
    │ Komparasi Fitur         │
    └─────────────────────────┘
```

#### B. Component & State Implementation Plan
1. **`src/types/index.ts` & `src/utils/subscription.ts`**:
   - Mendefinisikan tipe `LaundrySubscriptionTier` (`'basic' | 'pro'`) dan konfigurasi limit fitur.
   - Fungsi helper `canAccessFeature(tier, featureName)` dan `getBranchLimit(tier)`.
2. **`src/components/UpgradePlanModal.tsx`**:
   - Modal responsif berisi komparasi fitur Basic vs Pro, kartu paket berfokus nilai bisnis, dan tombol hubungi admin via WhatsApp untuk upgrade instan.
3. **Guard Integrasi Komponen**:
   - **`SwitchBranchModal.tsx`**: Cek batas penambahan cabang baru.
   - **`LaporanView.tsx`**: Guard ekspor Excel dan cetak PDF resmi, serta grafik komparasi.
   - **`SettingsView.tsx`**: Pengaturan logo & tanda tangan struk thermal.
   - **`StatusPengerjaanView.tsx`**: Guard tombol penugasan staf cuci/setrika.
   - **`SuperAdminDashboard.tsx`**: Pengaturan tier lisensi per brand/laundry.

---

### Verification & Testing Plan

1. **Simulasi Akun Basic**:
   - Coba tambah cabang ke-2 di SwitchBranchModal -> Modal upgrade Pro muncul dengan informasi yang jelas.
   - Buka Laporan -> Klik Ekspor Excel atau Cetak PDF -> Modal penawaran Pro terbuka.
   - Transaksi POS, cetak struk biasa, dan arus kas harian tetap berjalan lancar 100%.
2. **Simulasi Akun Pro**:
   - Seluruh batasan terbuka: multi-cabang aktif, ekspor Excel dan cetak PDF berjalan normal, penugasan kasir bekerja.
3. **Build & Type Check**:
   - Menjalankan `tsc --noEmit` dan `npm run build` untuk menjamin tidak ada regresi kode.
