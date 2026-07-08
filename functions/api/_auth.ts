export type PagesUserRole = 'ADMIN' | 'DATA_ENGINEER' | 'ANALYST' | 'BUSINESS_USER';

export interface PagesUser {
  username: string;
  name: string;
  email: string;
  role: PagesUserRole;
}

const USERS_DB: Record<string, PagesUser & { password: string }> = {
  admin: {
    username: 'admin',
    password: 'admin123',
    name: 'Administrator',
    email: 'admin@example.com',
    role: 'ADMIN'
  },
  engineer: {
    username: 'engineer',
    password: 'engineer123',
    name: 'Data Engineer',
    email: 'engineer@example.com',
    role: 'DATA_ENGINEER'
  },
  analyst: {
    username: 'analyst',
    password: 'analyst123',
    name: 'Risk Analyst',
    email: 'analyst@example.com',
    role: 'ANALYST'
  },
  business: {
    username: 'business',
    password: 'business123',
    name: 'Business User',
    email: 'business@example.com',
    role: 'BUSINESS_USER'
  }
};

const textEncoder = new TextEncoder();

function base64UrlEncode(bytes: string | Uint8Array) {
  const str = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeToString(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

function getEnvValue(context: any, key: string) {
  const envValue = context && typeof context === 'object' && 'env' in context ? context.env?.[key] : undefined;
  if (envValue) return envValue;
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[key] ?? '';
  }
  return '';
}

async function importHmacKey(secret: string) {
  const keyData = textEncoder.encode(secret);
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export function getUserForCredentials(username: string, password: string) {
  const user = USERS_DB[username.toLowerCase()];
  if (!user || user.password !== password) {
    return null;
  }
  return { username: user.username, name: user.name, email: user.email, role: user.role };
}

export async function createToken(username: string, context?: any) {
  const secret = getEnvValue(context, 'JWT_SECRET') || '';
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const user = USERS_DB[username.toLowerCase()];
  if (!user) throw new Error('Unknown user');

  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 60 * 60 * 24; // 24 hours
  const payload = { username: user.username, role: user.role, iat: issuedAt, exp: expiresAt };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importHmacKey(secret);
  const signatureBytes = await crypto.subtle.sign('HMAC', key, textEncoder.encode(signingInput));
  const signature = base64UrlEncode(new Uint8Array(signatureBytes));
  return `${signingInput}.${signature}`;
}

export async function verifyToken(authHeader: string | null, context?: any) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  const scheme = parts[0];
  const token = parts[1];
  if (scheme !== 'Bearer' || !token) return null;

  const secret = getEnvValue(context, 'JWT_SECRET') || '';
  if (!secret) return null;

  const pieces = token.split('.');
  if (pieces.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = pieces;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  try {
    const key = await importHmacKey(secret);
    const signatureBytes = Uint8Array.from(atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const verified = await crypto.subtle.verify('HMAC', key, signatureBytes, textEncoder.encode(signingInput));
    if (!verified) return null;

    const payloadJson = base64UrlDecodeToString(encodedPayload);
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    const username = payload.username;
    if (!username) return null;
    const user = USERS_DB[username.toLowerCase()];
    if (!user) return null;
    return { username: user.username, name: user.name, email: user.email, role: user.role };
  } catch (e) {
    return null;
  }
}

export function buildJsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json;charset=UTF-8' },
    ...init
  });
}
