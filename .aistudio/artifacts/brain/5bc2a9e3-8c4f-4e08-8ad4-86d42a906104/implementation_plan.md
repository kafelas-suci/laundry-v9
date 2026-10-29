# Rencana Kesiapan Komersial (Commercial Readiness) Kafelas Laundry

Transformasi menyeluruh untuk mengubah Kafelas Laundry dari versi purwarupa menjadi produk SaaS kasir laundry komersial yang aman dijual ke publik—mencakup pembayaran otomatis Midtrans, penutupan celah saldo/upgrade gratis, isolasi ketat data antar toko, dan sinkronisasi login kasir beda HP.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh keputusan produk utama di bawah ini telah disesuaikan dengan konfirmasi Anda pada tahap klarifikasi sebelumnya dan akan menjadi acuan tunggal saat implementasi:

- **Keputusan Terkonfirmasi 1 — Dua Pilihan Tombol Pembayaran Saat Perpanjang & Top-Up (Midtrans atau Transfer Biasa)**: Saat perpanjangan masa aktif Paket Premium (Rp 27.000 / 30 hari), upgrade paket, maupun isi saldo dompet, pengguna selalu disajikan **2 tombol pilihan metode pembayaran berdampingan**:
  1. **Bayar via Midtrans (Otomatis)**: Membuka pembayaran instan Midtrans Snap (QRIS, Virtual Account BRI/BCA/Mandiri/BNI, GoPay, DANA, ShopeePay) yang langsung mengaktifkan langganan/saldo secara otomatis begitu lunas.
  2. **Transfer Biasa (BRI / DANA Manual)**: Menampilkan nomor rekening resmi **BRI `4108 0100 8396 530`** dan **DANA `0831 3230 4649`** (a/n Iqbal S. Nuha) lengkap dengan tombol salin akurat serta tombol kirim konfirmasi bukti transfer ke WhatsApp Admin (`6285659781477`). *(Jika saldo dompet pengguna sudah mencukupi, tombol potong saldo dompet juga tetap tersedia).*
- **Keputusan Terkonfirmasi 2 — Penutupan Total Celah Gratis**: Tombol tambah saldo instan tanpa bayar dan perpindahan langsung ke Paket Premium tanpa pemotongan saldo/pembayaran sah dihapus sepenuhnya dari antarmuka serta diblokir melalui validasi keamanan cloud.
- **Keputusan Terkonfirmasi 3 — Rekening DANA Resmi & Penyeragaman Paket Premium Unlimited**: Nomor DANA resmi diseragamkan menjadi **`0831 3230 4649`** (a/n Iqbal S. Nuha) termasuk pada tombol salin otomatis, sementara BRI tetap `4108 0100 8396 530`. Kuota transaksi bulanan **Paket Premium (Rp 27.000/bulan)** ditetapkan **Tanpa Batas (Unlimited)** di seluruh logika sistem dan tampilan, serta label usang seperti "Paket Pro Rp 57.000" dibersihkan.
- **Keputusan Terkonfirmasi 4 — Isolasi Keamanan Antar Toko & Login Kasir Beda HP**: Hak akses database diperketat agar satu pemilik laundry tidak dapat melihat atau mengubah data toko laundry lain, dan pembuatan akun kasir disinkronkan langsung ke autentikasi cloud sehingga kasir dapat login dari HP masing-masing menggunakan email maupun nomor WhatsApp.
- **Keputusan Terkonfirmasi 5 — Kode Bersih Tanpa Komentar Tidak Perlu**: Seluruh perubahan kode akan ditulis rapi, langsung ke inti fungsi, dan bebas dari komentar kode yang berlebihan atau tidak diperlukan.

