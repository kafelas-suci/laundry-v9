# Rencana Penguatan Arsitektur: SSOT IndexedDB, Keamanan Server Firestore & Rekonsiliasi Real-time Anti-Konflik

Mewujudkan integritas data transaksional dan keamanan zero-trust pada aplikasi Kafelas Laundry dengan mengonsolidasikan penyimpanan lokal ke IndexedDB, mengunci hak penghapusan dokumen di Firestore Security Rules khusus untuk Owner, serta menyelaraskan Background Sync Outbox dengan listener real-time agar data tidak pernah berkedip atau tertimpa.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi preferensi pengguna:
> 1. **Kebijakan Hapus Transaksi:** Hanya akun dengan role **Owner** yang memiliki wewenang menghapus dokumen transaksi baik di UI maupun di server Firestore. Jika kasir salah input saat bertugas, kasir tidak dapat menghapus riwayat tersebut tanpa intervensi akun Owner.
> 2. **Strategi Migrasi Data:** Data transaksi historis yang saat ini berada di `LocalStorage` akan **dimigrasikan secara otomatis ke IndexedDB** saat aplikasi pertama kali dimuat (*startup one-time migration*), kemudian LocalStorage dibebaskan dari penulisan data transaksi agar tidak terjadi *dual-cache race condition*.

---

## 1. Overview & Core Concept

- **Tujuan Utama:** Mengeliminasi 3 titik rawan kritis:
  1. *Dual-caching desynchronization* antara LocalStorage (sinkron, limit 5MB) dan IndexedDB (asinkron, kuota besar).
  2. *Client-side pseudo-security* di mana kasir masih bisa memicu API delete langsung jika security rules server longgar.
  3. *Reconciliation glitch* di mana listener real-time `onSnapshot` menghapus sementara tampilan transaksi lokal yang sedang menunggu antrean Outbox saat perangkat baru kembali online.
- **Pengguna Terdampak:** Pemilik Laundry (Owner) dan Kasir/Staf Operasional.
- **Nilai Bisnis:** Keuangan dan riwayat nota 100% akurat, tidak ada celah kecurangan penghapusan nota kasir, dan aplikasi tetap responsif serta aman saat internet putus-nyambung.

---

## 2. Analisis Trade-Off & Konsekuensi (Minus dari Perubahan)

Setiap peningkatan arsitektur membawa konsekuensi teknis dan operasional. Berikut analisis transparan mengenai "minus" serta langkah mitigasinya:

| Area Perubahan | Potensi "Minus" / Konsekuensi | Strategi Mitigasi Teknis |
| :--- | :--- | :--- |
| **1. Penguncian Hak Hapus (Role Owner Only)** | Jika kasir salah input nota di outlet dan Owner sedang tidak di tempat, kasir tidak bisa langsung menghapus nota tersebut dari database server. | Kasir tetap dapat melakukan koreksi data (edit nama/layanan) atau mengubah status menjadi transaksi pending/koreksi. Notifikasi informatif akan tampil di UI menjelaskan bahwa penghapusan permanen memerlukan otorisasi Owner. |
| **2. Transisi SSOT ke IndexedDB** | IndexedDB bersifat asynchronous (Promise-based), sehingga membutuhkan jeda waktu mikro (~5-15ms) untuk memuat data pertama kali ke memori React saat cold boot, berbeda dengan LocalStorage yang instan. | Menggunakan *in-memory state cache* dan skeleton rendering instan pada dashboard sehingga kasir tidak merasakan *layout shift* atau jeda visual. |
| **3. Migrasi Otomatis dari LocalStorage** | Perangkat lama dengan LocalStorage penuh memerlukan proses pembacaan dan penyalinan ke IndexedDB saat startup pertama. | Dijalankan sebagai proses *background migration* ber-flag (`idb_migration_v1_done`) satu kali saja, dengan mekanisme fallback *safe-copy* tanpa menghilangkan data asli sebelum verifikasi berhasil. |
| **4. Rekonsiliasi Outbox + onSnapshot** | Logika penggabungan data di sisi klien menjadi sedikit lebih kompleks karena harus menjaga ID transaksi offline yang belum terunggah agar tidak terhapus oleh payload server. | Memanfaatkan fungsi deduping `Map<string, Transaksi>` dengan prioritas `terakhirDieditPada` (timestamp guard) dan mempertahankan antrean Outbox sampai server mengonfirmasi penulisan sukses. |

---

## 3. User Experience & Visual Design

- **Status Penghapusan pada Kasir:**
  - Tombol aksi "Hapus" pada kasir dinonaktifkan secara visual atau menampilkan dialog permintaan izin: *"Penghapusan nota hanya dapat dilakukan oleh Pemilik (Owner) untuk menjaga audit pembukuan kas."*
- **Indikator Sinkronisasi Halus (Seamless Sync Indicator):**
  - Badge Outbox offline yang tidak mengganggu: Menampilkan jumlah nota tertunda saat offline dan melakukan sinkronisasi otomatis tanpa popup yang mengagetkan kasir.
- **Zero Layout Jitter:**
  - Nilai nominal rupiah, kuantitas kg, dan nomor nota tetap menggunakan angka tabular (`tabular-nums` / `font-mono`) agar angka tidak bergeser saat data diperbarui secara real-time.

