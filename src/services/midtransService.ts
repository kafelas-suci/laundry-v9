import { auth } from '../firebase';

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

export function buildWhatsAppAdminUrl(message: string): string {
  return `https://api.whatsapp.com/send?phone=${OFFICIAL_PAYMENT_ACCOUNTS.WA_ADMIN}&text=${encodeURIComponent(message)}`;
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

async function getActiveIdToken(): Promise<string> {
  const fbUser = auth.currentUser;
  if (!fbUser) {
    throw new Error('Silakan login menggunakan akun Owner terlebih dahulu.');
  }
  return fbUser.getIdToken();
}

export async function verifyMidtransOrder(orderId: string): Promise<MidtransVerifyResult> {
  const idToken = await getActiveIdToken();
  const res = await fetch('/api/midtrans/verify-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderId }),
  });

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
  const createRes = await fetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: {
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
