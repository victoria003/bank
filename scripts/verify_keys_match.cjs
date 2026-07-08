const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..');
const privateKeyPath = path.join(rootDir, 'private_key.pem');
const publicKeyPath = path.join(rootDir, 'public_key.pem');

console.log('--- VERIFYING RSA KEYS ---');

if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ private_key.pem does not exist');
  process.exit(1);
}
if (!fs.existsSync(publicKeyPath)) {
  console.error('❌ public_key.pem does not exist');
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');

// Test signing & verification
try {
  const data = Buffer.from('test-data');
  const signature = crypto.sign('sha256', data, privateKeyPem);
  const verified = crypto.verify('sha256', data, publicKeyPem, signature);
  if (verified) {
    console.log('✅ Key pair match: YES (Private key successfully signs and public key successfully verifies)');
  } else {
    console.log('❌ Key pair match: NO (Verification failed)');
  }
} catch (err) {
  console.error('❌ Error during sign/verify test:', err.message);
}

// Calculate fingerprint
try {
  const pubKeyDer = crypto.createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  const hash = crypto.createHash('sha256').update(pubKeyDer).digest('base64');
  const calculatedFingerprint = `SHA256:${hash}`;
  console.log(`calculatedFingerprint: ${calculatedFingerprint}`);

  // Load .dev.vars
  const devVarsPath = path.join(rootDir, '.dev.vars');
  if (fs.existsSync(devVarsPath)) {
    const content = fs.readFileSync(devVarsPath, 'utf8');
    const match = content.match(/SNOWFLAKE_PUBLIC_KEY_FINGERPRINT\s*=\s*["']?([^"'\r\n]+)/);
    if (match) {
      const configuredFingerprint = match[1];
      console.log(`configuredFingerprint:  ${configuredFingerprint}`);
      if (calculatedFingerprint === configuredFingerprint) {
        console.log('✅ Fingerprint matches .dev.vars configuration: YES');
      } else {
        console.log('❌ Fingerprint matches .dev.vars configuration: NO');
      }
    } else {
      console.log('⚠️ SNOWFLAKE_PUBLIC_KEY_FINGERPRINT not found in .dev.vars');
    }
  } else {
    console.log('⚠️ .dev.vars does not exist');
  }
} catch (err) {
  console.error('❌ Error during fingerprint calculation:', err.message);
}
