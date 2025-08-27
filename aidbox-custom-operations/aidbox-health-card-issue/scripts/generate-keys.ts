#!/usr/bin/env npx ts-node

import * as jose from 'jose';
import * as fs from 'fs/promises';
import * as path from 'path';
import { generateKeyId } from '../src/utils/key-utils';

const KEYS_DIR = path.join(__dirname, '..', 'keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private-key.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public-key.pem');
const JWK_PATH = path.join(KEYS_DIR, 'public-key.jwk.json');

async function generateKeys(): Promise<void> {
  try {
    // Ensure keys directory exists
    await fs.mkdir(KEYS_DIR, { recursive: true });

    console.log('Generating ES256 key pair for SMART Health Cards...');

    // Generate key pair
    const { publicKey, privateKey } = await jose.generateKeyPair('ES256', {
      extractable: true,
    });

    // Export private key in PKCS#8 format
    const privateKeyPem = await jose.exportPKCS8(privateKey);
    await fs.writeFile(PRIVATE_KEY_PATH, privateKeyPem, 'utf8');
    console.log(`Private key saved to: ${PRIVATE_KEY_PATH}`);

    // Export public key in SPKI format
    const publicKeyPem = await jose.exportSPKI(publicKey);
    await fs.writeFile(PUBLIC_KEY_PATH, publicKeyPem, 'utf8');
    console.log(`Public key saved to: ${PUBLIC_KEY_PATH}`);

    // Export public key as JWK
    const jwk = await jose.exportJWK(publicKey);

    // Generate consistent key ID using shared utility
    const keyId = generateKeyId(publicKeyPem);

    // Add required fields for SMART Health Cards
    const healthCardJwk = {
      ...jwk,
      kty: 'EC',
      use: 'sig',
      alg: 'ES256',
      kid: keyId,
      crv: 'P-256',
    };

    await fs.writeFile(JWK_PATH, JSON.stringify(healthCardJwk, null, 2), 'utf8');
    console.log(`Public key JWK saved to: ${JWK_PATH}`);


    console.log('✅ Key generation completed successfully!');

  } catch (error) {
    console.error('Failed to generate keys:', error);
    process.exit(1);
  }
}


if (require.main === module) {
  generateKeys()
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}
