import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  RefreshCw,
  Server,
  ShieldCheck,
  X,
  Zap,
} from 'lucide-react';
import { auth } from '../firebase';
import { User } from '../types';
import { useToast } from './NotificationContext';
import {
  MidtransConnectionStatus,
  MidtransVerifyResult,
  OFFICIAL_PAYMENT_ACCOUNTS,
  SUPER_ADMIN_EMAILS,
  checkMidtransConnectionStatus,
  getSavedBackendUrl,
  isRunningOnBackendHost,
  isSuperAdminEmailVerified,
  isSuperAdminUser,
  loadPaymentGatewayConfig,
  savePaymentGatewayBackendUrl,
  startMidtransPayment,
} from '../services/midtransService';

interface MidtransAdminSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onMidtransSettled?: (result: MidtransVerifyResult) => void;
}

const ENV_VARS_REFERENCE = [
  {
    name: 'MIDTRANS_CLIENT_KEY',
    desc: 'Client Key dari menu Settings > Access Keys pada dashboard Midtrans',
  },
  {
    name: 'MIDTRANS_SERVER_KEY',
    desc: 'Server Key rahasia dari menu Settings > Access Keys pada dashboard Midtrans',
  },
  {
    name: 'MIDTRANS_IS_PRODUCTION',
    desc: 'Isi true untuk kunci Production (Mid-...), atau false saat uji Sandbox (SB-Mid-...)',
  },
  {
    name: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    desc: 'Kredensial JSON Service Account Firebase untuk otorisasi server memproses potong saldo, tambah cabang & webhook otomatis',
  },
];

