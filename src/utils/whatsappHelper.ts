import { Transaksi } from '../types';
import { formatRupiah } from './formatters';

export type WhatsAppVariant = 'regular' | 'business' | 'universal';

export function normalizeWhatsAppPhone(phone?: string | null): string {
  return (phone || '').replace(/[^0-9]/g, '').replace(/^0/, '62');
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

export function canWebShareFiles(file: File | null): boolean {
  if (!file || typeof navigator === 'undefined') return false;
  if (typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

export function openExternalUrl(url: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function buildWhatsAppReceiptCaption(
  transaksi: Transaksi,
  headerTitle: string,
  statusFinal: string,
  sisaBayar: number
): string {
  const sisaInfo = sisaBayar > 0 ? ` | Sisa: *${formatRupiah(sisaBayar)}*` : '';
  return `Halo Kak *${transaksi.namaPelanggan}*, berikut struk laundry No. *${
    transaksi.nomorTransaksi || '-'
  }* dari *${headerTitle}* (Total: *${formatRupiah(
    transaksi.totalHarga
  )}* - *${statusFinal}*${sisaInfo}). Terima kasih.`;
}

export function openDirectWhatsAppChat(
  phone: string,
  message: string,
  appType: WhatsAppVariant = 'universal'
): void {
  const cleanPhone = normalizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
  const isMobile = isMobileBrowser();
  const phoneParam = cleanPhone ? `phone=${cleanPhone}&` : '';

  if (isAndroid) {
    if (appType === 'business') {
      window.location.href = `intent://send?${phoneParam}text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      return;
    }
    if (appType === 'regular') {
      window.location.href = `intent://send?${phoneParam}text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      return;
    }
  }

  if (isMobile) {
    openExternalUrl(`https://api.whatsapp.com/send?${phoneParam}text=${encodedText}`);
    return;
  }

  if (cleanPhone) {
    openExternalUrl(`https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`);
  } else {
    openExternalUrl(`https://api.whatsapp.com/send?text=${encodedText}`);
  }
}

export function sendToWhatsApp(
  phone: string,
  message: string,
  appType: WhatsAppVariant = 'universal'
): void {
  openDirectWhatsAppChat(phone, message, appType);
}
