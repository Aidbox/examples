export interface Config {
  aidbox: {
    baseUrl: string;
    clientId: string;
    clientSecret: string;
  };
  shl: {
    /** Public base URL of this app as reachable by the SHL receiver (used to build manifest/file URLs). */
    publicBaseUrl: string;
    /** Optional viewer URL prepended to the shlink: payload. Must end with '#'. Empty for a bare shlink:. */
    viewerUrl: string;
  };
  rte: {
    /** Simulated real-time eligibility processing delay, in seconds. */
    processingSeconds: number;
  };
  shlPolicy: {
    /** Lifetime incorrect-passcode attempts allowed before a link locks (P flag). */
    passcodeMaxAttempts: number;
    /** Lifetime of a manifest-issued `location` URL, in seconds (spec: ≤ 3600). */
    fileTokenTtlSeconds: number;
    /** Minimum seconds between manifest requests for one link before 429. */
    manifestMinIntervalSeconds: number;
  };
  server: {
    port: number;
  };
}

export function loadConfig(): Config {
  const requiredEnvVars = [
    'AIDBOX_BASE_URL',
    'AIDBOX_CLIENT_ID',
    'AIDBOX_CLIENT_SECRET',
    'SHL_PUBLIC_BASE_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    aidbox: {
      // The Aidbox client prepends "/fhir" itself — pass the bare host here.
      baseUrl: process.env.AIDBOX_BASE_URL!.replace(/\/fhir\/?$/, '').replace(/\/$/, ''),
      clientId: process.env.AIDBOX_CLIENT_ID!,
      clientSecret: process.env.AIDBOX_CLIENT_SECRET!,
    },
    shl: {
      publicBaseUrl: process.env.SHL_PUBLIC_BASE_URL!.replace(/\/$/, ''),
      viewerUrl: process.env.SHL_VIEWER_URL || '',
    },
    rte: {
      processingSeconds: parseInt(process.env.RTE_PROCESSING_SECONDS || '10', 10),
    },
    shlPolicy: {
      passcodeMaxAttempts: parseInt(process.env.SHL_PASSCODE_MAX_ATTEMPTS || '5', 10),
      fileTokenTtlSeconds: parseInt(process.env.SHL_FILE_TOKEN_TTL_SECONDS || '60', 10),
      manifestMinIntervalSeconds: parseInt(
        process.env.SHL_MANIFEST_MIN_INTERVAL_SECONDS || '1',
        10
      ),
    },
    server: {
      port: parseInt(process.env.PORT || '3000', 10),
    },
  };
}
