import { toBlob } from 'html-to-image';
import { Transaksi, SettingsData } from '../types';
import { formatDateIndo, formatNumberOnly } from './formatters';
import { getThermalLogoDataUrl } from './logoHelper';

export function getReceiptFileName(transaksi: Transaksi): string {
  const safeInvoice = (transaksi.nomorTransaksi || 'nota').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `struk-${safeInvoice}.png`;
}

export function triggerBlobDownload(
  blob: Blob,
  fileName: string,
  existingUrl?: string | null
): string {
  const url = existingUrl || URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.className = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (!existingUrl) {
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  return url;
}

export async function tryCopyImageBlobToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      !navigator.clipboard ||
      typeof navigator.clipboard.write !== 'function' ||
      typeof ClipboardItem === 'undefined'
    ) {
      return false;
    }
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch {
    return false;
  }
}

export async function captureReceiptElementToBlob(element: HTMLElement): Promise<Blob> {
  const width = 320;
  const height = Math.max(element.offsetHeight, element.scrollHeight, 220);
  const blob = await toBlob(element, {
    cacheBust: false,
    skipFonts: true,
    pixelRatio: 3,
    width,
    height,
    backgroundColor: '#ffffff',
    style: {
      margin: '0',
      transform: 'none',
      boxShadow: 'none',
    },
  });
  if (!blob || blob.size < 500) {
    throw new Error('Gagal merender elemen struk ke gambar PNG');
  }
  return blob;
}

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

function drawDashedLine(ctx: CanvasRenderingContext2D, y: number, width: number, padding: number) {
  ctx.save();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, y);
  ctx.lineTo(width - padding, y);
  ctx.stroke();
  ctx.restore();
}

