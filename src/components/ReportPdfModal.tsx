import React, { useState } from 'react';
import { X, Download, Printer, FileText, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { LaporanPdfData, generateLaporanPdf } from '../utils/pdfExport';
import { formatRupiah } from '../utils/formatters';
import { useToast } from './NotificationContext';

interface ReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LaporanPdfData;
}

export const ReportPdfModal: React.FC<ReportPdfModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const toast = useToast();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const fileName = generateLaporanPdf(data);
      toast.success(`Berkas ${fileName} berhasil diunduh!`);
    } catch (err) {
      console.error('Download PDF error:', err);
      toast.error('Gagal membuat berkas PDF. Silakan coba lagi.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error('Print error:', err);
      toast.error('Browser tidak merespons cetak. Silakan gunakan tombol "Unduh PDF (.pdf)".');
    }
  };

  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-2 sm:p-4 animate-fade-in report-modal-overlay"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] text-slate-100 report-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header / Actions Bar (no-print) */}
        <div className="bg-[#800000] p-3.5 sm:p-4 flex items-center justify-between border-b border-red-950/60 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shrink-0">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white leading-tight">
                 Laporan Resmi (A4)
              </h2>
              <p className="text-[11px] text-red-200/90 hidden sm:block">
                {data.laundryName} • {data.periodeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Unduh File PDF */}
