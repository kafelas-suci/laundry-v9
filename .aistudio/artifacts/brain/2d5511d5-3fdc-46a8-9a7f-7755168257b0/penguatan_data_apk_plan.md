# Rencana Penguatan Offline-First & Keamanan Data (PWA + APK TWA)

## Analisis
Pengguna mengalami kendala pada akses browser (karena PWA/Web) dan kekhawatiran kehilangan data. Solusi terbaik adalah **Trusted Web Activity (TWA)**, yaitu membungkus PWA dalam APK "murni" untuk memberikan pengalaman aplikasi native, menghilangkan hambatan browser, dan memperkuat layer penyimpanan offline.

## Rencana Implementasi

### 1. Penguatan Layer Data (Offline-First)
- **SSOT (Single Source of Truth)**: Fokus sepenuhnya pada IndexedDB untuk penyimpanan lokal permanen.
- **Outbox Pattern yang Diperkuat**: Transaksi yang dibuat saat offline dimasukkan ke dalam antrean (IndexedDB) dengan *checksum* integritas sebelum disinkronkan ke Firestore saat koneksi tersedia.
- **Monitoring Sinkronisasi**: Indikator UI status sinkronisasi yang jelas di dashboard.

### 2. Migrasi ke APK (Trusted Web Activity)
- Menyediakan file `.zip` siap pakai yang berisi *Asset Links* (untuk verifikasi domain-ke-aplikasi) agar APK berjalan tanpa *address bar* browser dan terasa seperti aplikasi native.
- Membantu konfigurasi agar pengguna bisa langsung menginstal APK tanpa melalui toko aplikasi jika perlu.

### 3. Keamanan Firestore & Backup
- **Audit Rules**: Menjamin akses data berdasarkan kepemilikan (RBAC).
- **Manual Backup Service**: Menambahkan fitur untuk *download* file cadangan data (JSON/Excel) secara lokal sebagai cadangan tambahan di luar *Cloud*.
