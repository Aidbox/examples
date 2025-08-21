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

import { generateKeyIdFromFile } from '../utils/key-utils';

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

  // Generate default values for optional JWKS settings
  const publicKeyPath =
    process.env.JWKS_PUBLIC_KEY_PATH || './keys/public-key.pem';
  const keyId = process.env.JWKS_KEY_ID || generateKeyIdFromFile(publicKeyPath);

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

