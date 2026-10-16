import React, { useState } from 'react';
import { X, Download, ShieldCheck, PlayCircle, Smartphone, Copy, Check, FileCode, HardDriveDownload } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkPlaystoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkPlaystoreModal: React.FC<ApkPlaystoreModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install, isIOS, isInIframe } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'install' | 'playstore' | 'twa_config' | 'offline_safe'>('install');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://kafelaslaundry.web.app';

  const twaManifestJson = JSON.stringify(
    {
      packageId: 'com.kafilasuci4.app',
      host: currentOrigin.replace(/^https?:\/\//, ''),
      name: 'Laundry POS',
      launcherName: 'LaundryApp',
      themeColor: '#800000',
      navigationColor: '#800000',
      backgroundColor: '#800000',
      enableNotifications: true,
      startUrl: '/',
      iconUrl: `${currentOrigin}/pwa-512x512.png`,
      maskableIconUrl: `${currentOrigin}/pwa-maskable-512x512.png`,
      appVersionName: '1.25',
      appVersionCode: 25,
      signing: {
        file: './android.keystore',
        alias: 'laundry_suci_key',
      },
    },
    null,
    2
  );

  const assetLinksJson = JSON.stringify(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.kafilasuci4.app',
          sha256_cert_fingerprints: [
            '14:6D:E9:75:A0:68:5A:A1:0C:6F:E1:90:E5:A9:6F:4A:A7:F2:F2:10:4E:5F:8A:23:44:B2:7D:66:31:00:1E:59',
          ],
        },
      },
    ],
    null,
    2
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleDownloadBackup = () => {
    const backupData: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('laundry_suci_')) {
        try {
          backupData[key] = JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_laundry_suci_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#800000] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Unduh APK & Terbitkan ke Play Store</h2>
              <p className="text-xs text-white/80">Solusi Resmi Android: PWA Standalone & Google Play Store (TWA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors ${
              activeTab === 'install'
                ? 'border-[#800000] text-[#800000] bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            1. Pasang Langsung ke HP
          </button>
          <button
            onClick={() => setActiveTab('playstore')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors ${
              activeTab === 'playstore'
                ? 'border-[#800000] text-[#800000] bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            2. APK Google Play Store
          </button>
          <button
            onClick={() => setActiveTab('twa_config')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors ${
              activeTab === 'twa_config'
                ? 'border-[#800000] text-[#800000] bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            3. File Konfigurasi TWA
          </button>
          <button
            onClick={() => setActiveTab('offline_safe')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors ${
              activeTab === 'offline_safe'
                ? 'border-[#800000] text-[#800000] bg-white font-bold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            4. Keamanan Data
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700 leading-relaxed">
          {activeTab === 'install' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-900">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Instalasi PWA Standalone Resmi</h4>
                  <p className="text-xs text-emerald-800 mt-1">
                    Aplikasi ini dapat langsung dipasang ke perangkat Android/iOS tanpa membuka browser setiap saat.
                    Saat dibuka, berjalan full-screen tanpa address bar, ikon logo terpasang di Home Screen, dan bekerja
                    offline.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-[#800000] rounded-2xl flex items-center justify-center text-white shadow-md">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Kafelas Laundry</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Versi 1.25 • Ukuran ringan (~2.4 MB) • Cepat & Responsif • Kompatibel dengan Printer Bluetooth RPP02N & Thermal 58mm
                </p>

                {isInstalled ? (
                  <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm font-semibold">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Aplikasi Sudah Terpasang di Perangkat Ini
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={install}
                    className="inline-flex items-center gap-2 bg-[#800000] hover:bg-[#660000] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4 animate-bounce" />
                    Pasang Sekarang di HP (1-Klik)
                  </button>
                ) : isIOS ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs text-left max-w-sm mx-auto">
                    <p className="font-bold">Cara pasang di iPhone / iPad (Safari):</p>
                    <ol className="list-decimal pl-4 mt-1 space-y-1">
                      <li>Buka di browser <strong>Safari</strong></li>
                      <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas)</li>
                      <li>Pilih menu <strong>"Add to Home Screen" (Tambah ke Layar Utama)</strong></li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-md mx-auto">
                    {isInIframe ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-2 text-xs text-amber-900">
                        <p className="font-bold">Buka di Browser Penuh untuk Pasang Langsung:</p>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          Jendela pratinjau membatasi fitur dialog pasang otomatis. Buka di tab penuh Google Chrome untuk mengaktifkan tombol 1-klik:
                        </p>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => window.open(window.location.href, '_blank')}
                            className="flex-1 py-2 bg-[#800000] text-white font-bold rounded-lg text-xs hover:bg-[#660000] transition active:scale-95"
                          >
                            Buka di Tab Penuh Browser
                          </button>
                          <button
                            onClick={() => copyToClipboard(window.location.href, 'pwa_link')}
                            className="py-2 px-3 bg-white border border-amber-300 text-amber-900 font-bold rounded-lg text-xs hover:bg-amber-100 transition active:scale-95"
                          >
                            {copiedText === 'pwa_link' ? 'Tersalin!' : 'Salin URL'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-600 bg-slate-100 p-3 rounded-xl border border-slate-200 text-left space-y-1">
                        <p className="font-bold text-slate-800">Cara Pasang Cepat di Android (Chrome):</p>
                        <p>1. Ketuk menu <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser.</p>
                        <p>2. Pilih <strong>"Pasang aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
                        <p>3. Aplikasi langsung muncul di menu HP Anda!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'playstore' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-900">
                <PlayCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Standar Resmi Google: Trusted Web Activity (TWA)</h4>
                  <p className="text-xs text-blue-800 mt-1">
                    Google secara resmi merekomendasikan teknologi <strong>TWA (Trusted Web Activity)</strong> untuk
                    mengemas web app modern menjadi berkas <strong>.APK</strong> dan <strong>.AAB</strong> (Android App Bundle)
                    asli yang lolos kurasi Google Play Store dan didownload jutaan pengguna.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Langkah 1: Menggunakan PWABuilder (Cara Termudah - Tanpa Coding)</h4>
                <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-600">
                  <li>
                    Buka situs resmi:{' '}
                    <a
                      href="https://www.pwabuilder.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline font-medium"
                    >
                      www.pwabuilder.com
                    </a>
                  </li>
                  <li>Masukkan URL aplikasi ini: <code className="bg-slate-100 px-1 py-0.5 rounded text-[#800000]">{currentOrigin}</code></li>
                  <li>Klik <strong>"Start"</strong>, lalu di tab <strong>Android</strong> klik <strong>"Package For Store"</strong>.</li>
                  <li>
                    PWABuilder akan otomatis menghasilkan berkas <strong>signed .aab</strong> dan <strong>.apk</strong> lengkap
                    dengan nama paket <code>com.kafilasuci4.app</code> siap upload ke <strong>Google Play Console</strong>!
                  </li>
                </ol>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Langkah 2: Menggunakan Google CLI (Bubblewrap)</h4>
                <p className="text-xs text-slate-600">
                  Untuk developer yang ingin membangun APK langsung di komputer (Linux/Mac/Windows) via terminal:
                </p>
                <div className="bg-slate-900 text-slate-200 p-3 rounded-lg text-xs font-mono relative">
                  <pre>
{`npm install -g @bubblewrap/cli
bubblewrap init --manifest=${currentOrigin}/manifest.json
bubblewrap build`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`npm install -g @bubblewrap/cli\nbubblewrap init --manifest=${currentOrigin}/manifest.json\nbubblewrap build`, 'cli')}
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedText === 'cli' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'twa_config' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Berikut adalah berkas manifes Android Studio & Digital Asset Links resmi untuk aplikasi <strong>Laundry Suci</strong> (<code>com.kafilasuci4.app</code>):
              </p>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#800000]" />
                    twa-manifest.json
                  </span>
                  <button
                    onClick={() => copyToClipboard(twaManifestJson, 'twa')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {copiedText === 'twa' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Salin
                  </button>
                </div>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto">
                  <pre>{twaManifestJson}</pre>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#800000]" />
                    .well-known/assetlinks.json (Verifikasi Play Store)
                  </span>
                  <button
                    onClick={() => copyToClipboard(assetLinksJson, 'asset')}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {copiedText === 'asset' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    Salin
                  </button>
                </div>
                <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono max-h-36 overflow-y-auto">
                  <pre>{assetLinksJson}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offline_safe' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-900">
                <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm">Jaminan Penyimpanan Data Aman (Bukan Sekadar WebView Kosong)</h4>
                  <p className="text-xs text-amber-800 mt-1">
                    Sesuai permintaan Anda, aplikasi ini dirancang khusus dengan <strong>Local Database Caching</strong>.
                    Setiap transaksi, data kas, nama pelanggan, dan daftar harga otomatis tersimpan di penyimpanan aman HP Anda.
                    Jika internet mati saat kasir sedang mencetak nota, data tidak akan hilang!
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Cadangkan Data Usaha Anda</h4>
                <p className="text-xs text-slate-600">
                  Unduh seluruh database toko Anda (pelanggan, transaksi, laporan kas, setting struk) sebagai berkas JSON cadangan yang bisa dipindahkan ke HP atau komputer lain kapan saja:
                </p>
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition"
                >
                  <HardDriveDownload className="w-4 h-4 text-emerald-400" />
                  Unduh Berkas Cadangan Database (.json)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