---

## 4. Technical Architecture & Data Strategy

### A. Diagram Arsitektur Data Flow & Keamanan

```
┌────────────────────────────────────────────────────────────────────────┐
│                          APLIKASI KASIR / OWNER                        │
│                                                                        │
│   ┌────────────────────┐                   ┌───────────────────────┐   │
│   │   Form Input /     │                   │  Dashboard & Laporan  │   │
│   │ Tambah Transaksi   │                   │     (React State)     │   │
│   └─────────┬──────────┘                   └───────────▲───────────┘   │
│             │                                          │               │
│             ▼                                          │ (Read State)  │
│   ┌────────────────────────────────────────────────────┴───────────┐   │
│   │                 CENTRAL DATA REPOSITORY                        │   │
│   │                                                                │   │
│   │  - State In-Memory: Map<id, Transaksi>                         │   │
│   │  - Merge: [Live Firestore Snapshot] + [Pending Outbox Items]  │   │
│   └──────────────┬───────────────────────────────────▲─────────────┘   │
│                  │                                   │                 │
│      (Write SSOT)│                       (Hydrate/   │                 │
│                  ▼                        Background)│                 │
│   ┌──────────────────────────────┐                   │                 │
│   │     INDEXEDDB LOCAL DB       │                   │                 │
│   │  - transaksi_aktif           │                   │                 │
│   │  - transaksi_arsip           │                   │                 │
│   │  - outbox_transaksi (Queue)  │                   │                 │
│   └──────────────┬───────────────┘                   │                 │
└──────────────────┼───────────────────────────────────┼─────────────────┘
                   │                                   │
                   │ (Online / Background Sync)        │ (onSnapshot Listener)
                   ▼                                   │
┌──────────────────────────────────────────────────────┴─────────────────┐
│                       GOOGLE CLOUD FIRESTORE SERVER                    │
│                                                                        │
│   Path: /laundries/{laundryId}/transaksi/{transaksiId}                 │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                    FIRESTORE SECURITY RULES                    │   │
│   │                                                                │   │
│   │  • Read:   Kasir & Owner cabang terdaftar                      │   │
│   │  • Create: Kasir & Owner                                       │   │
│   │  • Update: Kasir & Owner (update status cucian / pelunasan)    │   │
│   │  • Delete: HANYA isOwnerOfLaundry(laundryId) [DIKUNCI SERVER]  │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### B. Spesifikasi Rencana Kode & File yang Akan Diperbarui

1. **`firestore.rules` (Penguatan Aturan Keamanan):**
   - Mengganti aturan permisif subkoleksi `match /{subcollection}/{docId}` dengan pemisahan eksplisit:
     - `match /transaksi/{transaksiId}`: `allow delete: if isOwnerOfLaundry(laundryId);`
     - `match /pelanggan/{pelangganId}`: `allow read, create, update: if isSignedIn(); allow delete: if isOwnerOfLaundry(laundryId);`
     - `match /pengeluaran/{pengeluaranId}`: `allow delete: if isOwnerOfLaundry(laundryId);`
     - `match /settings/{docId}`: `allow write: if isOwnerOfLaundry(laundryId);`
2. **`src/utils/indexedDb.ts` & `src/utils/storage.ts` (Konsolidasi SSOT):**
   - Menambahkan routine migrasi `migrateLocalStorageToIndexedDb()`: Membaca transaksi dari LocalStorage, memasukkannya ke IndexedDB jika ID belum ada, lalu menetapkan penanda migrasi selesai.
   - Menghentikan penulisan transaksi berulang ke LocalStorage yang berpotensi memicu *race condition*.
3. **`src/utils/firebaseSync.ts` & `src/App.tsx` (Rekonsiliasi Anti-Glitches):**
   - Memperbarui `subscribeTransaksi` agar saat snapshot Firestore masuk, ia mengambil ID-ID yang sedang berada di antrean `outbox_transaksi` dan menggabungkannya ke dalam state tampilan kasir:
     $$\text{Daftar Aktif} = \text{Merge}(\text{Live Snapshot}, \text{Outbox Pending})$$
   - Menggunakan stempel waktu `terakhirDieditPada` agar perubahan terbaru tidak pernah ditimpa oleh data usang.

---

## 5. Verifikasi & Pengujian

- [ ] Uji coba penghapusan nota via akun kasir: Tombol terproteksi dan permintaan delete server ditolak dengan `PERMISSION_DENIED`.
- [ ] Uji coba penghapusan nota via akun Owner: Penghapusan berhasil baik di lokal maupun di cloud Firestore.
- [ ] Uji coba migrasi data: Transaksi dari LocalStorage termigrasi utuh ke IndexedDB tanpa duplikasi data.
- [ ] Uji coba skenario Offline $\rightarrow$ Online:
  - Masuk mode offline, buat 1 transaksi baru (masuk antrean Outbox).
  - Hubungkan kembali ke internet: Transaksi tidak berkedip/hilang saat `onSnapshot` masuk, dan status Outbox otomatis berkurang menjadi 0.
- [ ] Verifikasi kompilasi build (`npm run build`) dan linting tipe TypeScript (`tsc --noEmit`).
