import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  MessageCircle,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  Loader2,
  Briefcase,
  ExternalLink,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Transaksi, SettingsData, Pelanggan } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { generateReceiptBlob } from '../utils/receiptCanvas';

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
  const [feedback, setFeedback] = useState<string | null>(null);

  // Precomputed Blob & File state untuk Google Chrome & Brave gesture compatibility
  const [precomputedBlob, setPrecomputedBlob] = useState<Blob | null>(null);
  const [precomputedFile, setPrecomputedFile] = useState<File | null>(null);
  const [precomputedUrl, setPrecomputedUrl] = useState<string | null>(null);
  const [isPrecomputing, setIsPrecomputing] = useState(false);

  // Interactive Saved Toast state
  const [savedToast, setSavedToast] = useState<{ fileName: string; imageUrl: string | null } | null>(null);

  // Lightbox preview state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi?.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, (transaksi?.totalHarga || 0) - (transaksi?.jumlahDp || 0));
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const customerPhoneClean = (transaksi?.nomorTelepon || pelanggan?.nomorTelepon || '')
    .replace(/[^0-9]/g, '')
    .replace(/^0/, '62');

  // Precompute file gambar PNG saat modal dibuka agar navigator.share dapat dipanggil seketika
  useEffect(() => {
    if (!isOpen || !transaksi) {
      setPrecomputedBlob(null);
      setPrecomputedFile(null);
      if (precomputedUrl) {
        URL.revokeObjectURL(precomputedUrl);
        setPrecomputedUrl(null);
      }
      setSavedToast(null);
      setIsLightboxOpen(false);
      return;
    }

    let isMounted = true;
    setIsPrecomputing(true);

    const safeTitle = `struk-${(transaksi.nomorTransaksi || 'laundry').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    generateReceiptBlob(
      transaksi,
      settings,
      laundryName,
      laundryAddress,
      laundryPhone
    )
      .then((blob) => {
        if (!isMounted) return;
        setPrecomputedBlob(blob);
        const file = new File([blob], safeTitle, { type: 'image/png' });
        setPrecomputedFile(file);
        const url = URL.createObjectURL(blob);
        setPrecomputedUrl(url);
        setIsPrecomputing(false);
      })
      .catch((err) => {
        console.warn('Gagal precompute struk image:', err);
        if (isMounted) setIsPrecomputing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, transaksi?.id, settings, laundryName, laundryAddress, laundryPhone]);

  if (!isOpen || !transaksi) return null;

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

  const copyAndNotify = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setFeedback('Nomor WhatsApp pelanggan belum terdaftar. Teks nota telah disalin ke clipboard!');
      setTimeout(() => {
        setCopiedText(false);
        setFeedback(null);
      }, 4000);
    } catch {
      setFeedback('Gagal menyalin teks ke clipboard.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // 1. Web Share API dengan Precomputed File (Didukung Penuh di Chrome & Brave)
  const handleNativeShare = async () => {
    setFeedback(null);
    const shareText = generateShareText();
    const shareTitle = `${headerTitle} - Struk #${transaksi.nomorTransaksi || ''}`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      // Prioritaskan share file jika file precomputed sudah siap dan didukung
      if (precomputedFile && navigator.canShare && navigator.canShare({ files: [precomputedFile] })) {
        try {
          await navigator.share({
            files: [precomputedFile],
            title: shareTitle,
            text: shareText,
          });
          return;
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') return;
          console.warn('Gagal share gambar, fallback ke teks share:', err);
        }
      }

      // Fallback cerdas: Bagikan teks resmi langsung jika file sharing tidak didukung
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    // Fallback jika Web Share API tidak tersedia di browser
    await copyAndNotify(shareText);
  };

  // 2A. WhatsApp Biasa (com.whatsapp)
  const handleSendWhatsAppRegular = () => {
    const text = generateShareText();
    if (customerPhoneClean) {
      const url = `https://api.whatsapp.com/send?phone=${customerPhoneClean}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    } else {
      copyAndNotify(text);
    }
  };

  // 2B. WhatsApp Business (com.whatsapp.w4b)
  const handleSendWhatsAppBusiness = () => {
    const text = generateShareText();
    if (customerPhoneClean) {
      const intentUrl = `intent://send?phone=${customerPhoneClean}&text=${encodeURIComponent(text)}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${customerPhoneClean}&text=${encodeURIComponent(text)}`;

      const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent || '');
      if (isAndroid) {
        window.location.href = intentUrl;
        setTimeout(() => {
          window.open(fallbackUrl, '_blank');
        }, 1200);
      } else {
        window.open(fallbackUrl, '_blank');
      }
    } else {
      copyAndNotify(text);
    }
  };

  // 3. Simpan Gambar Struk (PNG) dengan Toast Galeri Interaktif
  const handleDownloadPNG = async () => {
    setFeedback(null);
    try {
      let downloadBlob = precomputedBlob;
      let downloadUrl = precomputedUrl;

      if (!downloadBlob) {
        downloadBlob = await generateReceiptBlob(
          transaksi,
          settings,
          laundryName,
          laundryAddress,
          laundryPhone
        );
        downloadUrl = URL.createObjectURL(downloadBlob);
      }

      const fileName = `struk-${(transaksi.nomorTransaksi || 'nota').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

      // Eksekusi download file
      const a = document.createElement('a');
      a.href = downloadUrl!;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Tampilkan Toast Interaktif dengan Tombol "Buka Gambar"
      setSavedToast({
        fileName,
        imageUrl: downloadUrl,
      });
    } catch (err) {
      console.error('Download error:', err);
      setFeedback('Gagal mengunduh gambar struk. Silakan coba lagi.');
      setTimeout(() => setFeedback(null), 3000);
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
    <>
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

          {/* Feedback / Alert Notification */}
          {feedback && (
            <div className="mx-4 mt-3 p-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in shadow-md">
              <span className="leading-snug">{feedback}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded ml-2 shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Toast Galeri Interaktif (Saat Gambar Berhasil Disimpan) */}
          {savedToast && (
            <div className="mx-4 mt-3 p-3.5 rounded-2xl bg-emerald-900 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-emerald-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Tersimpan di Perangkat!
                  </div>
                  <div className="text-[11px] text-emerald-200 truncate font-mono">
                    {savedToast.fileName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka Gambar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSavedToast(null)}
                  className="text-emerald-300 hover:text-white p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Share Options List */}
          <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
            {/* Opsi 1: Menu Share Bawaan HP / Web Share (Precomputed untuk Chrome & Brave) */}
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-[#800000]/30 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isPrecomputing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>Bagikan ke Aplikasi Lain</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded-md">
                    Cepat & Instan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Buka menu share HP langsung (Google Chrome & Brave didukung penuh)
                </p>
              </div>
            </button>

            {/* Opsi 2A: WhatsApp Biasa (com.whatsapp) */}
            <button
              onClick={handleSendWhatsAppRegular}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 text-left transition-all active:scale-[0.98] group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>WhatsApp Biasa</span>
                  {customerPhoneClean && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                      +{customerPhoneClean}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Buka langsung aplikasi WhatsApp reguler (com.whatsapp)
                </p>
              </div>
            </button>

            {/* Opsi 2B: WA Business (com.whatsapp.w4b) */}
            <button
              onClick={handleSendWhatsAppBusiness}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-teal-200 hover:bg-teal-50/50 text-left transition-all active:scale-[0.98] group"
            >
              <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>WA Business</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md">
                    Bisnis
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Buka langsung aplikasi WhatsApp Business (com.whatsapp.w4b)
                </p>
              </div>
            </button>

            {/* Opsi 3: Simpan Gambar PNG dengan Notifikasi Interaktif */}
            <button
              onClick={handleDownloadPNG}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 text-left transition-all active:scale-[0.98] group"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isPrecomputing ? (
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
                  Unduh file foto struk thermal HD ke galeri & bisa langsung dibuka
                </p>
              </div>
            </button>

            {/* Opsi 4: Salin Teks Nota */}
            <button
              onClick={handleCopyText}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-left transition-all active:scale-[0.98] group"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {copiedText ? <Check className="w-5 h-5 text-emerald-300" /> : <Copy className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  {copiedText ? 'Teks Nota Disalin!' : 'Salin Teks Nota'}
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  Salin teks format nota rapi ke clipboard perangkat
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

      {/* Lightbox Preview Modal Saat Kasir Klik "Buka Gambar" */}
      {isLightboxOpen && precomputedUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold truncate">
                  Preview Gambar Struk ({transaksi.nomorTransaksi || 'Nota'})
                </h4>
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-100 flex justify-center">
              <img
                src={precomputedUrl}
                alt="Preview Struk"
                className="w-[280px] shadow-lg rounded-md bg-white border border-slate-300"
              />
            </div>
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
