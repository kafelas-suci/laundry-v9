import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type PaymentPurpose = 'extend_premium' | 'topup_wallet';

export interface MidtransVerifyResult {
  status: 'settled' | 'pending' | 'failed';
  alreadyCredited?: boolean;
  orderId: string;
  purpose?: PaymentPurpose;
  amount?: number;
  durationDays?: number;
  walletBalance?: number;
  subscriptionType?: string;
  subscriptionEndDate?: number | null;
  message?: string;
}

export interface MidtransConnectionStatus {
  reachable: boolean;
  isStaticFallback: boolean;
  configured: boolean;
  isProduction: boolean;
  mode: 'sandbox' | 'production';
  webhookReady: boolean;
  serviceAccountConfigured?: boolean;
  keyModeMismatch: boolean;
  effectiveBaseUrl: string;
  webhookUrl: string;
  message: string;
}

export const SUPER_ADMIN_EMAILS = [
  'qikacreative@gmail.com',
  'iqbalsaefinnuha@gmail.com',
] as const;
export const SUPER_ADMIN_EMAIL = SUPER_ADMIN_EMAILS[0];
const BACKEND_URL_CACHE_KEY = 'kafelas_midtrans_backend_url';

export const OFFICIAL_PAYMENT_ACCOUNTS = {
  BRI: {
    bank: 'BRI',
    displayNumber: '4108 0100 8396 530',
    copyNumber: '410801008396530',
    holderName: 'Iqbal S nuha',
  },
  DANA: {
    bank: 'DANA',
    displayNumber: '0831 3230 4649',
    copyNumber: '083132304649',
    holderName: 'Iqbal S. Nuha',
  },
  WA_ADMIN: '6285659781477',
} as const;

export function isSuperAdminUser(emailCandidate?: string | null): boolean {
  const candidates = [emailCandidate, auth.currentUser?.email]
    .map((val) => (val || '').trim().toLowerCase())
    .filter(Boolean);
  return candidates.some((email) =>
    (SUPER_ADMIN_EMAILS as readonly string[]).includes(email)
  );
}

export function isSuperAdminEmailVerified(): boolean {
  if (!auth.currentUser) return false;
  return Boolean(auth.currentUser.emailVerified);
}

export function buildWhatsAppAdminUrl(message: string): string {
  return `https://api.whatsapp.com/send?phone=${OFFICIAL_PAYMENT_ACCOUNTS.WA_ADMIN}&text=${encodeURIComponent(message)}`;
}

export function normalizeBackendUrl(raw: string, strict = false): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';

  const withoutSuffix = trimmed
    .replace(/\/+$/, '')
    .replace(/\/api\/(midtrans|billing|admin)(\/.*)?$/i, '')
    .replace(/\/api$/i, '');

  try {
    const parsed = new URL(withoutSuffix);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (parsed.protocol !== 'https:' && !(isLocal && parsed.protocol === 'http:')) {
      if (strict) {
        throw new Error('Alamat server harus diawali https://');
      }
      return '';
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch (err) {
    if (strict) {
      throw err instanceof Error && err.message.includes('https://')
        ? err
        : new Error('Format alamat server tidak valid. Contoh: https://nama-layanan.asia-southeast1.run.app');
    }
    return '';
  }
}

function readCachedBackendUrl(): string {
  try {
    if (typeof window === 'undefined') return '';
    return normalizeBackendUrl(window.localStorage.getItem(BACKEND_URL_CACHE_KEY) || '');
  } catch {
    return '';
  }
}

function writeCachedBackendUrl(url: string): void {
  try {
    if (typeof window === 'undefined') return;
    if (url) {
      window.localStorage.setItem(BACKEND_URL_CACHE_KEY, url);
    } else {
      window.localStorage.removeItem(BACKEND_URL_CACHE_KEY);
    }
  } catch {
    return;
  }
}

let cachedBackendUrl: string = readCachedBackendUrl();
let hasLoadedRemoteConfig = false;

export function isRunningOnBackendHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.run.app');
}

export function getSavedBackendUrl(): string {
  return cachedBackendUrl || normalizeBackendUrl(import.meta.env.VITE_BACKEND_URL || '');
}

export async function loadPaymentGatewayConfig(
  forceRefresh = false
): Promise<{ backendUrl: string; updatedAt?: number }> {
  if (hasLoadedRemoteConfig && !forceRefresh) {
    return { backendUrl: cachedBackendUrl };
  }
  if (!auth.currentUser) {
    return { backendUrl: cachedBackendUrl };
  }

  try {
    const snap = await getDoc(doc(db, 'app_config', 'payment_gateway'));
    hasLoadedRemoteConfig = true;
    if (snap.exists()) {
      const data = snap.data() as { backendUrl?: string; updatedAt?: number };
      const normalized = normalizeBackendUrl(data.backendUrl || '');
      cachedBackendUrl = normalized;
      writeCachedBackendUrl(normalized);
      return { backendUrl: normalized, updatedAt: data.updatedAt };
    }
    return { backendUrl: cachedBackendUrl };
  } catch {
    return { backendUrl: cachedBackendUrl };
  }
}

