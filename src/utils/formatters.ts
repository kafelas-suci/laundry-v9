// Utility formatters matching Android app logic

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount);
  return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rounded);
}

export function formatNumberOnly(amount: number): string {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(rounded);
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
