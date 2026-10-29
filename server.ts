import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const rootDir = import.meta.dirname || process.cwd();

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
}

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let cachedServiceToken: { token: string; expiresAt: number } | null = null;

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
  return {
    serverKey,
    clientKey,
    isProduction,
    configured: Boolean(serverKey && clientKey),
    snapBaseUrl: isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1',
    coreBaseUrl: isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2',
  };
}

async function verifyFirebaseIdToken(idToken: string, apiKey: string): Promise<VerifiedFirebaseUser | null> {
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
      users?: Array<{ localId?: string; email?: string; displayName?: string }>;
    };
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: user.email || '',
      displayName: user.displayName || '',
    };
  } catch {
    return null;
  }
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (!rawJson) return null;
  if (cachedServiceToken && cachedServiceToken.expiresAt > Date.now() + 60_000) {
    return cachedServiceToken.token;
  }
  try {
    const creds = JSON.parse(rawJson) as ServiceAccountCredentials;
    if (!creds.client_email || !creds.private_key) return null;
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

async function getFirestoreDoc(
  projectId: string,
  docPath: string,
  bearerToken: string
): Promise<{ name: string; data: Record<string, any>; updateTime?: string } | null> {
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

async function updatePaymentOrderStatus(
  projectId: string,
  orderId: string,
  status: 'failed' | 'pending',
  bearerToken: string
): Promise<void> {
  const maskParams = ['status', 'updatedAt']
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/payment_orders/${encodeURIComponent(orderId)}?${maskParams}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreFields({
        status,
        updatedAt: Date.now(),
      }),
    }),
  }).catch(() => undefined);
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
}): Promise<{
  walletBalance: number;
  subscriptionType: string;
  subscriptionEndDate: number | null;
  durationDays: number;
}> {
  const now = Date.now();
  const durationDays =
    params.purpose === 'extend_premium'
      ? Math.max(30, Math.round(params.amount / 27000) * 30)
      : 0;
  const nextWalletBalance =
    params.purpose === 'topup_wallet'
      ? Math.round(params.currentWalletBalance) + Math.round(params.amount)
      : Math.round(params.currentWalletBalance);
  const baseSubEnd = Math.max(now, Number(params.currentSubEnd) || 0);
  const nextSubEnd =
    params.purpose === 'extend_premium'
      ? baseSubEnd + durationDays * 24 * 60 * 60 * 1000
      : params.currentSubEnd;
  const nextSubType = params.purpose === 'extend_premium' ? 'premium' : params.currentSubType;

  const docRoot = `projects/${params.projectId}/databases/(default)/documents`;
  const orderDocName = `${docRoot}/payment_orders/${params.orderId}`;
  const userDocName = `${docRoot}/users/${params.ownerId}`;

  const userUpdateFields =
    params.purpose === 'topup_wallet'
      ? {
          walletBalance: nextWalletBalance,
          lastSettledOrderId: params.orderId,
        }
      : {
          subscriptionType: 'premium',
          subscriptionEndDate: nextSubEnd,
          lastSettledOrderId: params.orderId,
        };

  const userFieldPaths =
    params.purpose === 'topup_wallet'
      ? ['walletBalance', 'lastSettledOrderId']
      : ['subscriptionType', 'subscriptionEndDate', 'lastSettledOrderId'];

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
  ];

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    params.projectId
  )}/databases/(default)/documents:commit`;
  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.bearerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ writes }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore COMMIT failed (${res.status}): ${errText}`);
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

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/firebase-config', (_req, res) => {
    res.json(getFirebasePublicConfig());
  });

  app.get('/api/midtrans/config', (_req, res) => {
    const cfg = getMidtransConfig();
    res.json({
      configured: cfg.configured,
      clientKey: cfg.clientKey,
      isProduction: cfg.isProduction,
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

      const purpose = req.body?.purpose === 'extend_premium' ? 'extend_premium' : req.body?.purpose === 'topup_wallet' ? 'topup_wallet' : null;
      const rawAmount = Number(req.body?.amount);
      const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0;

      if (!purpose) {
        return res.status(400).json({ error: 'Tujuan pembayaran tidak valid.' });
      }
      if (purpose === 'extend_premium' && (amount < 27000 || amount % 27000 !== 0 || amount > 1080000)) {
        return res.status(400).json({ error: 'Nominal perpanjangan Paket Premium harus kelipatan Rp 27.000.' });
      }
      if (purpose === 'topup_wallet' && (amount < 10000 || amount > 10000000)) {
        return res.status(400).json({ error: 'Nominal isi saldo minimal Rp 10.000.' });
      }

      const safeUid = verified.uid.replace(/[^A-Za-z0-9]/g, '').slice(0, 10) || 'USER';
      const ts = String(Date.now()).padStart(13, '0').slice(0, 13);
      const prefix = purpose === 'extend_premium' ? 'PRM' : 'TOP';
      const orderId = `KFLS-${prefix}-${safeUid}-${ts}`;

      const months = Math.max(1, Math.round(amount / 27000));
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
        return res.status(502).json({
          error: 'Gagal membuat tagihan Midtrans. Silakan coba lagi atau gunakan Transfer Biasa.',
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
        idToken
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

      const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.trim() : '';
      if (!orderId) {
        return res.status(400).json({ error: 'Order ID wajib disertakan.' });
      }

      const [orderDoc, userDoc] = await Promise.all([
        getFirestoreDoc(fbCfg.projectId, `payment_orders/${encodeURIComponent(orderId)}`, idToken),
        getFirestoreDoc(fbCfg.projectId, `users/${encodeURIComponent(verified.uid)}`, idToken),
      ]);

      if (!orderDoc || orderDoc.data.ownerId !== verified.uid) {
        return res.status(404).json({ error: 'Data pesanan pembayaran tidak ditemukan.' });
      }
      if (!userDoc) {
        return res.status(404).json({ error: 'Profil akun owner tidak ditemukan.' });
      }

      const purpose = orderDoc.data.purpose === 'extend_premium' ? 'extend_premium' : 'topup_wallet';
      const amount = Math.round(Number(orderDoc.data.amount) || 0);
      const durationDays = purpose === 'extend_premium' ? Math.max(30, Math.round(amount / 27000) * 30) : 0;

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
          bearerToken: idToken,
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
        await updatePaymentOrderStatus(fbCfg.projectId, orderId, 'failed', idToken);
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

      const serviceToken = await getServiceAccountAccessToken();
      if (!serviceToken) {
        return res.json({ received: true, deferredToClientVerification: true });
      }

      const fbCfg = getFirebasePublicConfig();
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

  app.get(['/landing', '/beranda'], (_req, res) => {
    res.redirect('/landing.html');
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
