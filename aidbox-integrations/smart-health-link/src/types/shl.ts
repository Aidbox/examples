/**
 * SMART Health Links domain types.
 * Spec: https://hl7.org/fhir/uv/smart-health-cards-and-links/STU1/links-specification.html
 */

/** The JSON payload that gets base64url-encoded into a `shlink:` URI. */
export interface SHLPayload {
  /** Manifest URL for this SMART Health Link. */
  url: string;
  /** 43-char base64url of 32 random bytes — the AES key all files are encrypted under. */
  key: string;
  /** Optional expiration time, epoch seconds. */
  exp?: number;
  /** Single-char flags concatenated alphabetically: L (long-term), P (passcode), U (direct file). */
  flag?: string;
  /** Short (<=80 char) human description of the data. */
  label?: string;
  /** Protocol version (defaults to 1). */
  v?: number;
}

/** Content types the SHL protocol uses for manifest files. */
export type SHLFileContentType =
  | 'application/smart-health-card'
  | 'application/fhir+json'
  | 'application/smart-api-access';

/** One entry in the manifest `files` array. */
export interface ManifestFile {
  contentType: SHLFileContentType;
  /** Short-lived, single-use URL to fetch the JWE. Present unless `embedded` is used. */
  location?: string;
  /** The JWE compact serialization inlined directly. Present when small enough. */
  embedded?: string;
}

/** Manifest response body returned to the SHL receiver. */
export interface ManifestResponse {
  /**
   * Lifecycle status of the manifest contents:
   * - can-change: contents may still evolve (our RTE job is still running)
   * - finalized: contents are stable (result is ready)
   * - no-longer-valid: link is expired/revoked
   */
  status: 'can-change' | 'finalized' | 'no-longer-valid';
  files: ManifestFile[];
}

/** Status of the simulated real-time eligibility (RTE) job behind an SHL. */
export type EligibilityJobStatus = 'pending' | 'ready';
