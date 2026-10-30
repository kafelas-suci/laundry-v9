import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const rootDir = import.meta.dirname || process.cwd();

const SUPER_ADMIN_EMAILS = new Set([
  'qikacreative@gmail.com',
  'iqbalsaefinnuha@gmail.com',
]);

const HARGA_PREMIUM_BULANAN = 27000;
const EXTRA_BRANCH_PRICE = 25000;
const ALLOWED_SELF_EXTEND_DAYS = new Set([30, 60, 90, 180, 360]);
const ALLOWED_ADMIN_EXTEND_DAYS = new Set([30, 60, 90, 180, 360, 365]);

interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
}

interface ServiceAccountCredentials {
  project_id?: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface FirestoreDocSnapshot {
  id: string;
  name: string;
  data: Record<string, any>;
  updateTime?: string;
}

let cachedServiceToken: { token: string; expiresAt: number } | null = null;
let cachedMetadataProject: string | null = null;
let cachedMetadataToken: { token: string; expiresAt: number } | null = null;

function loadFirebaseAppletConfig(): Record<string, string> {
  try {
    const raw = fs.readFileSync(path.join(rootDir, 'firebase-applet-config.json'), 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function getFirebasePublicConfig(): FirebasePublicConfig {
  const appletCfg = loadFirebaseAppletConfig();
  return {
    apiKey:
      process.env.VITE_FIREBASE_API_KEY ||
      process.env.FIREBASE_API_KEY ||
      appletCfg.apiKey ||
      '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || appletCfg.authDomain || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || appletCfg.projectId || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || appletCfg.storageBucket || '',
    messagingSenderId:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletCfg.messagingSenderId || '',
    appId: process.env.VITE_FIREBASE_APP_ID || appletCfg.appId || '',
  };
}

function getMidtransConfig() {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  const clientKey = (process.env.MIDTRANS_CLIENT_KEY || '').trim();
  const isProduction = String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';
  const configured = Boolean(serverKey && clientKey);
  const hasSandboxPrefix = serverKey.startsWith('SB-') || clientKey.startsWith('SB-');
  const hasProdPrefix =
    (serverKey.startsWith('Mid-server-') && !serverKey.startsWith('SB-')) ||
    (clientKey.startsWith('Mid-client-') && !clientKey.startsWith('SB-'));
  const keyModeMismatch =
    configured && ((isProduction && hasSandboxPrefix) || (!isProduction && hasProdPrefix));

  return {
    serverKey,
    clientKey,
    isProduction,
    configured,
    keyModeMismatch,
    snapBaseUrl: isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1',
    coreBaseUrl: isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2',
  };
}

async function verifyFirebaseIdToken(
  idToken: string,
  apiKey: string
): Promise<VerifiedFirebaseUser | null> {
  if (!idToken || !apiKey) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{
        localId?: string;
        email?: string;
        displayName?: string;
        emailVerified?: boolean;
      }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email || '',
      displayName: user.displayName || '',
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
}

function isVerifiedSuperAdmin(user: VerifiedFirebaseUser | null): boolean {
  if (!user || !user.emailVerified) return false;
  return SUPER_ADMIN_EMAILS.has(user.email.trim().toLowerCase());
}

function parseServiceAccountEnv(): ServiceAccountCredentials | null {
  let rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!rawJson) return null;
  if (
    (rawJson.startsWith("'") && rawJson.endsWith("'")) ||
    (rawJson.startsWith('"') && rawJson.endsWith('"'))
  ) {
    rawJson = rawJson.slice(1, -1).trim();
  }
  try {
    const creds = JSON.parse(rawJson) as ServiceAccountCredentials;
    if (!creds.client_email || !creds.private_key) return null;
    return creds;
  } catch {
    return null;
  }
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  const creds = parseServiceAccountEnv();
  if (!creds) return null;
  if (cachedServiceToken && cachedServiceToken.expiresAt > Date.now() + 60_000) {
    return cachedServiceToken.token;
  }
  try {
    const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
    const nowSec = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        sub: creds.client_email,
        aud: tokenUri,
        iat: nowSec,
        exp: nowSec + 3600,
        scope: 'https://www.googleapis.com/auth/datastore',
      })
    ).toString('base64url');
    const unsigned = `${header}.${payload}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsigned);
    const signature = signer.sign(creds.private_key.replace(/\\n/g, '\n'), 'base64url');
    const assertion = `${unsigned}.${signature}`;

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) return null;
    const tokenData = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!tokenData.access_token) return null;
    cachedServiceToken = {
      token: tokenData.access_token,
      expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
    };
    return tokenData.access_token;
  } catch {
    return null;
  }
}

async function getSameProjectCloudRunAccessToken(expectedProjectId: string): Promise<string | null> {
  if (!process.env.K_SERVICE || !expectedProjectId) return null;
  if (cachedMetadataToken && cachedMetadataToken.expiresAt > Date.now() + 60_000) {
    return cachedMetadataToken.token;
  }
  try {
    if (cachedMetadataProject === null) {
      const projRes = await fetch(
        'http://metadata.google.internal/computeMetadata/v1/project/project-id',
        {
          headers: { 'Metadata-Flavor': 'Google' },
          signal: AbortSignal.timeout(1200),
        }
      );
      cachedMetadataProject = projRes.ok ? (await projRes.text()).trim() : '';
    }
    if (cachedMetadataProject !== expectedProjectId) {
      return null;
    }

    const tokenRes = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?scopes=https://www.googleapis.com/auth/datastore',
      {
        headers: { 'Metadata-Flavor': 'Google' },
        signal: AbortSignal.timeout(1500),
      }
    );
    if (!tokenRes.ok) return null;
    const tokenJson = (await tokenRes.json()) as { access_token?: string; expires_in?: number };
    if (!tokenJson.access_token) return null;
    cachedMetadataToken = {
      token: tokenJson.access_token,
      expiresAt: Date.now() + (tokenJson.expires_in || 1800) * 1000,
    };
    return tokenJson.access_token;
  } catch {
    return null;
  }
}

async function getPrivilegedFirestoreToken(projectId: string): Promise<string | null> {
  const explicitToken = await getServiceAccountAccessToken();
  if (explicitToken) return explicitToken;
  return getSameProjectCloudRunAccessToken(projectId);
}

async function resolveAuthoritativeWriteToken(
  projectId: string,
  callerUser: VerifiedFirebaseUser | null,
  callerIdToken: string
): Promise<string | null> {
  const serviceToken = await getPrivilegedFirestoreToken(projectId);
  if (serviceToken) return serviceToken;
  if (isVerifiedSuperAdmin(callerUser) && callerIdToken) {
    return callerIdToken;
  }
  return null;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreFields(obj: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function fromFirestoreValue(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  if ('nullValue' in raw) return null;
  if ('booleanValue' in raw) return Boolean(raw.booleanValue);
  if ('integerValue' in raw) return Number(raw.integerValue);
  if ('doubleValue' in raw) return Number(raw.doubleValue);
  if ('stringValue' in raw) return String(raw.stringValue);
  if ('arrayValue' in raw) {
    const vals = raw.arrayValue?.values;
    return Array.isArray(vals) ? vals.map(fromFirestoreValue) : [];
  }
  if ('mapValue' in raw) {
    return fromFirestoreFields(raw.mapValue?.fields || {});
  }
  return null;
}

function fromFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) {
    result[k] = fromFirestoreValue(v);
  }
  return result;
}

function extractDocIdFromName(docName: string): string {
  const parts = (docName || '').split('/');
  return parts[parts.length - 1] || '';
}

async function getFirestoreDoc(
  projectId: string,
  docPath: string,
  bearerToken: string
): Promise<FirestoreDocSnapshot | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${docPath}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore GET failed (${res.status}): ${errText}`);
  }
  const json = (await res.json()) as {
    name: string;
    fields?: Record<string, any>;
    updateTime?: string;
  };
  return {
    id: extractDocIdFromName(json.name),
    name: json.name,
    data: fromFirestoreFields(json.fields || {}),
    updateTime: json.updateTime,
  };
}

