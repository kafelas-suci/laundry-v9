# Rencana Implementasi: Pembatasan Multi-Website, Rate Limiting Terpadu, & Proteksi Bot

## Tujuan
1. Membatasi jumlah website/brand berdasarkan paket:
   - Standar: 0 Website
   - Pro: 1 Website
   - Ultimate: 2 Website
2. Mencegah penyalahgunaan sistem:
   - Batas aktivitas harian (perubahan pengaturan + perubahan foto):
     - Pro: 5 kali per hari
     - Ultimate: 15 kali per hari
   - Proteksi Bot: Batasi jumlah kunjungan per hari per sesi/IP untuk mencegah *scraping* atau *refresh* berlebihan.

## Perubahan yang Diperlukan

### 1. Update Konfigurasi Subscription (`src/utils/subscription.ts`)
Update `SubscriptionLimits` dan `SUBSCRIPTION_CONFIG`:
- Tambahkan: `maxDailyActions`, `maxDailyVisits`.
- Konfigurasi:
  - `standar`: `{ maxWebsites: 0, maxDailyActions: 0, maxDailyVisits: 10 }`
  - `pro`: `{ maxWebsites: 1, maxDailyActions: 5, maxDailyVisits: 50 }`
  - `ultimate`: `{ maxWebsites: 2, maxDailyActions: 15, maxDailyVisits: 200 }`

### 2. Firestore Usage Tracking & Proteksi Bot (`src/services/firebaseClient.ts`)
- Tambahkan field pada dokumen brand: `lastResetDate`, `actionsToday`, `visitsToday`.
- Tambahkan helper function: `checkAndIncrementActions(brandId: string)` dan `checkAndIncrementVisits(brandId: string)`.
  - Fungsi ini akan memeriksa `lastResetDate`. Jika tanggal berbeda, reset `actionsToday` dan `visitsToday` ke 0.
  - Jika limit tercapai, return `false` (blokir).

### 3. Implementasi Validasi di UI & Client-side
- **`src/components/SuperAdminDashboard.tsx`**: Validasi `maxWebsites`.
- **Aktivitas (Profil, Foto)**: Panggil `checkAndIncrementActions` sebelum menyimpan data.
- **Proteksi Kunjungan**:
  - Pada entry point website (misal: `profil.html` atau saat `App.tsx` dimuat), panggil `checkAndIncrementVisits`.
  - Jika `false`, tampilkan halaman "Akses Terbatas / Batas kunjungan harian tercapai".

## Tahapan Kerja
1. Update `src/utils/subscription.ts`.
2. Implementasi `checkAndIncrementActions` dan `checkAndIncrementVisits` di `src/services/firebaseClient.ts`.
3. Update `SuperAdminDashboard.tsx` dengan pengecekan website.
4. Integrasikan validasi `actionsToday` di komponen manajemen.
5. Integrasikan validasi `visitsToday` di entry point aplikasi (misal `main.tsx` atau `App.tsx`).
6. Verifikasi build dengan `compile_applet`.
