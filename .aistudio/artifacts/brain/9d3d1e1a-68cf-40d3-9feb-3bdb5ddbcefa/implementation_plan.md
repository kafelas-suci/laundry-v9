# Penyesuaian Interval Pembaruan Service Worker (1 Hari Sekali) & Tombol Manual di Pengaturan

Mengoptimalkan frekuensi pengecekan pembaruan aplikasi PWA menjadi sangat hemat (hanya 1 kali dalam 24 jam) dan menambahkan tombol manual "Periksa Pembaruan Aplikasi" di halaman Pengaturan sesuai permintaan pengelola.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Dikonfirmasi Pengguna:**
> - **Interval Pengecekan Otomatis**: Diubah dari 30 menit menjadi **24 jam (1 hari sekali)**. Listener `visibilitychange` (yang mengecek tiap kali layar/tab dibuka) dihapus agar perangkat kasir benar-benar tenang, hemat baterai, dan hemat jaringan.
> - **Kontrol Manual**: Ditambahkan tombol **"Periksa Pembaruan"** di menu **Pengaturan**, sehingga kasir/owner dapat memeriksa rilis versi terbaru kapan saja hanya saat dibutuhkan dengan satu ketukan tombol.

---

## 1. Overview & Core Concept

- **Apa yang Dilakukan**:
  1. Menyesuaikan logika Service Worker di `src/main.tsx` sehingga pemanggilan berkala `registration.update()` hanya dilakukan setiap 24 jam (1 hari sekali), tanpa pengecekan agresif tiap kali ganti tab.
  2. Menambahkan opsi dan tombol "Periksa Pembaruan Aplikasi" pada `SettingsView.tsx` (di dalam kartu Master / Pengaturan Sistem). Saat ditekan, tombol akan secara manual memanggil `registration.update()` dan memberikan feedback toast yang jelas:
     - Jika ada pembaruan: memberitahukan bahwa versi baru sedang dipasang dan aplikasi siap dimuat ulang.
     - Jika sudah terbaru: menampilkan toast "Aplikasi Anda sudah versi terbaru!".
- **Manfaat**:
  - Nol beban jaringan berulang untuk tablet kasir yang menyala seharian.
  - Pengelola memiliki kendali penuh secara manual kapan pun setelah melakukan deploy versi baru.

---

## 2. User Experience & Visual Design

- **Alur Pengguna**:
  1. Kasir menggunakan aplikasi seharian tanpa ada interupsi atau beban cek jaringan berulang.
  2. Ketika pengelola mengabarkan bahwa ada update baru (atau kasir ingin memastikan), kasir masuk ke **Pengaturan Laundry** > menekan tombol **"Periksa Pembaruan"**.
  3. Tombol menampilkan status periksa (loading spinner singkat) lalu memberikan respons instan:
     - *"Memeriksa versi terbaru ke server..."*
     - *"Aplikasi Anda sudah menggunakan versi terbaru!"* (jika tidak ada update).
     - *"Versi baru terdeteksi! Memperbarui aplikasi..."* (jika ada rilis baru).

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────┐
│                    Kafelas Laundry PWA                     │
└─────────────────────────────┬──────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    [Pengecekan Otomatis]           [Pengecekan Manual]
       (src/main.tsx)               (SettingsView.tsx)
              │                               │
    Interval: 24 Jam Sekali         Tombol "Periksa Pembaruan"
  (Tanpa listener visibility)                 │
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
            navigator.serviceWorker.getRegistration()
                              │
                              ▼
                    registration.update()
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
        [Versi Sama (304)]            [Versi Baru (200)]
      Toast: "Sudah terbaru"         Auto-update & Precache
                                     via Workbox (skipWaiting)
```

### Rincian Perubahan Kode:
1. **`src/main.tsx`**:
   - Set interval pembaruan: `24 * 60 * 60 * 1000` (24 jam / 1 hari).
   - Hapus event listener `visibilitychange` yang berulang.
   - Ekspor fungsi helper atau sediakan trigger periksa manual untuk Service Worker.
2. **`src/views/SettingsView.tsx`**:
   - Tambahkan kartu/tombol "Periksa Pembaruan Aplikasi" di bagian Pengaturan Sistem / Struk & Printer.
   - Lengkapi dengan ikon `RotateCw`, status loading saat memeriksa, dan pesan toast informatif.

---

## 4. Verification Plan

1. Jalankan `lint_applet` untuk memastikan tidak ada kesalahan sintaks atau tipe TypeScript.
2. Jalankan `compile_applet` untuk memverifikasi proses build produksi.
3. Uji coba tombol "Periksa Pembaruan" di antarmuka Pengaturan untuk memastikan respon visual dan penanganan Service Worker berjalan lancar.
