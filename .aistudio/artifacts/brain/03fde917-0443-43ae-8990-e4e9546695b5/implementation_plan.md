# Tur Panduan Interaktif In-App Spotlight (Interactive Walkthrough)

Panduan interaktif langkah demi langkah langsung di antarmuka aplikasi utama Kafelas Laundry untuk memandu kasir dan owner memahami alur operasional POS dari awal hingga akhir.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan dan preferensi yang dikonfirmasi pengguna pada sesi interaktif:
> - **Lokasi Tur**: Langsung di aplikasi utama (In-App Spotlight Tour) dengan menyorot elemen dan tombol asli secara real-time.
> - **Mekanisme**: Spotlight interaktif yang memandu klik tombol asli langkah demi langkah.
> - **Pemicu & Akhir Tur**: Tur dapat dipicu kapan saja atau otomatis, dengan opsi akhir berupa tombol "Coba Lagi" atau "Selesai & Hapus Transaksi Demo".

---

## 1. Overview & Core Concept

- **What It Does**: Memberikan panduan visual interaktif (spotlight overlay) yang menuntun pengguna mengeklik tombol-tombol nyata di aplikasi (Tambah Transaksi -> Isi data -> Lunas -> Nota -> Tombol Kerjakan merah -> Tombol Diambil hijau -> Selesai / Coba Lagi).
- **Target Audience / Persona**: Kasir baru dan pemilik studio laundry yang ingin memahami cara pakai aplikasi dengan cepat tanpa video rekaman berat.
- **Key Value**: Pengalaman belajar langsung (learning by doing) yang sangat intuitif dan mudah dipahami.

---

## 2. User Experience & Visual Design

### Key User Flows (Langkah Tur Interaktif)
1. **Pemicu Tur**: Tombol "Mulai Tur Panduan" di Dashboard atau Pengaturan.
2. **Langkah 1 (Tambah Transaksi)**: Overlay gelap dengan lubang spotlight (cutout) di tombol "Tambah Transaksi" (+ Transaksi Baru).
3. **Langkah 2 (Isi Nama & Layanan)**: Spotlight menyorot input nama pelanggan dan pemilihan layanan cuci.
4. **Langkah 3 (Pelunasan & Nota)**: Spotlight menyorot tombol status Pembayaran "Lunas" dan tombol simpan, dilanjutkan dengan modal Nota Struk.
5. **Langkah 4 (Status Pengerjaan - Kerjakan)**: Di daftar transaksi / status pengerjaan, spotlight menyorot tombol status merah "Kerjakan" untuk memulai cucian.
6. **Langkah 5 (Status Pengerjaan - Diambil)**: Spotlight menyorot tombol status hijau untuk menandai cucian telah "Diambil" oleh pelanggan.
7. **Langkah 6 (Selesai / Coba Lagi)**: Dialog penutup tur dengan opsi "Coba Lagi" (mengulang tur dari awal) atau "Selesai & Hapus Transaksi Demo" (membersihkan data uji coba).

### Visual Identity & Theme
- **Aesthetic Direction**: Utilitarian SaaS, bersih, profesional, dengan fokus visual high-contrast pada elemen yang disorot (spotlight effect dengan `box-shadow` atau SVG clip-path mask).
- **Color Palette**: Netral gelap transparan (`bg-black/70`) dengan aksen emerald green (`#16A34A`) dan maroon (`#800000`) khas Kafelas Laundry.

---

## 3. Key Product Decisions & Trade-Offs

- **Chosen Approach**: In-App Spotlight Tour menggunakan komponen React kustom yang mendeteksi posisi elemenDOM asli (`getBoundingClientRect`) dan menampilkan kotak petunjuk (tooltip) di sekitarnya.
- **Why**: Jauh lebih fleksibel daripada video statis karena pengguna benar-benar menekan tombol asli di aplikasi dan melihat langsung reaksi sistem.
- **State Management**: Menyimpan status langkah aktif (`tutorialStep: number | null`) di state global/lokal sehingga dapat maju mundur atau dibatalkan kapan saja.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│               InteractiveTourManager                   │
│  (State: step 1..6, targetRef coordinates detector)    │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌──────────────┐                        ┌──────────────┐
│  Spotlight   │                        │ Tooltip Card │
│  Overlay     │                        │ (Instructions)
└──────────────┘                        └──────────────┘
```

- **Interactive Component Mapping**:
  - `InteractiveTour.tsx`: Komponen wrapper yang merender backdrop gelap, spotlight cutout, dan kartu instruksi mengambang.
  - Integration in `DashboardView.tsx`, `TambahEditView.tsx`, `StatusPengerjaanView.tsx`, dan `ReceiptModal.tsx`: Menambahkan atribut `data-tour="..."` atau ref pada tombol target agar dapat dilacak dengan akurat.
