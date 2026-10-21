# Implementasi Background Sync Transaksi Offline ke Cloud Firestore

Rencana arsitektur untuk menerapkan sistem antrean persisten (*Outbox Queue*) dan sinkronisasi otomatis (*Background Sync*) saat kasir membuat transaksi tanpa internet, sehingga nota otomatis terkirim ke Firestore seketika sinyal terdeteksi kembali tanpa perlu memuat ulang (*reload*) aplikasi.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi preferensi pengguna:
> - **Alur Notifikasi Sinkronisasi:** **Senyap di latar belakang tanpa notifikasi toast/popup**, menjaga kenyamanan kasir saat sedang sibuk melayani pelanggan.
> - **Indikator Visual:** **Badge mengambang (*floating badge*)** yang menampilkan jumlah nota tertunda (misal: *2 Nota Tertunda* dengan indikator pulsa amber halus), dan otomatis lenyap seketika setelah semua nota tersinkron ke Cloud.

---

### 1. Overview & Core Concept

- **Tujuan Utama:** Menjamin zero-data-loss dan sinkronisasi instan multi-perangkat saat kasir bekerja di area dengan sinyal internet tidak stabil (sering putus-nyambung).
- **Mekanisme Inti:**
  1. Transaksi yang disimpan saat offline langsung masuk ke antrean *Outbox Queue* di basis data lokal IndexedDB.
  2. Saat koneksi internet kembali (`window.ononline`, Service Worker `sync` event, atau saat kasir membuka kembali aplikasi), proses sinkronisasi otomatis berjalan di latar belakang.
  3. Dokumen dikirim ke Firestore (`setDoc`) satu per satu; nota yang sukses dikirim langsung dihapus dari antrean Outbox.
  4. Badge mengambang terus memperbarui sisa jumlah nota tertunda secara *real-time* hingga angka mencapai 0.

---

### 2. User Experience & Visual Design

- **Floating Badge Nota Tertunda:**
  - Letak: Mengambang di sudut bawah layar (atau samping tombol kasir) dengan z-index tinggi.
  - Tampilan: Desain bernuansa hangat (amber/orange gelap `#78350F` / `#D97706`) dengan dot indikator mikro berkedip halus (*pulsing status*), teks tabular monospaced (*2 Nota Tertunda · Menunggu Sinyal*).
  - Interaksi: Kasir dapat mengetuk badge untuk memicu sinkronisasi seketika (*force sync now*).
  - Lenyap Otomatis: Saat semua nota berhasil terkirim ke Firestore, badge melakukan transisi fade-out halus tanpa meninggalkan jejak atau mengganggu pandangan kasir.
- **Sikap Senyap (Silent Sync):**
  - Tidak ada dialog pop-up konfirmasi atau toast berulang saat nota terkirim, sesuai pilihan preferensi kasir.

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Dual-Trigger Sync (Event 'online' + Service Worker SyncManager + Heartbeat)**
  - *Pendekatan:* Tidak hanya bergantung pada Service Worker `SyncManager` (yang didukung di Android/Chrome tetapi terbatas di iOS Safari), sistem juga menyematkan event listener `window.addEventListener('online')` dan auto-retry interval saat koneksi aktif.
  - *Alasan:* Menjamin 100% kompatibilitas lintas perangkat (HP Android, iPhone/iPad Safari, laptop Windows, dan macOS).
- **Keputusan 2: Pemrosesan Bersih Bersifat Idempoten**
  - *Pendekatan:* Transaksi memiliki ID unik (`trx-timestamp`), sehingga jika sinkronisasi dicoba dua kali karena fluktuasi sinyal, `setDoc` di Firestore hanya memperbarui dokumen yang sama tanpa membuat duplikasi nota.
- **Keputusan 3: Penanganan Data yang Sedang Diedit / Dihapus**
  - *Pendekatan:* Aksi perubahan status atau pelunasan transaksi offline juga dicatat ke antrean sinkronisasi sehingga riwayat kas tetap akurat.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 ALUR TRANSAKSI OFFLINE & SYNC                │
└─────────────────────────────────────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [ Koneksi Online ]                    [ Koneksi Terputus ]
            │                                     │
   Kirim langsung ke Firestore           Simpan ke IndexedDB Outbox
   & Simpan ke Local Cache                        │
                                                  ▼
                                       Tampilkan Floating Badge:
                                       "X Nota Tertunda"
                                                  │
                                                  ▼
                                       [ Sinyal Internet Kembali ]
                                       ('online' event / SW sync)
                                                  │
                                                  ▼
                                       Kirim Antrean ke Firestore
                                       (Senyap di Latar Belakang)
                                                  │
                                                  ▼
                                       Outbox Kosong (0 Nota)
                                       Badge Lenyap Otomatis
```

- **Rencana Modifikasi Berkas:**
  1. `src/utils/indexedDb.ts`: Penambahan store `outbox_transaksi` dengan operasi `addToOutbox`, `getOutbox`, `removeFromOutbox`, dan `getOutboxCount`.
  2. `src/utils/firebaseSync.ts`: Logika penyimpanan ke Outbox saat offline / gagal jaringan, serta fungsi pemroses `syncPendingOutbox()`.
  3. `src/components/OfflineIndicator.tsx`: Integrasi floating badge penghitung nota tertunda dan listener otomatis `online`/`focus`.
  4. `src/App.tsx`: Pemasangan listener global untuk memantau status antrean outbox secara reaktif.
