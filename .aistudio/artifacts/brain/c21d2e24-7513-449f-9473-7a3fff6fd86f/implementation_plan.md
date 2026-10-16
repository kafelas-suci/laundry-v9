# Cetak Struk Bluetooth Auto-Reconnect (Tanpa Dialog Berulang)

Mengoptimalkan alur pencetakan struk Bluetooth Thermal pada aplikasi PWA (Web Bluetooth API) dan Android APK agar langsung mencetak ke printer yang sebelumnya sudah terhubung tanpa memunculkan jendela dialog pairing setiap kali tombol cetak ditekan. Jika printer lama mati atau tidak ditemukan, sistem otomatis memunculkan dialog pemilihan printer baru.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pada sesi tanya jawab (Phase 1):
> - **Platform Aktif**: Pengguna telah berhasil mencetak struk lewat Web / PWA (Web Bluetooth) serta siap untuk Android APK.
> - **Mekanisme Ganti Printer**: **Otomatis**. Jika printer Bluetooth yang sebelumnya disimpan mati, di luar jangkauan, atau tidak ditemukan, sistem secara otomatis membuka dialog pemilihan printer baru tanpa kasir perlu melakukan reset manual rumit.

- **Keputusan 1 (Koneksi Otomatis / Zero-Prompt)**: Printer yang sudah pernah dipasangkan akan diingat di memori dan browser permissions. Saat kasir menekan tombol "Cetak Struk", data langsung dikirimkan ke printer tanpa memunculkan pop-up pemilihan perangkat.
- **Keputusan 2 (Fallback Cerdas)**: Jika koneksi ke printer tersimpan gagal (misal printer mati atau diganti model baru), aplikasi segera menangkap kegagalan tersebut dan seketika membuka dialog pemilihan printer baru agar transaksi tidak terhambat.
- **Keputusan 3 (Reset / Ganti Manual Opsional)**: Menambahkan opsi mini "Ganti Printer" di Pengaturan Aplikasi dan di dalam Modal Struk untuk kasir yang ingin sengaja berganti printer kapan saja.

---

## 1. Overview & Core Concept

Saat ini, fungsi cetak struk via Web Bluetooth API selalu mengeksekusi `navigator.bluetooth.requestDevice(...)` setiap kali kasir mencetak nota. Hal ini menyebabkan browser Chrome selalu memunculkan kotak dialog pop-up "Pilih perangkat Bluetooth" di setiap lembar struk yang dicetak, memperlambat proses pelayanan di kasir laundry.

Dengan pembaruan ini:
- **Pencetakan Pertama Kali**: Kasir memilih printer Bluetooth sekali. ID dan referensi printer disimpan.
- **Pencetakan Selanjutnya**: Aplikasi langsung menggunakan koneksi aktif atau menyambung ulang via `navigator.bluetooth.getDevices()` dan GATT reconnection. Struk langsung keluar dalam hitungan detik tanpa ada pop-up pilihan perangkat!
- **Kondisi Printer Mati / Ganti**: Jika koneksi ke printer sebelumnya gagal, aplikasi otomatis menampilkan dialog pencarian printer baru.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Kasir Menekan "Cetak Struk"]
              │
              ▼
   Apakah ada Printer Tersimpan?
        /               \
     (Ya)              (Tidak - Pertama Kali)
      │                           │
      ▼                           ▼
Coba Sambung Langsung        Buka Dialog Pairing
(Tanpa Dialog Pop-Up)        Pilih Printer
      │                           │
  Berhasil?                       ▼
   /     \                Simpan Perangkat
 (Ya)    (Tidak / Mati)           │
  │          │                    │
  │          ▼                    │
  │     Buka Dialog Pemilihan ◄───┘
  │     Printer Baru (Otomatis)
  ▼
