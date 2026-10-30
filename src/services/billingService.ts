import { Laundry } from '../types';
import {
  getActiveIdToken,
  isRunningOnBackendHost,
  resolveActiveBackendBaseUrl,
} from './midtransService';

export type ManualTransferChannel = 'BRI' | 'DANA' | 'MANUAL';
export type AdminGrantAction = 'extend_premium' | 'topup_wallet';

export interface BillingApiError extends Error {
  code?: string;
  walletBalance?: number;
  requiredCost?: number;
}

export interface ExtendSubscriptionResult {
  success: boolean;
  auditId: string;
  cost: number;
  durationDays: number;
  walletBalance: number;
  subscriptionType: string;
  subscriptionEndDate: number;
}

export interface ActivateBranchResult {
  success: boolean;
  auditId: string;
  isExtraBranch: boolean;
  cost: number;
  walletBalance: number;
  branch: Laundry;
  laundriesMap: Record<string, string>;
}

export interface BillingAuditLogItem {
  id: string;
  uid: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  channel: string;
  amount: number;
  walletDelta: number;
  walletBefore: number;
  walletAfter: number;
  durationDays?: number;
  subscriptionTypeAfter?: string;
  subscriptionEndDateAfter?: number | null;
  note?: string;
  createdAt: number;
}

export interface AdminLookedUpUser {
  uid: string;
  displayName: string;
  emailOrPhone: string;
  authEmail: string | null;
  nomorTelepon: string | null;
  role: string;
  walletBalance: number;
  subscriptionType: string;
  subscriptionEndDate: number | null;
  branches: Array<{
    id: string;
    namaLaundry: string;
    alamat: string;
  }>;
}

export interface AdminLookupResult {
  user: AdminLookedUpUser;
  suggestedAmount: number | null;
  recentLogs: BillingAuditLogItem[];
}

export interface AdminGrantResult {
  success: boolean;
  auditEntry: BillingAuditLogItem;
  user: {
    uid: string;
    displayName: string;
    walletBalance: number;
    subscriptionType: string;
    subscriptionEndDate: number | null;
  };
}

function createBackendError(
  message: string,
  extra?: { code?: string; walletBalance?: number; requiredCost?: number }
): BillingApiError {
  const err = new Error(message) as BillingApiError;
  if (extra?.code) err.code = extra.code;
  if (typeof extra?.walletBalance === 'number') err.walletBalance = extra.walletBalance;
  if (typeof extra?.requiredCost === 'number') err.requiredCost = extra.requiredCost;
  return err;
}

async function postProtectedBillingJson<T>(
  endpointPath: string,
  payload: Record<string, unknown>
): Promise<T> {
  const idToken = await getActiveIdToken();
  const baseUrl = await resolveActiveBackendBaseUrl();

  if (!baseUrl && !isRunningOnBackendHost()) {
    throw createBackendError(
      'Alamat server backend belum ditautkan untuk domain ini. Silakan hubungkan URL Cloud Run di Panel Admin Pusat atau gunakan Transfer Biasa.',
      { code: 'BACKEND_NOT_CONFIGURED' }
    );
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${endpointPath}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw createBackendError(
      'Gagal menghubungi server otorisasi billing. Periksa koneksi internet Anda lalu coba lagi.',
      { code: 'NETWORK_ERROR' }
    );
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw createBackendError(
      'Layanan backend billing belum aktif pada alamat ini. Pastikan URL server Cloud Run sudah terhubung.',
      { code: 'STATIC_HOST_FALLBACK' }
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw createBackendError(
      typeof data.error === 'string' && data.error
        ? data.error
        : 'Permintaan ditolak oleh validasi keamanan server.',
      {
        code: typeof data.code === 'string' ? data.code : undefined,
        walletBalance: typeof data.walletBalance === 'number' ? data.walletBalance : undefined,
        requiredCost: typeof data.requiredCost === 'number' ? data.requiredCost : undefined,
      }
    );
  }

  return data as T;
}

export async function extendSubscriptionViaBackend(
  durationDays: number
): Promise<ExtendSubscriptionResult> {
  return postProtectedBillingJson<ExtendSubscriptionResult>(
    '/api/billing/extend-subscription',
    { durationDays: Math.round(durationDays) }
  );
}

export async function activateBranchViaBackend(params: {
  namaLaundry: string;
  alamat?: string;
  nomorTelepon?: string;
}): Promise<ActivateBranchResult> {
  return postProtectedBillingJson<ActivateBranchResult>('/api/billing/activate-branch', {
    namaLaundry: params.namaLaundry.trim(),
    alamat: params.alamat?.trim() || '',
    nomorTelepon: params.nomorTelepon?.trim() || '',
  });
}

export async function adminLookupOwnerAccount(query: string): Promise<AdminLookupResult> {
  return postProtectedBillingJson<AdminLookupResult>('/api/admin/billing/lookup-user', {
    query: query.trim(),
  });
}

export async function adminGrantOwnerBilling(params: {
  targetUid: string;
  action: AdminGrantAction;
  channel: ManualTransferChannel;
  durationDays?: number;
  amount: number;
  note?: string;
}): Promise<AdminGrantResult> {
  return postProtectedBillingJson<AdminGrantResult>('/api/admin/billing/grant', {
    targetUid: params.targetUid.trim(),
    action: params.action,
    channel: params.channel,
    durationDays: params.durationDays ? Math.round(params.durationDays) : 0,
    amount: Math.round(params.amount),
    note: params.note?.trim() || '',
  });
}
