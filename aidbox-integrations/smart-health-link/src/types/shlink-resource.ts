import type { EligibilityJobStatus } from './shl.ts';

/**
 * Custom Aidbox resource that persists the state of one SMART Health Link.
 *
 * Registered as a first-class resource type via the init bundle. This is the
 * server-side record behind a `shlink:` — the receiver never sees it directly.
 *
 * Security note: we persist `key` so the background worker can encrypt the RTE
 * result once it's ready (the result lands *after* the link is minted, and the
 * link is long-term / `L`). The key is the only secret that makes the encrypted
 * file readable; in production you would keep it out of long-term storage (e.g.
 * hold it only in the worker, or encrypt-on-write and discard).
 */
/** A short-lived, single manifest-issued handle to the encrypted file (the SHL `location` URL). */
export interface FileToken {
  /** Random opaque token used in the file URL. */
  token: string;
  /** Epoch-ms after which the token is dead (spec: ≤ 1 hour). */
  expiresAtMs: number;
}

export interface SHLinkResource {
  resourceType: 'SHLink';
  id?: string;
  /** Content-encryption key (43-char base64url of 32 bytes). */
  key: string;
  /** Human label surfaced in the shlink: payload. */
  label: string;
  /** Status of the underlying RTE job. */
  jobStatus: EligibilityJobStatus;
  /**
   * What the link carries. SHL is content-agnostic — this is the media type of
   * the decrypted bytes (e.g. application/fhir+json, application/smart-health-card).
   */
  contentType?: string;
  /**
   * Optional reference to whatever resource produced the encrypted content
   * (e.g. CoverageEligibilityResponse/123). Kept generic — the link doesn't
   * care what kind of resource it points at.
   */
  sourceRef?: string;
  /** The encrypted (JWE) result file, populated when the job finishes. */
  encryptedFile?: string;
  /** Epoch-seconds expiration mirrored into the shlink: payload. */
  exp?: number;

  // --- passcode (P flag) ---
  /** Passcode required to resolve the manifest, if the P flag is set. */
  passcode?: string;
  /** Remaining incorrect-passcode attempts over the link's whole lifetime. */
  remainingAttempts?: number;

  // --- location file tokens (short-lived `location` URLs) ---
  /** Active file tokens minted by manifest requests. */
  fileTokens?: FileToken[];

  // --- manifest poll throttle (429 / Retry-After) ---
  /** Epoch-ms of the most recent manifest request, for rate-limiting. */
  lastManifestAtMs?: number;
}