export async function savePaymentGatewayBackendUrl(rawUrl: string): Promise<string> {
  const normalized = normalizeBackendUrl(rawUrl, true);
  await setDoc(doc(db, 'app_config', 'payment_gateway'), {
    backendUrl: normalized,
    updatedAt: Date.now(),
  });
  cachedBackendUrl = normalized;
  hasLoadedRemoteConfig = true;
  writeCachedBackendUrl(normalized);
  return normalized;
}

export async function resolveActiveBackendBaseUrl(): Promise<string> {
  if (!hasLoadedRemoteConfig && auth.currentUser) {
    await loadPaymentGatewayConfig();
  }
  const configuredUrl = getSavedBackendUrl();
  if (isRunningOnBackendHost()) {
    return '';
  }
  return configuredUrl;
}

function createNotConfiguredError(customMessage?: string): Error & { code: string } {
  const err = new Error(
    customMessage ||
      'Pembayaran otomatis Midtrans belum diaktifkan. Silakan lanjutkan menggunakan Transfer Biasa (BRI / DANA).'
  ) as Error & { code: string };
  err.code = 'MIDTRANS_NOT_CONFIGURED';
  return err;
}

export async function checkMidtransConnectionStatus(
  overrideUrl?: string
): Promise<MidtransConnectionStatus> {
  let targetBase = '';
  if (overrideUrl !== undefined) {
    targetBase = normalizeBackendUrl(overrideUrl, Boolean(overrideUrl.trim()));
  } else {
    targetBase = await resolveActiveBackendBaseUrl();
  }

  const originForDisplay =
    targetBase || (typeof window !== 'undefined' ? window.location.origin : '');
  const webhookUrl = originForDisplay ? `${originForDisplay}/api/midtrans/webhook` : '/api/midtrans/webhook';

  if (!targetBase && !isRunningOnBackendHost()) {
    return {
      reachable: false,
      isStaticFallback: true,
      configured: false,
      isProduction: false,
      mode: 'sandbox',
      webhookReady: false,
      keyModeMismatch: false,
      effectiveBaseUrl: '',
      webhookUrl: '',
      message:
        'Alamat server Cloud Run belum ditautkan untuk domain kflslaundry.web.app. Tempel alamat Cloud Run di bawah lalu klik Simpan & Hubungkan.',
    };
  }

  try {
    const res = await fetch(`${targetBase}/api/midtrans/config`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return {
        reachable: false,
        isStaticFallback: true,
        configured: false,
        isProduction: false,
        mode: 'sandbox',
        webhookReady: false,
        keyModeMismatch: false,
        effectiveBaseUrl: originForDisplay,
        webhookUrl,
        message:
          'Alamat ini hanya menyajikan halaman statis dan belum terhubung ke server backend Midtrans.',
      };
    }

    const data = (await res.json()) as {
      configured?: boolean;
      isProduction?: boolean;
      mode?: 'sandbox' | 'production';
      webhookReady?: boolean;
      serviceAccountConfigured?: boolean;
      keyModeMismatch?: boolean;
    };

    const configured = Boolean(data.configured);
    const isProduction = Boolean(data.isProduction);
    const mode = isProduction ? 'production' : 'sandbox';
    const webhookReady = Boolean(data.webhookReady);
    const serviceAccountConfigured = Boolean(data.serviceAccountConfigured ?? data.webhookReady);
    const keyModeMismatch = Boolean(data.keyModeMismatch);

    return {
      reachable: true,
      isStaticFallback: false,
      configured,
      isProduction,
      mode,
      webhookReady,
      serviceAccountConfigured,
      keyModeMismatch,
      effectiveBaseUrl: originForDisplay,
      webhookUrl,
      message: !configured
        ? 'Server backend sudah terhubung, namun MIDTRANS_CLIENT_KEY & MIDTRANS_SERVER_KEY belum diisi di Environment Server.'
        : keyModeMismatch
        ? isProduction
          ? 'Perhatian: MIDTRANS_IS_PRODUCTION bernilai true, tetapi kunci yang terpasang masih kunci Sandbox (diawali SB-). Ganti dengan Access Keys Production atau ubah MIDTRANS_IS_PRODUCTION ke false.'
          : 'Perhatian: Kunci Midtrans Production terdeteksi, tetapi MIDTRANS_IS_PRODUCTION masih bernilai false. Ubah MIDTRANS_IS_PRODUCTION menjadi true agar mode Production aktif.'
        : isProduction
        ? 'Server terhubung dan kunci Midtrans Production siap menerima pembayaran asli.'
        : 'Server terhubung dalam Mode Sandbox (siap uji simulasi bayar).',
    };
  } catch {
    return {
      reachable: false,
      isStaticFallback: false,
      configured: false,
      isProduction: false,
      mode: 'sandbox',
      webhookReady: false,
      serviceAccountConfigured: false,
      keyModeMismatch: false,
      effectiveBaseUrl: originForDisplay,
      webhookUrl,
      message: 'Gagal menghubungi alamat server. Pastikan URL Cloud Run benar dan sudah dideploy.',
    };
  }
}

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