export const MidtransAdminSetupModal: React.FC<MidtransAdminSetupModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onMidtransSettled,
}) => {
  const toast = useToast();
  const [backendUrlInput, setBackendUrlInput] = useState<string>('');
  const [status, setStatus] = useState<MidtransConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTestingPopup, setIsTestingPopup] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const activeAdminEmail = (
    auth.currentUser?.email ||
    currentUser.authEmail ||
    currentUser.emailOrPhone ||
    ''
  )
    .trim()
    .toLowerCase();
  const isSuperAdmin = isSuperAdminUser(currentUser.authEmail || currentUser.emailOrPhone);
  const emailVerified = isSuperAdminEmailVerified();
  const onCloudRunHost =
    isRunningOnBackendHost() &&
    typeof window !== 'undefined' &&
    window.location.hostname.endsWith('.run.app');
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const runDiagnostics = async (overrideUrl?: string) => {
    setIsChecking(true);
    try {
      const result = await checkMidtransConnectionStatus(overrideUrl);
      setStatus(result);
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memeriksa koneksi server.');
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !isSuperAdmin) return;
    let active = true;
    (async () => {
      setIsChecking(true);
      const cfg = await loadPaymentGatewayConfig(true);
      if (!active) return;
      const initialUrl = cfg.backendUrl || getSavedBackendUrl();
      setBackendUrlInput(initialUrl);
      const diag = await checkMidtransConnectionStatus(initialUrl || undefined);
      if (active) {
        setStatus(diag);
        setIsChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isOpen, isSuperAdmin]);

  if (!isOpen || !isSuperAdmin) return null;

  const handleCopy = (value: string, keyId: string, label: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(keyId);
    toast.success(`${label} berhasil disalin.`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveBackendUrl = async (targetValue?: string) => {
    if (!emailVerified) {
      toast.warning(
        'Silakan keluar lalu masuk kembali memakai tombol "Masuk dengan Akun Google" agar verifikasi email Super Admin aktif.'
      );
      return;
    }

    const raw = targetValue !== undefined ? targetValue : backendUrlInput;
    setIsSaving(true);
    try {
      const saved = await savePaymentGatewayBackendUrl(raw);
      setBackendUrlInput(saved);
      await runDiagnostics(saved || undefined);
      toast.success(
        saved
          ? 'Alamat server Cloud Run berhasil disimpan & disinkronkan ke kflslaundry.web.app.'
          : 'Tautan server Cloud Run dikosongkan.'
      );
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan alamat server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPopup = async () => {
    setIsTestingPopup(true);
    try {
      const res = await startMidtransPayment({
        purpose: 'extend_premium',
        amount: 27000,
        customerName: currentUser.displayName,
        customerPhone: currentUser.nomorTelepon,
      });
      if (res.status === 'settled') {
        onMidtransSettled?.(res);
        toast.success('Pembayaran uji berhasil terverifikasi.');
      } else {
        toast.info(res.message || 'Popup Midtrans berhasil dibuka.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menjalankan tes popup Midtrans.');
    } finally {
      setIsTestingPopup(false);
    }
  };

  const effectiveWebhookUrl =
    status?.webhookUrl ||
    (backendUrlInput.trim()
      ? `${backendUrlInput.trim().replace(/\/+$/, '')}/api/midtrans/webhook`
      : onCloudRunHost
      ? `${currentOrigin}/api/midtrans/webhook`
      : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900 truncate">
              Koneksi & Panduan Midtrans
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              <span>Admin aktif: </span>
              <span className="font-mono text-slate-700">{activeAdminEmail || SUPER_ADMIN_EMAILS[0]}</span>
              <span aria-hidden="true"> · </span>
              <span>Sinkronisasi kflslaundry.web.app</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer shrink-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!emailVerified && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold">Verifikasi Email Google Diperlukan untuk Menyimpan Konfigurasi</p>
                <p className="text-amber-800">
                  Anda sedang masuk tanpa verifikasi Google OAuth. Agar perubahan tautan server dapat disimpan ke database secara aman, silakan keluar lalu masuk kembali menggunakan tombol <strong>Masuk dengan Akun Google</strong> (<span className="font-mono">{activeAdminEmail}</span>).
                </p>
              </div>
            </div>
          )}

          <section className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-slate-900">Status Koneksi Saat Ini</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Domain dibuka:</span>
                <span className="font-mono text-slate-700">
                  {typeof window !== 'undefined' ? window.location.hostname : '-'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200/80 border-t border-b border-slate-200/80 text-xs">
              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 font-medium">Server Backend Cloud Run</span>
                <span
                  className={`font-semibold ${
                    isChecking
                      ? 'text-slate-500'
                      : status?.reachable
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {isChecking
                    ? 'Memeriksa...'
                    : status?.reachable
                    ? 'Terhubung'
                    : 'Belum Terhubung'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 font-medium">Kunci Midtrans di Server</span>
                <span
                  className={`font-semibold ${
                    !status?.configured
                      ? 'text-amber-700'
                      : status.keyModeMismatch
                      ? 'text-amber-700'
                      : status.isProduction
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {!status?.configured
                    ? 'Belum Diisi di Server'
                    : status.keyModeMismatch
                    ? 'Perlu Koreksi · Mode Kunci Tidak Cocok'
                    : status.isProduction
                    ? 'Aktif · Mode Production'
                    : 'Aktif · Mode Sandbox'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between gap-3">
                <span className="text-slate-600 font-medium">Otorisasi Server & Webhook</span>
                <span
                  className={`font-semibold ${
                    status?.serviceAccountConfigured || status?.webhookReady
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {status?.serviceAccountConfigured || status?.webhookReady
                    ? 'Aktif · Server Terproteksi'
                    : 'Perlu Service Account di Server'}
                </span>
              </div>
            </div>

            {status?.message && (
              <p
                className={`text-xs leading-relaxed ${
                  status.keyModeMismatch ? 'text-amber-800 font-medium' : 'text-slate-600'
                }`}
              >
                {status.message}
              </p>
            )}

            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                disabled={isChecking}
                onClick={() => runDiagnostics(backendUrlInput.trim() || undefined)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Cek Koneksi Server</span>
              </button>

              {status?.reachable && status?.configured && !status?.keyModeMismatch && (
                <button
                  type="button"
                  disabled={isTestingPopup}
                  onClick={handleTestPopup}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isTestingPopup ? 'Membuka Popup...' : 'Tes Popup Pembayaran'}</span>
                </button>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#800000]" />
                <span>Tautan Server Cloud Run untuk kflslaundry.web.app</span>
              </label>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Karena <span className="font-mono text-slate-800">kflslaundry.web.app</span> berjalan di Firebase Hosting statis, tempel alamat publik layanan Cloud Run Anda di bawah ini satu kali saja agar semua tombol Midtrans di <span className="font-mono text-slate-800">kflslaundry.web.app</span> otomatis terhubung ke server.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={backendUrlInput}
                onChange={(e) => setBackendUrlInput(e.target.value)}
                placeholder="https://nama-layanan-anda.asia-southeast1.run.app"
                className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveBackendUrl()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#800000] hover:bg-[#660000] text-white text-xs font-bold transition cursor-pointer shrink-0 disabled:opacity-50"
              >
                {isSaving ? 'Menyimpan...' : 'Simpan & Hubungkan'}
              </button>
            </div>

            {onCloudRunHost && backendUrlInput !== currentOrigin && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSaveBackendUrl(currentOrigin)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Gunakan alamat server Cloud Run yang sedang dibuka ini ({currentOrigin})</span>
              </button>
            )}

            {effectiveWebhookUrl && (
              <div className="pt-2 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  URL Payment Notification (Webhook Midtrans):
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-h-[42px] px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-800 truncate">
                    {effectiveWebhookUrl}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(effectiveWebhookUrl, 'webhook', 'URL Webhook')}
                    className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedKey === 'webhook' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Salin</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-200" />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Panduan Sambung Cepat Akun Midtrans Terdaftar
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                iqbalsaefinnuha@gmail.com
              </span>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-extrabold text-slate-900">
                    01. Masuk Dashboard Midtrans & Pilih Mode Aktif
                  </h4>
                  <a
                    href="https://dashboard.midtrans.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#800000] hover:underline inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
                  >
                    <span>Login Midtrans</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masuk ke <span className="font-mono text-slate-800">dashboard.midtrans.com</span> menggunakan akun <span className="font-mono text-slate-800">iqbalsaefinnuha@gmail.com</span> (selaras dengan rekening pencairan <span className="font-mono tabular-nums text-slate-800">BRI {OFFICIAL_PAYMENT_ACCOUNTS.BRI.displayNumber}</span> · {OFFICIAL_PAYMENT_ACCOUNTS.BRI.holderName}). Pada pemilih mode di pojok kiri atas dashboard, pilih <strong>Production</strong> jika akun sudah disetujui menerima uang asli, atau pilih <strong>Sandbox</strong> untuk uji coba simulasi terlebih dahulu.
                </p>
              </div>

              <div className="p-4 space-y-2.5">
                <h4 className="text-xs font-extrabold text-slate-900">
                  02. Salin Access Keys ke Environment Variables Server
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Buka menu <strong>Settings &gt; Access Keys</strong> di Dashboard Midtrans, lalu pasang <em>Client Key</em> dan <em>Server Key</em> ke menu <strong>Environment Variables / Secrets</strong> pada layanan Cloud Run / AI Studio Anda (jangan ubah kode aplikasi agar kunci rahasia tetap terlindungi):
                </p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg bg-slate-50/70">
                  {ENV_VARS_REFERENCE.map((item) => (
                    <div
                      key={item.name}
                      className="px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-slate-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">{item.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.name, item.name, item.name)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        {copiedKey === item.name ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Salin</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900">
                  03. Deploy Cloud Run, Hubungkan URL & Pasang Webhook
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Setelah mengisi Environment Variables, deploy ulang layanan Cloud Run Anda. Tempel alamat publik <span className="font-mono text-slate-800">https://...run.app</span> pada kolom tautan di atas lalu klik <strong>Simpan & Hubungkan</strong>. Salin juga <strong>URL Webhook</strong> di atas ke menu <strong>Settings &gt; Configuration &gt; Payment Notification URL</strong> di Dashboard Midtrans.
                </p>
              </div>

              <div className="p-4 space-y-2">
                <h4 className="text-xs font-extrabold text-slate-900">
                  04. Cek Status Koneksi & Uji Pembayaran
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Klik tombol <strong>Cek Koneksi Server</strong> di bagian atas panel ini. Sistem otomatis memeriksa apakah jenis kunci (<span className="font-mono text-slate-800">SB-Mid-...</span> vs <span className="font-mono text-slate-800">Mid-...</span>) sudah selaras dengan <span className="font-mono text-slate-800">MIDTRANS_IS_PRODUCTION</span>, lalu Anda dapat langsung mencoba tombol <strong>Tes Popup Pembayaran</strong>. Akses Admin Pusat ini aktif baik saat Anda masuk memakai <span className="font-mono text-slate-800">iqbalsaefinnuha@gmail.com</span> maupun <span className="font-mono text-slate-800">qikacreative@gmail.com</span>.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
