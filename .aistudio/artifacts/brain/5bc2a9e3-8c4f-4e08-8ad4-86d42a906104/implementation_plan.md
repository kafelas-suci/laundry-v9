# Rencana Pengamanan Penuh Billing & Langganan (`walletBalance` & `subscriptionType`)

## 1. Tujuan Utama & Model Keamanan
Menutup seluruh celah manipulasi status langganan (`subscriptionType`, `subscriptionEndDate`) dan saldo dompet (`walletBalance`) dari sisi client (browser console, modifikasi localStorage/IndexedDB, maupun panggilan langsung ke Firestore SDK/REST API dengan token user). Seluruh mutasi saldo dan masa aktif hanya sah apabila dieksekusi oleh server backend menggunakan kredensial Service Account resmi.

---

## 2. Arsitektur Penguncian Berlapis

### A. Penguncian Ketat `firestore.rules` (Zero Client Billing Mutation)
- **Koleksi `/users/{userId}`**:
  - **Saat Pendaftaran (`create`)**: User baru wajib berstatus `role == 'owner'`, `walletBalance == 0`, `subscriptionType == 'newcomer'`, dan `subscriptionEndDate == null`. Pembuatan akun kasir oleh Owner wajib memiliki `walletBalance == 0` dan hanya mewarisi status langganan asli milik Owner di database.
  - **Saat Pembaruan Profil (`update`)**: Menghapus izin `isValidWalletSpend()` dan `isValidOrderSettlement()` dari akses client reguler. Update oleh user dibatasi ketat dengan daftar kolom aman (`affectedKeys().hasOnly(...)`) khusus profil non-billing (`displayName`, `username`, `nomorTelepon`, `emailOrPhone`, `authEmail`, `laundries`, `laundryId`, dan preferensi operasional). Kolom `walletBalance`, `subscriptionType`, `subscriptionEndDate`, `lastSettledOrderId`, `role`, `uid`, dan `ownerId` dikunci mutlak agar tidak dapat diubah oleh client.
- **Koleksi `/payment_orders/{orderId}`**:
  - Client hanya diizinkan membaca (`read`) status pesanan miliknya sendiri.
  - Akses `create`, `update`, dan `delete` dari sisi client ditutup penuh bagi user reguler sehingga tidak ada celah pembuatan bukti bayar lunas palsu.
- **Koleksi `/laundries/{laundryId}`**:
  - Pembuatan cabang dari sisi client hanya diizinkan untuk **1 cabang utama awal** (`lnd-{uid}`) dengan status `newcomer`. Cabang ke-2 dan seterusnya wajib dibuat lewat endpoint backend berbayar.
  - Update data cabang oleh Owner dari client dibatasi hanya pada identitas toko (`namaLaundry`, `alamat`, `nomorTelepon`) dan dilarang mengubah `subscriptionType`, `subscriptionEndDate`, maupun `ownerId`.
- **Koleksi `/billing_audit_logs/{logId}` (Baru — Buku Besar Audit Billing)**:
  - Catatan transaksi billing bersifat *append-only* (tidak dapat diedit atau dihapus dari client) untuk merekam setiap penambahan saldo, perpanjangan paket, aktivasi cabang tambahan, maupun persetujuan transfer manual oleh Super Admin.

---

### B. Endpoint Backend Terproteksi (`server.ts`)
Seluruh endpoint memverifikasi Firebase ID Token pemanggil, menghitung biaya secara *server-authoritative* (mengabaikan angka harga dari request client), dan menulis ke Firestore menggunakan `FIREBASE_SERVICE_ACCOUNT_JSON`:

1. **`POST /api/billing/extend-subscription`**:
   - Memvalidasi pilihan durasi paket (kelipatan 30 hari) dan menghitung harga resmi di server (`Rp 27.000` per 30 hari).
   - Memeriksa kecukupan `walletBalance` langsung dari dokumen Firestore terbaru, memotong saldo secara atomik, memperbarui `subscriptionType: 'premium'` & `subscriptionEndDate`, menyelaraskan seluruh dokumen cabang milik Owner tersebut, serta mencatat ke `billing_audit_logs`.
2. **`POST /api/billing/activate-branch`**:
   - Memeriksa jumlah cabang eksisting milik Owner di Firestore.
   - Jika sudah memiliki cabang utama, server memvalidasi dan memotong biaya resmi `Rp 25.000` dari `walletBalance`, membuat dokumen cabang baru di `/laundries/{branchId}` dengan status langganan yang selaras, memperbarui peta `laundries` pada profil Owner, dan mencatat ke `billing_audit_logs`.
3. **Penguatan Endpoint Midtrans (`/api/midtrans/create-transaction`, `/api/midtrans/verify-order`, `/api/midtrans/webhook`)**:
   - Mengalihkan seluruh penulisan dokumen `payment_orders` dan pengkreditan `users/{uid}` agar wajib memakai token Service Account server (bukan lagi token user pemanggil), serta menyelaraskan masa aktif cabang ketika pembayaran `extend_premium` lunas.
   - Memperbarui endpoint diagnostik `/api/midtrans/config` agar menampilkan status kesiapan `FIREBASE_SERVICE_ACCOUNT_JSON` secara transparan bagi Super Admin.