> [!NOTE]
> **Kesiapan Dua Jalur Pembayaran**: Dengan hadirnya 2 tombol pilihan (**Midtrans** & **Transfer Biasa**), pembeli bebas memilih cara bayar yang paling nyaman kapan saja. Agar tombol Midtrans Snap dapat memproses pembayaran otomatis di lingkungan produksi, variabel lingkungan `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, dan `MIDTRANS_IS_PRODUCTION` cukup diatur pada server backend.

---

## 1. Overview & Core Concept

- **Apa yang Dihadirkan**: Sistem lisensi berlangganan SaaS, dompet saldo terverifikasi, proteksi data multi-toko (*multi-tenant*), dan manajemen staf kasir lintas perangkat yang siap dipasarkan secara komersial kepada pengusaha laundry di seluruh Indonesia.
- **Target Pengguna**:
  - **Pemilik Usaha Laundry (Owner)**: Mendaftar mandiri, mencoba Paket Newcomer secara gratis (maksimal 50 transaksi/bulan, 50 pelanggan, 5 layanan), lalu melakukan pembayaran otomatis via Midtrans untuk naik ke Paket Premium Unlimited (Rp 27.000/bulan) dan memantau seluruh cabang dari HP/laptop pribadi.
  - **Staf Kasir / Karyawan Operasional**: Masuk dari HP di meja kasir menggunakan akun kasir yang dibuatkan Owner untuk menginput cucian masuk, memperbarui status pengerjaan, dan mencatat pelunasan tanpa memiliki akses untuk menghapus transaksi, mengedit tarif layanan, atau melihat pengaturan finansial Owner.
- **Nilai Jual Utama**: Pendapatan langganan Anda sebagai penyedia aplikasi terlindungi dari pembobolan saldo gratis, privasi data pelanggan tiap pembeli aplikasi terjamin aman satu sama lain, dan fitur kolaborasi Owner–Kasir bekerja nyata secara *real-time* antar perangkat berbeda.

---

## 2. User Experience & Visual Design

### Alur Utama Pengguna (Key User Flows)

1. **Alur Perpanjangan Paket Premium & Top-Up dengan 2 Tombol Pilihan Pembayaran**:
   - Saat masa langganan habis (*Perpanjang Langganan*), saat ingin *Upgrade Paket Premium*, maupun saat membuka *Isi Saldo Dompet*, Owner memilih durasi/nominal (misal Rp 27.000 untuk 30 hari, Rp 54.000 untuk 60 hari, Rp 81.000 untuk 90 hari, atau nominal kustom) lalu melihat **2 tombol aksi pembayaran yang jelas**:
     - **Tombol 1 — Lewat Midtrans (Otomatis)**: Memunculkan jendela pembayaran **Midtrans Snap** (QRIS, Virtual Account Bank, E-Wallet). Begitu pembayaran selesai (*settlement*), sistem memverifikasi transaksi ke server secara otomatis dan langsung menambah masa aktif 30 hari atau saldo dompet tepat satu kali.
     - **Tombol 2 — Transfer Biasa (BRI / DANA)**: Membuka rincian rekening resmi **BRI `4108 0100 8396 530`** dan **DANA `0831 3230 4649`** (a/n Iqbal S. Nuha) dengan tombol **Salin** berdigit akurat, diikuti tombol **Kirim Bukti ke WhatsApp Admin** (`6285659781477`) dengan pesan konfirmasi terformat rapi.
   - Apabila saldo dompet Owner sebelumnya sudah mencukupi (≥ Rp 27.000), tombol **Perpanjang dengan Potong Saldo Dompet** juga langsung aktif untuk perpanjangan instan tanpa perlu transfer ulang.

2. **Alur Pendaftaran & Login Akun Kasir Lintas Perangkat**:
   - Owner berstatus Paket Premium membuka menu *Kelola Kasir*, lalu menginput Nama Kasir, Email atau Nomor WhatsApp Kasir, Cabang Penugasan, dan Kata Sandi (minimal 6 karakter).
   - Sistem mendaftarkan akun kasir tersebut ke layanan autentikasi cloud menggunakan sesi terisolasi (sehingga akun Owner yang sedang aktif **tidak ikut ter-logout**), sekaligus mencatat ikatan kasir ke cabang laundry milik Owner.
   - Di HP berbeda, Kasir membuka aplikasi Kafelas Laundry, memasukkan Email atau Nomor WhatsApp beserta kata sandi yang diberikan Owner, dan langsung diarahkan masuk ke dasbor operasional cabang tempat ia ditugaskan dengan sinkronisasi transaksi *real-time*.

### Identitas Visual & Tata Ruang SaaS

- **Aesthetic Direction**: *Clean Commercial POS & SaaS Dashboard* — tampilan lugas, berwibawa untuk pencatatan uang, padat informasi namun tetap lapang di layar ponsel maupun desktop.
- **Palet Warna & Hirarki Status (60-30-10)**:
  - **60% Permukaan Utama**: Putih bersih (`#FFFFFF`) dan abu terang sejuk (`#F8FAFC`) dengan garis batas tipis 1px (`#E2E8F0`) untuk memisahkan tabel dan panel tanpa penumpukan bayangan berlebih.
  - **30% Struktur Teks & Kontras**: Slate pekat (`#0F172A`) untuk judul dan angka utama, serta abu netral (`#475569`) untuk label pendukung.
  - **10% Aksen Merek & Status Semantik**: Merah Maroon khas Kafelas (`#800000`) khusus pada tombol tindakan utama dan penanda aktif; Hijau Zamrud (`#16A34A`) khusus status lunas/langganan aktif; Kuning Amber (`#D97706`) untuk peringatan masa aktif hampir habis/menunggu pembayaran; Merah Crimson (`#DC2626`) untuk langganan kedaluwarsa atau pembayaran gagal.
