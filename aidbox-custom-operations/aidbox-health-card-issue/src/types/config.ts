import * as fs from 'fs';

export interface Config {
  aidbox: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
  healthCards: {
    issuer: string;
    keyPath: string;
  };
  jwks: {
    keyId: string;
    publicKeyPath: string;
  };
  server: {
    port: number;
  };
}

/**
 * Reads the `kid` from the generated JWK file so that the signing `kid`
 * (used in the JWS header) is always identical to the `kid` published in the
 * JWKS. The JWK is written by `scripts/generate-keys.ts` with
 * `kid` = base64url SHA-256 JWK Thumbprint (RFC 7638), as the spec requires.
 */
function readKeyIdFromJwk(publicKeyPath: string): string {
  const jwkPath = publicKeyPath.replace('.pem', '.jwk.json');
  try {
    const jwk = JSON.parse(fs.readFileSync(jwkPath, 'utf8'));
    if (!jwk.kid) {
      throw new Error('JWK is missing "kid"');
    }
    return jwk.kid;
  } catch (error) {
    throw new Error(
      `Failed to read key id from ${jwkPath}. Run "npm run generate-keys" first. (${error})`
    );
  }
}

export function loadConfig(): Config {
  const requiredEnvVars = [
    'AIDBOX_BASE_URL',
    'AIDBOX_CLIENT_ID',
    'AIDBOX_CLIENT_SECRET',
    'HEALTH_CARDS_ISSUER',
    'HEALTH_CARDS_KEY_PATH',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  const publicKeyPath =
    process.env.JWKS_PUBLIC_KEY_PATH || './keys/public-key.pem';
  // kid is derived from the JWK thumbprint; JWKS_KEY_ID may override for testing.
  const keyId = process.env.JWKS_KEY_ID || readKeyIdFromJwk(publicKeyPath);

  return {
    aidbox: {
      baseUrl: process.env.AIDBOX_BASE_URL!,
      clientId: process.env.AIDBOX_CLIENT_ID!,
      clientSecret: process.env.AIDBOX_CLIENT_SECRET!,
    },
    healthCards: {
      issuer: process.env.HEALTH_CARDS_ISSUER!,
      keyPath: process.env.HEALTH_CARDS_KEY_PATH!,
    },
    jwks: {
      keyId,
      publicKeyPath,
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
    },
  };
}
