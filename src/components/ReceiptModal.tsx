import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Share2, MessageCircle, Download, Check } from 'lucide-react';
import { Transaksi, SettingsData, Pelanggan } from '../types';
import { formatRupiah, formatDateIndo, formatNumberOnly } from '../utils/formatters';
import { isAndroidPrintAvailable, printViaAndroidBluetooth, printViaWebBluetooth, preloadLogoBase64 } from '../utils/nativeBridge';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: Transaksi | null;
  settings: SettingsData;
  pelanggan?: Pelanggan | null;
  laundryName?: string;
  laundryPhone?: string;
  laundryAddress?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  settings,
  pelanggan,
  laundryName,
  laundryPhone,
  laundryAddress,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedWA, setCopiedWA] = useState(false);
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && settings.useLogo && settings.logoPath) {
      preloadLogoBase64(settings.logoPath);
    }
  }, [isOpen, settings.useLogo, settings.logoPath]);

  if (!isOpen || !transaksi) return null;

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - transaksi.jumlahDp);
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const customerPhoneClean = (transaksi.nomorTelepon || pelanggan?.nomorTelepon || '')
    .replace(/[^0-9]/g, '')
    .replace(/^0/, '62');

  const handlePrint = async () => {
    // 1. Prioritaskan cetak Bluetooth hardware langsung jika berjalan di APK Android
    if (isAndroidPrintAvailable()) {
      setPrintFeedback('Mengirim struk & logo ke printer Bluetooth...');
      const printed = await printViaAndroidBluetooth(
        transaksi,
        settings,
        laundryName,
        laundryAddress,
        laundryPhone
      );
      if (printed) {
        setTimeout(() => setPrintFeedback('Struk & logo berhasil dicetak!'), 800);
        setTimeout(() => setPrintFeedback(null), 3500);
        return;
      }
    }

    // 2. Coba Web Bluetooth jika dibuka di Google Chrome
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav?.bluetooth && typeof nav.bluetooth.requestDevice === 'function') {
      setPrintFeedback('Mencari printer Bluetooth thermal...');
      const res = await printViaWebBluetooth(
        transaksi,
        settings,
        laundryName,
        laundryAddress,
        laundryPhone
      );
      if (res.success) {
        setPrintFeedback(res.message);
        setTimeout(() => setPrintFeedback(null), 3500);
        return;
      } else if (!res.message.includes('dibatalkan')) {
        setPrintFeedback(res.message);
        setTimeout(() => setPrintFeedback(null), 4000);
      } else {
        setPrintFeedback(null);
      }
    }

    // 3. Fallback cetak standar browser web
    window.print();
  };

  const handlePrintStandard = () => {
    window.print();
  };

  const handleShareWhatsAppText = () => {
    let message = `*${headerTitle}*\n`;
    if (headerAddress) message += `${headerAddress}\n`;
    if (headerPhone) message += `Telp: ${headerPhone}\n`;
    message += `--------------------------------\n`;
    message += `*No. Nota:* ${transaksi.nomorTransaksi || '-'}\n`;
    message += `*Pelanggan:* ${transaksi.namaPelanggan}\n`;
    if (transaksi.alamat) message += `*Alamat:* ${transaksi.alamat}\n`;
    message += `*Tanggal Masuk:* ${formatDateIndo(transaksi.tanggalMasuk, true)}\n`;
    if (transaksi.tanggalSelesai) {
      message += `*Estimasi Selesai:* ${formatDateIndo(transaksi.tanggalSelesai)}\n`;
    }
    message += `--------------------------------\n`;
    message += `*Rincian Layanan:*\n`;

    transaksi.items.forEach((item) => {
      message += `• ${item.namaLayanan}\n  ${item.berat} ${item.satuan} x ${formatRupiah(item.hargaPerKg)} = *${formatRupiah(item.subtotal)}*\n`;
    });

    message += `--------------------------------\n`;
    message += `*Total Transaksi: ${formatRupiah(transaksi.totalHarga)}*\n`;

    if (transaksi.jumlahDp > 0) {
      message += `Pembayaran Awal: ${formatRupiah(transaksi.jumlahDp)}\n`;
    }
    if (sisaBayar > 0) {
      message += `*Sisa Pembayaran: ${formatRupiah(sisaBayar)}*\n`;
    }
    message += `*Status: ${statusFinal}*\n`;
    if (transaksi.metodePembayaran) {
      message += `Metode: ${transaksi.metodePembayaran}${transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : ''}\n`;
    }
    if (transaksi.catatan) {
      message += `\n*Catatan:* ${transaksi.catatan}\n`;
    }
    if (settings.footerStruk) {
      message += `\n${settings.footerStruk}\n`;
    }
    if (settings.chattyFooter) {
      message += `\n${settings.chattyFooter}\n`;
    }

    if (customerPhoneClean) {
      const url = `https://api.whatsapp.com/send?phone=${customerPhoneClean}&text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(message);
      setCopiedWA(true);
      setTimeout(() => setCopiedWA(false), 2000);
      alert('Teks nota berhasil disalin ke clipboard! Nomor telepon pelanggan tidak terdaftar.');
    }
  };

  const handleDownloadImage = () => {
    // Canvas-based download of the receipt container
    if (!receiptRef.current) return;
    const element = receiptRef.current;
    
    // Simple SVG-based foreignObject capture or direct print
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Top Header */}
        <div className="bg-[#800000] text-white p-4 flex items-center justify-between no-print">
          <div>
            <h3 className="font-bold text-sm">Struk Transaksi</h3>
            <p className="text-xs text-white/80">{transaksi.nomorTransaksi || 'Preview Struk'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Receipt Area */}
        <div className="p-4 overflow-y-auto bg-slate-100 flex justify-center">
          {/* 58mm Thermal Receipt Card with Watermark */}
          <div
            ref={receiptRef}
            id="printable-receipt"
            className="w-[320px] bg-white p-5 shadow-md border border-slate-200 relative text-slate-900 font-mono text-[11px] leading-tight select-none"
            style={{
              fontFamily: '"Courier New", Courier, monospace',
            }}
          >
            {/* DANA-style repeating watermark background */}
            <div
              className="absolute inset-0 pointer-events-none opacity-4 overflow-hidden z-0 flex flex-wrap content-start select-none"
              style={{
                transform: 'rotate(-20deg) scale(1.3)',
                transformOrigin: 'center center',
              }}
            >
              {Array.from({ length: 48 }).map((_, i) => (
                <div key={i} className="text-[12px] font-black text-slate-900 m-3 whitespace-nowrap">
                  {headerTitle.toUpperCase()} •
                </div>
              ))}
            </div>

            <div className="relative z-10 space-y-2">
              {/* Optional Store Logo */}
              {settings.useLogo && (
                <div className="flex justify-center mb-1">
                  {settings.logoPath ? (
                    <img
                      src={settings.logoPath}
                      alt="Logo"
                      className={`w-auto object-contain filter grayscale contrast-125 ${
                        settings.logoSize === 'kecil'
                          ? 'h-7 max-w-[70px]'
                          : settings.logoSize === 'besar'
                          ? 'h-13 max-w-[130px]'
                          : 'h-9 max-w-[95px]'
                      }`}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-xs">
                      LS
                    </div>
                  )}
                </div>
              )}

              {/* Store Information */}
              <div className="text-center space-y-0.5">
                <h2 className="text-sm font-bold uppercase tracking-wide">{headerTitle}</h2>
                {headerPhone && <p className="text-[10px]">{headerPhone}</p>}
                {headerAddress && <p className="text-[9px] text-slate-700">{headerAddress}</p>}
              </div>

              <div className="border-b border-dashed border-slate-800 my-2"></div>

              {/* Invoice Meta */}
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>No.</span>
                  <span className="font-bold">{transaksi.nomorTransaksi || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Terima</span>
                  <span>{formatDateIndo(transaksi.tanggalMasuk, true)}</span>
                </div>
                {transaksi.tanggalSelesai && (
                  <div className="flex justify-between">
                    <span>Selesai</span>
                    <span className="font-semibold">{formatDateIndo(transaksi.tanggalSelesai)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span>Yth. Bapak/Ibu</span>
                </div>
              </div>

              <div className="border-b border-dashed border-slate-800 my-1"></div>

              {/* Customer Name & Big Status */}
              <div className="text-center py-1">
                <div className="text-base font-extrabold uppercase">{transaksi.namaPelanggan}</div>
                {transaksi.alamat && <div className="text-[10px] text-slate-600">({transaksi.alamat})</div>}
                <div
                  className={`text-xs font-black tracking-widest mt-1 ${
                    statusFinal === 'LUNAS' ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {statusFinal}
                </div>
                {sisaBayar > 0 && (
                  <div className="text-sm font-black text-red-700 mt-0.5">
                    Rp.{formatNumberOnly(sisaBayar)},-
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-slate-800 my-1"></div>

              {/* Items List */}
              <div className="space-y-1.5 py-1">
                {(transaksi.items || []).map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-[11px]">{item?.namaLayanan || 'Layanan'}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {item?.berat || 0} {item?.satuan || ''} x {formatNumberOnly(item?.hargaPerKg || item?.hargaSatuan || 0)}
                      </span>
                      <span>= {formatNumberOnly(item?.subtotal || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-slate-800 my-1"></div>

              {/* Financial Totals */}
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between font-bold">
                  <span>Total Transaksi</span>
                  <span>Rp {formatNumberOnly(transaksi.totalHarga)}</span>
                </div>
                {transaksi.jumlahDp > 0 && (
                  <div className="flex justify-between">
                    <span>Pembayaran Awal</span>
                    <span>Rp {formatNumberOnly(transaksi.jumlahDp)}</span>
                  </div>
                )}
                {sisaBayar > 0 ? (
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Sisa Pembayaran</span>
                    <span>Rp {formatNumberOnly(sisaBayar)}</span>
                  </div>
                ) : isLunas && transaksi.jumlahDp > 0 && transaksi.jumlahDp < transaksi.totalHarga ? (
                  <div className="flex justify-between font-bold text-emerald-700">
                    <span>Pelunasan</span>
                    <span>Rp {formatNumberOnly(transaksi.totalHarga - transaksi.jumlahDp)}</span>
                  </div>
                ) : null}
              </div>

              <div className="border-b border-dashed border-slate-800 my-1"></div>

              {/* Payment Method, Notes, Policy */}
              <div className="text-center space-y-1 text-[10px] pt-1">
                {transaksi.metodePembayaran && (
                  <div>
                    Metode: {transaksi.metodePembayaran}
                    {transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : ''}
                  </div>
                )}
                {transaksi.catatan && (
                  <div className="font-bold italic text-slate-800">Catatan: {transaksi.catatan}</div>
                )}
                {settings.footerStruk && (
                  <div className="text-[10px] text-slate-600 leading-tight pt-1">{settings.footerStruk}</div>
                )}
                {settings.chattyFooter && (
                  <div className="text-[10px] font-semibold italic text-slate-800 pt-1">
                    {settings.chattyFooter}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Print Feedback Notification */}
        {printFeedback && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between animate-fade-in shadow-md no-print">
            <span className="truncate">{printFeedback}</span>
            <button
              onClick={() => setPrintFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-3 sm:p-2 mb-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-1 justify-between no-print">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-3.5 py-1 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
              title="Cetak via printer Bluetooth thermal kasir"
            >
              <Printer className="w-4 h-4" />
              <span>{isAndroidPrintAvailable() ? 'Cetak Bluetooth (Android)' : 'Cetak Bluetooth'}</span>
            </button>
                 <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
            >
              Tutup
            </button>
          
          </div>
    
        </div>
      </div>
    </div>
  );
};
