# Rencana Komprehensif: Sistem Sinkronisasi & Integritas Data

## Tujuan
Menciptakan sistem sinkronisasi yang tangguh (robust), transparan, dan dapat dikendalikan, menghilangkan ketakutan akan data "tersangkut" atau hilang.

## 1. Engine Level (Fondasi Data)
- **Retry Logic (Exponential Backoff)**: `FirebaseSyncService` akan dilengkapi logika *retry* dengan jeda waktu yang meningkat (misal: 1s, 2s, 4s, 8s) untuk memastikan kegagalan sesaat karena *network flakiness* tidak dianggap kegagalan permanen.
- **Data Integrity Validation**: Pada *startup* aplikasi, `IndexedDbService` akan menjalankan skrip pengecekan untuk mendeteksi:
  - Nota yang ada di status 'pending' (antrean) terlalu lama (> 30 menit).
  - Nota dengan data korup atau tidak lengkap.
  - Nota yang sudah ada di Firebase namun masih ditandai 'pending' di lokal (sinkronisasi status).

## 2. UI Level (Sync Manager)
- **Upgrade Banner**: *Floating banner* yang ada akan dimodifikasi menjadi indikator status:
  - 'OK' (hijau)
  - 'Syncing' (biru/berputar)
  - 'Error' (merah - jumlah nota yang tertunda).
- **Panel Interaktif**: Jika banner merah diklik, panel akan terbuka menampilkan:
  - Daftar nota gagal beserta pesan error-nya.
  - Tombol [Coba Lagi Semua] dan [Coba Lagi Satu].

## 3. Workflow Integrasi
1. **Startup**: Aplikasi cek integritas IndexedDB.
2. **Auto-Sync**: Mesin *Retry* otomatis mencoba mengirim antrean.
3. **UI Update**: Sync Manager merefleksikan hasil secara real-time.
4. **User Intervention**: Jika sistem otomatis menyerah, pengguna diberikan kendali penuh via Panel Sync Manager.