- **Tipografi & Disiplin Angka Tabular**:
  - Menggunakan `Plus Jakarta Sans` untuk keterbacaan antarmuka yang tajam pada ukuran 12px–14px.
  - Seluruh nominal Rupiah, saldo dompet, hitung mundur hari aktif, nomor rekening, dan kode referensi pembayaran wajib menerapkan angka sejajar (`tabular-nums` / huruf monospace) agar digit tidak bergeser saat nilai berubah.
- **Penyajian Kartu Paket yang Transparan**:
  - Matriks perbandingan **Paket Newcomer (Gratis Selamanya)** vs **Paket Premium (Rp 27.000 / 30 Hari)** ditulis dengan angka konkret (**"50 Transaksi / Bulan"** berbanding **"Tanpa Batas / Unlimited"**), bebas dari label paket lama yang membingungkan.

### Umpan Balik Interaktif & Penanganan Status

- **Status Pembayaran Transparan**: Tombol bayar berubah menjadi indikator pemrosesan selama pembuatan token Midtrans, menampilkan status *"Menunggu Pembayaran"* jika pengguna menutup jendela Snap sebelum membayar (dilengkapi tombol **Cek Status Pembayaran**), dan langsung memperbarui lencana langganan saat lunas.
- **Umpan Balik Salin & Validasi Form**: Tombol salin rekening memberikan konfirmasi visual instan (*Tersalin*) beserta notifikasi *toast* yang menampilkan nomor yang disalin agar pengguna yakin nomor DANA `083132304649` sudah benar.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Verifikasi Pembayaran Ganda Midtrans (Webhook Server + Pengecekan Status Aktif) dengan Proteksi Idempotensi**
  - *Pendekatan Terpilih*: Menggabungkan penerima notifikasi otomatis (*webhook* berverifikasi tanda tangan kriptografi SHA-512 dari Midtrans) dengan rute pengecekan status aktif dari aplikasi ke server Midtrans, serta buku catatan transaksi (*payment ledger*) yang mengunci setiap `orderId` agar hanya bisa dikreditkan satu kali.
  - *Mengapa & Kelebihannya*: Pada kondisi jaringan seluler yang tidak stabil atau ketika *webhook* mengalami jeda beberapa detik, pengguna tetap langsung mendapatkan aktivasi Paket Premium begitu jendela Snap selesai tanpa risiko saldo masuk dua kali (*double-credit*).
  - *Konsekuensi / Trade-Off*: Membutuhkan penyimpanan dokumen riwayat tagihan per pesanan pembayaran, namun memberikan jejak audit keuangan yang jauh lebih rapi dan aman dari kecurangan.

- **Keputusan 2: Penguncian Kolom Saldo & Langganan dari Manipulasi Sisi Klien**
  - *Pendekatan Terpilih*: Menghapus tombol instan di antarmuka sekaligus memperketat aturan keamanan database agar pengguna biasa tidak dapat memodifikasi nilai saldo dompet, tipe paket, atau tanggal kedaluwarsa secara sepihak melalui konsol peramban; perubahan aktivasi diproses melalui layanan verifikasi server yang sah atau pemotongan saldo tervalidasi.
  - *Mengapa & Kelebihannya*: Jika hanya tombolnya yang disembunyikan di tampilan depan tetapi aturan databasenya tetap terbuka, pembeli yang paham teknis masih bisa menyuntikkan saldo jutaan rupiah secara gratis lewat *browser inspect*. Mengunci di kedua sisi menutup celah kerugian bisnis secara permanen.
  - *Alternatif yang Dilewati*: Menyembunyikan tombol dengan kata sandi rahasia di sisi klien dilewati karena kode JavaScript klien selalu dapat dibongkar oleh publik.

