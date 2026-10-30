import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Transaksi, SettingsData, Pelanggan } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import {
  generateReceiptBlob,
  getReceiptFileName,
  triggerBlobDownload,
  tryCopyImageBlobToClipboard,
} from '../utils/receiptCanvas';
import {
  WhatsAppVariant,
  normalizeWhatsAppPhone,
  isMobileBrowser,
  canWebShareFiles,
  buildWhatsAppReceiptCaption,
  openDirectWhatsAppChat,
} from '../utils/whatsappHelper';
import { ReceiptPaper } from './ReceiptPaper';

interface ShareReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: Transaksi | null;
  settings: SettingsData;
  pelanggan?: Pelanggan | null;
  laundryName?: string;
  laundryPhone?: string;
  laundryAddress?: string;
  initialBlob?: Blob | null;
  initialFile?: File | null;
  initialUrl?: string | null;
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
  initialBlob,
  initialFile,
  initialUrl,
}) => {
  const captureRef = useRef<HTMLDivElement>(null);
  const ownedUrlRef = useRef<string | null>(null);

  const [copiedText, setCopiedText] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLogoReady, setIsLogoReady] = useState(false);

  const [precomputedBlob, setPrecomputedBlob] = useState<Blob | null>(null);
  const [precomputedFile, setPrecomputedFile] = useState<File | null>(null);
  const [precomputedUrl, setPrecomputedUrl] = useState<string | null>(null);
  const [isPrecomputing, setIsPrecomputing] = useState(false);

  const [savedToast, setSavedToast] = useState<{ fileName: string; imageUrl: string | null } | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const headerTitle = laundryName || settings.headerStruk || 'Kafelas Laundry';
  const headerAddress = laundryAddress || settings.address || '';
  const headerPhone = laundryPhone || settings.phoneNumber || '';

  const isLunas = transaksi?.statusPembayaran === 'Lunas';
  const sisaBayar = isLunas ? 0 : Math.max(0, (transaksi?.totalHarga || 0) - (transaksi?.jumlahDp || 0));
  const statusFinal = isLunas || sisaBayar <= 0 ? 'LUNAS' : 'BELUM LUNAS';

  const customerPhoneClean = normalizeWhatsAppPhone(
    transaksi?.nomorTelepon || pelanggan?.nomorTelepon
  );

  useEffect(() => {
    if (!isOpen || !transaksi) {
      setIsLogoReady(false);
      setPrecomputedBlob(null);
      setPrecomputedFile(null);
      setPrecomputedUrl(null);
      if (ownedUrlRef.current) {
        URL.revokeObjectURL(ownedUrlRef.current);
        ownedUrlRef.current = null;
      }
      setSavedToast(null);
      setFeedback(null);
      setIsLightboxOpen(false);
      return;
    }

    if (initialBlob && initialFile && initialUrl) {
      setPrecomputedBlob(initialBlob);
      setPrecomputedFile(initialFile);
      setPrecomputedUrl(initialUrl);
      setIsPrecomputing(false);
      return;
    }

    setIsPrecomputing(true);
    const fallbackTimer = setTimeout(() => {
      setIsLogoReady(true);
    }, 400);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [isOpen, transaksi?.id, initialBlob, initialFile, initialUrl]);

  useEffect(() => {
    if (!isOpen || !transaksi) return;
    if (initialBlob && initialFile && initialUrl) return;
    if (!isLogoReady) return;

    let isMounted = true;
    setIsPrecomputing(true);

    const raf = requestAnimationFrame(() => {
      const fileName = getReceiptFileName(transaksi);
      generateReceiptBlob(
        transaksi,
        settings,
        laundryName,
        laundryAddress,
        laundryPhone,
        captureRef.current
      )
        .then((blob) => {
          if (!isMounted) return;
          if (ownedUrlRef.current) {
            URL.revokeObjectURL(ownedUrlRef.current);
          }
          const url = URL.createObjectURL(blob);
          ownedUrlRef.current = url;
          setPrecomputedBlob(blob);
          setPrecomputedFile(new File([blob], fileName, { type: 'image/png' }));
          setPrecomputedUrl(url);
          setIsPrecomputing(false);
        })
        .catch(() => {
          if (isMounted) setIsPrecomputing(false);
        });
    });

    return () => {
      isMounted = false;
      cancelAnimationFrame(raf);
    };
  }, [
    isOpen,
    isLogoReady,
    transaksi,
    settings,
    laundryName,
    laundryAddress,
    laundryPhone,
    initialBlob,
    initialFile,
    initialUrl,
  ]);

  if (!isOpen || !transaksi) return null;

  const shareTitle = `${headerTitle} - Struk #${transaksi.nomorTransaksi || ''}`;
  const waCaption = buildWhatsAppReceiptCaption(transaksi, headerTitle, statusFinal, sisaBayar);
  const mobileFileShareReady = isMobileBrowser() && canWebShareFiles(precomputedFile);

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
        msg += `• ${it?.namaLayanan || 'Layanan'}\n  ${it?.berat || 0} ${it?.satuan || ''} x ${formatRupiah(
          it?.hargaPerKg || it?.hargaSatuan || 0
        )} = *${formatRupiah(it?.subtotal || 0)}*\n`;
      });
    } else {
      msg += `• Cucian Laundry = *${formatRupiah(transaksi.totalHarga)}*\n`;
    }

    msg += `--------------------------------\n`;
    if (transaksi.diskon && transaksi.diskon > 0) {
      msg += `Potongan Diskon: -${formatRupiah(transaksi.diskon)}\n`;
    }
    msg += `*Total Transaksi: ${formatRupiah(transaksi.totalHarga)}*\n`;
    if (transaksi.jumlahDp > 0) {
      msg += `Pembayaran Awal: ${formatRupiah(transaksi.jumlahDp)}\n`;
    }
    if (sisaBayar > 0) {
      msg += `*Sisa Pembayaran: ${formatRupiah(sisaBayar)}*\n`;
    }
    msg += `*Status: ${statusFinal}*\n`;
    if (transaksi.metodePembayaran) {
      msg += `Metode: ${transaksi.metodePembayaran}${
        transaksi.metodePembayaranDetail ? ` (${transaksi.metodePembayaranDetail})` : ''
      }\n`;
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

  const ensureReceiptAssets = async () => {
    if (precomputedBlob && precomputedFile) {
      return {
        blob: precomputedBlob,
        file: precomputedFile,
        url: precomputedUrl || URL.createObjectURL(precomputedBlob),
      };
    }
    const blob = await generateReceiptBlob(
      transaksi,
      settings,
      laundryName,
      laundryAddress,
      laundryPhone,
      captureRef.current
    );
    const fileName = getReceiptFileName(transaksi);
    const file = new File([blob], fileName, { type: 'image/png' });
    if (ownedUrlRef.current) {
      URL.revokeObjectURL(ownedUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    ownedUrlRef.current = url;
    setPrecomputedBlob(blob);
    setPrecomputedFile(file);
    setPrecomputedUrl(url);
    return { blob, file, url };
  };

  const fallbackSaveAndOpenWhatsApp = async (variant: WhatsAppVariant) => {
    try {
      const { blob, url } = await ensureReceiptAssets();
      const fileName = getReceiptFileName(transaksi);
      const copiedImage = await tryCopyImageBlobToClipboard(blob);
      triggerBlobDownload(blob, fileName, url);
      setSavedToast({ fileName, imageUrl: url });
      openDirectWhatsAppChat(customerPhoneClean, waCaption, variant);

      if (copiedImage) {
        setFeedback(
          'Gambar struk telah disalin & diunduh! Tekan Tempel (Ctrl+V) di chat WhatsApp untuk mengirim gambar struk.'
        );
      } else {
        setFeedback(
          'Gambar struk telah disimpan ke perangkat! Lampirkan gambar struk terbaru di ruang chat WhatsApp.'
        );
      }
    } catch {
      setFeedback('Gagal menyiapkan gambar struk untuk WhatsApp. Silakan coba lagi.');
    }
  };

  const handleShareWhatsAppImage = async (variant: WhatsAppVariant) => {
    setFeedback(null);

    if (mobileFileShareReady && precomputedFile) {
      try {
        await navigator.share({
          files: [precomputedFile],
          title: shareTitle,
          text: waCaption,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    await fallbackSaveAndOpenWhatsApp(variant);
  };

  const handleNativeShare = async () => {
    setFeedback(null);

    if (precomputedFile && canWebShareFiles(precomputedFile)) {
      try {
        await navigator.share({
          files: [precomputedFile],
          title: shareTitle,
          text: waCaption,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    try {
      const { blob, file, url } = await ensureReceiptAssets();
      if (canWebShareFiles(file)) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: waCaption,
        });
        return;
      }
      const fileName = getReceiptFileName(transaksi);
      const copiedImage = await tryCopyImageBlobToClipboard(blob);
      triggerBlobDownload(blob, fileName, url);
      setSavedToast({ fileName, imageUrl: url });
      setFeedback(
        copiedImage
          ? 'Gambar struk disalin ke clipboard & diunduh ke perangkat!'
          : 'Gambar struk berhasil diunduh ke perangkat!'
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setFeedback('Gagal membagikan gambar struk.');
    }
  };

  const handleDownloadPNG = async () => {
    setFeedback(null);
    try {
      const { blob, url } = await ensureReceiptAssets();
      const fileName = getReceiptFileName(transaksi);
      triggerBlobDownload(blob, fileName, url);
      setSavedToast({
        fileName,
        imageUrl: url,
      });
    } catch {
      setFeedback('Gagal mengunduh gambar struk. Silakan coba lagi.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

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
      {!(initialBlob && initialFile && initialUrl) && (
        <div
          aria-hidden="true"
          className="fixed -left-[9999px] top-0 pointer-events-none no-print"
        >
          <ReceiptPaper
            ref={captureRef}
            isCaptureNode
            transaksi={transaksi}
            settings={settings}
            laundryName={laundryName}
            laundryPhone={laundryPhone}
            laundryAddress={laundryAddress}
            onLogoReady={() => setIsLogoReady(true)}
          />
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
        <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-200">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 sm:hidden" />

          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#800000]/10 text-[#800000] flex items-center justify-center font-bold shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  Bagikan Gambar Struk
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {transaksi.nomorTransaksi || 'Transaksi'} · {transaksi.namaPelanggan}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mx-4 mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {precomputedUrl ? (
                <img
                  src={precomputedUrl}
                  alt="Thumbnail Struk"
                  referrerPolicy="no-referrer"
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-10 h-12 object-cover object-top rounded-md border border-slate-300 bg-white cursor-pointer shrink-0"
                />
              ) : (
                <div className="w-10 h-12 rounded-md border border-slate-200 bg-white flex items-center justify-center shrink-0">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {isPrecomputing ? 'Menyiapkan gambar struk...' : 'Struk Gambar HD Siap Dikirim'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {getReceiptFileName(transaksi)}
                </div>
              </div>
            </div>
            {precomputedUrl && (
              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            )}
          </div>

          {feedback && (
            <div className="mx-4 mt-2.5 p-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold flex items-center justify-between animate-in fade-in shadow-md">
              <span className="leading-snug">{feedback}</span>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded ml-2 shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {savedToast && (
            <div className="mx-4 mt-2.5 p-3 rounded-2xl bg-emerald-900 text-white shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border border-emerald-700">
              <div className="flex items-center gap-2.5 min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    Gambar Struk Tersimpan!
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
                  className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Buka</span>
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

          <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto">
            <button
              type="button"
              disabled={isPrecomputing}
              onClick={() => handleShareWhatsAppImage('regular')}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 hover:border-emerald-400 hover:bg-emerald-50 text-left transition-all active:scale-[0.98] disabled:opacity-60 group"
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isPrecomputing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MessageCircle className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>Share Gambar ke WhatsApp</span>
                  {customerPhoneClean && (
                    <span className="text-[11px] text-emerald-700 font-mono truncate">
                      · +{customerPhoneClean}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 truncate">
                  {mobileFileShareReady
                    ? 'Kirim foto struk persis seperti preview ke WhatsApp'
                    : 'Salin & unduh gambar struk lalu buka chat WhatsApp'}
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={isPrecomputing}
              onClick={() => handleShareWhatsAppImage('business')}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-teal-300 hover:bg-teal-50/50 text-left transition-all active:scale-[0.98] disabled:opacity-60 group"
            >
              <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isPrecomputing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Briefcase className="w-5 h-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-2">
                  <span>Share Gambar ke WA Business</span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {mobileFileShareReady
                    ? 'Kirim foto struk persis seperti preview ke WA Business'
                    : 'Salin & unduh gambar struk lalu buka WA Business'}
                </p>
              </div>
            </button>

            {mobileFileShareReady && customerPhoneClean && (
              <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2">
                <p className="text-[11px] text-slate-600 leading-snug">
                  Nomor baru <strong className="font-mono text-slate-800">+{customerPhoneClean}</strong> belum ada di daftar chat? Simpan struk & buka chat langsung:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fallbackSaveAndOpenWhatsApp('regular')}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 text-emerald-700 font-bold text-[11px] transition whitespace-nowrap"
                  >
                    Chat WA Biasa
                  </button>
                  <button
                    type="button"
                    onClick={() => fallbackSaveAndOpenWhatsApp('business')}
                    className="py-2 px-3 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 text-teal-700 font-bold text-[11px] transition whitespace-nowrap"
                  >
                    Chat WA Business
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isPrecomputing}
              onClick={handleNativeShare}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-[#800000]/30 hover:bg-slate-50 text-left transition-all active:scale-[0.98] disabled:opacity-60 group"
            >
              <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {isPrecomputing ? (
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
                  Kirim gambar struk yang sama ke aplikasi lain di perangkat
                </p>
              </div>
            </button>

            <button
              type="button"
              disabled={isPrecomputing}
              onClick={handleDownloadPNG}
              className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 text-left transition-all active:scale-[0.98] disabled:opacity-60 group"
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
                  Unduh gambar struk persis seperti preview ke galeri perangkat
                </p>
              </div>
            </button>

            <button
              type="button"
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
                  Salin rincian teks nota ke clipboard perangkat
                </p>
              </div>
            </button>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500 tabular-nums">
              Total: <strong className="text-slate-900">{formatRupiah(transaksi.totalHarga)}</strong> · {statusFinal}
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

      {isLightboxOpen && precomputedUrl && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs font-bold truncate">
                  Preview Gambar Struk ({transaksi.nomorTransaksi || 'Nota'})
                </h4>
              </div>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto bg-slate-100 flex justify-center">
              <img
                src={precomputedUrl}
                alt="Preview Struk"
                referrerPolicy="no-referrer"
                className="w-[300px] shadow-lg bg-white border border-slate-300"
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
