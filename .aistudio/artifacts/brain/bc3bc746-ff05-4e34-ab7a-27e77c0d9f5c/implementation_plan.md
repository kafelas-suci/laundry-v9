# Penyederhanaan Formulir Transaksi Kasir (Mode Ringkas Cepat)

Transformasi formulir transaksi (`TambahEditView`) menjadi antarmuka kasir super ringkas yang berfokus pada kecepatan transaksi harian: Nama Pelanggan, Nominal Pembayaran, dan Tombol Lunas sejajar bersebelahan, dengan opsi pembukaan rincian cucian & data pelengkap secara dinamis saat dibutuhkan.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi yang telah diberikan pada sesi tanya-jawab:
> - **Susunan Baris Utama**: Nama Pelanggan, Nominal Pembayaran, dan Tombol Lunas diposisikan sejajar bersebelahan dalam satu baris kartu utama yang responsif.
> - **Penyembunyian Bagian Rinci**: Bagian rincian cucian (pilihan layanan, berat/satuan, tabel nota) serta detail tambahan (alamat, no telepon, catatan, diskon) disembunyikan secara default.
> - **Pemicu Tampilan Lengkap**: Disediakan tombol ekspansi akordeon yang intuitif (`+ Buka Rincian Cucian & Layanan`) agar kasir dapat memunculkan bagian detail hanya jika ingin mencatat rincian kiloan/satuan tertentu.
> - **Layanan Otomatis**: Jika transaksi disimpan dalam mode ringkas tanpa membuka rincian, sistem secara cerdas menetapkan layanan default toko agar kalkulasi database dan cetak struk tetap 100% valid.

---

### 1. Overview & Core Concept

- **Apa yang Dibangun**: Redesain tata letak form transaksi kasir (`TambahEditView`) dari format vertikal panjang menjadi arsitektur bertingkat: **Mode Cepat (Quick Input)** di bagian atas dan **Mode Rinci (Detailed Accordion)** yang tersembunyi rapi di bawahnya.
- **Target Pengguna**: Kasir laundry yang melayani antrean pelanggan sibuk di jam-jam padat (jam pulang kerja / pagi hari) di mana kasir hanya butuh waktu 3-5 detik untuk mencatat nama, nominal uang diterima, dan status lunas.
- **Nilai Utama**: Menghilangkan kekacauan visual (*cognitive load*), mempercepat proses input kasir hingga 70%, sambil tetap mempertahankan fleksibilitas pemilihan layanan kiloan/satuan lengkap saat diperlukan.

---

### 2. User Experience & Visual Design

#### A. Key User Flows
1. **Alur Cepat (Default - 3 Detik Selesai)**:
   - Kasir membuka Transaksi Baru.
   - Layar langsung menampilkan kartu utama:
     - Input **Nama Pelanggan** (dengan saran pencarian otomatis jika pelanggan lama).
     - Input **Nominal Pembayaran** (Rp) di sampingnya.
     - Tombol toggle **Lunas** (warna marun `#800000` / hijau aktif) tepat di sebelahnya.
   - Kasir mengetik nama, isi nominal (atau klik Lunas untuk otomatis terisi penuh), lalu klik **Simpan Transaksi**.
2. **Alur Rinci (Saat Pelanggan Meminta Timbang Kiloan / Layanan Khusus)**:
   - Kasir mengklik tombol `+ Buka Rincian Cucian & Layanan`.
   - Bagian rincian meluncur terbuka dengan animasi halus (*smooth slide transition*):
     - Pemilih jenis layanan cucian (Cuci Kering Setrika, Bedcover, dll.).
     - Input berat/jumlah kiloan.
     - Tabel daftar item nota.
     - Data pelengkap (No. WhatsApp, Alamat, Catatan Khusus, dan Diskon Nota bagi Owner).
   - Kasir dapat menutup kembali (`- Sembunyikan Rincian`) kapan saja tanpa kehilangan data yang sudah diinput.

#### B. Visual Hierarchy & Theme
- **Baris Utama Bersisian**:
  - Kolom 1 (Fleksibel ~50% lebar): Input Nama Pelanggan dengan ikon pengguna minimalis.
  - Kolom 2 (Kompak ~30% lebar): Input Nominal Bayar dengan awalan `Rp` tabular numerik (`tabular-nums font-mono`).
  - Kolom 3 (Aksi Cepat ~20% lebar): Tombol toggle `Lunas` dengan ikon centang aktif.
- **Palet Warna (Disiplin 60-30-10)**:
  - 60% Kanvas: Latar belakang bersih `bg-slate-100`.
  - 30% Permukaan Kartu: Kartu putih `bg-white` dengan garis batas halus `border-slate-200` dan radius seragam `rounded-2xl`.
  - 10% Aksen Aksi: Warna brand signature `#800000` untuk tombol simpan & aksen lunas.
- **Tombol Ekspansi**: Menggunakan tombol berpola garis putus-putus atau pill-free text button dengan ikon chevron berputar halus saat dibuka/ditutup.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Layanan Otomatis (Fallback Service)**:
  - *Pendekatan*: Jika kasir menyimpan dalam mode ringkas tanpa menambah item cucian manual, sistem otomatis membuat 1 item dari layanan utama aktif (misal "Cuci Komplit Reguler" dengan nominal sesuai harga atau total nominal).
  - *Alasan*: Menjaga kompatibilitas menyeluruh dengan mesin cetak struk Bluetooth, Laporan Keuangan, dan Riwayat Transaksi tanpa memicu error validasi "items kosong".
- **Keputusan 2: Penanganan Status Lunas vs Nominal DP**:
  - *Pendekatan*: Mengklik tombol `Lunas` langsung mengisi nominal pembayaran sama dengan total tagihan. Jika kasir menonaktifkan `Lunas`, kasir bisa memasukkan angka DP (Down Payment) sesuai uang yang diterima.
  - *Alasan*: Menghilangkan kebingungan kasir dan mengurangi jumlah ketukan tombol seminimal mungkin.

---

### 4. Technical Architecture & Data Strategy

```
┌───────────────────────────────────────────────────────────────┐
│                    TambahEditView Container                   │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 1. BARIS UTAMA CEPAT (Selalu Tampak)                    │  │
│  │ ┌──────────────────┐ ┌────────────────┐ ┌─────────────┐ │  │
│  │ │ Nama Pelanggan   │ │ Nominal Bayar  │ │ [✓] Lunas   │ │  │
│  │ └──────────────────┘ └────────────────┘ └─────────────┘ │  │
│  └─────────────────────────────────────────────────────────┘  │
│                               │                               │
│              [+ Buka Rincian Cucian & Layanan]                │
│                               │                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 2. AREA RINCIAN (Tersembunyi by Default / Collapsible)  │  │
│  │  - Pemilih Layanan Cucian & Input Berat/Jumlah          │  │
│  │  - Tabel Daftar Layanan Nota                            │  │
│  │  - Nomor WhatsApp & Alamat Pelanggan                    │  │
│  │  - Catatan Khusus Cucian                                │  │
│  │  - Pilihan Non-Tunai / Bank Transfer                    │  │
│  │  - Diskon Nota (Khusus Akun Owner)                      │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ 3. STICKY ACTION BAR: [ Simpan Transaksi ]              │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

#### State & Handlers Mapping:
- `isDetailedOpen: boolean` (default: `false` untuk transaksi baru, `true` jika mode edit transaksi lama).
- Sinkronisasi instan antara input nominal, toggle `isLunas`, dan kalkulasi total tagihan.
- Validasi nama pelanggan tetap menjadi syarat utama sebelum penyimpanan.
