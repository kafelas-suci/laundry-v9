import { jsPDF } from 'jspdf';
import { formatRupiah } from './formatters';

export interface LaporanPdfData {
  laundryName: string;
  laundryAddress?: string;
  laundryPhone?: string;
  periodeLabel: string;
  totalOmzet: number;
  totalUangMasuk: number;
  totalUangMasukTrx: number;
  totalPengeluaran: number;
  labaBersih: number;
  totalTrx: number;
  totalWeight: number;
  countLunas: number;
  countBelumLunas: number;
  uangMasukOrderBulanIni?: number;
  uangPelunasanBulanLalu?: number;
  totalPiutang?: number;
  comparison?: {
    prevPeriodeLabel: string;
    prevOmzet: number;
    prevUangMasuk: number;
    prevPengeluaran: number;
    prevLabaBersih: number;
    prevTrxCount: number;
    omzetGrowth: number;
    labaGrowth: number;
    expGrowth: number;
    trxGrowth: number;
  };
  serviceList: [string, number][];
  expenseList: [string, number][];
}

/**
 * Membuat dan mengunduh berkas PDF resmi laporan keuangan A4
 */
export function generateLaporanPdf(data: LaporanPdfData): string {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm
  let y = 16;

  // Nama Laundry aman (hindari null/undefined)
  const laundryName = (data.laundryName || 'Kafelas Laundry').trim();
  const address = (data.laundryAddress || 'Bandung').trim();
  const phone = (data.laundryPhone || '-').trim();
  const periodeLabel = (data.periodeLabel || 'Semua Periode').trim();

  // 1. KOP SURAT TOKO
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(128, 0, 0); // Maroon #800000
  doc.text(laundryName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  const contactText = `${address} | Telp/WA: ${phone}`;
  doc.text(contactText, pageWidth / 2, y, { align: 'center' });

  y += 4;
  // Garis pemisah kop surat
  doc.setDrawColor(128, 0, 0);
  doc.setLineWidth(0.7);
  doc.line(margin, y, margin + contentWidth, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 0.8, margin + contentWidth, y + 0.8);

  y += 6;

  // 2. JUDUL DOKUMEN & PERIODE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('LAPORAN LABA RUGI & KINERJA OPERASIONAL', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text(`Periode: ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });

  y += 3.8;
  const now = new Date();
  const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(`Dicetak pada: ${dateStr} pukul ${timeStr} WIB`, pageWidth / 2, y, { align: 'center' });

  y += 6.5;

  // Helper kotak judul seksi
  const drawSectionHeader = (title: string, currentY: number) => {
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, currentY, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(128, 0, 0);
    doc.text(title, margin + 3, currentY + 3.8);
    return currentY + 7;
  };

  // 3. SEKSI 1: RINGKASAN EKSEKUTIF KEUANGAN
  y = drawSectionHeader('1. RINGKASAN EKSEKUTIF KEUANGAN', y);

  const drawTableRow = (label: string, value: string, currentY: number, isBold = false, isHighlight = false) => {
    if (isHighlight) {
      doc.setFillColor(235, 247, 238); // Soft green tint
      doc.rect(margin, currentY - 1, contentWidth, 6.5, 'F');
    }
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8);
    if (isHighlight) {
      doc.setTextColor(18, 120, 60);
    } else {
      doc.setTextColor(isBold ? 20 : 60, isBold ? 20 : 60, isBold ? 20 : 60);
    }
    doc.text(label, margin + 4, currentY + 3.2);
    doc.text(value, margin + contentWidth - 4, currentY + 3.2, { align: 'right' });

    // Hairline baris
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.15);
    doc.line(margin + 2, currentY + 5.2, margin + contentWidth - 2, currentY + 5.2);

    return currentY + 5.6;
  };

  const totalOmzet = Number(data.totalOmzet || 0);
  const totalUangMasuk = Number(data.totalUangMasuk || 0);
  const totalUangMasukTrx = Number(data.totalUangMasukTrx || 0);
  const totalPengeluaran = Number(data.totalPengeluaran || 0);
  const labaBersih = Number(data.labaBersih || 0);
  const totalTrx = Number(data.totalTrx || 0);
  const totalWeight = Number(data.totalWeight || 0);
  const countLunas = Number(data.countLunas || 0);
  const countBelumLunas = Number(data.countBelumLunas || 0);

  y = drawTableRow('Total Pendapatan Kotor (Omzet)', formatRupiah(totalOmzet), y);
  y = drawTableRow('Total Arus Kas Masuk Kasir', formatRupiah(totalUangMasuk), y, true);
  if (data.uangMasukOrderBulanIni !== undefined) {
    y = drawTableRow('  - Dari Order Periode Ini', formatRupiah(data.uangMasukOrderBulanIni), y);
  }
  if (data.uangPelunasanBulanLalu && data.uangPelunasanBulanLalu > 0) {
    y = drawTableRow('  - Dari Pelunasan Order Bulan Lalu', `+${formatRupiah(data.uangPelunasanBulanLalu)}`, y);
  }
  if (data.totalPiutang && data.totalPiutang > 0) {
    y = drawTableRow('Sisa Piutang Berjalan (Belum Lunas)', formatRupiah(data.totalPiutang), y);
  }
  y = drawTableRow('Total Beban Biaya Operasional', formatRupiah(totalPengeluaran), y, true);
  y = drawTableRow('LABA BERSIH USAHA (Net Profit)', formatRupiah(labaBersih), y, true, true);
  y = drawTableRow('Total Order Masuk / Berat Cucian', `${totalTrx} Order (${totalWeight.toFixed(1)} Kg)`, y);
  y = drawTableRow('Status Pelunasan Nota', `${countLunas} Lunas, ${countBelumLunas} Menunggu Pelunasan`, y);
  y = drawTableRow('Cut-off Waktu Ganti Hari', '00:00:00 Tengah Malam (Waktu Lokal)', y);

  y += 4;

  // 4. SEKSI 2: ANALISIS KOMPARASI (JIKA ADA PERIODE LALU)
  if (data.comparison) {
    const prevPeriode = data.comparison.prevPeriodeLabel || 'Periode Lalu';
    y = drawSectionHeader(`2. ANALISIS KOMPARASI (${periodeLabel.toUpperCase()} vs ${prevPeriode.toUpperCase()})`, y);

    // Header Tabel Komparasi
    doc.setFillColor(238, 238, 238);
    doc.rect(margin, y, contentWidth, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);

    const col1 = margin + 3;
    const col2 = margin + 65;
    const col3 = margin + 105;
    const col4 = margin + 145;
    const col5 = margin + contentWidth - 3;

    doc.text('Indikator', col1, y + 3.4);
    doc.text('Periode Lalu', col2, y + 3.4, { align: 'right' });
    doc.text('Periode Ini', col3, y + 3.4, { align: 'right' });
    doc.text('Selisih', col4, y + 3.4, { align: 'right' });
    doc.text('Pertumbuhan', col5, y + 3.4, { align: 'right' });

    y += 5.8;

    const drawCompRow = (
      name: string,
      prevVal: string,
      currVal: string,
      diffVal: string,
      growthVal: string,
      isPositive: boolean,
      currentY: number
    ) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      doc.text(name, col1, currentY + 3);
      doc.text(prevVal, col2, currentY + 3, { align: 'right' });
      doc.text(currVal, col3, currentY + 3, { align: 'right' });
      doc.text(diffVal, col4, currentY + 3, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      if (isPositive) {
        doc.setTextColor(18, 120, 60);
      } else {
        doc.setTextColor(180, 20, 20);
      }
      doc.text(growthVal, col5, currentY + 3, { align: 'right' });

      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.15);
      doc.line(margin, currentY + 4.5, margin + contentWidth, currentY + 4.5);

      return currentY + 5.2;
    };

    const prevOmzet = Number(data.comparison.prevOmzet || 0);
    const omzetDiff = totalOmzet - prevOmzet;
    const omzetGrowth = Number(data.comparison.omzetGrowth || 0);
    y = drawCompRow(
      'Omzet',
      formatRupiah(prevOmzet),
      formatRupiah(totalOmzet),
      `${omzetDiff >= 0 ? '+' : ''}${formatRupiah(omzetDiff)}`,
      `${omzetGrowth > 0 ? '+' : ''}${omzetGrowth.toFixed(1)}%`,
      omzetGrowth >= 0,
      y
    );

    const prevPengeluaran = Number(data.comparison.prevPengeluaran || 0);
    const expDiff = totalPengeluaran - prevPengeluaran;
    const expGrowth = Number(data.comparison.expGrowth || 0);
    y = drawCompRow(
      'Pengeluaran',
      formatRupiah(prevPengeluaran),
      formatRupiah(totalPengeluaran),
      `${expDiff > 0 ? '+' : ''}${formatRupiah(expDiff)}`,
      `${expGrowth > 0 ? '+' : ''}${expGrowth.toFixed(1)}%`,
      expGrowth <= 0,
      y
    );

    const prevLaba = Number(data.comparison.prevLabaBersih || 0);
    const labaDiff = labaBersih - prevLaba;
    const labaGrowth = Number(data.comparison.labaGrowth || 0);
    y = drawCompRow(
      'Laba Bersih',
      formatRupiah(prevLaba),
      formatRupiah(labaBersih),
      `${labaDiff >= 0 ? '+' : ''}${formatRupiah(labaDiff)}`,
      `${labaGrowth > 0 ? '+' : ''}${labaGrowth.toFixed(1)}%`,
      labaGrowth >= 0,
      y
    );

    const prevTrx = Number(data.comparison.prevTrxCount || 0);
    const trxDiff = totalTrx - prevTrx;
    const trxGrowth = Number(data.comparison.trxGrowth || 0);
    y = drawCompRow(
      'Order Cucian',
      `${prevTrx} Order`,
      `${totalTrx} Order`,
      `${trxDiff >= 0 ? '+' : ''}${trxDiff} Order`,
      `${trxGrowth > 0 ? '+' : ''}${trxGrowth.toFixed(1)}%`,
      trxGrowth >= 0,
      y
    );

    y += 4;
  }

  // 5. SEKSI 3: REKAPITULASI LAYANAN TERLARIS & PENGELUARAN
  y = drawSectionHeader('3. REKAPITULASI LAYANAN TERLARIS & BIAYA UTAMA', y);

  const halfWidth = contentWidth / 2 - 2;

  // Sub-header kiri (Layanan) & kanan (Pengeluaran)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Layanan Teratas (Volume)', margin + 2, y + 2.5);
  doc.text('Biaya Operasional Utama', margin + halfWidth + 4, y + 2.5);
  y += 4;

  const services = Array.isArray(data.serviceList) ? data.serviceList : [];
  const expenses = Array.isArray(data.expenseList) ? data.expenseList : [];
  const maxItems = Math.max(services.slice(0, 5).length, expenses.slice(0, 5).length, 1);

  for (let i = 0; i < maxItems; i++) {
    const s = services[i];
    const e = expenses[i];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);

    // Sisi Kiri (Layanan)
    if (s) {
      const sName = s[0].length > 22 ? s[0].substring(0, 20) + '...' : s[0];
      doc.text(`- ${sName}`, margin + 2, y + 2.5);
      doc.text(`${Number(s[1] || 0).toFixed(1)} Kg/Unit`, margin + halfWidth - 2, y + 2.5, { align: 'right' });
    } else if (i === 0) {
      doc.text('Tidak ada data layanan', margin + 2, y + 2.5);
    }

    // Sisi Kanan (Pengeluaran)
    if (e) {
      const eName = e[0].length > 20 ? e[0].substring(0, 18) + '...' : e[0];
      doc.text(`- ${eName}`, margin + halfWidth + 4, y + 2.5);
      doc.text(formatRupiah(Number(e[1] || 0)), margin + contentWidth - 2, y + 2.5, { align: 'right' });
    } else if (i === 0) {
      doc.text('Tidak ada pengeluaran', margin + halfWidth + 4, y + 2.5);
    }

    y += 3.8;
  }

  // 6. LEMBAR PENGESAHAN TANDA TANGAN
  const sigY = Math.min(Math.max(y + 8, 235), pageHeight - 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  // Kiri: Kasir
  doc.text('Dibuat oleh,', margin + 25, sigY, { align: 'center' });
  doc.line(margin + 5, sigY + 18, margin + 45, sigY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Petugas Kasir / Admin', margin + 25, sigY + 22, { align: 'center' });

  // Kanan: Pemilik Usaha
  doc.setFont('helvetica', 'normal');
  doc.text('Mengetahui & Menyetujui,', margin + contentWidth - 25, sigY, { align: 'center' });
  doc.line(margin + contentWidth - 45, sigY + 18, margin + contentWidth - 5, sigY + 18);
  doc.setFont('helvetica', 'bold');
  doc.text('Pemilik Usaha (Owner)', margin + contentWidth - 25, sigY + 22, { align: 'center' });

  // Nama file ramah sistem operasi
  const safeName = laundryName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safePeriod = periodeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Laporan_${safeName}_${safePeriod}.pdf`;

  // Simpan berkas dengan fallback berlapis (saveAs -> blob URL -> dataUri)
  try {
    doc.save(fileName);
  } catch (errSave) {
    console.warn('doc.save() gagal, menggunakan fallback Blob anchor download:', errSave);
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 1500);
    } catch (errBlob) {
      console.warn('Blob fallback gagal, membuka data URI di tab baru:', errBlob);
      const dataUri = doc.output('datauristring');
      window.open(dataUri, '_blank');
    }
  }

  return fileName;
}
