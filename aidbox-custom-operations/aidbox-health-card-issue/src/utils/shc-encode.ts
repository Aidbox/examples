/**
 * SMART Health Cards delivery encodings (spec §6 QR and §5 file download).
 */

/**
 * Encode a JWS as the numeric `shc:/` QR payload: each character `c` becomes the
 * two-digit number `Ord(c) - 45`. Single-chunk only (multi-chunk is deprecated
 * as of Dec 2022). A compact COVID card fits a single QR.
 */
export function toQrNumeric(jws: string): string {
  let digits = '';
  for (let i = 0; i < jws.length; i++) {
    const v = jws.charCodeAt(i) - 45;
    digits += v.toString().padStart(2, '0');
  }
  return `shc:/${digits}`;
}

/**
 * The `.smart-health-card` file body: a JSON object with a `verifiableCredential`
 * array of one or more JWS strings. Served as `application/smart-health-card`.
 */
export function toFileBody(jws: string | string[]): { verifiableCredential: string[] } {
  return { verifiableCredential: Array.isArray(jws) ? jws : [jws] };
}
