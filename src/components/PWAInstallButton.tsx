import React, { useState } from 'react';
import { Download, Smartphone, Share2, PlusSquare, ExternalLink, X, Check, Laptop } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'banner' | 'standalone';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running in standalone mode (already installed as PWA), hide button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenNewTab = () => {
    window.open(currentUrl, '_blank');
  };

  return (
    <>


      {variant === 'standalone' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#800000] hover:bg-[#660000] text-white font-bold text-xs shadow-md transition active:scale-95 ${className}`}
        >
          <Download className="w-4 h-4 text-amber-300" />
          <span>Pasang ke Layar Utama HP</span>
        </button>
      )}

      {/* MODAL PANDUAN CARA PASANG / INSTALASI */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 text-amber-700" />
            </div>

            <h3 className="text-base font-black text-slate-900 text-center">
              Pasang Aplikasi Kafelas Laundry
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              Dapat dipasang di Android, iPhone/iPad, dan Komputer/Laptop.
            </p>

            <div className="overflow-y-auto space-y-3.5 my-4 pr-1 text-xs text-slate-700">
      

              {/* Notice if running inside iframe */}
              {isInIframe && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Sedang dibuka di dalam Pratinjau (iFrame)</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Browser membatasi pemasangan langsung dari dalam jendela pratinjau. Silakan buka aplikasi di tab penuh untuk memasangnya langsung ke HP atau laptop Anda.
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleOpenNewTab}
                      className="flex-1 py-2 bg-[#800000] text-white font-bold rounded-xl text-xs hover:bg-[#660000] transition active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Tab Baru</span>
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="py-2 px-3 bg-white border border-amber-300 text-amber-900 font-bold rounded-xl text-xs hover:bg-amber-100 transition active:scale-95 flex items-center justify-center gap-1"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Panduan Android Chrome */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Untuk HP Android (Google Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Ketuk tombol menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser Chrome.</li>
                  <li>Pilih menu <strong>"Pasang aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                  <li>Ketuk <strong>"Instal"</strong>. Ikon Kafelas Laundry akan otomatis muncul di menu HP Anda!</li>
                </ol>
              </div>

              {/* Panduan iPhone / iPad */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <PlusSquare className="w-4 h-4 text-blue-600" />
                  <span>Untuk iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Buka website ini di browser bawaan <strong>Safari</strong>.</li>
                  <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah layar.</li>
                  <li>Gulir ke bawah dan ketuk <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.</li>
                  <li>Ketuk <strong>"Tambah"</strong> di pojok kanan atas.</li>
                </ol>
              </div>

              {/* Panduan PC / Laptop */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-purple-600" />
                  <span>Untuk Komputer / Laptop (Chrome / Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
                  <li>Lihat di sebelah kanan kolom alamat URL (address bar).</li>
                  <li>Klik ikon <strong>Komputer dengan tanda panah</strong> (Pasang aplikasi).</li>
                  <li>Klik <strong>"Instal"</strong> untuk membuka sebagai aplikasi desktop terpisah.</li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-xs text-slate-700 transition active:scale-95 mt-1"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}
    </>
  );
};
