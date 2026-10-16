# Rencana Implementasi: Struktur Baru 4 Halaman `profil.html` (Slogan + Bio + Logo IG & TikTok di Halaman Awal, Tukar Galeri & Layanan) + Splash Screen Reload

## 1. Tambah Kolom "Bio / Caption Perkenalan" di Pengaturan Website (`ManagementViews.tsx`)
- Di menu **Pengaturan &rarr; 🌐 Website & Link Booking**, menyediakan 2 kolom teks terpisah:
  1. **Slogan Singkat (`taglineWeb`)**: Motto pendek studio.
  2. **Bio / Caption Perkenalan (`bioWeb`)**: Paragraf perkenalan studio kepada klien.
- **Minimalisir Tulisan di Halaman Utama**: Hanya menampilkan data yang benar-benar disimpan oleh klien/owner (tanpa kalimat bawaan berlebih jika kolom dikosongkan).

---

## 2. Susunan Baru 4 Halaman di `profil.html`
1. **Halaman 1 — Landing Utama (`Sampul & Perkenalan`)**:
   - Latar belakang menggunakan **`Foto 1`**.
   - Menampilkan **Logo Studio**, **Nama Brand**, **Slogan**, dan **Bio / Caption Perkenalan** yang disimpan klien.
   - **Logo & Tombol Instagram + TikTok Resmi**: Ditampilkan langsung di Halaman Awal (Landing Hal 1) jika link IG/TikTok diisi oleh pemilik studio.
   - Dilengkapi tombol **`Lihat Galeri Karya →`**.
2. **Halaman 2 — Galeri Karya**:
   - Ditukar maju ke Halaman 2 (langsung setelah Landing).
   - Menampilkan **1 Foto Utama Besar di bagian paling atas** + **Grid Foto Karya (`Foto 2` s/d `Foto 8`)** beserta **Nama Karya** masing-masing.
3. **Halaman 3 — Daftar Layanan**:
   - Menampilkan katalog paket bernomor (`01`, `02`, `03`...) beserta harga, deskripsi, dan tombol **`Pilih Paket & Booking →`**.
4. **Halaman 4 — Kontak & Booking**:
   - Menampilkan alamat cabang (klik langsung pilih cabang), tombol berlogo Instagram & TikTok, serta tombol **`Isi Form Booking Online Sekarang →`**.

---

## 3. Splash Screen ("Flash") Anti-Terlempar Saat Reload & Optimasi Kuota
- **Splash Screen Berlogo "kafela's Agenda"**: Saat halaman di-*reload* (`F5`), tahan tampilan dengan Splash Screen dan langsung pulihkan sesi serta posisi menu/tab terakhir dari `localStorage` & `sessionStorage` agar **tidak pernah terlempar ke halaman Login atau kembali ke Kalender**.
- **Hemat Kuota Read/Write**: Simpan 8 foto langsung di dokumen `owners/{uid}` (**1 Write** saat simpan, **1 Read** saat muat awal, dan **0 Read** saat reload cepat via *Smart Local Cache*).
