# Perbaikan Logo Instalasi Presisi di Tengah & Paket Download ZIP (`kflsagnd.web.app`)

Memperbaiki ikon instalasi aplikasi (PWA Android, iOS, & PC) agar sesuai dengan gambar logo resmi **kafela's Agenda** dan terkunci tepat di titik tengah tanpa terpotong, sekaligus memperbaiki tombol **Download ZIP Siap Upload (3 Detik)** dengan hasil *build* terbaru.

### User Review & Critical Decisions

> [!IMPORTANT]
> Rencana ini telah diperbarui untuk mencakup perbaikan khusus pada **Logo Instalasi Aplikasi** sesuai gambar logo yang Bapak lampirkan:

- **Logo Instalasi 100% Presisi di Tengah**: Mengganti aset ikon lama yang miring/bergeser dengan desain logo resmi **kafela's Agenda** (lingkaran kaligrafi cokelat dengan tulisan *"kafela's"* yang menyambung ke lingkaran kanan dan *"Agenda"* di bawahnya) yang diposisikan tepat di titik pusat kanvas `(256, 256)` dengan ruang aman (*safe zone* 80%) agar saat di-install di HP maupun PC tampil utuh dan rapi di tengah.
- **Pembaruan Isi Paket ZIP**: Bundel `kflsagnd-kasir-pc.zip` akan dikompilasi ulang mencakup logo baru, label **"Kasir Cepat"** (tanpa kata Walk-in/Pasfoto), sinkronisasi warna *header* & *status bar* saat ganti tema, serta pembatasan tampilan masa aktif untuk Anggota/Kru.
- **Visibilitas Tombol Download ZIP**: Tombol **Download ZIP Siap Upload (3 Detik)** hanya ditampilkan saat dibuka di **mode preview** dan otomatis disembunyikan saat sudah tayang di `kflsagnd.web.app`.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. Menata ulang seluruh aset ikon instalasi (`pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512x512.png`, `apple-touch-icon.png`, `logo-kafela.svg`, dan `icon.svg`) menggunakan *vector path* presisi sesuai gambar logo **kafela's Agenda** yang Bapak kirimkan.
  2. Memperbaiki mekanisme unduhan tombol **Download ZIP Siap Upload (3 Detik)** agar tidak terblokir oleh cache Service Worker atau iframe preview.
- **Target Audience / Persona**: Owner dan tim studio yang menginstal aplikasi ke layar utama HP/Desktop serta mengunggah pembaruan ke `kflsagnd.web.app`.
- **Key Value**: Ikon aplikasi terlihat profesional dan simetris tepat di tengah saat di-install di perangkat apa pun, serta file ZIP yang diunduh langsung memuat seluruh perbaikan terbaru.

---

### 2. User Experience & Visual Design

- **Penyebab Logo Sebelumnya Tidak di Tengah & Solusinya**:
  - *Masalah Sebelumnya*: File SVG lama menggunakan koordinat busur yang tidak berpusat di `(256, 256)` dan memakai elemen `<text>` font sistem yang bergeser saat diubah menjadi ikon oleh Android/Windows, ditambah atribut `purpose: "any maskable"` digabung tanpa *padding* zona aman.
  - *Solusi Presisi*:
    - Seluruh bentuk huruf **"kafela's"** (dengan ekor huruf *k* dan sambungan ekor huruf *s* ke tepi lingkaran) serta **"Agenda"** digambar menggunakan kurva vektor murni (*outlined paths*) dan di-render menjadi PNG beresolusi tinggi yang terkunci tepat di titik tengah `(50%, 50%)`.
    - Pada ikon `maskable` (untuk launcher Android yang memotong ikon menjadi bulat/squircle), diameter lingkaran logo ditempatkan di dalam **Safe Zone tengah (radius 76% dari kanvas)** di atas latar krem halus `#F9F7F4`, sehingga lingkaran cokelat tidak pernah terpotong dan selalu pas di tengah.
- **Key User Flows**:
  1. Saat pengguna menginstal aplikasi di Android, iOS, atau PC, ikon yang muncul di layar utama dan *splash screen* menampilkan logo **kafela's Agenda** yang bulat simetris tepat di tengah.
  2. Saat Owner menekan tombol **Download ZIP Siap Upload (3 Detik)** di menu samping preview, browser langsung mengunduh bundel `kflsagnd-kasir-pc.zip` terbaru yang sudah berisi logo baru dan seluruh perbaikan UI.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Pemisahan Ikon `any` dan `maskable` Sesuai Standar PWA**
  - *Chosen Approach*: Memisahkan definisi ikon standar (`pwa-192x192.png`, `pwa-512x512.png` dengan `purpose: 'any'`) dari ikon adaptif (`pwa-maskable-512x512.png` dengan `purpose: 'maskable'`) di `vite.config.ts`, serta merender ulang keempat file PNG dan SVG langsung dari geometri logo resmi yang terpusat.
  - *Why*: Menjamin baik launcher Android (yang memotong tepi 15% luar ikon) maupun iOS/Desktop (yang menampilkan kotak penuh dengan sudut membulat) sama-sama menampilkan lingkaran logo tepat di tengah.
- **Decision 2: Unduhan ZIP Berbasis Blob + Cache-Busting**
  - *Chosen Approach*: Menggunakan `fetch('/kflsagnd-kasir-pc.zip?v=' + Date.now(), { cache: 'no-store' })` dan `URL.createObjectURL(blob)` serta mengecualikan file `.zip` dari Service Worker cache.
  - *Why*: Memastikan klik tombol unduh di dalam preview selalu berhasil dan selalu mengambil hasil *build* paling baru.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│             Generator Aset Logo Resmi "kafela's Agenda"                 │
│                                                                         │
│  [Logo Resmi Vector/Canvas Centered at (256, 256)]                      │
│     ├──► public/logo-kafela.svg & public/icon.svg (Simetris Tengah)     │
│     ├──► public/pwa-192x192.png & pwa-512x512.png (Purpose: 'any')      │
│     ├──► public/pwa-maskable-512x512.png (Safe-Zone 80% Tengah)         │
│     └──► public/apple-touch-icon.png (180x180 iOS Home Screen)          │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Build Produksi & Pengemasan ZIP                      │
│                                                                         │
│  1. Update Manifest PWA di vite.config.ts & Handler Unduh di App.tsx    │
│  2. Jalankan `npm run build` -> menghasilkan folder `dist/` terbaru     │
│  3. Kemas `dist/` + `UPLOAD_KE_KFLSAGND.bat` -> `kflsagnd-kasir-pc.zip` │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **Aset Ikon PWA & Header/Splash**: Seluruh referensi `/logo-kafela.svg`, `/icon.svg`, `/pwa-192x192.png`, `/pwa-512x512.png`, `/pwa-maskable-512x512.png`, dan `/apple-touch-icon.png` diperbarui secara serempak sehingga baik tampilan di dalam aplikasi, *splash screen*, maupun ikon hasil *install* di HP/PC konsisten dan presisi di tengah.
  - **Handler `handleDownloadZipSiapUpload` (`src/App.tsx`)**: Mengunduh `/kflsagnd-kasir-pc.zip` terbaru menggunakan *Blob URL* dengan indikator *loading* pada tombol di Sidebar PC dan Drawer Mobile (khusus mode preview).
