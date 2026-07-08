const textEncoder = new TextEncoder();

function base64UrlEncode(value: string | ArrayBuffer) {
  const bytes = typeof value === 'string'
    ? Array.from(value, (char) => char.charCodeAt(0))
    : Array.from(new Uint8Array(value));
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

function parsePemPrivateKey(pem: string) {
  const cleaned = pem
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  return base64UrlDecode(cleaned).buffer;
}

async function importPrivateKey(pem: string) {
  return crypto.subtle.importKey(
    'pkcs8',
    parsePemPrivateKey(pem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function normalizeAccountIdentifier(account: string) {
  return account.trim().toUpperCase().replace(/\./g, '-');
}

function normalizeColumnName(name: string) {
  return name
    .toLowerCase()
    .replace(/[_\s]+([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function getEnvValue(context: any, key: string) {
  const envValue = context && typeof context === 'object' && 'env' in context ? context.env?.[key] : undefined;
  if (envValue) return envValue;
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[key] ?? '';
  }
  return '';
}

async function getSnowflakeAuth(context: any) {
  const oauthToken = getEnvValue(context, 'SNOWFLAKE_OAUTH_TOKEN');
  if (oauthToken) {
    return { token: oauthToken, type: 'OAUTH' };
  }

  const privateKey = getEnvValue(context, 'SNOWFLAKE_PRIVATE_KEY');
  const fingerprint = getEnvValue(context, 'SNOWFLAKE_PUBLIC_KEY_FINGERPRINT');
  const account = getEnvValue(context, 'SNOWFLAKE_ACCOUNT');
  const user = getEnvValue(context, 'SNOWFLAKE_USER');

  if (!privateKey || !fingerprint) {
    throw new Error('Snowflake authentication is not configured. Provide SNOWFLAKE_OAUTH_TOKEN or key-pair values.');
  }
  if (!account || !user) {
    throw new Error('SNOWFLAKE_ACCOUNT and SNOWFLAKE_USER are required for key-pair authentication.');
  }

  const issuer = `${normalizeAccountIdentifier(account)}.${user.toUpperCase()}.${fingerprint}`;
  const subject = `${normalizeAccountIdentifier(account)}.${user.toUpperCase()}`;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: issuer, sub: subject, iat: issuedAt, exp: expiresAt };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKey);
  const signatureBytes = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    textEncoder.encode(signingInput)
  );
  const signature = base64UrlEncode(signatureBytes);
  return { token: `${signingInput}.${signature}`, type: 'KEYPAIR_JWT' };
}

function buildSnowflakeHost(account: string, hostOverride: string) {
  if (hostOverride) {
    return hostOverride;
  }

  const trimmed = account.trim();
  if (trimmed.includes('snowflakecomputing.com')) {
    return trimmed;
  }

  return `${trimmed}.snowflakecomputing.com`;
}

function buildBindings(values: unknown[]) {
  const result: Record<string, { type: string; value: string }> = {};
  let index = 1;

  for (const value of values) {
    if (value === undefined) continue;
    const type = typeof value === 'number'
      ? 'FIXED'
      : typeof value === 'boolean'
      ? 'BOOLEAN'
      : 'TEXT';
    result[String(index)] = { type, value: String(value) };
    index += 1;
  }

  return Object.keys(result).length ? result : undefined;
}

function mapResultSet(result: any) {
  if (!result?.data || !result?.resultSetMetaData?.rowType) return [];
  const columns = result.resultSetMetaData.rowType.map((column: any) => normalizeColumnName(column.name));
  return result.data.map((row: any[]) => Object.fromEntries(columns.map((column: string, index: number) => [column, row[index]])));
}

export async function executeSnowflakeSql(context: any, statement: string, bindingsValues: unknown[] = [], parameters?: any) {
  const apiHost = buildSnowflakeHost(getEnvValue(context, 'SNOWFLAKE_ACCOUNT'), getEnvValue(context, 'SNOWFLAKE_API_HOST'));
  const database = getEnvValue(context, 'SNOWFLAKE_DATABASE');
  const schema = getEnvValue(context, 'SNOWFLAKE_SCHEMA');
  const warehouse = getEnvValue(context, 'SNOWFLAKE_WAREHOUSE');
  const role = getEnvValue(context, 'SNOWFLAKE_ROLE');

  const auth = await getSnowflakeAuth(context);
  const body: any = {
    statement,
    database: database || undefined,
    schema: schema || undefined,
    warehouse: warehouse || undefined,
    role: role || undefined,
    bindings: buildBindings(bindingsValues),
    parameters: parameters || undefined
  };

  const response = await fetch(`https://${apiHost}/api/v2/statements`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      authorization: `Bearer ${auth.token}`,
      'x-snowflake-authorization-token-type': auth.type,
      'user-agent': 'BankingAnalyticsPlatform/1.0'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.message || response.statusText;
    throw new Error(`Snowflake SQL API error ${response.status}: ${message}`);
  }

  return {
    raw: payload,
    rows: mapResultSet(payload),
    stats: payload.stats ?? payload,
    code: payload.code,
    message: payload.message
  };
}
