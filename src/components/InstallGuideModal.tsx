import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  Apple,
  Download,
  Share,
  PlusSquare,
  MoreVertical,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useDeviceDetect } from '../hooks/useDeviceDetect';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'android' | 'ios' | 'pc';
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const { isInstallable, isInstalled, install, isInIframe } = usePWAInstall();
  const deviceInfo = useDeviceDetect();

  // Auto-detect best initial tab based on device OS
  const getDetectedTab = (): 'android' | 'ios' | 'pc' => {
    if (initialTab) return initialTab;
    if (deviceInfo.os === 'Android') return 'android';
    if (deviceInfo.os === 'iOS') return 'ios';
    return 'pc';
  };

  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>('android');
  const [copiedLink, setCopiedLink] = useState(false);
  const [installSuccessMessage, setInstallSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(getDetectedTab());
      setInstallSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleOpenFullBrowser = () => {
    window.open(currentUrl, '_blank');
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccessMessage('Aplikasi berhasil dipasang ke perangkat Anda!');
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-linear-to-r from-[#800000] to-[#550000] p-4 sm:p-5 flex items-center justify-between border-b border-red-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-sm">
              <Download className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                Cara Pasang Kafelas Laundry
              </h2>
              <p className="text-xs text-red-200/90 font-medium">
                Panduan instalasi untuk semua jenis perangkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Perangkat Terdeteksi */}
        <div className="bg-slate-950/60 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Perangkat Anda terdeteksi:</span>
            <span className="font-bold text-amber-300">
              {deviceInfo.os === 'Android'
                ? 'HP Android'
                : deviceInfo.os === 'iOS'
                ? 'iPhone / iPad (Apple)'
                : `${deviceInfo.os} (PC / Laptop)`}
            </span>
          </div>
          {isInstalled && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> Sudah Terpasang
            </span>
          )}
        </div>

        {/* Tab Selector: Android • iOS / iPhone • PC / Laptop */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-950 border-b border-slate-800 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Android</span>
            {deviceInfo.os === 'Android' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'ios'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Apple className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">iPhone / iPad</span>
            {deviceInfo.os === 'iOS' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pc')}
            className={`py-2 px-1 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'pc'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">PC / Laptop</span>
            {deviceInfo.os !== 'Android' && deviceInfo.os !== 'iOS' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping shrink-0" />
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Peringatan jika di dalam Pratinjau / In-App Browser (WhatsApp, Instagram, FB) */}
          {isInIframe && (
            <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                <ExternalLink className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Tips: Buka di Browser Utama (Chrome / Safari)</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                Jika Anda membuka tautan ini dari WhatsApp, Instagram, atau jendela pratinjau, browser membatasi tombol pasang otomatis. Buka di tab penuh browser:
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenFullBrowser}
                  className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Penuh</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="py-2 px-3 bg-slate-800 border border-amber-400/40 text-amber-200 font-bold rounded-xl text-xs hover:bg-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback jika berhasil install */}
          {installSuccessMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-500/60 text-emerald-200 flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{installSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
              {/* Tombol 1-Klik Jika Didukung Browser */}
              {isInstallable && (
                <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      Browser Mendukung Pasang Langsung
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                      Otomatis
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Sekarang ke Layar Utama HP</span>
                  </button>
                </div>
              )}

              {/* Panduan Langkah Manual */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-emerald-400 flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>Langkah Pasang di Android (Google Chrome & Samsung Internet):</span>
                </div>

                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      1
                    </span>
                    <div>
                      <p className="text-white font-semibold">Buka di Browser Google Chrome</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Pastikan tautan website dibuka langsung di Google Chrome.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      2
                    </span>
                    <div>
                      <p className="text-white font-semibold flex items-center gap-1.5 flex-wrap">
                        Ketuk tombol menu <strong>Titik Tiga</strong>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 text-white text-[11px]">
                          <MoreVertical className="w-3 h-3" />
                        </span>
                        di pojok kanan atas layar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      3
                    </span>
                    <div>
                      <p className="text-white font-semibold">
                        Pilih menu &quot;Pasang aplikasi&quot; atau &quot;Tambahkan ke Layar Utama&quot;
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        (Menu <em>Add to Home screen</em> / <em>Install app</em>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      4
                    </span>
                    <div>
                      <p className="text-white font-semibold">Ketuk tombol &quot;Instal&quot;</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Ikon <strong>Kafelas Laundry</strong> akan otomatis terpasang di Home Screen HP Anda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manfaat PWA */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Keunggulan di HP Android:
                </p>
                <p>• Berjalan layar penuh (fullscreen) tanpa bilah URL browser.</p>
                <p>• Ukuran sangat ringan (~2.5 MB) dan tidak membebani memori HP.</p>
                <p>• Data transaksi otomatis tersimpan di HP sehingga bisa dipakai kasir secara offline.</p>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE & IPAD (IOS) */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-sky-400 flex items-center gap-2 text-xs">
                  <Apple className="w-4 h-4" />
                  <span>Langkah Pasang di iPhone & iPad (Wajib Browser Safari):</span>
                </div>

                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      1
                    </span>
                    <div>
                      <p className="text-white font-semibold">Buka di Browser Safari Bawaan</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Apple hanya mengizinkan penambahan aplikasi ke Home Screen melalui browser <strong>Safari</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      2
                    </span>
                    <div>
                      <p className="text-white font-semibold flex items-center gap-1.5 flex-wrap">
                        Ketuk tombol <strong>Bagikan (Share)</strong>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30">
                          <Share className="w-3 h-3" /> Share
                        </span>
                        di bilah bawah layar Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      3
                    </span>
                    <div>
                      <p className="text-white font-semibold flex items-center gap-1.5 flex-wrap">
                        Gulir menu ke bawah lalu ketuk
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 text-white font-bold">
                          <PlusSquare className="w-3 h-3 text-sky-400" /> Tambah ke Layar Utama
                        </span>
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        (Atau <em>Add to Home Screen</em>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      4
                    </span>
                    <div>
                      <p className="text-white font-semibold">Ketuk tombol &quot;Tambah&quot; (Add) di pojok kanan atas</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Ikon Kafelas Laundry kini muncul di layar utama iPhone Anda dan dapat dibuka tanpa toolbar Safari.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips Khusus iPhone */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  Catatan untuk Pengguna Apple:
                </p>
                <p>• Jika saat ini membuka di Chrome iOS, salin link dan buka di aplikasi <strong>Safari</strong>.</p>
                <p>• Cetak struk di iPhone mendukung AirPrint dan Ekspor Gambar Struk WhatsApp HD.</p>
              </div>
            </div>
          )}

          {/* TAB 3: PC / LAPTOP (WINDOWS & MAC) */}
          {activeTab === 'pc' && (
            <div className="space-y-3.5">
              {/* Tombol 1-Klik di PC jika didukung */}
              {isInstallable && (
                <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      Browser Desktop Mendukung Pasang Cepat
                    </span>
                    <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full font-bold">
                      Desktop App
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDirectInstall}
                    className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Pasang Aplikasi ke Komputer / Laptop</span>
                  </button>
                </div>
              )}

              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                <div className="font-bold text-purple-400 flex items-center gap-2 text-xs">
                  <Laptop className="w-4 h-4" />
                  <span>Langkah Pasang di Windows & Mac (Google Chrome / Edge):</span>
                </div>

                <div className="space-y-3 pl-1">
                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      1
                    </span>
                    <div>
                      <p className="text-white font-semibold">Buka di Google Chrome atau Microsoft Edge</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Bekerja sangat baik di Windows 10, Windows 11, dan macOS.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      2
                    </span>
                    <div>
                      <p className="text-white font-semibold">
                        Klik ikon <strong>Pasang (Komputer dengan panah)</strong> di sebelah kanan kolom URL (Address Bar).
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Atau klik menu <strong>Titik Tiga (⋮)</strong> &gt; <strong>Simpan dan bagikan</strong> &gt; <strong>Pasang Kafelas Laundry</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      3
                    </span>
                    <div>
                      <p className="text-white font-semibold">Klik tombol &quot;Instal&quot;</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">
                        Aplikasi akan terbuka di jendela tersendiri tanpa tab browser dan otomatis disematkan di Taskbar & Desktop PC Anda.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manfaat di PC */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Keunggulan di PC / Kasir Meja:
                </p>
                <p>• Navigasi dua panel lebar (split-screen) optimal untuk keyboard & mouse kasir.</p>
                <p>• Pintasan cepat dari desktop saat toko baru dibuka setiap pagi.</p>
                <p>• Dukungan cetak printer thermal USB & Bluetooth langsung dari PC.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopyLink}
            className="py-2.5 px-3.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
