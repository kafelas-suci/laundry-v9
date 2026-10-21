import React, { useRef, useState, useEffect } from 'react';
import { X, Printer, Share2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Transaksi, SettingsData, Pelanggan } from '../types';
import { formatDateIndo, formatNumberOnly } from '../utils/formatters';
import {
  isAndroidPrintAvailable,
  printViaAndroidBluetooth,
  printViaWebBluetooth,
  preloadLogoBase64,
  getSavedBluetoothPrinter,
  pairBluetoothPrinterDirectly,
} from '../utils/nativeBridge';
import { ShareReceiptModal } from './ShareReceiptModal';

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
  const [printFeedback, setPrintFeedback] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [savedPrinterName, setSavedPrinterName] = useState<string | null>(() => {
    return getSavedBluetoothPrinter().name || settings.printerName || null;
  });

  useEffect(() => {
    if (isOpen) {
      const current = getSavedBluetoothPrinter().name || settings.printerName || null;
      setSavedPrinterName(current);
      if (settings.useLogo && settings.logoPath) {
        preloadLogoBase64(settings.logoPath);
      }
    }
  }, [isOpen, settings.useLogo, settings.logoPath, settings.printerName]);

  if (!isOpen || !transaksi) return null;

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - transaksi.jumlahDp);
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const handlePrint = async (forcePicker = false) => {
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

    // 2. Coba Web Bluetooth jika dibuka di Google Chrome (dengan Zero-Prompt Auto-Reconnect & Auto-Fallback)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (nav?.bluetooth && typeof nav.bluetooth.requestDevice === 'function') {
      if (forcePicker) {
        setPrintFeedback('Membuka dialog pencarian printer baru...');
      } else if (savedPrinterName) {
        setPrintFeedback(`Menghubungkan otomatis ke ${savedPrinterName}...`);
      } else {
        setPrintFeedback('Mencari printer Bluetooth thermal...');
      }

      const res = await printViaWebBluetooth(
        transaksi,
        settings,
        laundryName,
        laundryAddress,
        laundryPhone,
        forcePicker
      );

      if (res.success) {
        if (res.printerName) {
          setSavedPrinterName(res.printerName);
        }
        setPrintFeedback(res.message);
        setTimeout(() => setPrintFeedback(null), 3500);
        return;
      } else if (!res.message.includes('dibatalkan')) {
        setPrintFeedback(res.message);
        setTimeout(() => setPrintFeedback(null), 4000);
      } else {
        setPrintFeedback(null);
      }
      return;
    }

    // 3. Fallback cetak standar browser web
    window.print();
  };

  const handlePrintStandard = () => {
    window.print();
  };

  const handleSwitchPrinter = async () => {
    const res = await pairBluetoothPrinterDirectly();
    if (res.success && res.printerName) {
      setSavedPrinterName(res.printerName);
      setPrintFeedback(res.message);
      setTimeout(() => setPrintFeedback(null), 3500);
    } else if (res.message && !res.message.includes('dibatalkan')) {
      setPrintFeedback(res.message);
      setTimeout(() => setPrintFeedback(null), 3500);
    }
  };

  return (
    <>
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

          {/* Status & Kontrol Sandingan Printer Bluetooth */}
          <div className="px-4 pt-3 pb-1 bg-slate-50 border-b border-slate-200/80 no-print flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  savedPrinterName ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-amber-400'
                }`}
              />
              <div className="text-xs text-slate-700 truncate">
                <span className="text-slate-500">Printer: </span>
                <strong className="text-slate-900 font-semibold">
                  {savedPrinterName || 'Belum Terhubung'}
                </strong>
                {savedPrinterName && (
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md ml-1.5">
                    Tersimpan
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSwitchPrinter}
              className="text-[11px] font-bold text-[#800000] hover:text-[#660000] hover:bg-[#800000]/10 px-2 py-1 rounded-lg transition shrink-0 flex items-center gap-1"
              title="Ganti printer Bluetooth yang digunakan"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{savedPrinterName ? 'Ganti' : 'Pilih'}</span>
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
                {transaksi.diskon && transaksi.diskon > 0 ? (
                  <div className="flex justify-between text-rose-700">
                    <span>Potongan Diskon</span>
                    <span>-Rp {formatNumberOnly(transaksi.diskon)}</span>
                  </div>
                ) : null}
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
        <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-between items-center no-print">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handlePrint(false)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
              title="Cetak langsung ke printer Bluetooth thermal kasir"
            >
              <Printer className="w-4 h-4" />
              <span>{isAndroidPrintAvailable() ? 'Cetak Bluetooth (Android)' : 'Cetak Bluetooth'}</span>
            </button>

            {/* Tombol Bagikan Struk Berdampingan dengan Cetak Bluetooth */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer active:scale-95"
              title="Bagikan struk ke WhatsApp atau aplikasi lain"
            >
              <Share2 className="w-4 h-4" />
              <span>Bagikan Struk</span>
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintStandard}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
              title="Cetak lewat dialog printer standar atau AirPrint"
            >
              Cetak Standar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Modal Bagikan Struk Terbuka di Atas Struk */}
    <ShareReceiptModal
      isOpen={showShareModal}
      onClose={() => setShowShareModal(false)}
      transaksi={transaksi}
      settings={settings}
      pelanggan={pelanggan}
      laundryName={laundryName}
      laundryPhone={laundryPhone}
      laundryAddress={laundryAddress}
    />
  </>
  );
};

