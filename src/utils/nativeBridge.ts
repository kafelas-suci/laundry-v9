import { Transaksi, SettingsData } from '../types';
import { formatDateIndo, formatReceiptDate } from './formatters';
import { generateFormattedReceiptText, generateEscPosReceiptBytes } from './receiptFormatter';

import { getLogoBase64, convertBase64ToEscPosRaster } from './logoHelper';

declare global {
  interface Window {
    MesinPrint?: {
      /**
       * Metode Baru Rekomendasi: Menerima teks nota lengkap yang sudah terformat
       * persis sama dengan preview (32 karakter per baris), beserta logo opsional.
       */
      cetakTeksStruk?: (rawText: string, logoBase64?: string) => void;

      /**
       * Cetak Logo Terpisah jika didukung APK
       */
      cetakLogoBluetooth?: (logoBase64: string) => void;

      /**
       * Metode Biner ESC/POS langsung (Base64)
       */
      cetakEscPosBase64?: (base64EscPos: string) => void;

      /**
       * Metode Kompatibilitas Mundur (22 Parameter)
       */
      prosesCetakBluetooth?: (
        namaAcara: string,
        namaKlien: string,
        paketDipilih: string,
        hargaPaketDasar: number,
        namaTambahan: string,
        hargaTambahan: number,
        lokasi: string,
        tanggalBayar: string,
        waktuEvent: number,
        totalTarif: number,
        nominalDibayar: number,
        nominalDiskon: number,
        dpDibayar: number,
        isLunas: boolean,
        noStruk: string,
        catatan: string,
        metodeBayar: string,
        isArsip: boolean,
        namaBrand: string,
        namaAdmin: string,
        logoBase64: string,
        ttdBase64: string
      ) => void;

      cetakStrukDariWeb?: (
        namaAcara: string,
        namaKlien: string,
        paketDipilih: string,
        hargaPaketDasar: number,
        namaTambahan: string,
        hargaTambahan: number,
        lokasi: string,
        tanggalBayar: string,
        waktuEvent: number,
        totalTarif: number,
        nominalDibayar: number,
        nominalDiskon: number,
        dpDibayar: number,
        isLunas: boolean,
        noStruk: string,
        catatan: string,
        metodeBayar: string,
        isArsip: boolean
      ) => void;
    };
  }
}

/**
 * Cek apakah aplikasi web sedang dibuka di dalam WebView Android yang memiliki interface MesinPrint
 */
export function isAndroidPrintAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.MesinPrint !== 'undefined' &&
    (typeof window.MesinPrint.cetakTeksStruk === 'function' ||
      typeof window.MesinPrint.prosesCetakBluetooth === 'function')
  );
}

/**
 * Preload gambar logo ke Base64 agar siap dicetak seketika oleh printer Bluetooth
 */
export async function preloadLogoBase64(logoPath?: string | null): Promise<string> {
  const dummySettings = {
    useLogo: true,
    logoPath: logoPath || '/logo-kafela.png',
  } as SettingsData;
  return getLogoBase64(dummySettings);
}

/**
 * Kirim data transaksi langsung ke Printer Bluetooth fisik Android melalui interface MesinPrint
 * dengan susunan dan posisi yang 100% SAMA dengan tampilan Preview di aplikasi,
 * TERMASUK LOGO TOKO FISIK di bagian atas nota!
 */