- **Keputusan 3: Provisioning Akun Kasir via Instans Autentikasi Sekunder & Login Fleksibel (Email / No. WhatsApp)**
  - *Pendekatan Terpilih*: Saat Owner menambahkan kasir baru, sistem membuat akun autentikasi cloud melalui instans aplikasi sekunder yang terpisah di memori (lalu langsung memutus sesi sekunder tersebut), serta mengonversi nomor WhatsApp kasir secara deterministik menjadi identitas autentikasi standar apabila kasir tidak memiliki alamat email.
  - *Mengapa & Kelebihannya*: Mencegah masalah klasik Firebase di mana membuat akun staf baru justru menendang keluar (*logout*) sesi Owner yang sedang login, sekaligus memudahkan kasir lapangan cukup mengingat nomor WhatsApp dan kata sandi mereka untuk login di HP mana pun.
  - *Konsekuensi / Trade-Off*: Kata sandi kasir dikelola oleh autentikasi cloud (minimal 6 karakter sesuai standar keamanan autentikasi modern), bukan lagi teks biasa di penyimpanan lokal satu HP.

- **Keputusan 4: Isolasi Multi-Tenant Berbasis Kepemilikan Cabang & Registri Staf**
  - *Pendekatan Terpilih*: Memperbaiki logika aturan keamanan cloud yang sebelumnya mengizinkan *semua* akun berlabel `owner` mengakses *semua* cabang laundry, menjadi verifikasi spesifik bahwa pengakses benar-benar pemilik sah cabang `laundryId` tersebut atau kasir resmi yang terdaftar pada cabang itu.
  - *Mengapa & Kelebihannya*: Menjamin kerahasiaan omzet, daftar pelanggan, dan nota transaksi antar pembeli aplikasi Kafelas Laundry. Kasir tetap leluasa menginput nota dan pelunasan di cabangnya, namun diblokir di tingkat database jika mencoba menghapus nota atau mengubah harga layanan.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Diagram Arsitektur & Aliran Komponen

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                         ANTARMUKA KLIEN (WEB / PWA MOBILE)                        │
│                                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌───────────────────┐  │
│  │  Modul Billing & Paket  │  │   Modul Kelola Kasir    │  │  Ruang Kerja POS  │  │
│  │  • Perpanjang & Upgrade │  │  • Form Tambah Kasir    │  │  • Transaksi Nota │  │
│  │    (Unlimited Nota)     │  │  • Instans Auth Sekunder│  │  • Pelanggan      │  │
│  │  • 2 Opsi Bayar:        │  │  • Penugasan Cabang     │  │  • Arus Kas       │  │
│  │    1) Midtrans Snap     │  │                         │  │  • Laporan (Owner)│  │
│  │    2) Transfer BRI/DANA │  │                         │  │                   │  │
│  └────────────┬────────────┘  └────────────┬────────────┘  └─────────┬─────────┘  │
└───────────────┼────────────────────────────┼─────────────────────────┼────────────┘
                │                            │                         │
                │ HTTPS + Token Auth         │ Provisioning            │ Real-time Sync
                ▼                            ▼                         ▼
┌───────────────────────────────┐  ┌────────────────────────────────────────────────┐
│   LAYANAN BACKEND EXPRESS     │  │         FIREBASE AUTH & CLOUD FIRESTORE        │
│                               │  │                                                │
│  • Pembuat Transaksi Snap     │  │  ┌──────────────────────────────────────────┐  │
│    (Server Key Rahasia)       │  │  │ Koleksi Profil Pengguna                  │  │
│  • Penerima Webhook Midtrans  │──┼─▶│ • Peran (Owner / Kasir) & Ikatan Cabang  │  │
│    (Validasi SHA-512)         │  │  │ • Saldo Dompet & Masa Aktif Premium      │  │
│  • Verifikator Status Tagihan │  │  └──────────────────────────────────────────┘  │
│    & Pengunci Idempotensi     │  │  ┌──────────────────────────────────────────┐  │
└───────────────┬───────────────┘  │  │ Buku Tagihan Pembayaran (Payment Orders) │  │
                │                  │  │ • Order ID, Nominal, Tujuan, Status Lunas│  │
                ▼                  │  └──────────────────────────────────────────┘  │
