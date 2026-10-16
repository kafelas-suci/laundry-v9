# Portal Super Admin Stealth & Otomasi Role Firebase

Implementasi sistem otorisasi Super Admin tersembunyi (*stealth mode*) tanpa tombol publik dan tanpa *hardcode* kredensial, di mana hak akses ditentukan murni oleh verifikasi dokumen role pada koleksi `users` di Firebase Firestore.

### User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawaban Anda:
> 1. **Arsitektur**: Tetap dalam 1 aplikasi, namun seluruh akses Super Admin dibuat tersembunyi (*stealth mode* tanpa tombol publik di layar login maupun sidebar).
> 2. **Metode Akses**: Login biasa menggunakan form login Firebase. Sistem secara otomatis mendeteksi apakah akun tersebut memiliki hak akses Super Admin di Firestore dan mengalihkannya langsung ke dasbor Super Admin.
> 3. **Data Hak Akses**: Disimpan di koleksi Firestore `users` dengan field `role: "superadmin"`. Tidak ada email atau password yang di-*hardcode* di dalam kode aplikasi.

- **Confirmed Decision 1**: Tombol publik "Portal Super Admin" dihapus dari form login (`LoginAndSetupScreen.tsx`) dan dari menu navigasi/sidebar (`App.tsx`).
- **Confirmed Decision 2**: Saat pengguna login via Firebase Auth, aplikasi memeriksa dokumen `users/{uid}` di Firestore. Jika `role === "superadmin"`, pengguna langsung dialihkan ke portal Super Admin. Jika bukan superadmin, masuk ke portal studio/kru reguler sesuai hak aksesnya.
- **Confirmed Decision 3**: Struktur website profil publik (`public/profil.html`) tetap baku sesuai urutan: **Landing page (Sampul) -> Portofolio (Karya) -> Layanan (Paket) -> Penutup (Kontak & Reservasi)**.

---

## 1. Overview & Core Concept

- **Apa yang Dibuat**: Sistem akses aman berlapis untuk Super Admin. Dari sisi antarmuka publik, portal Super Admin tidak terlihat sama sekali. Pengguna login secara normal menggunakan form otentikasi Firebase bawaan. Jika akun tersebut memiliki dokumen di Firestore dengan atribut `role: "superadmin"`, aplikasi secara otomatis membuka dasbor kendali penuh Super Admin (pengaturan multi-brand, reset database, analitik global, dan manajemen lisensi).
- **Target Pengguna**: Pemilik sistem / Super Admin utama tanpa mengekspos pintu masuk khusus ke publik atau kru biasa.
- **Nilai Keamanan**: Tidak ada kata sandi atau email yang tertulis di dalam kode sumber (*zero hardcoded credentials*). Hak akses sepenuhnya dikontrol melalui Firebase Authentication dan Firestore Security Rules.

---

## 2. Panduan Pembuatan Data di Firebase Console (Untuk Anda)

Agar akun Super Admin Anda dapat dikenali sistem setelah kode diperbarui, berikut 2 hal yang perlu Anda buat di Firebase Console:

1. **Buat Pengguna di Firebase Authentication**:
   - Buka **Firebase Console** &rarr; **Authentication** &rarr; tab **Users**.
   - Klik **Add user** (Tambahkan pengguna).
   - Masukkan Email: `iqbasaefinnuha@gmail.com` dan Password sesuai kehendak Anda.
   - Salin **User UID** pengguna tersebut (misal: `abc123xyz456...`).

2. **Buat Dokumen Role di Firestore Database**:
   - Buka **Firebase Console** &rarr; **Firestore Database**.
   - Buka (atau buat baru) koleksi bernama `users`.
   - Tambahkan dokumen baru dengan:
     - **Document ID**: Masukkan **User UID** dari langkah 1 (atau email `iqbasaefinnuha@gmail.com` jika menggunakan email sebagai key). Sistem akan mendukung pengecekan berbasis UID maupun email.
     - Tambahkan field:
       - `email`: `"iqbasaefinnuha@gmail.com"` (string)
       - `role`: `"superadmin"` (string)
       - `nama`: `"Super Admin"` (string)

---

## 3. Alur Pengguna & Desain Antarmuka

```
┌────────────────────────────────────────────────────────┐
│            Form Login Biasa (Email & Password)         │
│     (Tanpa tombol/indikator publik Super Admin)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Firebase Auth: signInWithEmail            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         Cek Koleksi Firestore: users/{uid}             │
│                Field: role === "superadmin"            │
└─────────────┬────────────────────────────┬─────────────┘
              │ Ya                         │ Tidak
              ▼                            ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Buka Dashboard Penuh   │  │   Buka Dashboard Biasa   │
│       SUPER ADMIN        │  │       Studio / Kru       │
└──────────────────────────┘  └──────────────────────────┘
```

1. **Layar Login Bersih**: Pengunjung/kru hanya melihat form login studio standar dan opsi demo. Tombol abu-abu/kuning "Akses Cepat Super Admin" dihilangkan total.
2. **Otomasi Pengalihan**: Ketika akun ber-role `superadmin` masuk, aplikasi mendeteksi atribut tersebut secara *asynchronous* dan langsung mengatur `viewMode = 'SUPER_ADMIN'`.
3. **Pembersihan Navigasi Internal**: Menu navigasi samping (sidebar/drawer) tidak lagi menampilkan tombol "Portal Super Admin" kepada pengguna reguler. Super Admin tetap memiliki tombol navigasi keluar / kembali ke konsol studio bila diperlukan.

---

## 4. Arsitektur Teknis & Perubahan Kode

```
┌────────────────────────────────────────────────────────────────────────┐
│                              Aplikasi Web                              │
├────────────────────────────────┬───────────────────────────────────────┤
│ Frontend (React / Vite)        │ Backend / Firebase                    │
├────────────────────────────────┼───────────────────────────────────────┤
│ • LoginAndSetupScreen.tsx      │ • Firebase Auth                       │
│   - Hilangkan tombol publik    │   - Memverifikasi email & password    │
│ • App.tsx                      │ • Cloud Firestore                     │
│   - Callback onLoginSuccess    │   - Koleksi `users/{uid}`             │
│   - Query role user Firestore  │   - Validasi field `role: superadmin` │
│   - Set viewMode 'SUPER_ADMIN' │ • Firestore Rules                     │
│   - Hilangkan tombol di sidebar│   - Menjaga data users hanya bisa     │
│ • public/profil.html           │     dibaca oleh yang bersangkutan     │
│   - Pastikan urutan 4 seksi    │                                       │
└────────────────────────────────┴───────────────────────────────────────┘
```

### Rincian Perubahan:
1. **`src/components/LoginAndSetupScreen.tsx`**:
   - Hapus tombol "Akses Cepat Super Admin" / "Portal Super Admin" pada blok tombol bawah.
2. **`src/App.tsx`**:
   - Pada handler `handleLoginFirebaseSuccess`: setelah `signInWithEmailAndPassword`, ambil dokumen dari koleksi `users` berdasarkan `user.uid` (atau `users` query email).
   - Jika `data.role === 'superadmin'`, set `setIsSuperAdminUnlocked(true)` dan alihkan `setViewMode('SUPER_ADMIN')`.
   - Hapus tombol "Portal Super Admin" dari navigasi sidebar agar tidak muncul bagi pengguna biasa.
3. **`public/profil.html`**:
   - Pastikan urutan seksi:
     1. Sampul (Landing Page / Hero)
     2. Galeri Portofolio
     3. Katalog & Layanan
     4. Penutup (Kontak & Reservasi)