export async function generateReceiptCanvas(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<HTMLCanvasElement> {
  const width = 320;
  const scaleFactor = 3;
  const padding = 20;
  const contentWidth = width - padding * 2;

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - (transaksi.jumlahDp || 0));
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  let logoImg: HTMLImageElement | null = null;
  const maxLogoH =
    settings.logoSize === 'kecil' ? 28 : settings.logoSize === 'besar' ? 52 : 36;
  const maxLogoW =
    settings.logoSize === 'kecil' ? 70 : settings.logoSize === 'besar' ? 130 : 95;

  if (settings.useLogo && settings.logoPath) {
    try {
      const thermalUrl = await getThermalLogoDataUrl(settings);
      if (thermalUrl) {
        logoImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = thermalUrl;
        });
      }
    } catch {
      logoImg = null;
    }
  }

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d')!;
  let estimatedHeight = padding * 2 + 12;

  if (logoImg) {
    const scale = Math.min(
      1,
      maxLogoH / (logoImg.naturalHeight || logoImg.height || 1),
      maxLogoW / (logoImg.naturalWidth || logoImg.width || 1)
    );
    estimatedHeight += (logoImg.naturalHeight || logoImg.height) * scale + 10;
  }

  tempCtx.font = 'bold 14px "Courier New", Courier, monospace';
  estimatedHeight += wrapCanvasText(tempCtx, headerTitle.toUpperCase(), contentWidth).length * 17;
  tempCtx.font = '10px "Courier New", Courier, monospace';
  if (headerPhone) estimatedHeight += 14;
  tempCtx.font = '9px "Courier New", Courier, monospace';
  if (headerAddress) estimatedHeight += wrapCanvasText(tempCtx, headerAddress, contentWidth).length * 13;

  estimatedHeight += 18;
  estimatedHeight += 14 * (transaksi.tanggalSelesai ? 4 : 3) + 6;

  estimatedHeight += 16;
  tempCtx.font = 'bold 16px "Courier New", Courier, monospace';
  estimatedHeight += wrapCanvasText(tempCtx, (transaksi.namaPelanggan || 'PELANGGAN').toUpperCase(), contentWidth).length * 19;
  if (transaksi.alamat) estimatedHeight += 14;
  estimatedHeight += 18;
  if (sisaBayar > 0) estimatedHeight += 18;

  estimatedHeight += 16;
  const items = Array.isArray(transaksi.items) && transaksi.items.length > 0 ? transaksi.items : [];
  estimatedHeight += Math.max(1, items.length) * 30;

  estimatedHeight += 16;
  if (transaksi.diskon && transaksi.diskon > 0) estimatedHeight += 16;
  estimatedHeight += 16;
  if (transaksi.jumlahDp > 0) estimatedHeight += 16;
  if (sisaBayar > 0 || (isLunas && transaksi.jumlahDp > 0 && transaksi.jumlahDp < transaksi.totalHarga)) {
    estimatedHeight += 16;
  }

  estimatedHeight += 16;
  tempCtx.font = '10px "Courier New", Courier, monospace';
  if (transaksi.metodePembayaran) estimatedHeight += 14;
  if (transaksi.catatan) {
    estimatedHeight += wrapCanvasText(tempCtx, `Catatan: ${transaksi.catatan}`, contentWidth).length * 14 + 4;
  }
  if (settings.footerStruk) {
    estimatedHeight += wrapCanvasText(tempCtx, settings.footerStruk, contentWidth).length * 13 + 6;
  }
  if (settings.chattyFooter) {
    estimatedHeight += wrapCanvasText(tempCtx, settings.chattyFooter, contentWidth).length * 13 + 6;
  }

  const logicalHeight = Math.ceil(estimatedHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width * scaleFactor;
  canvas.height = logicalHeight * scaleFactor;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scaleFactor, scaleFactor);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, logicalHeight);

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, logicalHeight - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, logicalHeight);
  ctx.clip();
  ctx.translate(width / 2, logicalHeight / 2);
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.04)';
  ctx.font = 'bold 12px "Courier New", Courier, monospace';
  for (let x = -width; x < width; x += 125) {
    for (let wy = -logicalHeight; wy < logicalHeight; wy += 36) {
      ctx.fillText(`${headerTitle.toUpperCase()} •`, x, wy);
    }
  }
  ctx.restore();

  let y = padding + 10;

  if (logoImg) {
    const scale = Math.min(
      1,
      maxLogoH / (logoImg.naturalHeight || logoImg.height || 1),
      maxLogoW / (logoImg.naturalWidth || logoImg.width || 1)
    );
    const renderW = (logoImg.naturalWidth || logoImg.width) * scale;
    const renderH = (logoImg.naturalHeight || logoImg.height) * scale;
    const logoX = (width - renderW) / 2;
    ctx.drawImage(logoImg, logoX, y - 6, renderW, renderH);
    y += renderH + 8;
  }

  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px "Courier New", Courier, monospace';
  for (const line of wrapCanvasText(ctx, headerTitle.toUpperCase(), contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 17;
  }

  if (headerPhone) {
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    ctx.fillText(headerPhone, width / 2, y);
    y += 14;
  }

  if (headerAddress) {
    ctx.font = '9px "Courier New", Courier, monospace';
    ctx.fillStyle = '#334155';
    for (const line of wrapCanvasText(ctx, headerAddress, contentWidth)) {
      ctx.fillText(line, width / 2, y);
      y += 13;
    }
  }

  y += 4;
  drawDashedLine(ctx, y, width, padding);
  y += 14;

  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'left';
  ctx.fillText('No.', padding, y);
  ctx.textAlign = 'right';
  ctx.font = 'bold 10px "Courier New", Courier, monospace';
  ctx.fillText(transaksi.nomorTransaksi || '-', width - padding, y);
  y += 14;

  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Terima', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(formatDateIndo(transaksi.tanggalMasuk, true), width - padding, y);
  y += 14;

  if (transaksi.tanggalSelesai) {
    ctx.textAlign = 'left';
    ctx.fillText('Selesai', padding, y);
    ctx.textAlign = 'right';
    ctx.font = 'bold 10px "Courier New", Courier, monospace';
    ctx.fillText(formatDateIndo(transaksi.tanggalSelesai), width - padding, y);
    y += 14;
  }

  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Yth. Bapak/Ibu', padding, y + 2);
  y += 10;

  drawDashedLine(ctx, y, width, padding);
  y += 16;

  ctx.textAlign = 'center';
  ctx.font = 'bold 16px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';
  for (const line of wrapCanvasText(ctx, (transaksi.namaPelanggan || 'PELANGGAN').toUpperCase(), contentWidth)) {
    ctx.fillText(line, width / 2, y);
    y += 19;
  }

  if (transaksi.alamat) {
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText(`(${transaksi.alamat})`, width / 2, y);
    y += 14;
  }

  ctx.font = 'bold 12px "Courier New", Courier, monospace';
  ctx.fillStyle = statusFinal === 'LUNAS' ? '#047857' : '#B91C1C';
  ctx.fillText(statusFinal, width / 2, y);
  y += 15;

  if (sisaBayar > 0) {
    ctx.font = 'bold 14px "Courier New", Courier, monospace';
    ctx.fillStyle = '#B91C1C';
    ctx.fillText(`Rp.${formatNumberOnly(sisaBayar)},-`, width / 2, y);
    y += 16;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 15;

  if (items.length > 0) {
    for (const item of items) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 11px "Courier New", Courier, monospace';
      ctx.fillText(item?.namaLayanan || 'Layanan', padding, y);
      y += 14;

      ctx.font = '10px "Courier New", Courier, monospace';
      ctx.fillStyle = '#0F172A';
      const leftCol = `${item?.berat || 0} ${item?.satuan || ''} x ${formatNumberOnly(
        item?.hargaPerKg || item?.hargaSatuan || 0
      )}`;
      ctx.fillText(leftCol, padding, y);

      ctx.textAlign = 'right';
      ctx.fillText(`= ${formatNumberOnly(item?.subtotal || 0)}`, width - padding, y);
      y += 16;
    }
  } else {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillText('Cucian Laundry', padding, y);
    y += 14;
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillText('1 Paket', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`= ${formatNumberOnly(transaksi.totalHarga)}`, width - padding, y);
    y += 16;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 15;

  if (transaksi.diskon && transaksi.diskon > 0) {
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#BE123C';
    ctx.textAlign = 'left';
    ctx.fillText('Potongan Diskon', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`-Rp ${formatNumberOnly(transaksi.diskon)}`, width - padding, y);
    y += 15;
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 11px "Courier New", Courier, monospace';
  ctx.fillText('Total Transaksi', padding, y);
  ctx.textAlign = 'right';
  ctx.fillText(`Rp ${formatNumberOnly(transaksi.totalHarga)}`, width - padding, y);
  y += 15;

  if (transaksi.jumlahDp > 0) {
    ctx.textAlign = 'left';
    ctx.font = '11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Pembayaran Awal', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(transaksi.jumlahDp)}`, width - padding, y);
    y += 15;
  }

  if (sisaBayar > 0) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#B91C1C';
    ctx.fillText('Sisa Pembayaran', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(sisaBayar)}`, width - padding, y);
    y += 15;
  } else if (isLunas && transaksi.jumlahDp > 0 && transaksi.jumlahDp < transaksi.totalHarga) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "Courier New", Courier, monospace';
    ctx.fillStyle = '#047857';
    ctx.fillText('Pelunasan', padding, y);
    ctx.textAlign = 'right';
    ctx.fillText(`Rp ${formatNumberOnly(transaksi.totalHarga - transaksi.jumlahDp)}`, width - padding, y);
    y += 15;
  }

  y += 2;
  drawDashedLine(ctx, y, width, padding);
  y += 15;

  ctx.textAlign = 'center';
  ctx.font = '10px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0F172A';

  if (transaksi.metodePembayaran) {
    const detail = transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : '';
    ctx.fillText(`Metode: ${transaksi.metodePembayaran}${detail}`, width / 2, y);
    y += 14;
  }

  if (transaksi.catatan) {
    ctx.font = 'bold italic 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1E293B';
    for (const line of wrapCanvasText(ctx, `Catatan: ${transaksi.catatan}`, contentWidth)) {
      ctx.fillText(line, width / 2, y);
      y += 13;
    }
    y += 2;
  }

  if (settings.footerStruk) {
    ctx.font = '10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#475569';
    for (const line of wrapCanvasText(ctx, settings.footerStruk, contentWidth)) {
      ctx.fillText(line, width / 2, y);
      y += 13;
    }
    y += 2;
  }

  if (settings.chattyFooter) {
    ctx.font = 'bold italic 10px "Courier New", Courier, monospace';
    ctx.fillStyle = '#1E293B';
    for (const line of wrapCanvasText(ctx, settings.chattyFooter, contentWidth)) {
      ctx.fillText(line, width / 2, y);
      y += 13;
    }
  }

  return canvas;
}