export async function printViaAndroidBluetooth(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string,
  preloadedLogoBase64?: string
): Promise<boolean> {
  if (!isAndroidPrintAvailable()) {
    return false;
  }

  try {
    // Dapatkan Base64 logo toko secara instan (100% siap tanpa delay)
    let logoBase64 = '';
    if (settings.useLogo) {
      logoBase64 = preloadedLogoBase64 !== undefined ? preloadedLogoBase64 : await getLogoBase64(settings);
    }

    // 1. Generate teks lengkap 32 karakter yang susunan posisinya 100% sama dengan preview
    // Termasuk Header, No/Tanggal, Pelanggan, Status Lunas, Item Cucian, Rincian Bayar,
    // Catatan, Footer Struk (Syarat & Ketentuan), dan Chatty Footer
    const fullReceiptText = generateFormattedReceiptText(
      transaksi,
      settings,
      laundryName,
      laundryAddress,
      laundryPhone
    );

    // 2. Jika APK menggunakan prosesCetakBluetooth (metode 22 parameter yang mendukung logoBase64 di param #21),
    // prioritaskan pemanggilan ini ketika logo aktif agar logo dicetak sempurna di atas struk.
    if (typeof window.MesinPrint?.prosesCetakBluetooth === 'function') {
      const isLunas = transaksi.statusPembayaran === 'Lunas';
      const items = Array.isArray(transaksi.items) ? transaksi.items : [];

      // Susun ringkasan item yang rapi per baris sesuai preview
      const itemsDesc =
        items.length > 0
          ? items
              .map((it) => `${it.namaLayanan}\n  ${it.berat} ${it.satuan} x ${it.hargaPerKg} = Rp ${it.subtotal}`)
              .join('\n')
          : 'Cucian Laundry';

      const firstItem = items[0];
      const firstItemPrice = firstItem?.subtotal || transaksi.totalHarga;
      const restItems = items.slice(1);
      const restDesc = restItems
        .map((it) => `${it.namaLayanan} (${it.berat} ${it.satuan})`)
        .join(', ');
      const restPrice = restItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);

      const brand = laundryName || settings.headerStruk || "Kafela's Laundry";
      const address = laundryAddress || settings.address || '';
      const phone = laundryPhone || settings.phoneNumber || '';
      const lokasi = [address, phone ? `Telp: ${phone}` : ''].filter(Boolean).join(' - ') || 'Outlet Laundry';
      const tanggalBayarStr = formatReceiptDate(transaksi.tanggalMasuk, true);
      const waktuEvent = transaksi.tanggalSelesai || transaksi.tanggalMasuk;
      const nominalDibayar = isLunas ? transaksi.totalHarga : transaksi.jumlahDp || 0;
      const dpDibayar = transaksi.jumlahDp || 0;

      // Susun Catatan, Footer Struk (Syarat & Ketentuan), dan Chatty Footer
      const footerLines: string[] = [];
      if (transaksi.catatan && transaksi.catatan.trim()) {
        footerLines.push(`Catatan: ${transaksi.catatan.trim()}`);
      }
      if (settings.footerStruk && settings.footerStruk.trim()) {
        footerLines.push(settings.footerStruk.trim());
      }
      if (settings.chattyFooter && settings.chattyFooter.trim()) {
        footerLines.push(settings.chattyFooter.trim());
      }
      const combinedCatatanAndFooter = footerLines.join('\n');

      window.MesinPrint.prosesCetakBluetooth(
        itemsDesc, // 1: namaAcara (rincian item lengkap per baris)
        transaksi.namaPelanggan || 'Pelanggan', // 2: namaKlien
        firstItem?.namaLayanan || 'Laundry', // 3: paketDipilih
        firstItemPrice, // 4: hargaPaketDasar
        restDesc, // 5: namaTambahan
        restPrice, // 6: hargaTambahan
        lokasi, // 7: lokasi toko
        tanggalBayarStr, // 8: tanggalBayar
        waktuEvent, // 9: waktuEvent
        transaksi.totalHarga, // 10: totalTarif
        nominalDibayar, // 11: nominalDibayar
        0, // 12: nominalDiskon
        dpDibayar, // 13: dpDibayar
        isLunas, // 14: isLunas
        transaksi.nomorTransaksi || '-', // 15: noStruk
        combinedCatatanAndFooter, // 16: catatan (berisi Catatan + Footer Struk + Chatty Footer!)
        transaksi.metodePembayaran || 'Tunai', // 17: metodeBayar
        transaksi.status === 'Diambil', // 18: isArsip
        brand, // 19: namaBrand
        transaksi.dikerjakanOleh || 'Kasir', // 20: namaAdmin
        logoBase64, // 21: logoBase64 (LOGO TOKO TERCETAK DI SINI!)
        '' // 22: ttdBase64
      );
      return true;
    }

    // 3. Jika APK hanya menyediakan cetakTeksStruk
    if (typeof window.MesinPrint?.cetakTeksStruk === 'function') {
      try {
        // Panggil dengan parameter teks & logo jika didukung
        window.MesinPrint.cetakTeksStruk(fullReceiptText, logoBase64);
      } catch {
        // Fallback 1 parameter
        window.MesinPrint.cetakTeksStruk(fullReceiptText);
      }
      return true;
    }

    return false;
  } catch (error) {
    console.error('Gagal mencetak lewat MesinPrint Android:', error);
    return false;
  }
}

/**
 * Fitur opsional: Cetak langsung lewat Web Bluetooth API (Google Chrome di Android/PC)
 * Kompatibel dengan printer Bluetooth Thermal RPP02N, PT-210, dsb.
 */
export async function printViaWebBluetooth(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<{ success: boolean; message: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigator as any;
  if (!nav.bluetooth || typeof nav.bluetooth.requestDevice !== 'function') {
    return {
      success: false,
      message: 'Browser Anda tidak mendukung Web Bluetooth. Buka lewat APK Android atau Google Chrome.',
    };
  }

  try {
    let logoRasterBytes: Uint8Array | null = null;
    if (settings.useLogo) {
      const logoB64 = await getLogoBase64(settings);
      if (logoB64) {
        logoRasterBytes = await convertBase64ToEscPosRaster(logoB64, 240);
      }
    }

    const rawBytes = generateEscPosReceiptBytes(
      transaksi,
      settings,
      laundryName,
      laundryAddress,
      laundryPhone,
      logoRasterBytes
    );

    // Filter printer bluetooth thermal populer (SPP / Serial Port UUID standar)
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
      ],
    });

    if (!device || !device.gatt) {
      return { success: false, message: 'Gagal terhubung ke printer Bluetooth.' };
    }

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    if (!services || services.length === 0) {
      return { success: false, message: 'Tidak ditemukan layanan printer pada perangkat ini.' };
    }

    // Cari characteristic yang bisa di-write
    let writeChar = null;
    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      return { success: false, message: 'Karakteristik cetak printer tidak ditemukan.' };
    }

    // Kirim data dalam chunk maksimal 100 bytes (Bluetooth MTU safe)
    const chunkSize = 100;
    for (let i = 0; i < rawBytes.length; i += chunkSize) {
      const chunk = rawBytes.slice(i, i + chunkSize);
      await writeChar.writeValue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    return { success: true, message: 'Berhasil mencetak ke printer Bluetooth!' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('User cancelled')) {
      return { success: false, message: 'Pemilihan printer dibatalkan.' };
    }
    return { success: false, message: `Gagal cetak Bluetooth: ${errorMsg}` };
  }
}