┌───────────────────────────────┐  │  ┌──────────────────────────────────────────┐  │
│     GERBANG MIDTRANS SNAP     │  │  │ Koleksi Cabang Laundry Terisolasi        │  │
│  • QRIS / Virtual Account /   │  │  │ • Registri Staf Kasir Resmi Cabang       │  │
│    DANA / GoPay / ShopeePay   │  │  │ • Nota, Pelanggan, Layanan, Pengeluaran  │  │
└───────────────────────────────┘  └──┴──────────────────────────────────────────┴──┘
```

### Model Data & Entitas Utama

1. **Profil Pengguna & Langganan (`Users`)**:
   - Menyimpan identitas akun (`uid`, nama, email, nomor WhatsApp), peran (`owner` atau `admin` untuk kasir), referensi cabang penugasan (`laundryId` dan `ownerId` khusus akun kasir), serta atribut komersial (`subscriptionType`, `subscriptionEndDate`, `walletBalance`, `extraBranches`).
   - Aturan keamanan membatasi pembacaan profil hanya untuk pemilik akun yang bersangkutan (atau Owner atas staf kasirnya) dan mencegah eskalasi peran atau manipulasi saldo sepihak saat pendaftaran/pembaruan profil biasa.
2. **Buku Tagihan Pembayaran (`Payment Orders`)**:
   - Mencatat setiap sesi pembayaran Midtrans dengan atribut `orderId` unik, `ownerUid`, jenis pembelian (`topup_wallet`, `activate_premium_30d`, atau `extra_branch`), nominal tagihan (`grossAmount`), `snapToken`, status pembayaran (`pending`, `settled`, `expired`, `failed`), dan penanda `creditedAt` untuk menjamin satu pembayaran hanya memicu satu kali penambahan saldo atau masa aktif.
3. **Cabang Laundry & Registri Staf (`Laundries` & Subkoleksi `Staff`)**:
   - Setiap dokumen cabang menyimpan `ownerId` tunggal pemilik sah serta daftar/subkoleksi staf kasir resmi (`staff/{cashierUid}`) berisi status aktif, nama tampilan, dan kontak login.
   - Subkoleksi operasional (`transaksi`, `pelanggan`, `pengeluaran`, `layanan`, `settings`) divalidasi secara ketat terhadap kepemilikan `ownerId` spesifik cabang tersebut atau keanggotaan `cashierUid` di dalam registri staf cabang yang sama.

### Pemetaan Interaksi Komponen & Transisi State

- **Pilihan Ganda Metode Pembayaran (Midtrans Snap vs Transfer Biasa)**:
  1. Pada modal perpanjangan langganan, upgrade paket, maupun isi saldo, pengguna memilih salah satu dari **2 tombol metode pembayaran**: **Lewat Midtrans** atau **Transfer Biasa**.
  2. Jika memilih **Lewat Midtrans**, antarmuka memvalidasi nominal dan memanggil backend untuk menerbitkan `snapToken` Midtrans, memunculkan jendela Snap, lalu menjalankan verifikasi status pesanan otomatis saat pembayaran selesai sehingga masa aktif +30 hari atau saldo dompet langsung bertambah satu kali secara atomik.
  3. Jika memilih **Transfer Biasa**, panel menampilkan rekening resmi BRI (`4108 0100 8396 530`) dan DANA (`0831 3230 4649`) beserta tombol salin presisi dan tombol kirim bukti transfer ke WhatsApp Admin tanpa menyediakan tombol tambah saldo gratis instan.
- **Pemotongan Saldo Dompet untuk Perpanjangan / Tambah Cabang**:
  - Jika pengguna sudah memiliki saldo dompet yang mencukupi (hasil top-up sebelumnya), tombol perpanjangan memvalidasi kecukupan saldo, memotong Rp 27.000 (untuk +30 hari Premium) atau Rp 25.000 (untuk +1 slot cabang), dan menyinkronkan pembaruan secara konsisten. Tombol perpindahan paket gratis tanpa saldo dihapus sepenuhnya.
- **Pendaftaran, Penghapusan, dan Login Kasir**:
  - Saat Owner mendaftarkan kasir dengan nomor WhatsApp (misal `0812xxxx`), sistem menormalisasi nomor tersebut dan memetakannya ke format kredensial email internal kasir secara konsisten baik saat pembuatan akun maupun saat kasir melakukan login di halaman masuk.
  - Saat Kasir berhasil login di HP baru, sistem membaca profil kasir dari cloud, mendeteksi `role: 'admin'` beserta `laundryId` dan `ownerId` miliknya, mewarisi status aktif langganan toko induknya, lalu langsung memuat cabang, daftar layanan, pelanggan, dan aliran *real-time* transaksi cabang tersebut.
  - Saat Owner menghapus akun kasir dari menu *Kelola Kasir*, entri kasir pada registri staf cabang dicabut sehingga akses perangkat kasir tersebut ke data cabang otomatis terputus pada tingkat aturan keamanan database.
