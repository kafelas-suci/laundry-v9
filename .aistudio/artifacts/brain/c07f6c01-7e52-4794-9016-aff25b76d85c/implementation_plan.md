# Arsitektur Multi-Brand (White-Label) & Super Admin Dashboard

Rencana implementasi sistem multi-tenant untuk mendukung 30+ brand klien pada satu infrastruktur Firebase, memungkinkan akses web profil publik via slug URL (`kflsagnd.web.app/:brandSlug`) atau custom domain (`brand.web.app`), penyembunyian tombol akses internal dari publik, serta portal Super Admin untuk mengelola pendaftaran dan lisensi brand.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan arsitektur utama yang telah disepakati dari sesi klarifikasi:

- **Confirmed Decision 1 (Tampilan Brand Publik)**: Ketika pengunjung mengakses URL brand seperti `/kfls` atau `brand.web.app`, sistem langsung menyajikan Web Profil & Portofolio resmi brand tersebut. Tombol login staf/owner disembunyikan sepenuhnya dari pandangan publik dan hanya dapat diakses melalui rute privat (misal `/kfls/app`, parameter `?login=1`, atau ketukan rahasia pada footer).
- **Confirmed Decision 2 (Format Domain & URL)**: Sistem mendukung ganda: slug URL pada domain utama (`kflsagnd.web.app/kfls`, `kflsagnd.web.app/nama-brand`) sekaligus pemetaan multi-domain / custom domain di Firebase Hosting (`brand.web.app`, `studioanda.com`).
- **Confirmed Decision 3 (Manajemen 30+ Klien)**: Disediakan Portal Super Admin terpusat dengan otentikasi khusus untuk mendaftarkan nama brand baru, membuat slug URL unik, menetapkan paket langganan (Standar/Pro/Ultimate), kuota jadwal, serta mengaktifkan atau menangguhkan lisensi klien.
- **Rekomendasi Tambahan**: Setiap brand memiliki isolasi data yang aman pada Firestore (`/owners/{ownerId}`) yang diindeks dalam koleksi pendaftaran brand (`brands_registry`), sehingga 1 project Firestore mampu menampung 30+ bahkan ratusan brand tanpa konflik data.

---

### 1. Overview & Core Concept

- **What It Does**: Mengubah aplikasi dari single-tenant menjadi platform Software-as-a-Service (SaaS) multi-tenant berlabel putih (white-label). Klien dapat menjual jasa studio dengan identitas mereka sendiri, memiliki tautan profil publik yang bersih, dan pemilik platform (Super Admin) memiliki kontrol penuh atas lisensi dan langganan.
- **Target Audience / Persona**:
  1. *Super Admin (Pemilik Platform)*: Mengelola akun klien, lisensi 30+ studio, status aktif/kedaluwarsa, dan paket fitur.
  2. *Owner Studio Klien & Kru*: Mengelola agenda, kasir cepat, laporan keuangan, dan portofolio dengan identitas brand mereka sendiri.
  3. *Pengunjung / Calon Klien Studio*: Mengakses web profil publik brand tanpa melihat menu atau tombol login internal studio.
- **Key Value**: Skalabilitas tanpa biaya server ganda (cukup 1 hosting + 1 database Firestore), kemudahan menjual software ke 30+ vendor foto/studio, dan privasi penuh antar-brand.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Alur Pengunjung Publik (`/nama-brand` atau `brand.web.app`)**:
   - Pengunjung membuka `kflsagnd.web.app/kfls`.
   - Sistem mencocokkan slug `kfls` dengan data profil brand.
   - Halaman profil interaktif muncul lengkap dengan logo brand, tema visual pilihan brand, bio, galeri karya, katalog paket, tombol WhatsApp, dan form booking instan.
   - Tidak ada tombol "Masuk Kasir", "Login Owner", atau status internal yang mengganggu mata pengunjung umum.
2. **Alur Masuk Kru / Owner Studio**:
   - Kru atau owner mengakses pintu masuk khusus: `kflsagnd.web.app/kfls/app` atau menekan logo kecil di footer dengan kombinasi gesture (atau link rahasia di WhatsApp selamat datang).
   - Muncul portal login kasir/owner yang sudah terkunci ke brand `kfls`.
   - Setelah login, mereka masuk ke workspace agenda, kasir printer thermal, dan pencatatan kas.
3. **Alur Super Admin (`/super-admin`)**:
   - Super Admin memasukkan PIN / Kredensial Master.
   - Menampilkan ringkasan metrik: Total Brand Terdaftar (misal 32/50), Brand Aktif, Brand Masa Percobaan, dan Pendapatan Lisensi.
   - Tombol "+ Daftarkan Brand Baru" dengan formulir: Nama Studio, Slug URL, WhatsApp Owner, Paket Tier, Tanggal Aktif, dan Catatan Domain.
   - Tabel direktori 30+ brand dengan aksi: Buka Web Publik, Buka Kasir, Edit Lisensi, Salin Tautan Cepat, atau Nonaktifkan Brand.

