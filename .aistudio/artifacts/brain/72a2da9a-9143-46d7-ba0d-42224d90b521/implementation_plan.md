# Rencana Integrasi Cetak Logo & Tanda Tangan (TTD) Struk Bluetooth APK Android

Rencana ini menyediakan pembaruan menyeluruh untuk menghubungkan Web App Kafela's Agenda dengan aplikasi Android APK (Kotlin) sehingga printer thermal Bluetooth dapat mencetak **Logo Studio** dan **Tanda Tangan Digital (TTD)** secara fisik.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Dikonfirmasi oleh Pengguna:**
> - **Metode Pengiriman**: Web App mengirimkan string gambar Base64 (Data URL) langsung ke antarmuka JavaScript Android (`window.MesinPrint`).
> - **Tata Letak Cetak**: Mengikuti pengaturan struk di web: Logo dicetak di bagian atas (header) dan Tanda Tangan (TTD) dicetak di bagian tanda tangan bawah struk fisik.

---

### 1. Overview & Core Concept

Saat ini, fungsi cetak Bluetooth di APK Android (`StrukHelper.kt`) hanya mengirimkan teks ASCII biasa (nama klien, paket, harga, dll) ke socket Bluetooth ESC/POS tanpa adanya perintah raster grafis bitmap. Selain itu, jembatan `WebPrintInterface` di Android belum menerima parameter Base64 gambar dari web, dan Web App belum meneruskan Base64 ke `window.MesinPrint`.

Solusi ini menghadirkan:
1. **Algoritma ESC/POS Raster Image Converter** di Kotlin untuk mengubah gambar Base64 menjadi bitmap monokrom (1-bit dithering/threshold) yang kompatibel dengan printer thermal 58mm/80mm (`GS v 0`).
2. **Ekspansi Antarmuka `WebPrintInterface`** di Kotlin untuk menerima `logoBase64`, `ttdBase64`, `namaBrand`, dan `namaAdmin`.
3. **Penyambungan di Web App (`StrukModal.tsx`)** agar tombol "Print Bluetooth" mendeteksi keberadaan `window.MesinPrint` di WebView APK dan langsung mengirimkan data struk beserta Base64 Logo & TTD secara instan.

---

### 2. User Experience & Visual Design

- **Di Web App**:
  - Tombol **"Print Bluetooth"** secara otomatis mendeteksi apakah aplikasi sedang berjalan di dalam APK Android (`window.MesinPrint`).
  - Jika berada di APK Android: Menampilkan status *"Mengirim data ke Printer Bluetooth APK..."* dan langsung mengeksekusi cetak Bluetooth native tanpa popup Web Bluetooth browser yang rumit.
  - Jika berada di Browser biasa (PC/Chrome HP): Tetap berjalan dengan Web Bluetooth standar dan opsi fallback RawBT.

- **Hasil Cetakan Fisik Printer Thermal (58mm)**:
  ```text
            [ LOGO STUDIO ]         <-- Cetak Gambar Raster Monokrom
           QIKA CREATIVE
      ================================
            INVOICE PEMBAYARAN
      No.    : #INV-202610-001
      Tanggal: 10 Okt 2026, 17:30
      Admin  : Iqbal Saefinnuha
      --------------------------------
      Yth. Bpk/Ibu : Budi Santoso
            Wedding Gold
      Paket  : Wedding Gold
      Lokasi : Gedung Graha Sabha
      --------------------------------
      Total Tarif : Rp 25.000.000
      Telah DP    : - Rp 5.000.000
      --------------------------------
      DIBAYAR     : Rp 20.000.000
      SISA        : Rp 0
      ================================
                STATUS: LUNAS
                
            Tanda Tangan Kasir:
               [ GAMBAR TTD ]       <-- Cetak Gambar Raster Monokrom
             ( Iqbal Saefinnuha )
             
          Terima kasih atas
           kepercayaan Anda.
  ```

---

### 3. Key Product Decisions & Trade-Offs

1. **Format Grafis Printer: ESC/POS Raster (`GS v 0`) vs Bit Image (`ESC *`)**:
   - *Pilihan*: Menggunakan standard ESC/POS Raster Bit Image command (`0x1D, 0x76, 0x30, 0x00`).
   - *Alasan*: Kompatibel dengan 99% printer kasir thermal Bluetooth murah di pasaran (GOOJPRT, Panda, Eppos, Vsc, Iware, Zywell, Bluetooth POS-58). Format raster memproses per baris byte penuh sehingga tidak menyebabkan cetakan terputus atau glitch.

2. **Ukuran dan Resolusi Bitmap**:
   - Lebar target gambar disesuaikan dengan kapasitas dot printer 58mm (maksimal 384 dot per baris, direkomendasikan lebar 240–320 px untuk logo dan 200–240 px untuk TTD).
   - Tinggi gambar menyesuaikan rasio asli tanpa distorsi.

3. **Thresholding Monokrom Otomatis**:
   - Nilai kecerahan pixel dikonversi ke grayscale `(0.299*R + 0.587*G + 0.114*B)`. Pixel dengan kecerahan di bawah batas dianggap hitam (titik cetak) dan di atas batas dianggap putih (kertas polos).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                        WEB APP                         │
│  StrukModal.tsx                                        │
│  - Ambil finalLogoUrl & finalTtdUrl (Base64)           │
│  - Cek: if (window.MesinPrint?.prosesCetakBluetooth)    │
│  - Kirim: logoBase64, ttdBase64 + data transaksi      │
└───────────────────────────┬────────────────────────────┘
                            │ JavascriptInterface
                            ▼
┌────────────────────────────────────────────────────────┐
│                   ANDROID APK (KOTLIN)                 │
│                                                        │
│  1. WebPrintInterface.kt                               │
│     - Terima semua parameter termasuk logoBase64 &     │
│       ttdBase64                                        │
│                                                        │
│  2. StrukHelper.kt                                     │
│     - decodeBase64ToEscPosBitmap(base64)               │
│     - Konversi Base64 -> Bitmap -> 1-Bit Monochrome    │
│     - Format bytes ESC/POS: [GS, v, 0, 0, xL, xH...]   │
│     - Tulis ke BluetoothSocket.outputStream:           │
│       • Logo Header                                    │
│       • Teks Transaksi                                 │
│       • TTD Footer                                     │
│       • Feed & Potong Kertas                           │
└────────────────────────────────────────────────────────┘
```

#### Langkah Perubahan Kode:
1. **Perubahan di Web App (`src/components/StrukModal.tsx`)**:
   - Menambahkan pemanggilan `(window as any).MesinPrint.prosesCetakBluetooth(...)` saat `window.MesinPrint` tersedia.
   - Mengirimkan string `logoBase64`, `ttdBase64`, `namaBrand`, dan `adminName`.
2. **Penyediaan Kode Kotlin Siap-Pakai untuk Pengguna**:
   - File 1: `WebPrintInterface.kt` yang telah diperbarui.
   - File 2: `StrukHelper.kt` yang telah dilengkapi fungsi raster bitmap logo & TTD monokrom.
   - File 3: `MainActivity.kt` jika ada penyesuaian inisialisasi.
   - File panduan cara pasang ke Android Studio.