4. **Endpoint Khusus Super Admin untuk Transfer Biasa BRI / DANA**:
   - **`POST /api/admin/billing/lookup-user`**: Mencari akun Owner berdasarkan **ID Akun (`uid`)**, **Email**, atau **Nomor Telepon** (sesuai format pesan konfirmasi WhatsApp pembeli) setelah memverifikasi token Super Admin (`email_verified == true` dan email terdaftar di daftar Super Admin).
   - **`POST /api/admin/billing/grant`**: Mengizinkan Super Admin mengaktifkan/memperpanjang Paket Premium (30/60/90/180/365 hari) atau menambahkan `walletBalance` sesuai nominal bukti transfer BRI/DANA, menyelaraskan seluruh cabang Owner tersebut, dan menyimpan jejak audit resmi.

---

### C. Pembaruan Alur Client & Antarmuka Super Admin
1. **Sanitasi Sinkronisasi Client (`src/utils/firebaseSync.ts` & `src/App.tsx`)**:
   - Memisahkan fungsi update profil menjadi khusus kolom identitas (`displayName`, `username`, `nomorTelepon`, `laundries`) agar tidak pernah lagi mengirim field `walletBalance` atau `subscriptionType` dari client.
   - Mengarahkan aksi **Potong Saldo Perpanjang Paket** dan **Bayar & Buat Cabang Baru** ke layanan baru `src/services/billingService.ts` yang memanggil endpoint backend terproteksi, disertai indikator loading yang jelas dan sinkronisasi state otomatis dari respons server.
2. **Panel Aktivasi Transfer Manual (Khusus Super Admin)**:
   - Menambahkan komponen modal khusus `SuperAdminBillingModal.tsx` yang hanya muncul dan dapat diakses oleh akun Super Admin terverifikasi di halaman **Pengaturan** dan **Kelola Owner**.
   - **Alur Kerja Praktis**:
     1. Pembeli melakukan Transfer Biasa (BRI / DANA) dan mengirim pesan konfirmasi WhatsApp berisi **ID Akun** & **Nominal**.
     2. Super Admin menempelkan ID Akun / Email / No. WA di kolom pencarian panel Super Admin.
     3. Layar menampilkan profil toko, sisa hari aktif, dan saldo dompet saat ini.
     4. Super Admin memilih metode bukti bayar (`BRI` / `DANA`), memilih aksi (**Aktifkan Paket Premium** atau **Tambah Saldo Dompet**), lalu menekan tombol konfirmasi untuk mengaktifkan akun pembeli secara instan.

---

## 3. Daftar File yang Akan Dibuat / Dimodifikasi
- `firestore.rules` — Penguncian mutlak kolom billing pada `/users`, `/laundries`, `/owners`, penguncian tulis pada `/payment_orders`, serta aturan untuk `/billing_audit_logs`.
- `server.ts` — Penambahan endpoint `/api/billing/extend-subscription`, `/api/billing/activate-branch`, `/api/admin/billing/lookup-user`, `/api/admin/billing/grant`, serta migrasi mutasi Midtrans ke kredensial Service Account penuh.
- `src/services/billingService.ts` *(Baru)* — Klien HTTP terautentikasi Bearer ID Token untuk seluruh aksi potong saldo, aktivasi cabang baru, dan operasi panel Super Admin.
- `src/services/midtransService.ts` — Penambahan indikator diagnostik status Service Account server.
- `src/components/SuperAdminBillingModal.tsx` *(Baru)* — Antarmuka khusus Super Admin untuk pencarian akun Owner, aktivasi Paket Premium, pengisian saldo Transfer Biasa (BRI/DANA), dan riwayat kredit terakhir.
- `src/components/MidtransAdminSetupModal.tsx` — Menampilkan indikator kesiapan `FIREBASE_SERVICE_ACCOUNT_JSON` agar Super Admin mengetahui status proteksi penulisan server.
- `src/utils/firebaseSync.ts` — Pembatasan payload update profil & cabang hanya ke kolom non-billing yang diizinkan aturan keamanan baru.
- `src/App.tsx`, `src/views/KelolaOwnerView.tsx`, & `src/views/SettingsView.tsx` — Integrasi pemanggilan endpoint backend saat perpanjang paket/tambah cabang serta tombol akses Panel Aktivasi Transfer Manual khusus Super Admin.

---

## 4. Rencana Verifikasi
1. **Validasi Kompilasi & Tipe**: Menjalankan pemeriksaan TypeScript dan build produksi (`compile_applet`) untuk memastikan seluruh tipe data client & server selaras tanpa error.
2. **Audit Keamanan Rules & Endpoint**:
   - Memastikan update profil nama/telepon Owner tetap berjalan lancar tanpa terkena `permission-denied`.
   - Memastikan setiap percobaan manipulasi `walletBalance`, `subscriptionType`, `subscriptionEndDate`, maupun pembuatan `payment_orders` dari sisi client ditolak oleh `firestore.rules`.
   - Memastikan endpoint Super Admin menolak akses (`403 Forbidden`) bagi semua akun selain Super Admin terverifikasi, serta mendeploy aturan terbaru ke Firebase (`deploy_firebase`).