#### Visual Identity & Theme
- **Super Admin Console**: Desain utilitarian profesional berbasis slate gelap (`#0B0F19` canvas, `#111827` surface, aksen `#3B82F6` sapphire). Menekankan tata letak tabular rapat (`font-mono tabular-nums`), kartu metrik tanpa elevasi berlebih, serta indikator status unboxed yang bersih.
- **Brand Public Profile**: Menyesuaikan tema masing-masing brand yang tersimpan di database (`MODERN_STUDIO`, `LUXURY_GOLD`, `CLEAN_MINIMALIST`, `VERTICAL_LANDING`) dengan visual responsif pada perangkat seluler dan desktop.
- **Typography & Formatting**: Display menggunakan `Plus Jakarta Sans`, data tabular dan kode slug menggunakan `JetBrains Mono`.

---

### 3. Key Product Decisions & Trade-Offs

- **Multi-Tenant Routing (Hybrid Slug + Subdomain)**:
  - *Pendekatan*: Deteksi dilakukan pada sisi browser (`index.html` dan React Router / App state). Jika hostname bukan domain default AI Studio/kflsagnd (misal `customstudio.com` atau `studiob.web.app`), sistem memeriksa pemetaan hostname. Jika ada slug di path pertama (misal `/kfls`), sistem mengisolasi tenant ke slug tersebut.
  - *Keuntungan*: Klien yang belum membeli domain sendiri bisa langsung menggunakan link pendek `domain.web.app/kfls`. Klien yang ingin domain sendiri bisa diarahkan via Firebase Hosting Custom Domain tanpa ubah kode.
- **Pemisahan Web Publik vs Dashboard Kasir**:
  - *Pendekatan*: Mengikuti instruksi eksplisit pengguna: web publik menyembunyikan tombol login internal agar calon pelanggan studio fokus melihat portofolio dan melakukan booking. Kru studio diberikan rute `/kfls/app` atau akses tersembunyi yang elegan.
- **Koleksi Registri Brand (`brands_registry`)**:
  - *Pendekatan*: Menyimpan dokumen ringkas untuk tiap brand berisi `{ slug, ownerId, namaBrand, domain, paket, status, expiredAt }`.
  - *Keuntungan*: Pencarian tenant sangat cepat (O(1) read) tanpa perlu mengunduh seluruh profil dokumen pemilik yang besar.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Pengunjung & Klien Web                          │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
[URL: domain.web.app/:slug]                             [URL: /super-admin]
         │                                                       │
         ▼                                                       ▼
┌─────────────────────────────────┐                     ┌─────────────────┐
│     Client Tenant Resolver      │                     │  Super Admin    │
│  - Lookup slug di registry      │                     │  Lisensi 30+    │
│  - Mode Publik: Web Profil      │                     │  Brand Klien    │
│    (Sembunyikan tombol login)   │                     │  - Tambah Brand │
│  - Mode Kasir: Masuk via /app   │                     │  - Set Paket    │
└────────────────┬────────────────┘                     │  - Link Domain  │
                 │                                      └────────┬────────┘
                 ▼                                               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Firestore Multi-Tenant Layer                        │
│                                                                        │
│  /brands_registry/{slug}          --> Indeks pencarian & lisensi       │
│  /owners/{ownerId}               --> Profil, Logo, Rekening, Galeri    │
│  /owners/{ownerId}/jadwal        --> Jadwal agenda & transaksi kasir   │
│  /owners/{ownerId}/paket_layanan --> Katalog paket foto studio         │
│  /owners/{ownerId}/tim           --> Kru, fotografer & kasir           │
└────────────────────────────────────────────────────────────────────────┘
```

#### Struktur Data Firestore
1. `/brands_registry/{slug}`:
   - `slug`: string (misal: `"kfls"`)
   - `ownerId`: string (ID akun Firebase Owner)
   - `namaBrand`: string (misal: `"Kafela Studio"`)
   - `customDomain`: string opsional (misal: `"kfls.web.app"`)
   - `tier`: `"STANDAR" | "PRO" | "ULTIMATE"`
   - `status`: `"AKTIF" | "SUSPENDED" | "TRIAL"`
   - `expiredAt`: string ISO
   - `createdAt`: timestamp
2. `/owners/{ownerId}`: Profil lengkap tenant yang sudah ada (diperkaya dengan flag slug).

#### Rencana Modifikasi File:
1. `src/types/kafela.ts`: Menambahkan tipe data `BrandRegistryItem`, `SuperAdminState`, dan status lisensi.
2. `src/services/firebaseClient.ts`: Menambahkan fungsi lookup brand by slug/domain, fungsi CRUD untuk registri brand oleh Super Admin.
3. `src/components/SuperAdminDashboard.tsx`: Komponen UI manajemen 30+ brand, kartu metrik, formulir pendaftaran brand, dan generator tautan.
4. `src/App.tsx`: Integrasi deteksi URL (`/:slug`, `/:slug/app`, `/super-admin`), perutean tenant otomatis, serta kontrol penyamaran login kasir pada tampilan publik.
5. `public/profil.html` & `index.html`: Penyelarasan logika redirect dan penyembunyian tombol masuk internal pada mode public showcase.
