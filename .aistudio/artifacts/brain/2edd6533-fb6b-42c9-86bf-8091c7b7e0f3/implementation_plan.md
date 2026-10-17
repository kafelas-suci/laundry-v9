# Sistem Toast Notifikasi Modern & Dialog Konfirmasi Kustom

Sistem notifikasi toast modern dan modal konfirmasi elegan untuk menggantikan seluruh popup bawaan browser (`window.alert` dan `window.confirm`) yang selama ini menampilkan teks kaku *"Alamat web ini menyatakan..."*.

---

## Status Implementasi: SELESAI (COMPLETED)

Seluruh rencana implementasi telah selesai dikerjakan dan terverifikasi secara penuh:
- **Posisi Toast**: Mengambang di bagian **atas tengah layar** (*top-center*), mudah dilihat baik di layar HP maupun Desktop PC (`fixed top-4 left-1/2 -translate-x-1/2 z-[9999]`).
- **Cakupan Penggantian**: Mengganti **seluruh** `window.alert` dan `window.confirm` di seluruh penjuru aplikasi (form transaksi, kasir, pelanggan, layanan, owner, settings, buku kas, arsip, dan status pengerjaan).
- **Durasi Auto-Dismiss**: Menghilang otomatis setelah **3 detik** dengan animasi mulus, garis progress mikro, dan tombol tutup manual (tanda silang).
- **Dialog Konfirmasi**: Menggunakan modal modern berbasis Promise (async/await) dengan tombol batal dan tombol konfirmasi tematik (merah untuk aksi hapus, marun untuk aksi simpan/beli).

---

## 1. Overview & Core Concept

- **Problem Solved**: Tidak ada lagi dialog abu-abu kaku bertuliskan *"Alamat web menyatakan..."* dari browser saat validasi form maupun saat konfirmasi penghapusan data.
- **Components Built**:
  1. `src/components/NotificationContext.tsx`: Mengelola antrean Toast mengambang di atas tengah layar serta modal dialog konfirmasi modern berbasis Promise.
  2. Integrasi ke `src/main.tsx` dan pembaharuan seluruh view (`TambahEditView`, `DetailTransaksiView`, `SettingsView`, `KelolaPelangganView`, `KelolaLayananView`, `KelolaKasirView`, `KelolaOwnerView`, `StatusPengerjaanView`, `ArsipView`, `App.tsx`, `AturKasModal.tsx`, `AssignStaffModal.tsx`, dan `DemoBanner.tsx`).

---

## 2. User Experience & Visual Design

- **Toast Notification**:
  - Posisi: Bagian atas tengah layar (*top-center*).
  - Tipe & Warna:
    - **Sukses**: Latar putih, border emerald lembut, ikon `CheckCircle2` hijau.
    - **Peringatan / Validasi**: Latar putih, border amber lembut, ikon `AlertTriangle` kuning.
    - **Error**: Latar putih, border rose lembut, ikon `XCircle` merah marun khas Kafelas Laundry.
    - **Info**: Latar putih, border sky lembut, ikon `Info` biru.
  - Progress Bar 3 Detik di sisi bawah toast yang menyusut halus.
- **Modal Konfirmasi**:
  - Efek latar belakang gelap dengan *backdrop blur*.
  - Kotak dialog membulat modern (`rounded-3xl`) dengan ikon peringatan besar.
  - Tombol aksi jelas (*Batal* vs *Ya, Hapus Transaksi* / *Ya, Lanjutkan*).
