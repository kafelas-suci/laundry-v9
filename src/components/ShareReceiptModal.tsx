import React, { useState } from 'react';
import { X, Share2, MessageCircle, Download, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Transaksi, SettingsData, Pelanggan } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { generateReceiptBlob, downloadReceiptImage } from '../utils/receiptCanvas';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: Transaksi | null;
  settings: SettingsData;
  pelanggan?: Pelanggan | null;
  laundryName?: string;
  laundryPhone?: string;
  laundryAddress?: string;
}

export const ShareReceiptModal: React.FC<ShareReceiptModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  settings,
  pelanggan,
  laundryName,
  laundryPhone,
  laundryAddress,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !transaksi) return null;

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, transaksi.totalHarga - (transaksi.jumlahDp || 0));
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const customerPhoneClean = (transaksi.nomorTelepon || pelanggan?.nomorTelepon || '')
    .replace(/[^0-9]/g, '')
    .replace(/^0/, '62');

  const generateShareText = () => {
    let msg = `*${headerTitle.toUpperCase()}*\n`;
    if (headerAddress) msg += `${headerAddress}\n`;
    if (headerPhone) msg += `Telp: ${headerPhone}\n`;
    msg += `--------------------------------\n`;
    msg += `*No. Nota:* ${transaksi.nomorTransaksi || '-'}\n`;
    msg += `*Pelanggan:* ${transaksi.namaPelanggan}\n`;
    if (transaksi.alamat) msg += `*Alamat:* ${transaksi.alamat}\n`;
    msg += `*Tgl Masuk:* ${formatDateIndo(transaksi.tanggalMasuk, true)}\n`;
    if (transaksi.tanggalSelesai) {
      msg += `*Est. Selesai:* ${formatDateIndo(transaksi.tanggalSelesai)}\n`;
    }
    msg += `--------------------------------\n`;
    msg += `*Rincian Cucian:*\n`;

    const items = Array.isArray(transaksi.items) && transaksi.items.length > 0 ? transaksi.items : [];
    if (items.length > 0) {
      items.forEach((it) => {
        msg += `• ${it?.namaLayanan || 'Layanan'}\n  ${it?.berat || 0} ${it?.satuan || ''} x ${formatRupiah(it?.hargaPerKg || it?.hargaSatuan || 0)} = *${formatRupiah(it?.subtotal || 0)}*\n`;
      });
    } else {
      msg += `• Cucian Laundry = *${formatRupiah(transaksi.totalHarga)}*\n`;
    }

    msg += `--------------------------------\n`;
    msg += `*Total Transaksi: ${formatRupiah(transaksi.totalHarga)}*\n`;
    if (transaksi.jumlahDp > 0) {
      msg += `Pembayaran Awal: ${formatRupiah(transaksi.jumlahDp)}\n`;
    }
    if (sisaBayar > 0) {
      msg += `*Sisa Pembayaran: ${formatRupiah(sisaBayar)}*\n`;
    }
    msg += `*Status: ${statusFinal}*\n`;
    if (transaksi.metodePembayaran) {
      msg += `Metode: ${transaksi.metodePembayaran}${transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : ''}\n`;
    }
    if (transaksi.catatan) {
      msg += `\n*Catatan:* ${transaksi.catatan}\n`;
    }
    if (settings.footerStruk) {
      msg += `\n${settings.footerStruk}\n`;
    }
    if (settings.chattyFooter) {
      msg += `\n${settings.chattyFooter}\n`;
    }
    return msg;
  };

  // 1. Web Share API (Menu Share Bawaan HP / OS)
  const handleNativeShare = async () => {
    setIsProcessing('share');
    setFeedback(null);
    try {
      const shareText = generateShareText();
      const safeTitle = `Struk_${transaksi.nomorTransaksi || 'Laundry'}`;

      // Coba bagikan file gambar struk PNG jika browser mendukung file sharing
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        try {
          const blob = await generateReceiptBlob(
            transaksi,
            settings,
            laundryName,
            laundryAddress,
            laundryPhone
          );
          const file = new File([blob], `${safeTitle}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `${headerTitle} - Struk #${transaksi.nomorTransaksi || ''}`,
              text: shareText,
            });
            setIsProcessing(null);
            return;
          }
        } catch (fileErr) {
          console.warn('Gagal share dengan file image, fallback ke text share:', fileErr);
        }

        // Fallback teks jika tidak mendukung sharing file
        await navigator.share({
          title: `${headerTitle} - Struk #${transaksi.nomorTransaksi || ''}`,
          text: shareText,
        });
        setIsProcessing(null);
        return;
      }

      // Jika Web Share API sama sekali tidak tersedia (misal di PC non-HTTPS)
      if (typeof window !== 'undefined' && window.navigator && window.navigator.clipboard) {
        await window.navigator.clipboard.writeText(shareText);
        setFeedback('Menu share tidak didukung pada browser ini. Teks nota telah disalin!');
      } else {
        setFeedback('Menu share tidak didukung pada browser ini.');
      }
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: unknown) {
      // User membatalkan menu share adalah kejadian normal
      if (err instanceof Error && err.name === 'AbortError') {
        // user cancelled
      } else {
        console.warn('Share error:', err);
      }
    } finally {
      setIsProcessing(null);
    }
  };

  // 2. Kirim Pesan WhatsApp Langsung
  const handleSendWhatsApp = () => {
    const text = generateShareText();
    if (customerPhoneClean) {
      const url = `https://api.whatsapp.com/send?phone=${customerPhoneClean}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else {
      navigator.clipboard.writeText(text);
      setCopiedText(true);
      setFeedback('Nomor WhatsApp pelanggan belum terdaftar. Teks nota telah disalin ke clipboard!');
      setTimeout(() => {
        setCopiedText(false);
        setFeedback(null);
      }, 3500);
    }
  };

  // 3. Simpan / Unduh Gambar Struk (PNG)
  const handleDownloadPNG = async () => {
    setIsProcessing('download');
    setFeedback(null);
    try {
      await downloadReceiptImage(
        transaksi,
        settings,
        laundryName,
        laundryAddress,
        laundryPhone
      );
      setFeedback('Gambar struk berhasil diunduh ke perangkat Anda!');
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      console.error('Download error:', err);
      setFeedback('Gagal mengunduh gambar struk. Silakan coba lagi.');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsProcessing(null);
    }
  };

  // 4. Salin Teks Nota ke Clipboard
  const handleCopyText = async () => {
    try {
      const text = generateShareText();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setFeedback('Teks nota berhasil disalin ke clipboard!');
      setTimeout(() => {
        setCopiedText(false);
        setFeedback(null);
      }, 2500);
    } catch {
      setFeedback('Gagal menyalin teks.');
      setTimeout(() => setFeedback(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-200">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden" />

        {/* Top Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                Bagikan Struk
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {transaksi.nomorTransaksi || 'Transaksi'} · {transaksi.namaPelanggan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback / Toast Notification */}
        {feedback && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in shadow-md">
            <span>{feedback}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Share Options List */}
        <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
          {/* Opsi 1: Menu Share Bawaan HP / Web Share */}
          <button
            onClick={handleNativeShare}
            disabled={isProcessing === 'share'}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-[#800000]/30 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {isProcessing === 'share' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                Bagikan ke Aplikasi Lain
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Munculkan pilihan share HP (WhatsApp, Telegram, Drive, dll)
              </p>
            </div>
          </button>

          {/* Opsi 2: WhatsApp Langsung */}
          <button
            onClick={handleSendWhatsApp}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                <span>Kirim Pesan WhatsApp</span>
                {customerPhoneClean && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                    +{customerPhoneClean}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Kirim format nota rapi langsung ke chat pelanggan
              </p>
            </div>
          </button>

          {/* Opsi 3: Simpan Gambar PNG */}
          <button
            onClick={handleDownloadPNG}
            disabled={isProcessing === 'download'}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 text-left transition-all active:scale-[0.98] group"
          >
            <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {isProcessing === 'download' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                Simpan Gambar Struk (PNG)
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Unduh file foto struk thermal 58mm jernih ke galeri
              </p>
            </div>
          </button>


        </div>

        {/* Footer info & close */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Total: <strong className="text-slate-900">{formatRupiah(transaksi.totalHarga)}</strong> ({statusFinal})
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
