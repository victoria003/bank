const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Helper to load env variables from a simple parser
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
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

console.log('Generating 2048-bit RSA key pair for Snowflake Authentication...');

// Generate key pair
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Calculate fingerprint: DER representation of public key, SHA256 hashed, Base64 encoded
const pubKeyDer = crypto.createPublicKey(publicKey).export({ type: 'spki', format: 'der' });
const hash = crypto.createHash('sha256').update(pubKeyDer).digest('base64');
const fingerprint = `SHA256:${hash}`;

// Save files
const rootDir = path.join(__dirname, '..');
const privateKeyPath = path.join(rootDir, 'private_key.pem');
const publicKeyPath = path.join(rootDir, 'public_key.pem');

fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
fs.writeFileSync(publicKeyPath, publicKey, 'utf8');

// Load environment to check username
const env = loadEnv();
const snowflakeUser = env.SNOWFLAKE_USER || '<YOUR_SNOWFLAKE_USERNAME>';

// Format public key for Snowflake (strip headers and whitespace)
const cleanPubKey = publicKey
  .replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '')
  .replace(/\s+/g, '');

console.log('\n==================================================');
console.log('🔑 RSA KEY PAIR GENERATED SUCCESSFULLY');
console.log('==================================================');
console.log(`\n1. Private Key saved to: ${privateKeyPath}`);
console.log(`2. Public Key saved to:  ${publicKeyPath}`);
console.log(`\n==================================================`);
console.log('👉 STEP 1: CONFIGURE PUBLIC KEY IN SNOWFLAKE');
console.log('==================================================');
console.log('Run the following SQL statement in your Snowflake worksheet:\n');
console.log(`ALTER USER "${snowflakeUser}" SET RSA_PUBLIC_KEY='${cleanPubKey}';`);
console.log('\n==================================================');
console.log('👉 STEP 2: CLOUDFLARE PAGES ENVIRONMENT VARIABLES');
console.log('==================================================');
console.log('Add the following variables to your Cloudflare Pages dashboard (under Settings > Environment Variables) or your local .env / .dev.vars file:\n');
console.log(`SNOWFLAKE_PUBLIC_KEY_FINGERPRINT="${fingerprint}"`);
console.log('\nFor SNOWFLAKE_PRIVATE_KEY, copy the contents of the generated private_key.pem file and paste it in.');
console.log('Or use this single-line representation (with escaped newlines) for files/variables that require single-line formats:');
const escapedPrivateKey = privateKey.replace(/\r?\n/g, '\\n');
console.log(`\nSNOWFLAKE_PRIVATE_KEY="${escapedPrivateKey}"`);
console.log('\n==================================================\n');
