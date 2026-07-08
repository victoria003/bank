const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper to load env variables from a simple parser
function loadDevVars() {
  const envPath = path.join(__dirname, '..', '.dev.vars');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let key = match[1];
      let val = match[2] || '';
      // clean quotes
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.substring(1, val.length - 1);
      }
      env[key] = val.trim();
    }
  });
  return env;
}

const env = loadDevVars();

function base64UrlEncode(value) {
  const bytes = typeof value === 'string'
    ? Array.from(value, (char) => char.charCodeAt(0))
    : Array.from(value);
  const str = String.fromCharCode(...bytes);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function parsePemPrivateKey(pem) {
  const cleaned = pem
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  
  // Base64 decode to buffer
  const padded = cleaned + '='.repeat((4 - (cleaned.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function normalizeAccountIdentifier(account) {
  return account.trim().toUpperCase().replace(/\./g, '-');
}

async function getSnowflakeAuth() {
  const privateKey = env.SNOWFLAKE_PRIVATE_KEY;
  const fingerprint = env.SNOWFLAKE_PUBLIC_KEY_FINGERPRINT;
  const account = env.SNOWFLAKE_ACCOUNT;
  const user = env.SNOWFLAKE_USER;

  if (!privateKey || !fingerprint || !account || !user) {
    throw new Error('Snowflake credentials missing in .dev.vars!');
  }

  const issuer = `${normalizeAccountIdentifier(account)}.${user.toUpperCase()}.${fingerprint}`;
  const subject = `${normalizeAccountIdentifier(account)}.${user.toUpperCase()}`;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3500; // 58 minutes

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: issuer, sub: subject, iat: issuedAt, exp: expiresAt };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const keyBuffer = parsePemPrivateKey(privateKey);
  const privateKeyObject = crypto.createPrivateKey({
    key: keyBuffer,
    format: 'der',
    type: 'pkcs8'
  });

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signingInput);
  const signatureBytes = sign.sign(privateKeyObject);
  const signature = base64UrlEncode(signatureBytes);

  return { token: `${signingInput}.${signature}`, type: 'KEYPAIR_JWT' };
}

async function testQuery() {
  console.log('--- DIRECT SNOWFLAKE TEST ---');
  try {
    const auth = await getSnowflakeAuth();
    const account = normalizeAccountIdentifier(env.SNOWFLAKE_ACCOUNT);
    const host = `${account}.snowflakecomputing.com`;
    const url = `https://${host}/api/v2/statements`;

    console.log(`Connecting to URL: ${url}`);
    console.log(`User: ${env.SNOWFLAKE_USER}`);
    console.log(`Account: ${account}`);
    console.log(`Fingerprint: ${env.SNOWFLAKE_PUBLIC_KEY_FINGERPRINT}`);

    const body = {
      statement: 'SELECT 1 AS TEST_VAL',
      database: env.SNOWFLAKE_DATABASE,
      schema: env.SNOWFLAKE_SCHEMA,
      warehouse: env.SNOWFLAKE_WAREHOUSE,
      role: env.SNOWFLAKE_ROLE
    };

    const headers = {
      'content-type': 'application/json',
      'accept': 'application/json',
      'authorization': `Bearer ${auth.token}`,
      'x-snowflake-authorization-token-type': auth.type,
      'user-agent': 'BankingAnalyticsPlatform/1.0'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log(`Response Status: ${response.status}`);
    console.log('Response Body:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Error executing direct test:', err.message);
  }
}

testQuery();
