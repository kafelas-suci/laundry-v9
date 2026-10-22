# In-App Spotlight Tour: Panduan Interaktif Kasir Langkah demi Langkah

Menambahkan tur panduan interaktif berbasis lampu sorot (*spotlight tour*) yang dapat diakses kapan saja melalui menu **Pengaturan**, membimbing kasir baru memahami seluruh alur kerja operasional kasir laundry langkah demi langkah secara nyata.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan yang Dikonfirmasi oleh Pengguna:**
> - **Format Tur:** Tur sorot langkah demi langkah (*spotlight step-by-step*) pada elemen tombol aplikasi asli, bukan gambar mati atau slide statis.
> - **Waktu Kemunculan:** Dapat dibuka kapan saja oleh pengguna melalui menu **Pengaturan** (tombol "Mulai Tur Panduan Kasir").
> - **Integritas Data:** Tur memandu navigasi secara langsung dengan pratinjau aman tanpa mengotori atau mengubah pembukuan keuangan toko yang sebenarnya.

---

## 1. Overview & Core Concept

- **Apa yang Dilakukan:** Membuka panduan sorot dinamis di atas antarmuka kasir. Elemen tombol yang sedang dibahas akan disorot terang dengan bingkai fokus bercahaya hijau emerald (*spotlight pulse ring*), sementara latar belakang meredup dengan lembut (*backdrop dark scrim*). Balon teks panduan interaktif menyajikan instruksi yang ringkas, jelas, dan dapat dipindah langkah demi langkah.
- **Target Pengguna:** Kasir baru outlet, staf operasional, maupun pemilik laundry yang ingin melatih karyawan baru agar langsung mahir mengoperasikan kasir POS dalam waktu kurang dari 2 menit.
- **Nilai Utama:** Menghilangkan kebingungan kasir pemula saat menggunakan sistem POS untuk pertama kali, mengurangi risiko salah input transaksi, dan dapat dibuka kembali kapan pun dibutuhkan dari menu Pengaturan.

---

## 2. User Experience & Visual Design

### Alur Langkah Tur Interaktif (6 Langkah Kunci)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 1: Tombol "+ Transaksi Baru" (Dashboard Utama)                      │
│ Menyorot tombol utama transaksi masuk di bagian atas Dashboard.             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 2: Pengisian Pelanggan & Layanan (Formulir Kasir)                   │
│ Menyorot input Nama Pelanggan dan kartu pilihan Layanan Cuci Kiloan/Satuan. │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 3: Pelunasan & Tombol Simpan Transaksi                              │
│ Menyorot opsi status "Lunas" dan tombol simpan transaksi untuk cetak nota.  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 4: Pratinjau Struk & Tombol Cetak Thermal                           │
│ Menyorot struk kasir profesional dan opsi cetak Bluetooth / nota WhatsApp.  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 5: Pengerjaan Antrean Cucian (Dashboard)                            │
│ Menyorot tombol proses warna merah ("Kerjakan") di antrean cucian masuk.    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ LANGKAH 6: Pengambilan Cucian & Kasir Otomatis ("Diambil")                  │
│ Menyorot tombol hijau serah-terima cucian dan pencatatan kas otomatis.      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Spotlight Focus Ring:** Bingkai bersudut melengkung (`rounded-2xl`) dengan aksen emerald glowing (`ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900`) dan animasi denyut mikro lembut (*smooth pulse*) untuk memandu mata kasir ke tombol target.
- **Backdrop Scrim:** Layer gelap semitransparan 75% (`bg-slate-950/75 backdrop-blur-xs`) dengan lubang sorot yang dipotong rapi mengikuti koordinat target elemen asli (`getBoundingClientRect`).
- **Balon Kartu Panduan:** Kartu putih berbayang tegas (`shadow-2xl bg-white border border-slate-100 rounded-2xl p-5`) yang cerdas memposisikan diri di atas atau di bawah target sorot agar tidak menutupi tombol penting.
- **Navigasi Balon:**
  - Indikator progres langkah (*stepper*): Bulatan titik progres `1 / 6`.
  - Tombol aksi: **"Sebelumnya"**, **"Lanjut"**, **"Ulangi Tur"**, dan tombol silang **(X)** untuk keluar kapan saja.

---

## 3. Key Product Decisions & Trade-Offs

- **Pemicu dari Menu Pengaturan:**
  - *Keputusan:* Diletakkan di seksi "Website Publik & Panduan Outlet" pada menu Pengaturan (`SettingsView`), berdampingan dengan panduan infografis.
  - *Alasan:* Sesuai preferensi pengguna agar tidak mengganggu kasir yang sudah mahir dengan popup otomatis yang tidak diinginkan, namun selalu mudah ditemukan saat ada kasir baru yang butuh panduan.
- **State Navigation Terpadu (In-App Step Navigation):**
  - *Keputusan:* Tur secara otomatis memindahkan tampilan aktif (`activeView: 'dashboard' -> 'tambah_edit' -> 'detail_transaksi'`) sesuai langkah yang sedang disorot.
  - *Alasan:* Kasir mendapatkan pengalaman nyata melihat layar yang sebenarnya, bukan hanya simulasi di satu layar statis.
- **Penyimpanan Transaksi Uji Coba Demo:**
  - *Keputusan:* Jika kasir menyelesaikan pembuatan nota simulasi saat tur, sistem menyediakan tombol "Selesaikan Tur & Bersihkan Data Latihan" agar kas pembukuan asli tetap bersih 100%.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SettingsView.tsx                              │
│         [ Tombol: "Mulai Tur Panduan Kasir (Sorot Interaktif)" ]        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ triggers onStartTour()
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                App.tsx                                  │
│  State: isTourActive (boolean), tourStep (number: 0..5)                 │
│  Controllers: handleStartTour(), handleTourNext(), handleFinishTour()   │
└──────────────────┬──────────────────────────────────┬───────────────────┘
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│       InteractiveTourModal.tsx       │   │ Target Elements (DOM)        │
│  - Dynamic BoundingRect Tracker      │   │ - data-tour="btn-tambah"     │
│  - Spotlight cutout SVG/Div          │◄──┤ - data-tour="form-transaksi" │
│  - Step card floating container      │   │ - data-tour="btn-simpan"     │
│  - Next / Prev / Finish handlers     │   │ - data-tour="btn-kerjakan"   │
└──────────────────────────────────────┘   └──────────────────────────────┘
```

### Data Model & State Mapping
- `isTourActive: boolean` – Penanda apakah tur interaktif sedang berjalan.
- `tourStep: number` – Indeks langkah aktif (0 hingga 5).
- `data-tour="..."` – Atribut HTML data pada tombol-tombol utama di `DashboardView`, `TambahEditView`, dan `DetailTransaksiView` sebagai jangkar (*anchor*) sorotan spotlight.
