# Rencana Implementasi: Migrasi Penyimpanan Lokal (IndexedDB)

## 1. Pembuatan Service IndexedDB (`src/services/localDb.ts`)
Membuat layer akses data lokal untuk menyimpan file gambar (logo, tanda tangan) sebagai `Blob`.
- Menggunakan `idb` library (atau native API) untuk penyimpanan blob.
- Fungsi: `saveFile(key, blob)`, `getFile(key)`, `deleteFile(key)`.

## 2. Pembaruan Komponen (`src/components/SignatureAndLogoModal.tsx`, `src/App.tsx`)
- Mengubah fungsi unggah gambar agar tidak lagi mengunggah ke Firebase Storage.
- Mengunggah gambar ke IndexedDB dan menyimpan key-nya di `OwnerProfile`.

## 3. Penyesuaian Rendering & Print (`src/components/StrukModal.tsx`)
- Memperbarui komponen `StrukModal` untuk mengambil data gambar (logo) dari IndexedDB menggunakan `URL.createObjectURL(blob)`.
- Menggunakan `URL.createObjectURL` agar `window.print()` dapat mengakses gambar secara lokal saat proses cetak struk.

## 4. Keuntungan
- **Menghindari Firebase Storage Rules**: Tidak perlu lagi pusing dengan akses permission karena data tersimpan sepenuhnya di browser pengguna (local-first).
- **Kecepatan**: Cetak struk lebih cepat karena tidak perlu memuat gambar dari internet.
- **Offline-capable**: Struk tetap bisa dicetak meskipun koneksi internet terputus.