<button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/25 disabled:opacity-60 text-white transition active:scale-95 cursor-pointer shrink-0"
          title={isGeneratingPdf ? 'Membuat PDF...' : 'Unduh Berkas PDF (.pdf) ke Penyimpanan'}
        >
          {isGeneratingPdf ? (
            <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-4 h-4 text-rose-400" />
          )}
        </button>

            {/* Tombol Cetak Browser */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              title="Cetak Kertas (Print)"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Cetak Kertas</span>
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95 ml-1 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Scrollable A4 Document Preview */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950 flex justify-center report-modal-body">
          {/* Kertas Dokumen A4 */}
          <div
            id="printable-report"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-6 sm:p-10 font-sans text-xs leading-relaxed border border-slate-200 flex flex-col justify-between"
          >
            {/* Bagian Atas Laporan */}
            <div className="space-y-4">
              {/* Kop Surat Toko */}
              <div className="border-b-2 border-slate-900 pb-3 text-center">
                <h1 className="text-xl sm:text-2xl font-black text-[#800000] uppercase tracking-wide">
                  {data.laundryName}
                </h1>
                <p className="text-xs text-slate-600 mt-1">
                  {data.laundryAddress || 'Bandung'} • Telp/WhatsApp: {data.laundryPhone || '-'}
                </p>
                <div className="mt-2.5 inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  LAPORAN LABA RUGI &amp; KINERJA KEUANGAN
                </div>
                <p className="text-xs font-bold text-slate-700 mt-1">Periode: {data.periodeLabel}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Dicetak pada: {printDateStr}, {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                </p>
              </div>

              {/* 1. Ringkasan Eksekutif Keuangan */}
              <div>
                <h3 className="text-xs font-black uppercase text-[#800000] border-b border-slate-300 pb-1 mb-2">
                  1. RINGKASAN EKSEKUTIF KEUANGAN
                </h3>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-medium text-slate-700">Total Pendapatan Kotor (Omzet)</td>
                      <td className="p-2 text-right font-bold text-slate-900 tabular-nums">
                        {formatRupiah(data.totalOmzet)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      <td className="p-2 font-medium text-slate-700">Total Arus Kas Masuk Kasir</td>
                      <td className="p-2 text-right font-black text-emerald-800 tabular-nums">
                        {formatRupiah(data.totalUangMasuk)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 pl-4 text-slate-500 text-[11px]">- Pemasukan Transaksi Cucian</td>
                      <td className="p-2 text-right text-slate-600 tabular-nums">
                        {formatRupiah(data.totalUangMasukTrx)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-medium text-slate-700">Total Beban Biaya Operasional</td>
                      <td className="p-2 text-right font-black text-red-600 tabular-nums">
                        {formatRupiah(data.totalPengeluaran)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/70 font-bold border-b border-emerald-200">
                      <td className="p-2.5 text-slate-900 font-black">LABA BERSIH USAHA (Net Profit)</td>
                      <td
                        className={`p-2.5 text-right text-sm font-black tabular-nums ${
                          data.labaBersih >= 0 ? 'text-emerald-800' : 'text-red-700'
                        }`}
                      >
                        {formatRupiah(data.labaBersih)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="p-2 font-medium text-slate-700">Total Order Masuk / Berat Cucian</td>
                      <td className="p-2 text-right font-semibold text-slate-900 tabular-nums">
                        {data.totalTrx} Order ({data.totalWeight.toFixed(1)} Kg)
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 font-medium text-slate-700">Status Pelunasan Nota</td>
                      <td className="p-2 text-right font-semibold text-slate-900 tabular-nums">
                        {data.countLunas} Lunas, {data.countBelumLunas} Belum Lunas
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Analisis Komparasi (Bulan Lalu vs Sekarang) */}
              {data.comparison && (
                <div>
                  <h3 className="text-xs font-black uppercase text-[#800000] border-b border-slate-300 pb-1 mb-2">
                    2. ANALISIS KOMPARASI ({data.periodeLabel.toUpperCase()} vs {data.comparison.prevPeriodeLabel.toUpperCase()})
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                        <th className="p-2">Indikator</th>
                        <th className="p-2 text-right">Periode Lalu</th>
                        <th className="p-2 text-right">Periode Ini</th>
                        <th className="p-2 text-right">Selisih</th>
                        <th className="p-2 text-right">Pertumbuhan (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Omzet Usaha</td>
                        <td className="p-2 text-right tabular-nums">{formatRupiah(data.comparison.prevOmzet)}</td>
                        <td className="p-2 text-right font-bold tabular-nums">{formatRupiah(data.totalOmzet)}</td>
                        <td className="p-2 text-right tabular-nums">
                          {data.totalOmzet - data.comparison.prevOmzet >= 0 ? '+' : ''}
                          {formatRupiah(data.totalOmzet - data.comparison.prevOmzet)}
                        </td>
                        <td
                          className={`p-2 text-right font-black tabular-nums ${
                            data.comparison.omzetGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {data.comparison.omzetGrowth > 0 ? '+' : ''}
                          {data.comparison.omzetGrowth.toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-medium">Beban Pengeluaran</td>
                        <td className="p-2 text-right tabular-nums">{formatRupiah(data.comparison.prevPengeluaran)}</td>
                        <td className="p-2 text-right font-bold text-red-600 tabular-nums">{formatRupiah(data.totalPengeluaran)}</td>
                        <td className="p-2 text-right tabular-nums">
                          {data.totalPengeluaran - data.comparison.prevPengeluaran > 0 ? '+' : ''}
                          {formatRupiah(data.totalPengeluaran - data.comparison.prevPengeluaran)}
                        </td>
                        <td
                          className={`p-2 text-right font-black tabular-nums ${
                            data.comparison.expGrowth <= 0 ? 'text-emerald-700' : 'text-amber-800'
                          }`}
                        >
                          {data.comparison.expGrowth > 0 ? '+' : ''}
                          {data.comparison.expGrowth.toFixed(1)}%
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-emerald-50/50">
                        <td className="p-2 font-bold text-slate-900">Laba Bersih Usaha</td>
                        <td className="p-2 text-right tabular-nums">{formatRupiah(data.comparison.prevLabaBersih)}</td>
                        <td className="p-2 text-right font-black text-emerald-800 tabular-nums">{formatRupiah(data.labaBersih)}</td>
                        <td className="p-2 text-right font-bold tabular-nums">
                          {data.labaBersih - data.comparison.prevLabaBersih >= 0 ? '+' : ''}
                          {formatRupiah(data.labaBersih - data.comparison.prevLabaBersih)}
                        </td>
                        <td
                          className={`p-2 text-right font-black tabular-nums ${
                            data.comparison.labaGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {data.comparison.labaGrowth > 0 ? '+' : ''}
                          {data.comparison.labaGrowth.toFixed(1)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Volume Order Cucian</td>
                        <td className="p-2 text-right tabular-nums">{data.comparison.prevTrxCount} Order</td>
                        <td className="p-2 text-right font-bold tabular-nums">{data.totalTrx} Order</td>
                        <td className="p-2 text-right tabular-nums">
                          {data.totalTrx - data.comparison.prevTrxCount >= 0 ? '+' : ''}
                          {data.totalTrx - data.comparison.prevTrxCount} Order
                        </td>
                        <td
                          className={`p-2 text-right font-bold tabular-nums ${
                            data.comparison.trxGrowth >= 0 ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {data.comparison.trxGrowth > 0 ? '+' : ''}
                          {data.comparison.trxGrowth.toFixed(1)}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Rekapitulasi Layanan Terlaris & Biaya */}
              <div className="grid grid-cols-2 gap-4">
                {/* Kolom Kiri: Layanan Terlaris */}
                <div>
                  <h3 className="text-xs font-black uppercase text-[#800000] border-b border-slate-300 pb-1 mb-2">
                    3. Layanan Terlaris
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-1.5 text-left">Nama Layanan</th>
                        <th className="p-1.5 text-right">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.serviceList.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-2 text-center text-slate-400 italic">Belum ada layanan</td>
                        </tr>
                      ) : (
                        data.serviceList.slice(0, 6).map(([name, weight], idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-1.5 text-slate-700">• {name}</td>
                            <td className="p-1.5 text-right font-semibold text-slate-900 tabular-nums">
                              {weight.toFixed(1)} Unit/Kg
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Kolom Kanan: Rincian Biaya Operasional */}
                <div>
                  <h3 className="text-xs font-black uppercase text-[#800000] border-b border-slate-300 pb-1 mb-2">
                    4. Biaya Operasional
                  </h3>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-1.5 text-left">Keterangan Biaya</th>
                        <th className="p-1.5 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.expenseList.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-2 text-center text-slate-400 italic">Belum ada pengeluaran</td>
                        </tr>
                      ) : (
                        data.expenseList.slice(0, 6).map(([cat, total], idx) => (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-1.5 text-slate-700">• {cat}</td>
                            <td className="p-1.5 text-right font-semibold text-red-600 tabular-nums">
                              {formatRupiah(total)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Lembar Tanda Tangan Pengesahan Dokumen */}
            <div className="pt-8 mt-6 border-t border-slate-200 flex justify-between text-xs text-center">
              <div className="w-44">
                <p className="text-slate-600">Dibuat oleh,</p>
                <div className="h-16" />
                <p className="font-bold border-t border-slate-500 pt-1 text-slate-900">
                  Petugas Kasir / Admin
                </p>
              </div>

              <div className="w-44">
                <p className="text-slate-600">Mengetahui &amp; Menyetujui,</p>
                <div className="h-16" />
                <p className="font-bold border-t border-slate-500 pt-1 text-slate-900">
                  Pemilik Usaha (Owner)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer (no-print) */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between no-print">
          <p className="text-[11px] text-slate-400">
            💡 <em>Unduh PDF</em> menyimpan file langsung ke HP/PC, atau klik <em>Cetak Kertas</em> untuk print fisik.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