export async function generateReceiptBlob(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string,
  targetElement?: HTMLElement | null
): Promise<Blob> {
  if (typeof document !== 'undefined') {
    let candidate = targetElement || null;
    if (!candidate && transaksi.id) {
      const allNodes = document.querySelectorAll<HTMLElement>('[data-trx-id]');
      for (let i = 0; i < allNodes.length; i++) {
        const node = allNodes[i];
        if (node.dataset.trxId === transaksi.id) {
          candidate = node;
          if (node.dataset.receiptCapture === 'true') break;
        }
      }
    }
    if (candidate) {
      try {
        return await captureReceiptElementToBlob(candidate);
      } catch {
        // Fallback ke 2D canvas jika gagal capture DOM
      }
    }
  }

  const canvas = await generateReceiptCanvas(
    transaksi,
    settings,
    laundryName,
    laundryAddress,
    laundryPhone
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal membuat blob gambar'));
    }, 'image/png');
  });
}

export async function downloadReceiptImage(
  transaksi: Transaksi,
  settings: SettingsData,
  laundryName?: string,
  laundryAddress?: string,
  laundryPhone?: string
): Promise<void> {
  const blob = await generateReceiptBlob(
    transaksi,
    settings,
    laundryName,
    laundryAddress,
    laundryPhone
  );
  triggerBlobDownload(blob, getReceiptFileName(transaksi));
}
