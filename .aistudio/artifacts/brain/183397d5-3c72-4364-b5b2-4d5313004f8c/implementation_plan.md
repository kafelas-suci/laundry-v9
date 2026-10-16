# Pemisahan & Penyempurnaan Fitur Cetak Struk dan Bagikan Struk (Revisi)

Rencana yang telah disesuaikan dengan instruksi: **Logika cetak Bluetooth Android sama sekali TIDAK diubah (100% dipertahankan seperti semula)**. Pembaruan hanya memisahkan tombol "Bagikan Struk" agar memiliki menu berbagi tersendiri, serta menambahkan tombol cetak standar/AirPrint untuk pengguna iPhone & PC di samping tombol Cetak Bluetooth Android yang sudah ada.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Jaminan Kunci (Sesuai Permintaan Anda):**
> - **Cetak Bluetooth Android 100% UTUH**: Seluruh file `src/utils/nativeBridge.ts`, integrasi `window.MesinPrint`, pengecekan `isAndroidPrintAvailable()`, `printViaAndroidBluetooth()`, konversi ESC/POS Raster, penanganan logo base64, dan fungsi printer Bluetooth Android TIDAK DISENTUH ATAU DIUBAH SAMA SEKALI. Tombol Bluetooth tetap bekerja persis seperti sekarang.
> - **Penambahan Tombol iPhone / PC**: Di samping tombol Cetak Bluetooth, ditambahkan tombol **"Cetak AirPrint / Standar"** yang menjalankan `window.print()` untuk melayani pengguna iPhone (AirPrint bawaan iOS), iPad, maupun laptop/komputer kasir tanpa mengganggu koneksi Bluetooth Android.
> - **Pemisahan Bagikan Struk**: Tombol "Bagikan Struk" di layar detail transaksi langsung memunculkan menu berbagi (Share Sheet) yang menyediakan:
>   1. Opsi kirim ke WhatsApp pelanggan dengan format nota siap kirim.
>   2. Opsi bagikan via Web Share API bawaan ponsel (langsung muncul pilihan share seperti pada ponsel umumnya).
>   3. Opsi simpan/unduh gambar struk (PNG) ke galeri/unduhan.
>   4. Opsi salin teks nota ke clipboard.

---

## 1. Overview & Core Concept

- **Tujuan**:
  - Tombol **Cetak Struk** tetap membuka pratinjau struk kasir, dengan dua pilihan tombol cetak yang jelas:
    1. **Cetak Bluetooth (Android)** (menggunakan kode native bridge Bluetooth yang sudah ada, tanpa perubahan).
    2. **Cetak AirPrint / Standar (iPhone & PC)** (menggunakan dialog cetak sistem untuk iPhone & browser).
  - Tombol **Bagikan Struk** tidak lagi membuka pratinjau yang sama dengan cetak, melainkan langsung menampilkan menu share interaktif lengkap.

---

## 2. User Experience & Visual Design

### Alur Antarmuka Pengguna

```
                   [ Layar Detail Transaksi ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Tombol Cetak Struk ]               [ Tombol Bagikan Struk ]
            │                                     │
            ▼                                     ▼
   [ Modal Pratinjau Struk ]             [ Menu Bagikan (Share Sheet) ]
   ├── Pratinjau Nota Thermal 58mm       ├── 1. Bagikan via Web Share (Bawaan HP)
   ├── [Tombol 1] Cetak Bluetooth        ├── 2. Kirim ke WhatsApp Pelanggan
   │   (Android - Kode Asli 100% Tetap)  ├── 3. Simpan / Unduh Gambar Struk (PNG)
   └── [Tombol 2] Cetak AirPrint         └── 4. Salin Teks Nota Lengkap
       (iPhone iOS & PC Standar)
```

### Rincian Tampilan
1. **Modal Pratinjau Cetak Struk (`ReceiptModal.tsx`)**:
   - Mempertahankan tampilan struk thermal 58mm dengan watermark dan font monospace kasir.
   - Di bar bawah terdapat 2 tombol cetak:
     - Tombol 1: **Cetak Bluetooth (Android)** (berwarna merah `#800000`, memicu fungsi bluetooth yang lama tanpa modifikasi).
     - Tombol 2: **Cetak AirPrint / Standar (iPhone & PC)** (berwarna biru/slate, memicu `window.print()`).
2. **Modal / Bottom Sheet Bagikan Struk (`ShareReceiptModal.tsx`)**:
   - Tampil ramah sentuhan (touch-friendly) di bagian bawah layar HP atau modal elegan di layar lebar.
   - Pilihan aksi dengan ikon yang jelas dan deskriptif:
     - 📱 *Bagikan ke Aplikasi Lain* (membuka menu share sistem Android/iOS).
     - 💬 *Kirim ke WhatsApp* (membuka WhatsApp dengan pesan rincian nota).
     - 🖼️ *Simpan Gambar Struk (PNG)* (menyimpan nota sebagai gambar ke galeri).
     - 📋 *Salin Teks Nota* (notifikasi cepat teks nota tersalin).

---

## 3. Key Product Decisions & Batasan Keamanan Kode

- **Pencegahan Regresi Bluetooth Android**:
  - File `src/utils/nativeBridge.ts` dan fungsi-fungsi `printViaAndroidBluetooth` tidak akan dimodifikasi.
  - Alur eksekusi saat kasir menekan tombol Bluetooth di perangkat Android APK tetap 100% sama dengan kondisi saat ini.
- **Dukungan iPhone / iOS**:
  - iPhone secara native menggunakan **AirPrint** untuk semua kebutuhan cetak nirkabel (ke printer thermal berkoneksi Wi-Fi/AirPrint atau konversi ke PDF). Pemanggilan `window.print()` di iOS memicu dialog AirPrint secara langsung tanpa memerlukan plugin eksternal.

---

## 4. Technical Architecture & File Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 DetailTransaksiView.tsx                     │
│  State:                                                     │
│  - showReceiptModal (khusus pratinjau & cetak)              │
│  - showShareModal   (khusus menu bagikan)                   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      ReceiptModal.tsx        │ │    ShareReceiptModal.tsx   │
│ - Preview nota thermal 58mm  │ │ - Web Share API trigger    │
│ - Tombol Bluetooth (ASLI)    │ │ - WhatsApp direct link     │
│ - Tombol AirPrint / Standar  │ │ - Simpan gambar PNG        │
│   (window.print() baru)      │ │ - Salin teks nota          │
└──────────────┬───────────────┘ └────────────────────────────┘
               │ (Kode Asli Tidak Berubah)
               ▼
┌──────────────────────────────┐
│  src/utils/nativeBridge.ts   │  <-- 100% TIDAK DIUBAH
└──────────────────────────────┘
```

- **File Baru**: `src/components/ShareReceiptModal.tsx`
- **File Diperbarui**:
  - `src/views/DetailTransaksiView.tsx`: Mengarahkan tombol "Bagikan Struk" ke `showShareModal`.
  - `src/components/ReceiptModal.tsx`: Menampilkan 2 tombol cetak berdampingan (Bluetooth Android & AirPrint/Standar).