let loadedSnapScriptUrl: string | null = null;

function ensureSnapScriptLoaded(clientKey: string, isProduction: boolean): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser environment required'));
  }

  const targetUrl = isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

  if (window.snap && loadedSnapScriptUrl === targetUrl) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap="true"]');
    if (existing) {
      if (existing.src === targetUrl && window.snap) {
        loadedSnapScriptUrl = targetUrl;
        resolve();
        return;
      }
      existing.remove();
    }

    const script = document.createElement('script');
    script.src = targetUrl;
    script.async = true;
    script.setAttribute('data-client-key', clientKey);
    script.setAttribute('data-midtrans-snap', 'true');
    script.onload = () => {
      loadedSnapScriptUrl = targetUrl;
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Gagal memuat modul pembayaran Midtrans Snap. Periksa koneksi internet Anda.'));
    };
    document.head.appendChild(script);
  });
}

export async function getActiveIdToken(): Promise<string> {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    throw new Error('Silakan login menggunakan akun Owner terlebih dahulu.');
  }
  return fbUser.getIdToken();
}

export async function verifyMidtransOrder(orderId: string): Promise<MidtransVerifyResult> {
  const idToken = await getActiveIdToken();
  const baseUrl = await resolveActiveBackendBaseUrl();
  if (!baseUrl && !isRunningOnBackendHost()) {
    throw createNotConfiguredError();
  }

  const res = await fetch(`${baseUrl}/api/midtrans/verify-order`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw createNotConfiguredError();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Gagal memverifikasi status pembayaran.');
  }
  return data as MidtransVerifyResult;
}

export async function startMidtransPayment(params: {
  purpose: PaymentPurpose;
  amount: number;
  customerName?: string;
  customerPhone?: string | null;
}): Promise<MidtransVerifyResult> {
  const idToken = await getActiveIdToken();
  const baseUrl = await resolveActiveBackendBaseUrl();
  if (!baseUrl && !isRunningOnBackendHost()) {
    throw createNotConfiguredError();
  }

  let createRes: Response;
  try {
    createRes = await fetch(`${baseUrl}/api/midtrans/create-transaction`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        purpose: params.purpose,
        amount: Math.round(params.amount),
        customerName: params.customerName || '',
        customerPhone: params.customerPhone || '',
      }),
    });
  } catch {
    throw createNotConfiguredError(
      'Server pembayaran otomatis belum terjangkau. Silakan gunakan Transfer Biasa (BRI / DANA).'
    );
  }

  const contentType = (createRes.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw createNotConfiguredError();
  }

  const createData = await createRes.json().catch(() => ({}));
  if (!createRes.ok) {
    const err = new Error(
      createData.error || 'Gagal membuat transaksi Midtrans. Silakan coba lagi atau pilih Transfer Biasa.'
    ) as Error & { code?: string };
    err.code = createData.code;
    throw err;
  }

  const { orderId, snapToken, clientKey, isProduction } = createData as {
    orderId: string;
    snapToken: string;
    clientKey: string;
    isProduction: boolean;
  };

  await ensureSnapScriptLoaded(clientKey, isProduction);

  if (!window.snap) {
    throw new Error('Layanan popup Midtrans tidak tersedia di perangkat ini.');
  }

  return new Promise<MidtransVerifyResult>((resolve) => {
    let settledCheckTriggered = false;
    const runVerify = async (fallbackMessage?: string) => {
      if (settledCheckTriggered) return;
      settledCheckTriggered = true;
      try {
        const verified = await verifyMidtransOrder(orderId);
        resolve(verified);
      } catch (e: any) {
        resolve({
          status: 'pending',
          orderId,
          purpose: params.purpose,
          amount: params.amount,
          message: fallbackMessage || e?.message || 'Menunggu konfirmasi pembayaran.',
        });
      }
    };

    window.snap!.pay(snapToken, {
      onSuccess: () => {
        runVerify();
      },
      onPending: () => {
        runVerify('Tagihan telah dibuat. Selesaikan pembayaran lalu klik Cek Status Pembayaran.');
      },
      onError: () => {
        runVerify('Pembayaran belum berhasil diselesaikan.');
      },
      onClose: () => {
        runVerify('Jendela pembayaran ditutup. Jika Anda sudah membayar, klik Cek Status Pembayaran.');
      },
    });
  });
}