async function createFirestoreDoc(
  projectId: string,
  collectionPath: string,
  docId: string,
  payload: Record<string, unknown>,
  bearerToken: string
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${collectionPath}?documentId=${encodeURIComponent(docId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore CREATE failed (${res.status}): ${errText}`);
  }
}

async function patchFirestoreDoc(
  projectId: string,
  docPath: string,
  payload: Record<string, unknown>,
  fieldPaths: string[],
  bearerToken: string
): Promise<void> {
  const maskParams = fieldPaths
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${docPath}?${maskParams}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: toFirestoreFields(payload) }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore PATCH failed (${res.status}): ${errText}`);
  }
}

async function runFirestoreEqualQuery(
  projectId: string,
  collectionId: string,
  fieldPath: string,
  value: string,
  bearerToken: string,
  limitCount = 25
): Promise<FirestoreDocSnapshot[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value: toFirestoreValue(value),
          },
        },
        limit: limitCount,
      },
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore QUERY failed (${res.status}): ${errText}`);
  }
  const rows = (await res.json()) as Array<{
    document?: {
      name: string;
      fields?: Record<string, any>;
      updateTime?: string;
    };
  }>;
  const results: FirestoreDocSnapshot[] = [];
  for (const row of rows || []) {
    if (row?.document?.name) {
      results.push({
        id: extractDocIdFromName(row.document.name),
        name: row.document.name,
        data: fromFirestoreFields(row.document.fields || {}),
        updateTime: row.document.updateTime,
      });
    }
  }
  return results;
}

async function commitFirestoreWrites(
  projectId: string,
  writes: Array<Record<string, unknown>>,
  bearerToken: string
): Promise<void> {
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents:commit`;
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore COMMIT failed (${res.status}): ${errText}`);
  }
}

async function syncOwnerBranchesSubscription(params: {
  projectId: string;
  ownerId: string;
  subscriptionType: string;
  subscriptionEndDate: number | null;
  bearerToken: string;
  knownLaundriesMap?: Record<string, unknown>;
}): Promise<void> {
  try {
    const queried = await runFirestoreEqualQuery(
      params.projectId,
      'laundries',
      'ownerId',
      params.ownerId,
      params.bearerToken,
      25
    );
    const branchIds = new Set<string>(queried.map((d) => d.id));
    branchIds.add(`lnd-${params.ownerId}`);
    if (params.knownLaundriesMap && typeof params.knownLaundriesMap === 'object') {
      for (const k of Object.keys(params.knownLaundriesMap)) {
        if (k && k !== 'lnd-1' && k !== 'demo-lnd-1') {
          branchIds.add(k);
        }
      }
    }

    const now = Date.now();
    await Promise.all(
      Array.from(branchIds).map(async (branchId) => {
        if (!branchId || branchId === 'lnd-1' || branchId === 'demo-lnd-1') return;
        const existing =
          queried.find((q) => q.id === branchId) ||
          (await getFirestoreDoc(
            params.projectId,
            `laundries/${encodeURIComponent(branchId)}`,
            params.bearerToken
          ).catch(() => null));
        if (!existing || existing.data.ownerId !== params.ownerId) return;

        await patchFirestoreDoc(
          params.projectId,
          `laundries/${encodeURIComponent(branchId)}`,
          {
            subscriptionType: params.subscriptionType,
            subscriptionEndDate: params.subscriptionEndDate,
            updatedAt: now,
          },
          ['subscriptionType', 'subscriptionEndDate', 'updatedAt'],
          params.bearerToken
        ).catch(() => undefined);
      })
    );
  } catch (err) {
    console.warn('Non-fatal warning syncing owner branches subscription:', err);
  }
}

async function updatePaymentOrderStatus(
  projectId: string,
  orderId: string,
  status: 'failed' | 'pending',
  bearerToken: string
): Promise<void> {
  await patchFirestoreDoc(
    projectId,
    `payment_orders/${encodeURIComponent(orderId)}`,
    {
      status,
      updatedAt: Date.now(),
    },
    ['status', 'updatedAt'],
    bearerToken
  ).catch(() => undefined);
}

async function commitOrderSettlement(params: {
  projectId: string;
  bearerToken: string;
  orderId: string;
  orderUpdateTime?: string;
  ownerId: string;
  userUpdateTime?: string;
  purpose: 'extend_premium' | 'topup_wallet';
  amount: number;
  currentWalletBalance: number;
  currentSubEnd: number | null;
  currentSubType: string;
  paymentType: string;
  knownLaundriesMap?: Record<string, unknown>;
}): Promise<{
  walletBalance: number;
  subscriptionType: string;
  subscriptionEndDate: number | null;
  durationDays: number;
}> {
  const now = Date.now();
  const durationDays =
    params.purpose === 'extend_premium'
      ? Math.max(30, Math.round(params.amount / HARGA_PREMIUM_BULANAN) * 30)
      : 0;
  const walletBefore = Math.max(0, Math.round(params.currentWalletBalance));
  const nextWalletBalance =
    params.purpose === 'topup_wallet'
      ? walletBefore + Math.round(params.amount)
      : walletBefore;
  const baseSubEnd = Math.max(now, Number(params.currentSubEnd) || 0);
  const nextSubEnd =
    params.purpose === 'extend_premium'
      ? baseSubEnd + durationDays * 24 * 60 * 60 * 1000
      : params.currentSubEnd;
  const nextSubType = params.purpose === 'extend_premium' ? 'premium' : params.currentSubType;

  const docRoot = `projects/${params.projectId}/databases/(default)/documents`;
  const orderDocName = `${docRoot}/payment_orders/${params.orderId}`;
  const userDocName = `${docRoot}/users/${params.ownerId}`;
  const auditId = `AUD-MDT-${params.orderId}`;
  const auditDocName = `${docRoot}/billing_audit_logs/${auditId}`;

  const userUpdateFields =
    params.purpose === 'topup_wallet'
      ? {
          walletBalance: nextWalletBalance,
          lastSettledOrderId: params.orderId,
          updatedAt: now,
        }
      : {
          subscriptionType: 'premium',
          subscriptionEndDate: nextSubEnd,
          lastSettledOrderId: params.orderId,
          updatedAt: now,
        };

  const userFieldPaths =
    params.purpose === 'topup_wallet'
      ? ['walletBalance', 'lastSettledOrderId', 'updatedAt']
      : ['subscriptionType', 'subscriptionEndDate', 'lastSettledOrderId', 'updatedAt'];

  const writes: Array<Record<string, unknown>> = [
    {
      update: {
        name: orderDocName,
        fields: toFirestoreFields({
          status: 'settled',
          credited: true,
          settledAt: now,
          paymentType: params.paymentType || 'midtrans',
          updatedAt: now,
        }),
      },
      updateMask: {
        fieldPaths: ['status', 'credited', 'settledAt', 'paymentType', 'updatedAt'],
      },
      ...(params.orderUpdateTime
        ? { currentDocument: { updateTime: params.orderUpdateTime } }
        : { currentDocument: { exists: true } }),
    },
    {
      update: {
        name: userDocName,
        fields: toFirestoreFields(userUpdateFields),
      },
      updateMask: {
        fieldPaths: userFieldPaths,
      },
      ...(params.userUpdateTime
        ? { currentDocument: { updateTime: params.userUpdateTime } }
        : { currentDocument: { exists: true } }),
    },
    {
      update: {
        name: auditDocName,
        fields: toFirestoreFields({
          id: auditId,
          uid: params.ownerId,
          actorUid: 'midtrans_gateway',
          actorEmail: 'system@midtrans',
          action:
            params.purpose === 'extend_premium'
              ? 'midtrans_extend_premium'
              : 'midtrans_topup_wallet',
          channel: 'MIDTRANS',
          amount: Math.round(params.amount),
          walletDelta: params.purpose === 'topup_wallet' ? Math.round(params.amount) : 0,
          walletBefore,
          walletAfter: nextWalletBalance,
          durationDays,
          subscriptionTypeAfter: nextSubType,
          subscriptionEndDateAfter: nextSubEnd,
          note: `Order ${params.orderId} (${params.paymentType || 'midtrans'})`,
          createdAt: now,
        }),
      },
      currentDocument: { exists: false },
    },
  ];

  await commitFirestoreWrites(params.projectId, writes, params.bearerToken);

  if (params.purpose === 'extend_premium') {
    await syncOwnerBranchesSubscription({
      projectId: params.projectId,
      ownerId: params.ownerId,
      subscriptionType: 'premium',
      subscriptionEndDate: nextSubEnd,
      bearerToken: params.bearerToken,
      knownLaundriesMap: params.knownLaundriesMap,
    });
  }

  return {
    walletBalance: nextWalletBalance,
    subscriptionType: nextSubType,
    subscriptionEndDate: nextSubEnd,
    durationDays,
  };
}

function extractBearerToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice(7).trim();
}

async function fetchMidtransStatus(orderId: string, serverKey: string, coreBaseUrl: string) {
  const basicAuth = Buffer.from(`${serverKey}:`).toString('base64');
  const res = await fetch(`${coreBaseUrl}/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gagal memeriksa status Midtrans (${res.status}): ${text}`);
  }
  return (await res.json()) as {
    status_code?: string;
    transaction_status?: string;
    fraud_status?: string;
    gross_amount?: string;
    payment_type?: string;
    order_id?: string;
  };
}

function isMidtransSettled(txStatus?: string, fraudStatus?: string): boolean {
  if (txStatus === 'settlement') return true;
  if (txStatus === 'capture' && (!fraudStatus || fraudStatus === 'accept')) return true;
  return false;
}

function isMidtransFailed(txStatus?: string): boolean {
  return txStatus === 'cancel' || txStatus === 'deny' || txStatus === 'expire' || txStatus === 'failure';
}

function isAllowedCorsOrigin(origin: string): boolean {
  if (!origin) return false;
  const normalized = origin.trim().replace(/\/+$/, '').toLowerCase();
  const staticAllowed = new Set([
    'https://kflslaundry.web.app',
    'https://kflslaundry.firebaseapp.com',
    'https://kafilasuci4.web.app',
    'https://kafilasuci4.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
  ]);
  if (staticAllowed.has(normalized)) return true;

  const extra = (process.env.ALLOWED_FRONTEND_ORIGINS || '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, '').toLowerCase())
    .filter(Boolean);
  if (extra.includes(normalized)) return true;

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.run.app')) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

function parseLookupCandidate(rawQuery: string): {
  cleanQuery: string;
  extractedUid: string;
  suggestedAmount: number | null;
} {
  const text = (rawQuery || '').trim();
  const uidMatch = text.match(/ID\s*Akun\s*:\s*([A-Za-z0-9_-]{6,128})/i);
  const nominalMatch = text.match(/Nominal\s*:\s*(?:Rp\.?\s*)?([0-9][0-9.,]*)/i);
  let suggestedAmount: number | null = null;
  if (nominalMatch?.[1]) {
    const digits = parseInt(nominalMatch[1].replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(digits) && digits >= 1000) {
      suggestedAmount = digits;
    }
  }
  const extractedUid = uidMatch?.[1]?.trim() || '';
  return {
    cleanQuery: extractedUid || text,
    extractedUid,
    suggestedAmount,
  };
}

async function lookupOwnerAccountInFirestore(
  projectId: string,
  rawQuery: string,
  bearerToken: string
): Promise<{
  userDoc: FirestoreDocSnapshot;
  suggestedAmount: number | null;
} | null> {
  const { cleanQuery, extractedUid, suggestedAmount } = parseLookupCandidate(rawQuery);
  if (!cleanQuery) return null;

  // 1. Exact UID lookup
  if (extractedUid || (!cleanQuery.includes('@') && /^[A-Za-z0-9_-]{10,128}$/.test(cleanQuery))) {
    const directUid = extractedUid || cleanQuery;
    const byUid = await getFirestoreDoc(
      projectId,
      `users/${encodeURIComponent(directUid)}`,
      bearerToken
    );
    if (byUid) {
      return { userDoc: byUid, suggestedAmount };
    }
  }

  // 2. Email lookup
  if (cleanQuery.includes('@')) {
    const lowerEmail = cleanQuery.toLowerCase();
    for (const [field, val] of [
      ['authEmail', lowerEmail],
      ['authEmail', cleanQuery],
      ['emailOrPhone', lowerEmail],
      ['emailOrPhone', cleanQuery],
    ] as const) {
      const matches = await runFirestoreEqualQuery(projectId, 'users', field, val, bearerToken, 5);
      const ownerMatch = matches.find((m) => m.data.role === 'owner') || matches[0];
      if (ownerMatch) {
        return { userDoc: ownerMatch, suggestedAmount };
      }
    }
  }

  // 3. Phone number lookup (08xx, 628xx, and 628xx@kafelas.app variants)
  const digitsOnly = cleanQuery.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 8) {
    const zeroVariant = digitsOnly.startsWith('62')
      ? `0${digitsOnly.slice(2)}`
      : digitsOnly.startsWith('8')
      ? `0${digitsOnly}`
      : digitsOnly;
    const sixtyTwoVariant = digitsOnly.startsWith('0')
      ? `62${digitsOnly.slice(1)}`
      : digitsOnly.startsWith('8')
      ? `62${digitsOnly}`
      : digitsOnly;

    const candidates: Array<[string, string]> = [
      ['nomorTelepon', cleanQuery],
      ['nomorTelepon', zeroVariant],
      ['nomorTelepon', sixtyTwoVariant],
      ['emailOrPhone', zeroVariant],
      ['emailOrPhone', sixtyTwoVariant],
      ['authEmail', `${sixtyTwoVariant}@kafelas.app`],
      ['authEmail', `${zeroVariant}@kafelas.app`],
    ];

    for (const [field, val] of candidates) {
      const matches = await runFirestoreEqualQuery(projectId, 'users', field, val, bearerToken, 5);
      const ownerMatch = matches.find((m) => m.data.role === 'owner') || matches[0];
      if (ownerMatch) {
        return { userDoc: ownerMatch, suggestedAmount };
      }
    }
  }

  // 4. Fallback exact emailOrPhone match
  const fallbackMatches = await runFirestoreEqualQuery(
    projectId,
    'users',
    'emailOrPhone',
    cleanQuery,
    bearerToken,
    5
  );
  const fallbackOwner = fallbackMatches.find((m) => m.data.role === 'owner') || fallbackMatches[0];
  if (fallbackOwner) {
    return { userDoc: fallbackOwner, suggestedAmount };
  }

  return null;
}

const MISSING_SERVICE_ACCOUNT_ERROR =
  'Server belum memiliki kredensial otorisasi penuh (FIREBASE_SERVICE_ACCOUNT_JSON). Silakan pasang FIREBASE_SERVICE_ACCOUNT_JSON pada Environment Variables Cloud Run atau gunakan Transfer Biasa.';

async function startServer() {
  const app = express();
  const port = 3000;

  // CORS lintas-origin untuk https://kflslaundry.web.app ke seluruh endpoint /api/*
  app.use('/api', (req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
    res.setHeader('Vary', 'Origin');
    if (origin && isAllowedCorsOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/firebase-config', (_req, res) => {
    res.json(getFirebasePublicConfig());
  });

  app.get('/api/midtrans/config', async (_req, res) => {
    const cfg = getMidtransConfig();
    const fbCfg = getFirebasePublicConfig();
    const serviceAccountReady = Boolean(await getPrivilegedFirestoreToken(fbCfg.projectId));
    res.json({
      configured: cfg.configured,
      clientKey: cfg.clientKey,
      isProduction: cfg.isProduction,
      mode: cfg.isProduction ? 'production' : 'sandbox',
      webhookReady: serviceAccountReady,
      serviceAccountConfigured: serviceAccountReady,
      keyModeMismatch: cfg.keyModeMismatch,
    });
  });

  app.post('/api/midtrans/create-transaction', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }

      const midtransCfg = getMidtransConfig();
      if (!midtransCfg.configured) {
        return res.status(503).json({
          error:
            'Kunci Midtrans belum diaktifkan di server. Silakan pilih tombol Transfer Biasa (BRI / DANA) untuk melanjutkan.',
          code: 'MIDTRANS_NOT_CONFIGURED',
        });
      }

      const writeToken = await resolveAuthoritativeWriteToken(fbCfg.projectId, verified, idToken);
      if (!writeToken) {
        return res.status(503).json({
          error: MISSING_SERVICE_ACCOUNT_ERROR,
          code: 'SERVICE_ACCOUNT_NOT_CONFIGURED',
        });
      }

      const purpose =
        req.body?.purpose === 'extend_premium'
          ? 'extend_premium'
          : req.body?.purpose === 'topup_wallet'
          ? 'topup_wallet'
          : null;
      const rawAmount = Number(req.body?.amount);
      const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0;

      if (!purpose) {
        return res.status(400).json({ error: 'Tujuan pembayaran tidak valid.' });
      }
      if (
        purpose === 'extend_premium' &&
        (amount < HARGA_PREMIUM_BULANAN ||
          amount % HARGA_PREMIUM_BULANAN !== 0 ||
          amount > 1080000)
      ) {
        return res
          .status(400)
          .json({ error: 'Nominal perpanjangan Paket Premium harus kelipatan Rp 27.000.' });
      }
      if (purpose === 'topup_wallet' && (amount < 10000 || amount > 10000000)) {
        return res.status(400).json({ error: 'Nominal isi saldo minimal Rp 10.000.' });
      }

      const safeUid = verified.uid.replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || 'USER';
      const ts = String(Date.now()).padStart(13, '0').slice(0, 13);
      const prefix = purpose === 'extend_premium' ? 'PRM' : 'TOP';
      const orderId = `KFLS-${prefix}-${safeUid}-${ts}`;

      const months = Math.max(1, Math.round(amount / HARGA_PREMIUM_BULANAN));
      const itemName =
        purpose === 'extend_premium'
          ? `Paket Premium Kafelas Laundry (${months * 30} Hari)`
          : `Top Up Saldo Owner Kafelas Laundry`;

      const customerName =
        typeof req.body?.customerName === 'string' && req.body.customerName.trim()
          ? req.body.customerName.trim().slice(0, 50)
          : verified.displayName || 'Owner Laundry';
      const customerPhone =
        typeof req.body?.customerPhone === 'string' ? req.body.customerPhone.trim().slice(0, 20) : '';

      const basicAuth = Buffer.from(`${midtransCfg.serverKey}:`).toString('base64');
      const snapRes = await fetch(`${midtransCfg.snapBaseUrl}/transactions`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: orderId,
            gross_amount: amount,
          },
          item_details: [
            {
              id: purpose,
              price: amount,
              quantity: 1,
              name: itemName.slice(0, 50),
            },
          ],
          customer_details: {
            first_name: customerName,
            email: verified.email || undefined,
            phone: customerPhone || undefined,
          },
        }),
      });

      if (!snapRes.ok) {
        const errBody = await snapRes.text();
        console.error('Midtrans create transaction failed:', snapRes.status, errBody);
        const mismatchHint = midtransCfg.keyModeMismatch
          ? ' Mode kunci Midtrans (Sandbox/Production) tidak sesuai dengan nilai MIDTRANS_IS_PRODUCTION di server.'
          : '';
        return res.status(502).json({
          error: `Gagal membuat tagihan Midtrans.${mismatchHint} Silakan coba lagi atau gunakan Transfer Biasa.`,
        });
      }

      const snapData = (await snapRes.json()) as { token?: string; redirect_url?: string };
      if (!snapData.token) {
        return res.status(502).json({ error: 'Token pembayaran Midtrans tidak ditemukan.' });
      }

      const now = Date.now();
      await createFirestoreDoc(
        fbCfg.projectId,
        'payment_orders',
        orderId,
        {
          orderId,
          ownerId: verified.uid,
          amount,
          purpose,
          status: 'pending',
          credited: false,
          snapToken: snapData.token,
          redirectUrl: snapData.redirect_url || '',
          createdAt: now,
          updatedAt: now,
        },
        writeToken
      );

      return res.json({
        orderId,
        snapToken: snapData.token,
        redirectUrl: snapData.redirect_url || '',
        clientKey: midtransCfg.clientKey,
        isProduction: midtransCfg.isProduction,
      });
    } catch (error) {
      console.error('Error in /api/midtrans/create-transaction:', error);
      return res.status(500).json({ error: 'Terjadi kesalahan saat menyiapkan pembayaran Midtrans.' });
    }
  });

  app.post('/api/midtrans/verify-order', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }

      const midtransCfg = getMidtransConfig();
      if (!midtransCfg.configured) {
        return res.status(503).json({ error: 'Konfigurasi Midtrans belum tersedia di server.' });
      }

      const writeToken = await resolveAuthoritativeWriteToken(fbCfg.projectId, verified, idToken);
      if (!writeToken) {
        return res.status(503).json({
          error: MISSING_SERVICE_ACCOUNT_ERROR,
          code: 'SERVICE_ACCOUNT_NOT_CONFIGURED',
        });
      }

      const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID wajib disertakan.' });
      }

      const [orderDoc, userDoc] = await Promise.all([
        getFirestoreDoc(fbCfg.projectId, `payment_orders/${encodeURIComponent(orderId)}`, writeToken),
        getFirestoreDoc(fbCfg.projectId, `users/${encodeURIComponent(verified.uid)}`, writeToken),
      ]);

      if (!orderDoc || orderDoc.data.ownerId !== verified.uid) {
        return res.status(404).json({ error: 'Data pesanan pembayaran tidak ditemukan.' });
      }
      if (!userDoc) {
        return res.status(404).json({ error: 'Profil akun owner tidak ditemukan.' });
      }

      const purpose = orderDoc.data.purpose === 'extend_premium' ? 'extend_premium' : 'topup_wallet';
      const amount = Math.round(Number(orderDoc.data.amount) || 0);
      const durationDays =
        purpose === 'extend_premium'
          ? Math.max(30, Math.round(amount / HARGA_PREMIUM_BULANAN) * 30)
          : 0;

      if (orderDoc.data.credited === true || orderDoc.data.status === 'settled') {
        return res.json({
          status: 'settled',
          alreadyCredited: true,
          orderId,
          purpose,
          amount,
          durationDays,
          walletBalance: Number(userDoc.data.walletBalance) || 0,
          subscriptionType: userDoc.data.subscriptionType || 'newcomer',
          subscriptionEndDate: userDoc.data.subscriptionEndDate ?? null,
        });
      }

      const midtransStatus = await fetchMidtransStatus(
        orderId,
        midtransCfg.serverKey,
        midtransCfg.coreBaseUrl
      );

      const grossAmount = Math.round(Number(midtransStatus.gross_amount) || 0);
      if (isMidtransSettled(midtransStatus.transaction_status, midtransStatus.fraud_status)) {
        if (grossAmount !== amount) {
          return res.status(400).json({ error: 'Nominal pembayaran tidak sesuai dengan pesanan.' });
        }

        const settlement = await commitOrderSettlement({
          projectId: fbCfg.projectId,
          bearerToken: writeToken,
          orderId,
          orderUpdateTime: orderDoc.updateTime,
          ownerId: verified.uid,
          userUpdateTime: userDoc.updateTime,
          purpose,
          amount,
          currentWalletBalance: Number(userDoc.data.walletBalance) || 0,
          currentSubEnd:
            typeof userDoc.data.subscriptionEndDate === 'number'
              ? userDoc.data.subscriptionEndDate
              : null,
          currentSubType: String(userDoc.data.subscriptionType || 'newcomer'),
          paymentType: midtransStatus.payment_type || 'midtrans',
          knownLaundriesMap: userDoc.data.laundries,
        });

        return res.json({
          status: 'settled',
          alreadyCredited: false,
          orderId,
          purpose,
          amount,
          durationDays: settlement.durationDays,
          walletBalance: settlement.walletBalance,
          subscriptionType: settlement.subscriptionType,
          subscriptionEndDate: settlement.subscriptionEndDate,
        });
      }

      if (isMidtransFailed(midtransStatus.transaction_status)) {
        await updatePaymentOrderStatus(fbCfg.projectId, orderId, 'failed', writeToken);
        return res.json({
          status: 'failed',
          orderId,
          message: 'Pembayaran dibatalkan atau telah kedaluwarsa.',
        });
      }

      return res.json({
        status: 'pending',
        orderId,
        message: 'Pembayaran masih menunggu penyelesaian. Klik Cek Status setelah membayar.',
      });
    } catch (error) {
      console.error('Error in /api/midtrans/verify-order:', error);
      return res.status(500).json({ error: 'Gagal memverifikasi status pembayaran Midtrans.' });
    }
  });

  app.post('/api/midtrans/webhook', async (req, res) => {
    try {
      const midtransCfg = getMidtransConfig();
      if (!midtransCfg.configured) {
        return res.status(503).json({ error: 'Midtrans not configured' });
      }

      const orderId = String(req.body?.order_id || '');
      const statusCode = String(req.body?.status_code || '');
      const grossAmountRaw = String(req.body?.gross_amount || '');
      const signatureKey = String(req.body?.signature_key || '');

      if (!orderId || !statusCode || !grossAmountRaw || !signatureKey) {
        return res.status(400).json({ error: 'Invalid webhook payload' });
      }

      const expectedSig = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${grossAmountRaw}${midtransCfg.serverKey}`)
        .digest('hex');

      const sigBuf = Buffer.from(signatureKey, 'utf8');
      const expBuf = Buffer.from(expectedSig, 'utf8');
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return res.status(403).json({ error: 'Invalid Midtrans signature' });
      }

      const fbCfg = getFirebasePublicConfig();
      const serviceToken = await getPrivilegedFirestoreToken(fbCfg.projectId);
      if (!serviceToken) {
        return res.json({ received: true, deferredToClientVerification: true });
      }

      const orderDoc = await getFirestoreDoc(
        fbCfg.projectId,
        `payment_orders/${encodeURIComponent(orderId)}`,
        serviceToken
      );
      if (!orderDoc || orderDoc.data.credited === true) {
        return res.json({ received: true });
      }

      const midtransStatus = await fetchMidtransStatus(
        orderId,
        midtransCfg.serverKey,
        midtransCfg.coreBaseUrl
      );

      const amount = Math.round(Number(orderDoc.data.amount) || 0);
      const verifiedGross = Math.round(Number(midtransStatus.gross_amount) || 0);
      if (
        isMidtransSettled(midtransStatus.transaction_status, midtransStatus.fraud_status) &&
        verifiedGross === amount
      ) {
        const ownerId = String(orderDoc.data.ownerId || '');
        const userDoc = await getFirestoreDoc(
          fbCfg.projectId,
          `users/${encodeURIComponent(ownerId)}`,
          serviceToken
        );
        if (userDoc) {
          await commitOrderSettlement({
            projectId: fbCfg.projectId,
            bearerToken: serviceToken,
            orderId,
            orderUpdateTime: orderDoc.updateTime,
            ownerId,
            userUpdateTime: userDoc.updateTime,
            purpose: orderDoc.data.purpose === 'extend_premium' ? 'extend_premium' : 'topup_wallet',
            amount,
            currentWalletBalance: Number(userDoc.data.walletBalance) || 0,
            currentSubEnd:
              typeof userDoc.data.subscriptionEndDate === 'number'
                ? userDoc.data.subscriptionEndDate
                : null,
            currentSubType: String(userDoc.data.subscriptionType || 'newcomer'),
            paymentType: midtransStatus.payment_type || 'midtrans',
            knownLaundriesMap: userDoc.data.laundries,
          });
        }
      } else if (isMidtransFailed(midtransStatus.transaction_status)) {
        await updatePaymentOrderStatus(fbCfg.projectId, orderId, 'failed', serviceToken);
      }

      return res.json({ received: true });
    } catch (error) {
      console.error('Midtrans webhook error:', error);
      return res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  // ============================================================================
  // ENDPOINT BILLING TERPROTEKSI (POTONG SALDO PAKET & AKTIVASI CABANG BARU)
  // ============================================================================

  app.post('/api/billing/extend-subscription', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }

      const writeToken = await resolveAuthoritativeWriteToken(fbCfg.projectId, verified, idToken);
      if (!writeToken) {
        return res.status(503).json({
          error: MISSING_SERVICE_ACCOUNT_ERROR,
          code: 'SERVICE_ACCOUNT_NOT_CONFIGURED',
        });
      }

      const durationDays = Math.round(Number(req.body?.durationDays) || 0);
      if (!ALLOWED_SELF_EXTEND_DAYS.has(durationDays)) {
        return res.status(400).json({
          error: 'Durasi perpanjangan tidak valid. Pilih kelipatan 30 hari yang tersedia.',
        });
      }

      // Server-authoritative cost calculation (mengabaikan angka harga dari client)
      const months = durationDays / 30;
      const authoritativeCost = Math.round(months * HARGA_PREMIUM_BULANAN);

      const userDoc = await getFirestoreDoc(
        fbCfg.projectId,
        `users/${encodeURIComponent(verified.uid)}`,
        writeToken
      );
      if (!userDoc) {
        return res.status(404).json({ error: 'Profil akun owner tidak ditemukan di server.' });
      }
      if (userDoc.data.role && userDoc.data.role !== 'owner') {
        return res.status(403).json({ error: 'Hanya akun Owner yang dapat memperpanjang langganan.' });
      }

      const walletBefore = Math.max(0, Math.floor(Number(userDoc.data.walletBalance) || 0));
      if (walletBefore < authoritativeCost) {
        return res.status(400).json({
          error: `Saldo dompet di server (${walletBefore.toLocaleString('id-ID')}) tidak mencukupi untuk biaya Rp ${authoritativeCost.toLocaleString('id-ID')}.`,
          code: 'INSUFFICIENT_WALLET_BALANCE',
          walletBalance: walletBefore,
          requiredCost: authoritativeCost,
        });
      }

      const now = Date.now();
      const walletAfter = walletBefore - authoritativeCost;
      const currentSubEnd =
        typeof userDoc.data.subscriptionEndDate === 'number' ? userDoc.data.subscriptionEndDate : 0;
      const baseEnd = Math.max(now, currentSubEnd);
      const nextSubEnd = baseEnd + durationDays * 24 * 60 * 60 * 1000;

      const docRoot = `projects/${fbCfg.projectId}/databases/(default)/documents`;
      const userDocName = `${docRoot}/users/${verified.uid}`;
      const auditId = `AUD-WLT-PRM-${now}-${crypto.randomBytes(3).toString('hex')}`;
      const auditDocName = `${docRoot}/billing_audit_logs/${auditId}`;

      await commitFirestoreWrites(
        fbCfg.projectId,
        [
          {
            update: {
              name: userDocName,
              fields: toFirestoreFields({
                walletBalance: walletAfter,
                subscriptionType: 'premium',
                subscriptionEndDate: nextSubEnd,
                updatedAt: now,
              }),
            },
            updateMask: {
              fieldPaths: ['walletBalance', 'subscriptionType', 'subscriptionEndDate', 'updatedAt'],
            },
            ...(userDoc.updateTime
              ? { currentDocument: { updateTime: userDoc.updateTime } }
              : { currentDocument: { exists: true } }),
          },
          {
            update: {
              name: auditDocName,
              fields: toFirestoreFields({
                id: auditId,
                uid: verified.uid,
                actorUid: verified.uid,
                actorEmail: verified.email || '',
                action: 'wallet_extend_premium',
                channel: 'WALLET',
                amount: authoritativeCost,
                walletDelta: -authoritativeCost,
                walletBefore,
                walletAfter,
                durationDays,
                subscriptionTypeAfter: 'premium',
                subscriptionEndDateAfter: nextSubEnd,
                note: `Perpanjangan Paket Premium (${durationDays} Hari) dari saldo dompet`,
                createdAt: now,
              }),
            },
            currentDocument: { exists: false },
          },
        ],
        writeToken
      );

      await syncOwnerBranchesSubscription({
        projectId: fbCfg.projectId,
        ownerId: verified.uid,
        subscriptionType: 'premium',
        subscriptionEndDate: nextSubEnd,
        bearerToken: writeToken,
        knownLaundriesMap: userDoc.data.laundries,
      });

      return res.json({
        success: true,
        auditId,
        cost: authoritativeCost,
        durationDays,
        walletBalance: walletAfter,
        subscriptionType: 'premium',
        subscriptionEndDate: nextSubEnd,
      });
    } catch (error) {
      console.error('Error in /api/billing/extend-subscription:', error);
      return res.status(500).json({
        error: 'Gagal memproses perpanjangan paket di server. Saldo Anda tidak terpotong.',
      });
    }
  });

  app.post('/api/billing/activate-branch', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }

      const writeToken = await resolveAuthoritativeWriteToken(fbCfg.projectId, verified, idToken);
      if (!writeToken) {
        return res.status(503).json({
          error: MISSING_SERVICE_ACCOUNT_ERROR,
          code: 'SERVICE_ACCOUNT_NOT_CONFIGURED',
        });
      }

      const namaLaundry =
        typeof req.body?.namaLaundry === 'string' ? req.body.namaLaundry.trim().slice(0, 120) : '';
      const alamat =
        typeof req.body?.alamat === 'string' ? req.body.alamat.trim().slice(0, 300) : '';
      const nomorTelepon =
        typeof req.body?.nomorTelepon === 'string' ? req.body.nomorTelepon.trim().slice(0, 40) : '';

      if (!namaLaundry) {
        return res.status(400).json({ error: 'Nama cabang laundry wajib diisi.' });
      }

      const [userDoc, queriedBranches] = await Promise.all([
        getFirestoreDoc(fbCfg.projectId, `users/${encodeURIComponent(verified.uid)}`, writeToken),
        runFirestoreEqualQuery(fbCfg.projectId, 'laundries', 'ownerId', verified.uid, writeToken, 25),
      ]);

      if (!userDoc) {
        return res.status(404).json({ error: 'Profil akun owner tidak ditemukan di server.' });
      }
      if (userDoc.data.role && userDoc.data.role !== 'owner') {
        return res.status(403).json({ error: 'Hanya akun Owner yang dapat menambahkan cabang.' });
      }

      const realBranchIds = new Set<string>(
        queriedBranches
          .map((b) => b.id)
          .filter((id) => id && id !== 'lnd-1' && id !== 'demo-lnd-1')
      );
      if (realBranchIds.size === 0) {
        const primaryDoc = await getFirestoreDoc(
          fbCfg.projectId,
          `laundries/${encodeURIComponent(`lnd-${verified.uid}`)}`,
          writeToken
        ).catch(() => null);
        if (primaryDoc && primaryDoc.data.ownerId === verified.uid) {
          realBranchIds.add(primaryDoc.id);
        }
      }

      if (realBranchIds.size >= 20) {
        return res.status(400).json({ error: 'Batas maksimal 20 cabang per akun telah tercapai.' });
      }

      const isExtraBranch = realBranchIds.size >= 1;
      const authoritativeCost = isExtraBranch ? EXTRA_BRANCH_PRICE : 0;
      const walletBefore = Math.max(0, Math.floor(Number(userDoc.data.walletBalance) || 0));

      if (isExtraBranch && walletBefore < authoritativeCost) {
        return res.status(400).json({
          error: `Saldo dompet di server tidak mencukupi untuk aktivasi cabang tambahan (Rp ${authoritativeCost.toLocaleString('id-ID')}).`,
          code: 'INSUFFICIENT_WALLET_BALANCE',
          walletBalance: walletBefore,
          requiredCost: authoritativeCost,
        });
      }

      const now = Date.now();
      const walletAfter = walletBefore - authoritativeCost;
      const branchId = isExtraBranch
        ? `lnd-${now}-${crypto.randomBytes(2).toString('hex')}`
        : `lnd-${verified.uid}`;
      const authoritativeSubType = String(userDoc.data.subscriptionType || 'newcomer');
      const authoritativeSubEnd =
        typeof userDoc.data.subscriptionEndDate === 'number'
          ? userDoc.data.subscriptionEndDate
          : null;

      const existingMap =
        userDoc.data.laundries && typeof userDoc.data.laundries === 'object'
          ? (userDoc.data.laundries as Record<string, string>)
          : {};
      const nextLaundriesMap: Record<string, string> = {
        ...existingMap,
        [branchId]: namaLaundry,
      };

      const branchPayload = {
        id: branchId,
        ownerId: verified.uid,
        namaLaundry,
        alamat,
        nomorTelepon,
        subscriptionType: authoritativeSubType,
        subscriptionEndDate: authoritativeSubEnd,
        updatedAt: now,
      };

      const docRoot = `projects/${fbCfg.projectId}/databases/(default)/documents`;
      const branchDocName = `${docRoot}/laundries/${branchId}`;
      const userDocName = `${docRoot}/users/${verified.uid}`;
      const auditId = `AUD-WLT-BRN-${now}-${crypto.randomBytes(3).toString('hex')}`;
      const auditDocName = `${docRoot}/billing_audit_logs/${auditId}`;

      await commitFirestoreWrites(
        fbCfg.projectId,
        [
          {
            update: {
              name: branchDocName,
              fields: toFirestoreFields(branchPayload),
            },
            currentDocument: { exists: false },
          },
          {
            update: {
              name: userDocName,
              fields: toFirestoreFields({
                walletBalance: walletAfter,
                laundries: nextLaundriesMap,
                updatedAt: now,
              }),
            },
            updateMask: {
              fieldPaths: ['walletBalance', 'laundries', 'updatedAt'],
            },
            ...(userDoc.updateTime
              ? { currentDocument: { updateTime: userDoc.updateTime } }
              : { currentDocument: { exists: true } }),
          },
          {
            update: {
              name: auditDocName,
              fields: toFirestoreFields({
                id: auditId,
                uid: verified.uid,
                actorUid: verified.uid,
                actorEmail: verified.email || '',
                action: 'wallet_activate_branch',
                channel: 'WALLET',
                amount: authoritativeCost,
                walletDelta: -authoritativeCost,
                walletBefore,
                walletAfter,
                durationDays: 0,
                subscriptionTypeAfter: authoritativeSubType,
                subscriptionEndDateAfter: authoritativeSubEnd,
                note: `Aktivasi cabang '${namaLaundry}' (${branchId})`,
                createdAt: now,
              }),
            },
            currentDocument: { exists: false },
          },
        ],
        writeToken
      );

      return res.json({
        success: true,
        auditId,
        isExtraBranch,
        cost: authoritativeCost,
        walletBalance: walletAfter,
        branch: branchPayload,
        laundriesMap: nextLaundriesMap,
      });
    } catch (error) {
      console.error('Error in /api/billing/activate-branch:', error);
      return res.status(500).json({
        error: 'Gagal mengaktifkan cabang baru di server. Saldo Anda tidak terpotong.',
      });
    }
  });

  // ============================================================================
  // ENDPOINT KHUSUS SUPER ADMIN (AKTIVASI TRANSFER MANUAL BRI / DANA)
  // ============================================================================

  app.post('/api/admin/billing/lookup-user', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }
      if (!isVerifiedSuperAdmin(verified)) {
        return res.status(403).json({
          error:
            'Akses ditolak. Pastikan Anda masuk memakai tombol Google dengan email Super Admin resmi.',
        });
      }

      const fsToken = (await getPrivilegedFirestoreToken(fbCfg.projectId)) || idToken;
      const rawQuery = typeof req.body?.query === 'string' ? req.body.query : '';
      if (!rawQuery.trim()) {
        return res.status(400).json({ error: 'Masukkan ID Akun, Email, atau Nomor WhatsApp pembeli.' });
      }

      const found = await lookupOwnerAccountInFirestore(fbCfg.projectId, rawQuery, fsToken);
      if (!found) {
        return res.status(404).json({
          error: 'Akun Owner tidak ditemukan. Periksa kembali ID Akun, Email, atau Nomor Telepon.',
        });
      }

      const targetUid = found.userDoc.id;
      const [branches, auditDocs] = await Promise.all([
        runFirestoreEqualQuery(fbCfg.projectId, 'laundries', 'ownerId', targetUid, fsToken, 25).catch(
          () => []
        ),
        runFirestoreEqualQuery(
          fbCfg.projectId,
          'billing_audit_logs',
          'uid',
          targetUid,
          fsToken,
          25
        ).catch(() => []),
      ]);

      const recentLogs = auditDocs
        .map((d) => d.data)
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
        .slice(0, 10);

      const u = found.userDoc.data;
      return res.json({
        user: {
          uid: targetUid,
          displayName: String(u.displayName || u.username || 'Owner Laundry'),
          emailOrPhone: String(u.emailOrPhone || ''),
          authEmail: u.authEmail ? String(u.authEmail) : null,
          nomorTelepon: u.nomorTelepon ? String(u.nomorTelepon) : null,
          role: String(u.role || 'owner'),
          walletBalance: Math.max(0, Math.floor(Number(u.walletBalance) || 0)),
          subscriptionType: String(u.subscriptionType || 'newcomer'),
          subscriptionEndDate:
            typeof u.subscriptionEndDate === 'number' ? u.subscriptionEndDate : null,
          branches: branches.map((b) => ({
            id: b.id,
            namaLaundry: String(b.data.namaLaundry || "Kafela's Laundry"),
            alamat: String(b.data.alamat || ''),
          })),
        },
        suggestedAmount: found.suggestedAmount,
        recentLogs,
      });
    } catch (error) {
      console.error('Error in /api/admin/billing/lookup-user:', error);
      return res.status(500).json({ error: 'Gagal mencari data akun di database.' });
    }
  });

  app.post('/api/admin/billing/grant', async (req, res) => {
    try {
      const fbCfg = getFirebasePublicConfig();
      const idToken = extractBearerToken(req.headers.authorization);
      const verified = await verifyFirebaseIdToken(idToken, fbCfg.apiKey);
      if (!verified) {
        return res.status(401).json({ error: 'Sesi login tidak valid. Silakan masuk ulang.' });
      }
      if (!isVerifiedSuperAdmin(verified)) {
        return res.status(403).json({
          error:
            'Akses ditolak. Hanya Super Admin terverifikasi Google yang dapat memproses aktivasi manual.',
        });
      }

      const fsToken = (await getPrivilegedFirestoreToken(fbCfg.projectId)) || idToken;

      const targetUid =
        typeof req.body?.targetUid === 'string' ? req.body.targetUid.trim() : '';
      const action =
        req.body?.action === 'extend_premium'
          ? 'extend_premium'
          : req.body?.action === 'topup_wallet'
          ? 'topup_wallet'
          : null;
      const channel =
        req.body?.channel === 'BRI'
          ? 'BRI'
          : req.body?.channel === 'DANA'
          ? 'DANA'
          : 'MANUAL';
      const durationDays = Math.round(Number(req.body?.durationDays) || 0);
      const rawAmount = Math.round(Number(req.body?.amount) || 0);
      const customNote =
        typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 240) : '';

      if (!targetUid || !/^[A-Za-z0-9_-]{4,128}$/.test(targetUid)) {
        return res.status(400).json({ error: 'ID Akun tujuan tidak valid.' });
      }
      if (!action) {
        return res.status(400).json({ error: 'Jenis tindakan aktivasi tidak valid.' });
      }
      if (action === 'extend_premium' && !ALLOWED_ADMIN_EXTEND_DAYS.has(durationDays)) {
        return res.status(400).json({
          error: 'Durasi aktivasi Paket Premium harus 30, 60, 90, 180, atau 360 hari.',
        });
      }
      if (action === 'topup_wallet' && (rawAmount < 5000 || rawAmount > 50_000_000)) {
        return res.status(400).json({
          error: 'Nominal pengisian saldo harus antara Rp 5.000 hingga Rp 50.000.000.',
        });
      }

      const userDoc = await getFirestoreDoc(
        fbCfg.projectId,
        `users/${encodeURIComponent(targetUid)}`,
        fsToken
      );
      if (!userDoc) {
        return res.status(404).json({ error: 'Akun tujuan tidak ditemukan di Firestore.' });
      }
      if (userDoc.data.role && userDoc.data.role !== 'owner') {
        return res.status(400).json({
          error: 'Akun tersebut adalah akun Kasir. Aktivasi paket atau saldo hanya untuk akun Owner.',
        });
      }

      const now = Date.now();
      const walletBefore = Math.max(0, Math.floor(Number(userDoc.data.walletBalance) || 0));
      const currentSubEnd =
        typeof userDoc.data.subscriptionEndDate === 'number'
          ? userDoc.data.subscriptionEndDate
          : null;
      const currentSubType = String(userDoc.data.subscriptionType || 'newcomer');

      const effectiveAmount =
        action === 'extend_premium'
          ? rawAmount > 0
            ? rawAmount
            : Math.round((durationDays / 30) * HARGA_PREMIUM_BULANAN)
          : rawAmount;

      const walletAfter =
        action === 'topup_wallet' ? walletBefore + effectiveAmount : walletBefore;
      const nextSubType = action === 'extend_premium' ? 'premium' : currentSubType;
      const nextSubEnd =
        action === 'extend_premium'
          ? Math.max(now, currentSubEnd || 0) + durationDays * 24 * 60 * 60 * 1000
          : currentSubEnd;

      const docRoot = `projects/${fbCfg.projectId}/databases/(default)/documents`;
      const userDocName = `${docRoot}/users/${targetUid}`;
      const auditId = `AUD-ADM-${now}-${crypto.randomBytes(3).toString('hex')}`;
      const auditDocName = `${docRoot}/billing_audit_logs/${auditId}`;

      const userUpdateFields =
        action === 'topup_wallet'
          ? {
              walletBalance: walletAfter,
              updatedAt: now,
            }
          : {
              subscriptionType: 'premium',
              subscriptionEndDate: nextSubEnd,
              updatedAt: now,
            };

      const userMaskPaths =
        action === 'topup_wallet'
          ? ['walletBalance', 'updatedAt']
          : ['subscriptionType', 'subscriptionEndDate', 'updatedAt'];

      const auditEntry = {
        id: auditId,
        uid: targetUid,
        actorUid: verified.uid,
        actorEmail: verified.email,
        action: action === 'extend_premium' ? 'admin_extend_premium' : 'admin_topup_wallet',
        channel,
        amount: effectiveAmount,
        walletDelta: action === 'topup_wallet' ? effectiveAmount : 0,
        walletBefore,
        walletAfter,
        durationDays: action === 'extend_premium' ? durationDays : 0,
        subscriptionTypeAfter: nextSubType,
        subscriptionEndDateAfter: nextSubEnd,
        note:
          customNote ||
          (action === 'extend_premium'
            ? `Aktivasi Paket Premium ${durationDays} Hari via Transfer ${channel}`
            : `Top Up Saldo Dompet via Transfer ${channel}`),
        createdAt: now,
      };

      await commitFirestoreWrites(
        fbCfg.projectId,
        [
          {
            update: {
              name: userDocName,
              fields: toFirestoreFields(userUpdateFields),
            },
            updateMask: {
              fieldPaths: userMaskPaths,
            },
            ...(userDoc.updateTime
              ? { currentDocument: { updateTime: userDoc.updateTime } }
              : { currentDocument: { exists: true } }),
          },
          {
            update: {
              name: auditDocName,
              fields: toFirestoreFields(auditEntry),
            },
            currentDocument: { exists: false },
          },
        ],
        fsToken
      );

      if (action === 'extend_premium') {
        await syncOwnerBranchesSubscription({
          projectId: fbCfg.projectId,
          ownerId: targetUid,
          subscriptionType: 'premium',
          subscriptionEndDate: nextSubEnd,
          bearerToken: fsToken,
          knownLaundriesMap: userDoc.data.laundries,
        });
      }

      return res.json({
        success: true,
        auditEntry,
        user: {
          uid: targetUid,
          displayName: String(userDoc.data.displayName || userDoc.data.username || 'Owner Laundry'),
          walletBalance: walletAfter,
          subscriptionType: nextSubType,
          subscriptionEndDate: nextSubEnd,
        },
      });
    } catch (error) {
      console.error('Error in /api/admin/billing/grant:', error);
      return res.status(500).json({ error: 'Gagal memproses aktivasi manual di server.' });
    }
  });

  app.get('/api/proxy-image', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch image');
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const contentType = response.headers.get('content-type') || 'image/png';
      res.send(`data:${contentType};base64,${base64}`);
    } catch (error) {
      console.error('Proxy image error:', error);
      res.status(500).send('Failed to proxy image');
    }
  });

  app.get(['/profil', '/landing', '/beranda'], (_req, res) => {
    res.redirect('/profil.html');
  });

  app.get(['/tutorial', '/panduan'], (_req, res) => {
    res.redirect('/tutorial.html');
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(rootDir, 'dist');
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (/\.(?:html|webmanifest)$/i.test(filePath) || /(?:sw|workbox-[^/]+)\.js$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          }
        },
      })
    );
    app.get(/^\/assets\/.*/, (_req, res) => {
      res.status(404).end();
    });
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
