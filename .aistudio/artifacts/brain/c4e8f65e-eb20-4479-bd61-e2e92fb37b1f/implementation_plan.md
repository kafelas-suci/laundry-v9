# Rencana Pembatasan Hak Akses Keamanan Admin / Kasir

Implementasi kontrol keamanan berbasis peran (*Role-Based Access Control*) pada alur operasional kasir untuk mencegah manipulasi uang kas, penghapusan nota sepihak, kebocoran laporan keuangan, dan pemberian diskon manual yang tidak terotorisasi.

## Konfirmasi Keputusan Pengguna

> [!IMPORTANT]
> Berdasarkan konfirmasi yang telah Anda pilih:
> 1. **Kunci Hapus Transaksi**: Tombol dan aksi hapus nota transaksi dikunci 100% hanya untuk **Owner**. Admin/Kasir tidak memiliki tombol atau izin menghapus data nota yang sudah tercatat.
> 2. **Kunci Tombol Laporan di Dashboard & Sidebar**: Akses ke **Laporan Keuangan** disembunyikan dari Dashboard, Sidebar, dan diproteksi rutenya agar admin tidak dapat mengintip rekap omset total dan laba-rugi bisnis.
> 3. **Kunci Total Diskon Manual**: Input diskon manual pada saat pembuatan transaksi baru di kasir (`TambahEditView`) dikunci khusus untuk Owner, memastikan kasir hanya memproses transaksi sesuai tarif harga resmi toko.

---

## 1. Ringkasan & Ruang Lingkup

Aplikasi kasir laundry saat ini telah membatasi saldo dompet, pengaturan fitur, dan master data. Langkah selanjutnya adalah memperketat integritas transaksi harian:
- **Proteksi Hapus Transaksi**: Menghilangkan tombol Hapus Nota bagi kasir. Kasir hanya dapat melayani order, mencetak struk, dan mengubah status pengerjaan (Diterima, Proses, Selesai, Diambil).
- **Proteksi Laporan Keuangan**: Menyembunyikan menu Laporan Keuangan dari kasir. Kasir tetap dapat menggunakan Buku Kas Harian (jika diperlukan untuk setoran uang tunai kasir), namun Laporan Keuangan komprehensif dikunci untuk Owner.
- **Proteksi Diskon Manual**: Menonaktifkan input diskon di formulir kasir, sehingga nota dibuat dengan harga standar tanpa celah manipulasi diskon liar.

---

## 2. Pengalaman Pengguna & Desain Antarmuka (UX)

### A. Tampilan Detail Transaksi (`DetailTransaksiView.tsx`)
- **Owner**: Tombol "Hapus Transaksi" tetap tersedia di pojok kanan bawah dengan konfirmasi modal.
- **Admin / Kasir**: Tombol "Hapus Transaksi" ditiadakan sepenuhnya dari antarmuka. Hanya tombol cetak, bagikan struk, dan update status yang tetap aktif.

### B. Dashboard Kasir (`DashboardView.tsx`) & Sidebar Desktop (`DesktopSidebar.tsx`)
- **Owner**: Tombol pintasan "Laporan Keuangan" (kartu navigasi & sidebar) tetap aktif dengan grafik dan ekspor PDF/Excel.
- **Admin / Kasir**:
  - Tombol Laporan di Dashboard disembunyikan atau diganti dengan badge gembok halus (*Owner Only*).
  - Menu navigasi "Laporan Keuangan" pada sidebar desktop disembunyikan dari daftar menu.
  - Jika URL/rute laporan dibuka secara paksa, sistem menampilkan kartu peringatan ramah: *"Akses Dibatasi (Owner Only) - Halaman Laporan Keuangan hanya dapat diakses oleh akun dengan peran Owner"*.

### C. Formulir Nota Kasir (`TambahEditView.tsx`)
- **Owner**: Input kolom diskon dapat diisi bebas seperti biasa (nominal Rupiah).
- **Admin / Kasir**: Bagian input diskon manual ditampilkan dalam mode terkunci (read-only dengan ikon gembok mikro atau disembunyikan), sehingga kasir tidak dapat mengubah total tagihan di luar tarif resmi layanan.

---

## 3. Arsitektur Teknis & Alur Data

```
┌────────────────────────────────────────────────────────┐
│                   User Session (Role)                  │
│       Role: 'owner'           vs.     Role: 'admin'    │
└───────────────┬───────────────────────────┬────────────┘
                │                           │
        Full Privileges             Restricted Access
                │                           │
  ┌─────────────┴─────────────┐  ┌──────────┴───────────────┐
  │ • Hapus Transaksi (Aktif) │  │ • Tombol Hapus: HIDDEN   │
  │ • Laporan Keuangan: FULL  │  │ • Laporan Menu: HIDDEN   │
  │ • Diskon Manual: EDITABLE │  │ • Input Diskon: LOCKED   │
  │ • Saldo & Fitur: FULL     │  │ • Saldo & Fitur: HIDDEN  │
  └───────────────────────────┘  └──────────────────────────┘
```

### Modifikasi Berkas Target:
1. **`src/views/DetailTransaksiView.tsx`**:
   - Memastikan tombol `Hapus Transaksi` hanya di-render jika `currentUser.role === 'owner'`.
2. **`src/views/DashboardView.tsx`**:
   - Membatasi tombol pintasan `Laporan Keuangan` (`onOpenLaporan`) hanya untuk akun Owner.
3. **`src/components/DesktopSidebar.tsx`**:
   - Mengelompokkan menu `laporan` agar hanya muncul untuk akun Owner (`isOwner`).
4. **`src/App.tsx`**:
   - Menambahkan guard proteksi rute `activeView === 'laporan'` sehingga jika kasir masuk, dialihkan atau diberikan peringatan akses ditolak.
   - Menambahkan verifikasi `currentUser.role === 'owner'` pada fungsi `handleDeleteTransaksi` sebagai lapisan pengaman backend/state.
5. **`src/views/TambahEditView.tsx`**:
   - Menerima `currentUser?: User` dan mengunci input diskon manual jika `currentUser?.role !== 'owner'`.

---

## 4. Rencana Verifikasi

- **Pengujian Peran Kasir/Admin**:
  - Buka Detail Transaksi: Pastikan tombol hapus nota tidak ada.
  - Periksa Dashboard & Sidebar: Pastikan tombol Laporan Keuangan tidak tampil.
  - Buka Form Tambah Transaksi: Pastikan input diskon terkunci/hanya untuk owner.
- **Pengujian Peran Owner**:
  - Pastikan semua menu (Laporan Keuangan, Hapus Transaksi, Diskon Manual) tetap berjalan normal tanpa gangguan.
- **Validasi Build**: Menjalankan `compile_applet` dan `lint_applet` (`tsc --noEmit`).
