# Rencana Redesain Struk Profesional & Responsif (Versi PC & HP)

Pembaruan menyeluruh pada desain visual lembaran struk agar menyerupai struk kasir thermal profesional modern (seperti standar struk POS, DANA, dan nota laundry digital), dipadukan dengan arsitektur antarmuka responsif dua mode untuk kenyamanan maksimal di PC (Desktop) maupun HP (Smartphone).

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Detail revisi desain yang disepakati:
> - **Estetika Struk Kasir Profesional**:
>   - Tipografi monospasi murni (`font-mono text-[11px] leading-tight select-none`).
>   - Pembatas garis putus-putus (*dashed line border*) antar seksi data nota.
>   - Status pelunasan besar di tengah nota (`LUNAS` hijau bold vs `BELUM LUNAS` merah bold) beserta angka sisa tagihan yang kontras.
>   - Watermark miring berulang latar belakang bergaya struk bank/DANA dengan opasitas sangat halus.
>   - Tabel rincian layanan & biaya tabular yang rapi (Paket, Tambahan, Diskon, DP, dan Sisa).
>   - Wadah tanda tangan digital owner yang rapi dan terbingkai resmi.
> - **Tata Letak Versi PC (Desktop)**:
>   - Dialog lebar *side-by-side*: Lembaran struk putih melayang di sisi kiri (latar kanvas `bg-slate-100`) dan panel kontrol aksi terpadu di sisi kanan.
> - **Tata Letak Versi HP (Smartphone)**:
>   - Lembaran struk pas layar di area scrollable, dengan *Sticky Action Bar* di bagian bawah yang menempel di layar sehingga tombol Bagikan, WA, dan Cetak mudah dioperasikan satu jempol.

---

### 1. Desain Visual Struk Profesional (Kertas Nota Thermal)

1. **Header Toko & Logo**:
   - Logo studio di tengah/samping dengan opsi filter kontras tinggi untuk printer thermal.
   - Nama brand kapital tebal, nomor kontak, dan alamat cabang.
2. **Metadata Invoice & Tanggal**:
   - Nomor Invoice, Tanggal Transaksi, Waktu Acara, dan Nama Admin Kasir tertata dua kolom kiri-kanan.
3. **Seksi Klien & Status Pembayaran Utama**:
   - Nama klien dalam huruf kapital tebal (*font-extrabold*).
   - Banner status transaksi besar: `LUNAS` (latar hijau lembut atau teks tebal hijau) atau `BELUM LUNAS` (merah).
   - Jika belum lunas, angka sisa pembayaran ditampilkan tebal: `Rp. [SISA],-`.
4. **Rincian Layanan & Keuangan**:
   - Rincian paket dasar dan biaya tambahan dengan perkalian harga transparan.
   - Garis pemisah putus-putus presisi.
   - Total tagihan, pemotongan diskon, uang muka (DP) yang telah dibayar, dan sisa pelunasan.
5. **Catatan & Tanda Tangan Digital**:
   - Catatan khusus klien (jika ada).
   - Tanda tangan digital owner hasil kompresi ultra dengan teks nama brand resmi di bawahnya.
   - Teks penutup: *"Terima kasih. Simpan struk ini sebagai bukti pembayaran yang sah."*
6. **Watermark DANA Background**:
   - Teks nama brand berulang miring -20 derajat di lapisan latar kertas nota dengan opasitas sangat halus (4%), memberikan rasa keaslian dan proteksi anti-pemalsuan.

---

### 2. Antarmuka Responsif (HP & PC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MODAL FRAME DIALOG (PC & HP)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ Top Header: [Judul: Struk Pembayaran Digital]   [No. INV001]   [(X) Tutup]  │
├──────────────────────────────────────┬──────────────────────────────────────┤
│               PC KIRI                │               PC KANAN               │
│        (Kertas Struk Profesional)     │         (Panel Kontrol Aksi)         │
│                                      │                                      │
│  ┌────────────────────────────────┐  │  ┌────────────────────────────────┐  │
│  │   [Watermark Miring DANA]      │  │  │ Ringkasan Klien & Tagihan      │  │
│  │   Logo Studio                  │  │  │ Status: LUNAS                  │  │
│  │   NAMA BRAND STUDIO            │  │  └────────────────────────────────┘  │
│  │   - - - - - - - - - - - - - -  │  │                                      │
│  │   No. Invoice & Tanggal        │  │  [ 🚀 Bagikan Gambar Struk ]         │  │
│  │   - - - - - - - - - - - - - -  │  │  [ 💬 Kirim ke WhatsApp ]            │  │
│  │   Yth. RINA SARI               │  │  [ 🖼️ Simpan Berkas PNG ]             │  │
│  │   STATUS: LUNAS                │  │  [ 🖨️ Print Biasa (USB/PC) ]        │  │
│  │   - - - - - - - - - - - - - -  │  │  [ 📶 Print Bluetooth Thermal ]      │  │
│  │   Rincian Paket & DP           │  │                                      │
│  │   - - - - - - - - - - - - - -  │  │  Status Printer & Web Bluetooth      │  │
│  │   Tanda Tangan Digital         │  │                                      │
│  └────────────────────────────────┘  │                                      │
├──────────────────────────────────────┴──────────────────────────────────────┤
│  HP ONLY: [Sticky Bottom Action Bar: Bagikan | Kirim WA | Print]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Modifikasi Teknis di `src/components/StrukModal.tsx`

1. **Restrukturisasi Komponen**:
   - Layout responsif `flex flex-col lg:flex-row max-w-4xl lg:h-[88vh]`.
   - Kolom kiri: Area preview struk dengan latar abu-abu netral (`bg-slate-100 dark:bg-slate-900/60`), kertas struk thermal `w-[320px] sm:w-[340px] bg-white p-6 shadow-xl border border-slate-200`.
   - Kolom kanan (Desktop): Panel aksi vertikal terorganisir dengan ringkasan status pembayaran, tombol hero bagikan gambar, kirim WA, simpan PNG, print printer USB, dan Bluetooth.
   - Bar bawah (Mobile): Sticky bottom bar dengan tombol sentuh berukuran ergonomis.
2. **Sinkronisasi Render Kanvas & Unduhan**:
   - Kanvas `renderCanvasReceipt` diperbarui agar layout gambar struk PNG 100% identik dengan tampilan kertas struk profesional baru (termasuk status pelunasan besar dan garis putus-putus).
   - Menghasilkan berkas PNG yang sangat tajam dan memuat Logo serta TTD tanpa kendala CORS.
3. **Feedback Salin WA Otomatis**:
   - Jika nomor WhatsApp klien kosong, sistem otomatis menyalin format teks struk terstruktur ke clipboard dan tombol menampilkan ikon centang hijau (`Check`) selama 2 detik.

---

### Langkah Pengujian & Verifikasi
- Menguji tampilan struk di resolusi Mobile (HP layar kecil 360px - 414px) memastikan tidak ada horizontal overflow dan sticky action bar berfungsi mulus.
- Menguji tampilan di resolusi Desktop (PC layar lebar > 1024px) memastikan layout side-by-side terbelah sempurna.
- Menguji tombol Download PNG, Share Gambar, dan Print untuk memastikan hasil cetak/ekspor tetap tajam dengan Logo & TTD lengkap.
- Menjalankan `compile_applet` dan `lint_applet`.
