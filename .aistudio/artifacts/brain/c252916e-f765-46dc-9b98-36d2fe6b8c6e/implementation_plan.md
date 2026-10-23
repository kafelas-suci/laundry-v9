# Fitur Sinkronisasi Paksa Cerdas (Smart Delta Sync) & Cooldown 10 Menit

Rencana implementasi fitur **Sinkronisasi Paksa** di Dashboard Kafelas Laundry yang mengintegrasikan mekanisme **Smart Delta Sync** (hanya mengambil data baru dan yang berubah), **prioritas antrean offline anti-hilang**, serta **jeda pengaman cooldown 10 menit** untuk menjamin konsistensi data multi-perangkat tanpa memboroskan kuota read Firebase Firestore.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Keputusan Kunci yang Telah Dikonfirmasi Pengguna:**
> - **Metode Sinkronisasi:** **Smart Delta Sync** (hanya mengunduh data baru dan yang mengalami perubahan sejak sinkronisasi terakhir berdasarkan timestamp `terakhirDieditPada`, bukan full reload yang memboroskan kuota).
> - **Proteksi Anti-Spam / Cooldown:** **10 Menit (600 detik)**. Jika tombol diklik kembali sebelum 10 menit, aplikasi memberikan feedback ramah berisi sisa waktu tanpa memanggil query Firestore sama sekali (0 Reads).
> - **Keamanan Data Offline:** Sistem otomatis mengirimkan seluruh antrean nota offline di `Outbox IndexedDB` ke Firestore terlebih dahulu sebelum menarik data baru dari server.

---

### 1. Overview & Core Concept

- **Tujuan Utama:** Memastikan seluruh data operasional (transaksi aktif, pelanggan, katalog layanan, pengeluaran, dan pengaturan outlet) di kasir dan owner selalu sinkron dengan server Firestore, terutama ketika kasir berpindah jaringan, baru saja menyelesaikan transaksi offline, atau mendeteksi ada nota yang dibuat dari perangkat kasir lain.
- **Nilai Efisiensi:** Dengan Smart Delta Sync, konsumsi kuota Firestore turun hingga **95%** dibandingkan Full Reload, dan jeda pengaman 10 menit melindungi tagihan/kuota gratis Firestore dari klik berulang yang tidak disengaja.

---

### 2. User Experience & Visual Design

- **Lokasi & Tampilan Tombol di Dashboard:**
  - **Desktop Header:** Tombol elegan di bar atas dengan ikon `RotateCw`, label **"Sinkron Cloud" / "Sinkronisasi Paksa"**, serta tooltip informatif berisi waktu sinkronisasi terakhir.
  - **Mobile Header:** Tombol ringkas dengan ikon sinkron yang beranimasi putar halus saat proses berjalan (`animate-spin`).
- **Indikator Status & Cooldown:**
  - Saat cooldown 10 menit sedang aktif, tombol menampilkan badge/teks mikro waktu sinkronisasi terakhir (misal: *15:30*) dan saat diklik memunculkan toast info: *"Data sudah mutakhir. Sinkronisasi berikutnya dapat dilakukan dalam X menit lagi."*
  - Opsi bypass darurat: Jika kasir mendesak butuh sinkronisasi sebelum 10 menit habis, tersedia dialog konfirmasi singkat *"Paksa Sinkron Sekarang"*.
- **Feedback Selesai:**
  - Toast notifikasi emerald informatif: *"Sinkronisasi Berhasil: 3 nota baru diperbarui, 1 pelanggan ditambahkan."*

---

### 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Smart Delta Sync vs Full Reload**
  - *Pendekatan Terpilih:* Smart Delta Sync berbasis `terakhirDieditPada > lastSyncTime`.
  - *Alasan:* Sangat hemat kuota Firebase read. Jika hanya ada 2 transaksi baru, hanya 2 reads yang terpakai (bukan 100+ reads).
- **Keputusan 2: Penanganan Data Lokal & Outbox**
  - *Pendekatan Terpilih:* Cek dan kuras antrean `outbox` terlebih dahulu ke server Firestore sebelum mengunduh data masuk.
  - *Alasan:* Mencegah kondisi balapan (*race condition*) di mana nota kasir yang baru dibuat offline tertimpa atau hilang akibat penarikan data lama dari server.
- **Keputusan 3: Penanganan Kegagalan Jaringan**
  - *Pendekatan Terpilih:* Jika saat sinkronisasi koneksi internet terputus, data lokal tidak boleh dikosongkan (pertahankan state lokal dan IndexedDB).

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DashboardView (Desktop / Mobile)                  │
│   [Tombol Sinkronisasi Paksa] ──(Klik)                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Cooldown Check (10 Menit)                       │
│  - Jika (Now - LastSync < 10 Menit) ──► Tampilkan Toast Info (0 Reads) │
│  - Jika (Now - LastSync >= 10 Menit) ─► Lanjut ke Eksekusi             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Langkah 1: Kuras Outbox Offline ke Firestore               │
│             IndexedDbService.getOutbox() ──► Firestore setDoc()         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Langkah 2: Smart Delta Sync Koleksi Firestore              │
│  - Transaksi: query(..., where('terakhirDieditPada', '>', lastSync))   │
│  - Pelanggan: query(..., limit(150))                                   │
│  - Layanan: getDocs(collection(db, 'layanan'))                         │
│  - Pengeluaran & Settings                                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             Langkah 3: Rekonsiliasi State & Penyimpanan Lokal          │
│  - Gabungkan ke State React (transaksiList, pelangganList, dll)        │
│  - Update IndexedDB & LocalStorage                                     │
│  - Catat last_force_sync_time = Date.now()                             │
│  - Tampilkan Toast Sukses Rincian Data                                 │
└────────────────────────────────────────────────────────────────────────┘
```

#### Komponen Teknis yang Akan Diperbarui:
1. **`src/utils/firebaseSync.ts`**:
   - Menambahkan metode `forceDeltaSync(laundryId, lastSyncTime)` yang mengambil transaksi berdasarkan timestamp `terakhirDieditPada` serta menyelaraskan pelanggan, layanan, dan pengeluaran secara aman.
2. **`src/App.tsx`**:
   - Memperbarui fungsi `loadFirestoreData` dengan dukungan `forceSync = true` dan `smartDeltaMode`.
   - Mengintegrasikan pengurasan antrean `outbox` sebelum unduhan dijalankan.
3. **`src/views/DashboardView.tsx`**:
   - Memperbarui tombol aksi di Desktop & Mobile Header dengan status visual loading dan logika cooldown 10 menit.
