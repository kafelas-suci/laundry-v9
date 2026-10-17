// Utility formatters matching Android app logic & system requirements

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rounded);
}

export function formatNumberOnly(amount: number): string {
  const rounded = Math.round(amount || 0);
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rounded);
}

export function formatRibuanInput(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'number' ? Math.round(val) : parseInt(val.toString().replace(/\D/g, ''), 10);
  return isNaN(num) ? '' : new Intl.NumberFormat('id-ID').format(num);
}

export function bersihkanTitik(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Math.round(val);
  const cleaned = val.toString().replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export function keRupiah(amount: number): string {
  return formatRupiah(amount);
}

export function formatDateIndo(timestamp: number, withTime = false): string {
  const date = new Date(timestamp);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return new Intl.DateTimeFormat('id-ID', options).format(date);
}

export function formatTanggalIndo(date: Date | number | string, withDay = true): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = d.getDate();
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const dayName = dayNames[d.getDay()];
  return withDay ? `${dayName}, ${day} ${month} ${year}` : `${day} ${month} ${year}`;
}

export function formatJamWIB(timestamp: number | Date): string {
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} WIB`;
}

export function formatReceiptDate(timestamp: number, withTime = false): string {
  const d = new Date(timestamp);
  const day = String(d.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  if (withTime) {
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  }
  return `${day} ${month} ${year}`;
}

export function formatShortDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = monthNames[date.getMonth()];
  return `${day} ${month}`;
}

export function formatShortTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatNomorWA(nomor: string): string {
  if (!nomor) return '';
  let clean = nomor.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  return clean;
}

export function bersihkanSlugBrand(str: string): string {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buatLoginIdKru(prefix: string, nama: string): string {
  const p = (prefix || 'KRU').toUpperCase();
  const n = (nama || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  const rand = Math.floor(100 + Math.random() * 900);
  return `${p}-${n}-${rand}`;
}

export function idKeEmailSistem(input: string): string {
  if (!input) return '';
  const clean = input.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  const digits = clean.replace(/[^0-9]/g, '');
  return `${digits || 'kru'}@kafelas.app`;
}

export function waKeEmailSistem(wa: string): string {
  return idKeEmailSistem(wa);
}

export function createAlignedLine(left: string, right: string, lineWidth = 32): string {
  const spacesNeeded = lineWidth - left.length - right.length;
  if (spacesNeeded < 0) {
    const truncatedLeft = left.slice(0, Math.max(0, lineWidth - right.length - 4)) + '...';
    return truncatedLeft + ' ' + right;
  }
  return left + ' '.repeat(spacesNeeded) + right;
}

export function calculateCompletionDate(
  tanggalMasuk: number,
  items: Array<{ namaLayanan: string; durasi?: string }>
): number {
  let maxDurationMs = 0;
  for (const item of items) {
    const durationStr = item.durasi || '3 Hari';
    const parts = durationStr.split(' ');
    if (parts.length >= 2) {
      const val = parseInt(parts[0], 10) || 0;
      const unit = parts[1].toLowerCase();
      let ms = 0;
      if (unit.startsWith('hari')) ms = val * 24 * 60 * 60 * 1000;
      else if (unit.startsWith('jam')) ms = val * 60 * 60 * 1000;
      else if (unit.startsWith('minggu')) ms = val * 7 * 24 * 60 * 60 * 1000;

      if (ms > maxDurationMs) maxDurationMs = ms;
    }
  }
  return tanggalMasuk + (maxDurationMs > 0 ? maxDurationMs : 3 * 24 * 60 * 60 * 1000);
}

export function ekstrakTandaTanganDariKertasCanvas(
  img: HTMLImageElement,
  persenTebal = 50,
  persenBersih = 50
): HTMLCanvasElement | null {
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const threshold = 180 + (persenBersih / 100) * 50;
  for (let i = 0; i < d.length; i += 4) {
    const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
    if (brightness > threshold) {
      d[i + 3] = 0; // transparent
    } else {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = Math.min(255, Math.round(255 * (1 + (persenTebal / 100))));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export async function kompresGambarKeBase64(
  input: string | File | Blob | HTMLCanvasElement,
  options?: { maxDim?: number; kualitas?: number; forceSquare?: boolean }
): Promise<{ base64: string; ukuranKb: number }> {
  const maxDim = options?.maxDim || 300;
  const kualitas = options?.kualitas || 0.82;
  const forceSquare = options?.forceSquare || false;

  let canvas: HTMLCanvasElement;
  if (input instanceof HTMLCanvasElement) {
    canvas = input;
  } else {
    const img = new Image();
    let url = '';
    let shouldRevoke = false;
    if (typeof input === 'string') {
      url = input;
    } else {
      url = URL.createObjectURL(input);
      shouldRevoke = true;
    }
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    canvas = document.createElement('canvas');
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (forceSquare) {
      const minSide = Math.min(w, h);
      const sx = (w - minSide) / 2;
      const sy = (h - minSide) / 2;
      canvas.width = Math.min(minSide, maxDim);
      canvas.height = Math.min(minSide, maxDim);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, sx, sy, minSide, minSide, 0, 0, canvas.width, canvas.height);
    } else {
      if (w > maxDim || h > maxDim) {
        if (w > h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
    }
    if (shouldRevoke) {
      URL.revokeObjectURL(url);
    }
  }

  const base64 = canvas.toDataURL('image/png', kualitas);
  const head = base64.indexOf(',') + 1;
  const ukuranKb = Math.round(((base64.length - head) * 3) / 4 / 1024);
  return { base64, ukuranKb };
}
