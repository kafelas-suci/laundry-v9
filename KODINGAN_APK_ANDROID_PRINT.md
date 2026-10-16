# Panduan & Kode Pembaruan Cetak Bluetooth Sesuai Preview Struk di Aplikasi

Dokumen ini berisi kode Kotlin lengkap yang sudah diperbarui agar hasil cetak **Printer Thermal Bluetooth** (RPP02N, PT-210, 58mm) memiliki **susunan, posisi, dan urutan yang 100% PERSIS sama dengan tampilan Preview Struk di aplikasi**.

---

## Ringkasan Perubahan Susunan Cetak (Sesuai Preview di Layar):
1. **Header Toko (Rata Tengah / Center)**:
   - Nama Toko Laundry (Huruf Besar / Kapital & Tebal)
   - Nomor Telepon Toko
   - Alamat Lengkap Outlet Toko
2. **Garis Pemisah**: `--------------------------------` (32 karakter)
3. **Metadata Nota**:
   - `No.` rata kiri dan Nomor Transaksi rata kanan
   - `Terima` rata kiri dan Waktu Masuk rata kanan
   - `Selesai` rata kiri dan Estimasi Selesai rata kanan (jika ada)
   - Teks `Yth. Bapak/Ibu`
4. **Garis Pemisah**: `--------------------------------`
5. **Data Pelanggan & Status (Rata Tengah / Center)**:
   - **NAMA PELANGGAN** (Huruf Besar, Ukuran Font Besar & Tebal)
   - Alamat Pelanggan (jika ada)
   - Status Pembayaran: **LUNAS** atau **BELUM LUNAS** (Tebal)
   - Nominal Sisa (jika belum lunas, contoh: `Rp.25.000,-`)
6. **Garis Pemisah**: `--------------------------------`
7. **Daftar Item Layanan Cucian**:
   - Baris 1: Nama Layanan / Cucian (Tebal)
   - Baris 2: `[berat] [satuan] x [harga]` rata kiri, dan `= [subtotal]` rata kanan
8. **Garis Pemisah**: `--------------------------------`
9. **Rincian Total & Pembayaran**:
   - `Total Transaksi` rata kiri, nominal rata kanan (Tebal)
   - `Pembayaran Awal` (jika ada DP)
   - `Sisa Pembayaran` (jika belum lunas, Tebal)
   - `Pelunasan` (jika lunas dan ada riwayat DP, Tebal)
10. **Garis Pemisah**: `--------------------------------`
11. **Metode, Catatan & Catatan Kaki (Rata Tengah / Center)**:
    - Metode Pembayaran (contoh: `Metode: Tunai`)
    - Catatan Khusus Cucian
    - Pesan / Footer Toko Laundry
    - Jarak penutup kertas agar tidak terpotong pisau printer

---

## 1. File: `WebPrintInterface.kt`

Ganti seluruh isi file `WebPrintInterface.kt` di project Android Studio Anda (`app/src/main/java/com/kafilasuci4/app/WebPrintInterface.kt` atau sesuai package Anda) dengan kode berikut:

```kotlin
package com.kafilasuci4.app

import android.content.Context
import android.webkit.JavascriptInterface

/**
 * Jembatan komunikasi JavaScript Web ke Kotlin Android (Interface: "MesinPrint")
 */
class WebPrintInterface(
    private val context: Context,
    private val strukHelper: StrukHelper
) {
    /**
     * METODE 1: Cetak Teks Struk Langsung + Logo (Rekomendasi Utama)
     * Format teks sudah disusun rapi oleh Web (32 karakter per baris) beserta Logo Base64,
     * sehingga 100% PERSIS sama dengan preview di layar aplikasi.
     */
    @JvmOverloads
    @JavascriptInterface
    fun cetakTeksStruk(teksStruk: String, logoBase64: String = "") {
        strukHelper.cetakTeksStrukLangsung(teksStruk, logoBase64)
    }

    /**
     * METODE 2: Cetak Bluetooth Berparameter (22 Parameter)
     * Kompatibel dengan pemanggilan fungsi lama, dengan layout yang sudah disesuaikan
     * persis sama dengan preview nota laundry.
     */
    @JavascriptInterface
    fun prosesCetakBluetooth(
        namaAcara: String,
        namaKlien: String,
        paketDipilih: String,
        hargaPaketDasar: Long,
        namaTambahan: String,
        hargaTambahan: Long,
        lokasi: String,
        tanggalBayar: String,
        waktuEvent: Long,
        totalTarif: Long,
        nominalDibayar: Long,
        nominalDiskon: Long,
        dpDibayar: Long,
        isLunas: Boolean,
        noStruk: String,
        catatan: String,
        metodeBayar: String,
        isArsip: Boolean,
        namaBrand: String = "Kafela's Laundry",
        namaAdmin: String = "Kasir",
        logoBase64: String = "",
        ttdBase64: String = ""
    ) {
        strukHelper.cetakStrukBluetoothFisik(
            namaAcara = namaAcara,
            namaKlien = namaKlien,
            paketDipilih = paketDipilih,
            hargaPaketDasar = hargaPaketDasar,
            namaTambahan = namaTambahan,
            hargaTambahan = hargaTambahan,
            lokasi = lokasi,
            tanggalBayar = tanggalBayar,
            waktuEvent = waktuEvent,
            totalTarif = totalTarif,
            nominalDibayar = nominalDibayar,
            nominalDiskon = nominalDiskon,
            dpDibayar = dpDibayar,
            isLunas = isLunas,
            noStruk = noStruk,
            catatan = catatan,
            metodeBayar = metodeBayar,
            isArsip = isArsip,
            namaBrand = namaBrand,
            namaAdmin = namaAdmin,
            logoBase64 = logoBase64,
            ttdBase64 = ttdBase64
        )
    }

    /**
     * Alias jika web memanggil cetakStrukDariWeb
     */
    @JavascriptInterface
    fun cetakStrukDariWeb(
        namaAcara: String, namaKlien: String, paketDipilih: String, hargaPaketDasar: Long,
        namaTambahan: String, hargaTambahan: Long, lokasi: String, tanggalBayar: String,
        waktuEvent: Long, totalTarif: Long, nominalDibayar: Long, nominalDiskon: Long,
        dpDibayar: Long, isLunas: Boolean, noStruk: String, catatan: String,
        metodeBayar: String, isArsip: Boolean
    ) {
        prosesCetakBluetooth(
            namaAcara, namaKlien, paketDipilih, hargaPaketDasar, namaTambahan, hargaTambahan,
            lokasi, tanggalBayar, waktuEvent, totalTarif, nominalDibayar, nominalDiskon,
            dpDibayar, isLunas, noStruk, catatan, metodeBayar, isArsip
        )
    }
}
```

---

## 2. File: `StrukHelper.kt`

Ganti seluruh isi file `StrukHelper.kt` di project Android Studio Anda (`app/src/main/java/com/kafilasuci4/app/StrukHelper.kt` atau sesuai package Anda) dengan kode berikut:

```kotlin
package com.kafilasuci4.app

import android.annotation.SuppressLint
import android.app.Activity
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.os.Build
import android.util.Base64
import android.widget.Toast
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import java.io.ByteArrayOutputStream
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.UUID

class StrukHelper(
    private val activity: Activity,
    private var namaBrandDefault: String = "Kafela's Laundry",
    private var namaAdminDefault: String = "Kasir"
) {
    private val formatRp = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    private fun rp(nom: Long) = formatRp.format(nom).replace(",00", "").replace("Rp", "Rp ")
    private fun formatAngka(nom: Long): String {
        return NumberFormat.getNumberInstance(Locale("id", "ID")).format(nom)
    }

    /**
     * Dapatkan perangkat printer bluetooth aktif (dari simpanan atau dialog pilihan)
     */
    @SuppressLint("MissingPermission")
    private fun getBluetoothPrinter(onDeviceReady: (BluetoothDevice) -> Unit) {
        // 1. Verifikasi Izin Runtime Android 12+ (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val izinConnect = androidx.core.content.ContextCompat.checkSelfPermission(
                activity,
                android.Manifest.permission.BLUETOOTH_CONNECT
            )
            if (izinConnect != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(
                    activity,
                    "Izin Bluetooth Connect belum diberikan! Mohon izinkan di pengaturan HP.",
                    Toast.LENGTH_LONG
                ).show()
                return
            }
        }

        // 2. Cek status aktif bluetooth
        val bluetoothManager = activity.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val bluetoothAdapter = bluetoothManager?.adapter
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            Toast.makeText(activity, "Bluetooth belum aktif! Silakan nyalakan Bluetooth HP.", Toast.LENGTH_SHORT).show()
            return
        }

        // 3. Ambil daftar printer yang sudah di-pair
        val pairedDevices: Set<BluetoothDevice>? = try {
            bluetoothAdapter.bondedDevices
        } catch (e: SecurityException) {
            Toast.makeText(activity, "Gagal mengakses Bluetooth: Izin ditolak sistem.", Toast.LENGTH_SHORT).show()
            null
        }

        if (pairedDevices.isNullOrEmpty()) {
            Toast.makeText(activity, "Belum ada printer Bluetooth yang di-pair di HP Anda.", Toast.LENGTH_LONG).show()
            return
        }

        val deviceList = pairedDevices.toList()
        val sharedPref = activity.getSharedPreferences("PengaturanApp", Context.MODE_PRIVATE)
        val savedMac = sharedPref.getString("SAVED_PRINTER_MAC", null)
        val savedDevice = deviceList.find { it.address == savedMac }

        if (savedDevice != null) {
            onDeviceReady(savedDevice)
            return
        }

        val deviceNames = deviceList.map { it.name ?: it.address }.toTypedArray()
        if (deviceList.size == 1) {
            val selectedDevice = deviceList[0]
            sharedPref.edit().putString("SAVED_PRINTER_MAC", selectedDevice.address).apply()
            onDeviceReady(selectedDevice)
        } else {
            MaterialAlertDialogBuilder(activity)
                .setTitle("Pilih Printer Bluetooth")
                .setItems(deviceNames) { _, index ->
                    val selectedDevice = deviceList[index]
                    sharedPref.edit().putString("SAVED_PRINTER_MAC", selectedDevice.address).apply()
                    Toast.makeText(activity, "Printer diset sebagai default", Toast.LENGTH_SHORT).show()
                    onDeviceReady(selectedDevice)
                }
                .show()
        }
    }

    /**
     * CETAK TEKS STRUK LANGSUNG + LOGO (Teks Utuh & Logo Base64)
     * Mengirim logo toko dan teks yang sudah disusun rapi oleh Web (32 karakter) langsung ke printer.
     */
    @SuppressLint("MissingPermission")
    fun cetakTeksStrukLangsung(teksStruk: String, logoBase64: String = "") {
        getBluetoothPrinter { device ->
            activity.runOnUiThread {
                Toast.makeText(activity, "Mencetak nota & logo ke ${device.name ?: "Printer"}...", Toast.LENGTH_SHORT).show()
            }
            Thread {
                try {
                    val uuid = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb")
                    val socket = device.createRfcommSocketToServiceRecord(uuid)
                    socket.connect()
                    val outputStream = socket.outputStream
                    val byteBuffer = ByteArrayOutputStream()

                    val ESC_INIT = byteArrayOf(0x1B, 0x40)
                    val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
                    byteBuffer.write(ESC_INIT)

                    // 1. Cetak Logo Toko jika ada Base64
                    if (logoBase64.isNotBlank()) {
                        val logoRasterBytes = decodeBase64ToEscPosRaster(logoBase64, maxTargetWidth = 280)
                        if (logoRasterBytes != null) {
                            byteBuffer.write(ALIGN_CENTER)
                            byteBuffer.write(logoRasterBytes)
                            byteBuffer.write("\n".toByteArray(Charsets.ISO_8859_1))
                        }
                    }

                    // 2. Cetak Teks Struk Lengkap
                    byteBuffer.write(teksStruk.toByteArray(Charsets.ISO_8859_1))
                    byteBuffer.write("\n\n\n\n".toByteArray(Charsets.ISO_8859_1))

                    outputStream.write(byteBuffer.toByteArray())
                    outputStream.flush()
                    Thread.sleep(500)
                    socket.close()

                    activity.runOnUiThread {
                        Toast.makeText(activity, "Struk & logo berhasil dicetak!", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    activity.runOnUiThread {
                        Toast.makeText(activity, "Gagal mencetak: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }.start()
        }
    }

    /**
     * CETAK FISIK DENGAN SUSUNAN 100% PERSIS PREVIEW DI APLIKASI
     */
    @SuppressLint("MissingPermission")
    fun cetakStrukBluetoothFisik(
        namaAcara: String,
        namaKlien: String,
        paketDipilih: String,
        hargaPaketDasar: Long,
        namaTambahan: String,
        hargaTambahan: Long,
        lokasi: String,
        tanggalBayar: String,
        waktuEvent: Long,
        totalTarif: Long,
        nominalDibayar: Long,
        nominalDiskon: Long,
        dpDibayar: Long,
        isLunas: Boolean,
        noStruk: String,
        catatan: String,
        metodeBayar: String,
        isArsip: Boolean,
        namaBrand: String = namaBrandDefault,
        namaAdmin: String = namaAdminDefault,
        logoBase64: String = "",
        ttdBase64: String = ""
    ) {
        getBluetoothPrinter { device ->
            activity.runOnUiThread {
                Toast.makeText(activity, "Mencetak struk ke ${device.name ?: "Printer"}...", Toast.LENGTH_SHORT).show()
            }
            Thread {
                try {
                    val uuid = UUID.fromString("00001101-0000-1000-8000-00805f9b34fb")
                    val socket = device.createRfcommSocketToServiceRecord(uuid)
                    socket.connect()
                    val outputStream = socket.outputStream
                    val byteBuffer = ByteArrayOutputStream()

                    // Perintah Kontrol ESC/POS Standar
                    val ESC_INIT = byteArrayOf(0x1B, 0x40)
                    val ALIGN_CENTER = byteArrayOf(0x1B, 0x61, 0x01)
                    val ALIGN_LEFT = byteArrayOf(0x1B, 0x61, 0x00)
                    val BOLD_ON = byteArrayOf(0x1B, 0x45, 0x01)
                    val BOLD_OFF = byteArrayOf(0x1B, 0x45, 0x00)
                    val FONT_LARGE = byteArrayOf(0x1D, 0x21, 0x11)
                    val FONT_NORMAL = byteArrayOf(0x1D, 0x21, 0x00)

                    val garisTunggal = "--------------------------------\n"
                    val tagihanSetelahDiskon = totalTarif - nominalDiskon
                    val sisaTagihan = if (isLunas) 0L else (tagihanSetelahDiskon - dpDibayar)

                    byteBuffer.write(ESC_INIT)

                    // ============================================================
                    // 1. LOGO TOKO (Jika Ada Base64)
                    // ============================================================
                    if (logoBase64.isNotBlank()) {
                        val logoRasterBytes = decodeBase64ToEscPosRaster(logoBase64, maxTargetWidth = 280)
                        if (logoRasterBytes != null) {
                            byteBuffer.write(ALIGN_CENTER)
                            byteBuffer.write(logoRasterBytes)
                            byteBuffer.write("\n".toByteArray(Charsets.ISO_8859_1))
                        }
                    }

                    // ============================================================
                    // 2. HEADER TOKO (CENTER): NAMA LAUNDRY, NO HP, ALAMAT
                    // ============================================================
                    byteBuffer.write(ALIGN_CENTER)
                    val brandFinal = if (namaBrand.isNotBlank()) namaBrand else namaBrandDefault
                    byteBuffer.write(BOLD_ON)
                    byteBuffer.write("${brandFinal.uppercase()}\n".toByteArray(Charsets.ISO_8859_1))
                    byteBuffer.write(BOLD_OFF)

                    if (lokasi.isNotBlank()) {
                        // Jika lokasi berisi nomor telp & alamat
                        byteBuffer.write("$lokasi\n".toByteArray(Charsets.ISO_8859_1))
                    }

                    // ============================================================
                    // 3. GARIS PEMISAH PUTUS-PUTUS
                    // ============================================================
                    byteBuffer.write(garisTunggal.toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 4. METADATA NOTA: No, Terima, Selesai, Yth. Bapak/Ibu
                    // ============================================================
                    byteBuffer.write(ALIGN_LEFT)
                    if (noStruk.isNotBlank()) {
                        byteBuffer.write("${createAlignedLine("No.", noStruk)}\n".toByteArray(Charsets.ISO_8859_1))
                    }
                    byteBuffer.write("${createAlignedLine("Terima", tanggalBayar)}\n".toByteArray(Charsets.ISO_8859_1))
                    if (waktuEvent > 0L) {
                        val formatSelesai = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
                        byteBuffer.write("${createAlignedLine("Selesai", formatSelesai.format(java.util.Date(waktuEvent)))}\n".toByteArray(Charsets.ISO_8859_1))
                    }
                    byteBuffer.write("Yth. Bapak/Ibu\n".toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 5. GARIS PEMISAH PUTUS-PUTUS
                    // ============================================================
                    byteBuffer.write(garisTunggal.toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 6. NAMA PELANGGAN (BESAR & TEBAL DI TENGAH) & STATUS
                    // ============================================================
                    byteBuffer.write(ALIGN_CENTER)
                    byteBuffer.write(BOLD_ON)
                    byteBuffer.write(FONT_LARGE)
                    byteBuffer.write("${namaKlien.uppercase()}\n".toByteArray(Charsets.ISO_8859_1))
                    byteBuffer.write(FONT_NORMAL)

                    val statusTeks = if (isLunas || sisaTagihan <= 0) "LUNAS" else "BELUM LUNAS"
                    byteBuffer.write("$statusTeks\n".toByteArray(Charsets.ISO_8859_1))
                    if (!isLunas && sisaTagihan > 0) {
                        byteBuffer.write("Rp.${formatAngka(sisaTagihan)},-\n".toByteArray(Charsets.ISO_8859_1))
                    }
                    byteBuffer.write(BOLD_OFF)

                    // ============================================================
                    // 7. GARIS PEMISAH PUTUS-PUTUS
                    // ============================================================
                    byteBuffer.write(garisTunggal.toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 8. DAFTAR ITEM LAYANAN / CUCIAN
                    // ============================================================
                    byteBuffer.write(ALIGN_LEFT)
                    if (namaAcara.isNotBlank() && (namaAcara.contains("\n") || namaAcara.contains("="))) {
                        // Format rincian item lengkap dari Web
                        byteBuffer.write("$namaAcara\n".toByteArray(Charsets.ISO_8859_1))
                    } else {
                        // Format tunggal paket
                        val labelItem = if (paketDipilih.isNotBlank() && paketDipilih != "-") paketDipilih else "Cucian Laundry"
                        byteBuffer.write(BOLD_ON)
                        byteBuffer.write("$labelItem\n".toByteArray(Charsets.ISO_8859_1))
                        byteBuffer.write(BOLD_OFF)
                        byteBuffer.write("${createAlignedLine("1 Paket", "= ${formatAngka(totalTarif)}")}\n".toByteArray(Charsets.ISO_8859_1))

                        if (hargaTambahan > 0L) {
                            val labelTambahan = if (namaTambahan.isNotBlank()) namaTambahan else "Tambahan"
                            byteBuffer.write(BOLD_ON)
                            byteBuffer.write("$labelTambahan\n".toByteArray(Charsets.ISO_8859_1))
                            byteBuffer.write(BOLD_OFF)
                            byteBuffer.write("${createAlignedLine("+ Tambahan", "= ${formatAngka(hargaTambahan)}")}\n".toByteArray(Charsets.ISO_8859_1))
                        }
                    }

                    // ============================================================
                    // 9. GARIS PEMISAH PUTUS-PUTUS
                    // ============================================================
                    byteBuffer.write(garisTunggal.toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 10. RINCIAN KEUANGAN / TOTAL TRANSAKSI
                    // ============================================================
                    byteBuffer.write(BOLD_ON)
                    byteBuffer.write("${createAlignedLine("Total Transaksi", "Rp ${formatAngka(totalTarif)}")}\n".toByteArray(Charsets.ISO_8859_1))
                    byteBuffer.write(BOLD_OFF)

                    if (dpDibayar > 0L) {
                        byteBuffer.write("${createAlignedLine("Pembayaran Awal", "Rp ${formatAngka(dpDibayar)}")}\n".toByteArray(Charsets.ISO_8859_1))
                    }

                    if (!isLunas && sisaTagihan > 0) {
                        byteBuffer.write(BOLD_ON)
                        byteBuffer.write("${createAlignedLine("Sisa Pembayaran", "Rp ${formatAngka(sisaTagihan)}")}\n".toByteArray(Charsets.ISO_8859_1))
                        byteBuffer.write(BOLD_OFF)
                    } else if (isLunas && dpDibayar > 0L && dpDibayar < totalTarif) {
                        val pelunasan = totalTarif - dpDibayar
                        byteBuffer.write(BOLD_ON)
                        byteBuffer.write("${createAlignedLine("Pelunasan", "Rp ${formatAngka(pelunasan)}")}\n".toByteArray(Charsets.ISO_8859_1))
                        byteBuffer.write(BOLD_OFF)
                    }

                    // ============================================================
                    // 11. GARIS PEMISAH PUTUS-PUTUS
                    // ============================================================
                    byteBuffer.write(garisTunggal.toByteArray(Charsets.ISO_8859_1))

                    // ============================================================
                    // 12. METODE PEMBAYARAN, CATATAN & FOOTER STRUK LENGKAP (CENTER)
                    // ============================================================
                    byteBuffer.write(ALIGN_CENTER)
                    if (metodeBayar.isNotBlank()) {
                        byteBuffer.write("Metode: $metodeBayar\n".toByteArray(Charsets.ISO_8859_1))
                    }

                    // Cetak Catatan Transaksi, Footer Struk (Syarat & Ketentuan), dan Chatty Footer
                    if (catatan.isNotBlank()) {
                        val barisList = catatan.split("\n")
                        for (baris in barisList) {
                            val b = baris.trim()
                            if (b.isNotEmpty()) {
                                val wrapped = wrapTextCenter(b, 32)
                                for (w in wrapped) {
                                    byteBuffer.write("$w\n".toByteArray(Charsets.ISO_8859_1))
                                }
                            }
                        }
                    }

                    // Feed kertas 4 baris agar nota keluar sempurna dan tidak terpotong pisau printer
                    byteBuffer.write("\n\n\n\n".toByteArray(Charsets.ISO_8859_1))

                    outputStream.write(byteBuffer.toByteArray())
                    outputStream.flush()
                    Thread.sleep(500)
                    socket.close()

                    activity.runOnUiThread {
                        Toast.makeText(activity, "Struk berhasil dicetak!", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    activity.runOnUiThread {
                        Toast.makeText(activity, "Gagal mencetak struk fisik: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                }
            }.start()
        }
    }

    private fun createAlignedLine(left: String, right: String, maxChar: Int = 32): String {
        val totalLength = left.length + right.length
        if (totalLength >= maxChar) {
            val maxLeft = maxOf(4, maxChar - right.length - 2)
            val safeLeft = if (left.length > maxLeft) left.take(maxLeft - 2) + ".." else left
            val spaces = maxOf(1, maxChar - safeLeft.length - right.length)
            return safeLeft + " ".repeat(spaces) + right
        }
        val spaces = maxChar - totalLength
        return left + " ".repeat(spaces) + right
    }

    private fun centerText(text: String, width: Int = 32): String {
        val trimmed = text.trim()
        if (trimmed.length >= width) return trimmed
        val left = (width - trimmed.length) / 2
        val right = width - trimmed.length - left
        return " ".repeat(left) + trimmed + " ".repeat(right)
    }

    private fun wrapTextCenter(text: String, width: Int = 32): List<String> {
        if (text.isEmpty()) return emptyList()
        val words = text.split(Regex("\\s+"))
        val lines = mutableListOf<String>()
        var current = ""
        for (w in words) {
            if (current.isEmpty()) {
                current = w
            } else if ((current.length + 1 + w.length) <= width) {
                current += " $w"
            } else {
                lines.add(centerText(current, width))
                current = w
            }
        }
        if (current.isNotEmpty()) {
            lines.add(centerText(current, width))
        }
        return lines
    }

    /**
     * Konverter Gambar Base64 ke Format ESC/POS Raster Bit Image (GS v 0) Monokrom
     */
    private fun decodeBase64ToEscPosRaster(base64Data: String, maxTargetWidth: Int = 384): ByteArray? {
        try {
            val cleanBase64 = if (base64Data.contains(",")) {
                base64Data.substringAfter(",")
            } else {
                base64Data
            }.trim()
            if (cleanBase64.isEmpty()) return null
            val decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT)
            val originalBmp = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size) ?: return null

            val originalWidth = originalBmp.width
            val originalHeight = originalBmp.height
            var targetWidth = if (originalWidth > maxTargetWidth) maxTargetWidth else originalWidth
            targetWidth = (targetWidth / 8) * 8
            if (targetWidth <= 0) targetWidth = 8
            val targetHeight = (originalHeight * targetWidth) / originalWidth
            if (targetHeight <= 0) return null

            val scaledBmp = Bitmap.createScaledBitmap(originalBmp, targetWidth, targetHeight, true)
            val xBytes = targetWidth / 8
            val xL = (xBytes % 256).toByte()
            val xH = (xBytes / 256).toByte()
            val yL = (targetHeight % 256).toByte()
            val yH = (targetHeight / 256).toByte()

            val stream = ByteArrayOutputStream()
            stream.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH))

            for (y in 0 until targetHeight) {
                for (xb in 0 until xBytes) {
                    var byteVal = 0
                    for (b in 0 until 8) {
                        val x = xb * 8 + b
                        if (x < targetWidth) {
                            val pixel = scaledBmp.getPixel(x, y)
                            val alpha = Color.alpha(pixel)
                            val red = Color.red(pixel)
                            val green = Color.green(pixel)
                            val blue = Color.blue(pixel)
                            val luminance = (0.299 * red + 0.587 * green + 0.114 * blue).toInt()
                            val isBlack = (alpha > 50) && (luminance < 165)
                            if (isBlack) {
                                byteVal = byteVal or (1 shl (7 - b))
                            }
                        }
                    }
                    stream.write(byteVal)
                }
            }
            return stream.toByteArray()
        } catch (e: Exception) {
            e.printStackTrace()
            return null
        }
    }
}
```

---

## 3. File: `MainActivity.kt`

Pastikan pada `MainActivity.kt` Anda, baris `webView.addJavascriptInterface(...)` sudah terpasang:

```kotlin
package com.kafilasuci4.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var strukHelper: StrukHelper

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        strukHelper = StrukHelper(this)

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.databaseEnabled = true

        // Pasang interface MesinPrint agar tombol Cetak Bluetooth di Web dapat memanggil printer fisik
        webView.addJavascriptInterface(WebPrintInterface(this, strukHelper), "MesinPrint")

        webView.webViewClient = WebViewClient()
        // Muat URL Web Aplikasi Kafela's Laundry
        webView.loadUrl("https://kflslaundry.web.app")
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
```
