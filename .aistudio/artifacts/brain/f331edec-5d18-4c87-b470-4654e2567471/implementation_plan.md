# Rencana Implementasi: Sistem Subscription Tier (Standar, Pro, Ultimate)

## 1. Definisi Aturan Baru (`src/utils/subscription.ts`)
Membuat file utilitas untuk menampung konfigurasi batasan per paket:
- **Paket Standar**: 100 jadwal/bulan, 1 Owner, 0 Admin, 0 Crew. Akses terbatas (Website, Booking Link, Kelola Tim, Ubah Tema diblokir).
- **Paket Pro**: 500 jadwal/bulan, 1 Owner, 1 Admin, 2 Crew.
- **Paket Ultimate**: 1000 jadwal/bulan, 1 Owner, 5 Admin, 20 Crew.

## 2. Integrasi UI & Navigasi (`src/App.tsx`)
- Menggunakan `subscription.ts` untuk menonaktifkan item menu (Website, Link Booking, Kelola Tim).
- Menambahkan tooltip pada elemen yang dinonaktifkan.
- Membatasi akses ganti tema pada paket Standar.
- Menambahkan pemeriksaan kuota sebelum memproses pembuatan jadwal baru (`ScheduleAndCashierForm`).

## 3. Penyesuaian Komponen (`src/components/ManagementViews.tsx`)
- Memperbarui `KelolaTimView` untuk menerapkan kuota staf sesuai paket.
- Menonaktifkan tombol tambah staf jika kuota penuh.

## 4. Penanganan Pembatasan
- Sesuai permintaan, fitur yang dibatasi akan menggunakan `disabled` state dan menampilkan tooltip penjelasan ("Fitur ini tidak tersedia pada paket Standar").
- Jadwal yang sudah ada tetap aman, hanya pembuatan baru yang diblokir jika melewati batas kuota bulanan.
