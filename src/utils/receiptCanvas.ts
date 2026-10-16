import { Transaksi, SettingsData } from '../types';
import { formatDateIndo, formatNumberOnly } from './formatters';
import { getLogoBase64 } from './logoHelper';

/**
 * Membagi teks panjang menjadi beberapa baris yang muat dalam lebar canvas tertentu
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Menggambar garis putus-putus horizontal khas struk thermal
 */
function drawDashedLine(ctx: CanvasRenderingContext2D, y: number, width: number, padding: number) {
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  ctx.restore();
}

/**
 * Generate elemen HTMLCanvasElement dari struk transaksi berkualitas tinggi (HD)
 */
export async function generateReceiptCanvas(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<HTMLCanvasElement> {
  const width = 440;
  const padding = 24;
  const contentWidth = width - padding * 2;

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - (transaksi.jumlahDp || 0));
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  // 1. Muat gambar logo jika diaktifkan
  let logoImg: HTMLImageElement | null = null;
  if (settings.useLogo) {
    try {
      const base64 = await getLogoBase64(settings);
      if (base64) {
        logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
        });
      }
    } catch {
      logoImg = null;
    }
  }

  // 2. Estimasi tinggi canvas secara dinamis
  // Buat context sementara untuk mengukur teks
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.font = '13px "Courier New", Courier, monospace';

  let estimatedHeight = 60; // Padding atas & bawah

  if (logoImg) {
    estimatedHeight += 60;
  }

  // Header toko (Title, phone, address)
  tempCtx.font = 'bold 16px "Courier New", Courier, monospace';
  estimatedHeight += wrapCanvasText(tempCtx, headerTitle.toUpperCase(), contentWidth).length * 20;
  tempCtx.font = '12px "Courier New", Courier, monospace';
  if (headerPhone) estimatedHeight += 16;
  if (headerAddress) estimatedHeight += wrapCanvasText(tempCtx, headerAddress, contentWidth).length * 15;

  // Garis 1 + Meta transaksi (No, Terima, Selesai, Yth)
  estimatedHeight += 18; // garis pemisah
  estimatedHeight += 18 * 4; // baris meta

  // Garis 2 + Nama Pelanggan + Status
  estimatedHeight += 18; // garis pemisah
  tempCtx.font = 'bold 16px "Courier New", Courier, monospace';
  estimatedHeight += wrapCanvasText(tempCtx, (transaksi.namaPelanggan || 'Pelanggan').toUpperCase(), contentWidth).length * 20;
  if (transaksi.alamat) estimatedHeight += 16;
  estimatedHeight += 24; // Status badge
  if (sisaBayar > 0) estimatedHeight += 20;

  // Garis 3 + Items Layanan
  estimatedHeight += 18; // garis pemisah
  const items = Array.isArray(transaksi.items) && transaksi.items.length > 0 ? transaksi.items : [];
  estimatedHeight += Math.max(1, items.length) * 36;

  // Garis 4 + Financial Totals
  estimatedHeight += 18; // garis pemisah
  estimatedHeight += 22; // Total transaksi
  if (transaksi.jumlahDp > 0) estimatedHeight += 20;
  if (sisaBayar > 0 || (isLunas && transaksi.jumlahDp > 0)) estimatedHeight += 20;

  // Garis 5 + Metode, Catatan, Footers
  estimatedHeight += 18; // garis pemisah
  if (transaksi.metodePembayaran) estimatedHeight += 18;
  if (transaksi.catatan) {
    estimatedHeight += wrapCanvasText(tempCtx, `Catatan: ${transaksi.catatan}`, contentWidth).length * 16 + 6;
  }
  if (settings.footerStruk) {
    estimatedHeight += wrapCanvasText(tempCtx, settings.footerStruk, contentWidth).length * 15 + 6;
  }
  if (settings.chattyFooter) {
    estimatedHeight += wrapCanvasText(tempCtx, settings.chattyFooter, contentWidth).length * 15 + 6;
  }
  estimatedHeight += 40; // ruang bawah

  // 3. Buat Canvas Utama
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.ceil(estimatedHeight);
  const ctx = canvas.getContext('2d')!;

  // Background Putih
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, canvas.height);

  // Border luar tipis
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, canvas.height - 2);

  // Watermark samar
  ctx.save();
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.03)';
  ctx.font = 'bold 14px "Courier New", Courier, monospace';
  for (let x = -width; x < width * 2; x += 130) {
    for (let y = -canvas.height; y < canvas.height * 2; y += 45) {
      ctx.fillText(`${headerTitle.toUpperCase()} •`, x, y);
    }
  }
  ctx.restore();

  // 4. Render Isi Struk
  let y = padding + 10;

  // Logo Toko
  if (logoImg) {
    const maxLogoH = 50;
    const scale = Math.min(1, maxLogoH / logoImg.naturalHeight);
    const renderW = (logoImg.naturalWidth || logoImg.width) * scale;
    const renderH = (logoImg.naturalHeight || logoImg.height) * scale;
    const logoX = (width - renderW) / 2;
    ctx.drawImage(logoImg, logoX, y, renderW, renderH);
    y += renderH + 8;
  }

  // Header Toko
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  const titleLines = wrapCanvasText(ctx, headerTitle.toUpperCase(), contentWidth);
  for (const line of titleLines) {
    ctx.fillText(line, width / 2, y);
    y += 19;
  }

  ctx.font = '12px "Courier New", Courier, monospace';
  if (headerPhone) {
    ctx.fillText(headerPhone, width / 2, y);
    y += 16;
  }
  if (headerAddress) {
    ctx.fillStyle = '#475569';
    const addrLines = wrapCanvasText(ctx, headerAddress, contentWidth);
    for (const line of addrLines) {
      ctx.fillText(line, width / 2, y);
      y += 15;
    }
  }

  y += 6;
  drawDashedLine(ctx, y, width, padding);
  y += 16;

  // Metadata Nota
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  
  // No
  ctx.textAlign = 'left';
  ctx.fillText('No.', padding, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px "Courier New", Courier, monospace';
  ctx.fillText(transaksi.nomorTransaksi || '-', width - padding, y);
  y += 18;

  // Terima
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Terima', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatDateIndo(transaksi.tanggalMasuk, true), width - padding, y);
  y += 18;

  // Selesai
  if (transaksi.tanggalSelesai) {
    ctx.textAlign = 'left';
    ctx.fillText('Selesai', padding, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 12px "Courier New", Courier, monospace';
    ctx.fillText(formatDateIndo(transaksi.tanggalSelesai), width - padding, y);
    y += 18;
  }

  // Yth
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Yth. Bapak/Ibu', padding, y);
  y += 8;

  drawDashedLine(ctx, y, width, padding);
  y += 18;

  // Nama Pelanggan & Status
  ctx.textAlign = 'center';
  ctx.font = 'bold 17px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  const nameLines = wrapCanvasText(ctx, (transaksi.namaPelanggan || 'PELANGGAN').toUpperCase(), contentWidth);
  for (const line of nameLines) {
    ctx.fillText(line, width / 2, y);
    y += 20;
  }

  if (transaksi.alamat) {
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`(${transaksi.alamat})`, width / 2, y);
    y += 16;
  }

  // Status Badge Text
  ctx.font = 'bold 14px "Courier New", Courier, monospace';
  ctx.fillStyle = statusFinal === 'LUNAS' ? '#047857' : '#B91C1C';
  ctx.fillText(statusFinal, width / 2, y);
  y += 18;

  if (sisaBayar > 0) {
    ctx.font = 'bold 15px "Courier New", Courier, monospace';
    ctx.fillStyle = '#B91C1C';
    ctx.fillText(`Rp.${formatNumberOnly(sisaBayar)},-`, width / 2, y);
    y += 20;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 18;

  // Items Layanan
  if (items.length > 0) {
    for (const item of items) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillText(item?.namaLayanan || 'Layanan', padding, y);
      y += 16;

      ctx.font = '12px "Courier New", Courier, monospace';
      ctx.fillStyle = '#334155';
      const leftCol = `${item?.berat || 0} ${item?.satuan || ''} x ${formatNumberOnly(item?.hargaPerKg || item?.hargaSatuan || 0)}`;
      ctx.fillText(leftCol, padding, y);

      ctx.textAlign = 'right';
      ctx.fillText(`= ${formatNumberOnly(item?.subtotal || 0)}`, width - padding, y);
      y += 18;
    }
  } else {
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px "Courier New", Courier, monospace';
    ctx.fillText('Cucian Laundry', padding, y);
    y += 16;
    ctx.textAlign = 'right';
    ctx.fillText(`= ${formatNumberOnly(transaksi.totalHarga)}`, width - padding, y);
    y += 18;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 18;

  // Financial Totals
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 13px "Courier New", Courier, monospace';
  ctx.fillText('Total Transaksi', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Rp ${formatNumberOnly(transaksi.totalHarga)}`, width - padding, y);
  y += 18;

  if (transaksi.jumlahDp > 0) {
    ctx.textAlign = 'left';
    ctx.font = '12px "Courier New", Courier, monospace';
    ctx.fillText('Pembayaran Awal', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(transaksi.jumlahDp)}`, width - padding, y);
    y += 18;
  }

  if (sisaBayar > 0) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Courier New", Courier, monospace';
    ctx.fillStyle = '#B91C1C';
    ctx.fillText('Sisa Pembayaran', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(sisaBayar)}`, width - padding, y);
    y += 18;
  } else if (isLunas && transaksi.jumlahDp > 0 && transaksi.jumlahDp < transaksi.totalHarga) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px "Courier New", Courier, monospace';
    ctx.fillStyle = '#047857';
    ctx.fillText('Pelunasan', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(transaksi.totalHarga - transaksi.jumlahDp)}`, width - padding, y);
    y += 18;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 18;

  // Catatan, Metode Pembayaran, Footers
  ctx.textAlign = 'center';
  ctx.font = '11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#334155';

  if (transaksi.metodePembayaran) {
    const detail = transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : '';
    ctx.fillText(`Metode: ${transaksi.metodePembayaran}${detail}`, width / 2, y);
    y += 16;
  }

  if (transaksi.catatan) {
    ctx.font = 'italic 11px "Courier New", Courier, monospace';
    const noteLines = wrapCanvasText(ctx, `Catatan: ${transaksi.catatan}`, contentWidth);
    for (const line of noteLines) {
      ctx.fillText(line, width / 2, y);
      y += 15;
    }
    y += 2;
  }

  if (settings.footerStruk) {
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#64748B';
    const footLines = wrapCanvasText(ctx, settings.footerStruk, contentWidth);
    for (const line of footLines) {
      ctx.fillText(line, width / 2, y);
      y += 14;
    }
  }

  if (settings.chattyFooter) {
    ctx.font = 'italic 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1E293B';
    const chatLines = wrapCanvasText(ctx, settings.chattyFooter, contentWidth);
    for (const line of chatLines) {
      ctx.fillText(line, width / 2, y);
      y += 15;
    }
  }

  return canvas;
}

/**
 * Konversi canvas struk ke file Blob PNG
 */
export async function generateReceiptBlob(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<Blob> {
  const canvas = await generateReceiptCanvas(transaksi, settings, laundryName, laundryAddress, laundryPhone);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat blob gambar'));
    }, 'image/png');
  });
}

/**
 * Unduh langsung gambar struk sebagai file PNG
 */
export async function downloadReceiptImage(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<void> {
  const blob = await generateReceiptBlob(transaksi, settings, laundryName, laundryAddress, laundryPhone);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = `struk-${(transaksi.nomorTransaksi || 'nota').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
