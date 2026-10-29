# Rencana Perbaikan Layar Putih (White Screen of Death) pada kflslaundry.web.app

## Analisis Masalah
Berdasarkan laporan pengguna (layar putih kosong), kemungkinan besar aplikasi gagal menginisialisasi bundle React atau tersangkut dalam konflik Service Worker/PWA.

## Langkah Perbaikan
1. **Pemeriksaan Service Worker**: Memastikan `initPWA` tidak memblokir render utama jika ada masalah cache.
2. **Fallback Routing**: Memastikan konfigurasi `firebase.json` untuk `rewrites` (fallback to index.html) sudah benar.
3. **Optimasi Entry Point**: Memastikan script `main.tsx` dimuat dengan benar dan tidak terhambat oleh error inisialisasi yang tidak tertangkap.
4. **Debugging**: Menambahkan error boundary sederhana di root untuk menangkap dan menampilkan error jika terjadi crash saat loading.