[Struk Fisik Keluar dari Printer Thermal]
```

### Feedback & Notifikasi Pengguna:
1. **Status Instan**: Saat menekan "Cetak Struk", tombol menampilkan status *"Mencetak ke [Nama Printer]..."*.
2. **Pencarian Otomatis**: Jika printer lama tidak terdeteksi, muncul status *"Printer sebelumnya tidak terdeteksi, mencari printer baru..."* disusul dialog pairing Chrome.
3. **Indikator Nama Printer**: Di footer modal struk dan menu Pengaturan, kasir dapat melihat nama printer yang sedang aktif (misal: *Printer: RPP02N (Terhubung)*) beserta tombol kecil *"Ganti Printer"*.

---

## 3. Key Product Decisions & Trade-Offs

- **Trade-Off Web Bluetooth Reconnection**:
  - `navigator.bluetooth.getDevices()` didukung pada Chromium / Google Chrome Android dan Desktop modern untuk mengingat device yang sudah diizinkan.
  - Untuk menjaga kestabilan koneksi, sesi GATT yang masih aktif akan di-reuse (tidak perlu `device.gatt.connect()` berulang-ulang jika koneksi masih hidup).
  - Jika printer terputus (sleep / disconnect), aplikasi melakukan reconnect otomatis.
- **Penyimpanan Info Printer**:
  - Menyimpan `saved_bluetooth_device_id` dan `saved_bluetooth_device_name` di `localStorage` dan IndexedDB.
  - Menyimpan instans `BluetoothDevice` di memori runtime (`cachedBluetoothDevice`).
- **Android APK Harmonization**:
  - Pada APK WebView Android, file panduan `KODINGAN_APK_ANDROID_PRINT.md` diselaraskan agar jika `SAVED_PRINTER_MAC` gagal tersambung (socket error), otomatis menghapus MAC lama dan memunculkan dialog daftar printer yang tersedia.

---

## 4. Technical Architecture & Data Strategy

### System & Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      ReceiptModal.tsx                       │
│  - Tombol "Cetak Struk" (Trigger cetak instan)              │
│  - Info: "Printer: [Nama Printer]" + Tombol "Ganti Printer" │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      nativeBridge.ts                        │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ printViaWebBluetooth(transaksi, settings, ...)        │  │
│  │                                                       │  │
│  │ 1. Cek cachedBluetoothDevice / getDevices()           │  │
│  │ 2. Coba kirim data ESC/POS langsung (Zero-Prompt)     │  │
│  │ 3. Catch Error -> Fallback requestDevice()            │  │
│  │ 4. Update localStorage: saved_bluetooth_device_id     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ getSavedPrinterName() / forgetBluetoothPrinter()      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Web Bluetooth API / Chrome                  │
│  - GATT Server Connection                                   │
│  - Serial Port / SPP Characteristic Chunk Writing           │
└─────────────────────────────────────────────────────────────┘
```

### Rencana File yang Dimodifikasi:
1. `src/utils/nativeBridge.ts`:
   - Tambahkan state `cachedBluetoothDevice: BluetoothDevice | null` dan helper `getSavedBluetoothDevice()`.
   - Update `printViaWebBluetooth()`: Gunakan perangkat yang sudah ada dari `getDevices()` / cache terlebih dahulu. Hanya buka `requestDevice()` jika belum ada perangkat atau koneksi gagal.
   - Tambahkan fungsi `forgetBluetoothPrinter()` untuk mereset printer jika kasir ingin memilih ulang secara eksplisit.
   - Tambahkan `getConnectedPrinterInfo()`.
2. `src/components/ReceiptModal.tsx`:
   - Tampilkan status nama printer yang tersimpan (misal: `Printer aktif: RPP02N`).
   - Sediakan tombol halus "Ganti" di samping nama printer untuk fleksibilitas.
3. `src/views/SettingsView.tsx`:
   - Tambahkan status printer Bluetooth di tab / bagian struk dengan opsi "Ganti / Putus Printer Bluetooth" jika kasir ingin mengganti printer utama toko.
4. `KODINGAN_APK_ANDROID_PRINT.md`:
   - Lengkapi penanganan error Bluetooth di Kotlin APK agar ketika printer mati/mac tidak ditemukan, dialog `MaterialAlertDialogBuilder` otomatis muncul ulang.
