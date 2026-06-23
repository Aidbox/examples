import { CompactEncrypt, compactDecrypt, base64url } from 'jose';

/**
 * Crypto helpers for SMART Health Links.
 *
 * Every file shared through an SHL is encrypted with AES-256-GCM using a single
 * 32-byte key that travels inside the `shlink:` payload. Whoever holds that key
 * (the client that minted the link) can decrypt; nobody else can — which is
 * exactly the "only the client that kicked off the job can read it" property
 * the use case requires. The server stores only ciphertext.
 */

/** Generate a fresh 32-byte content-encryption key, base64url-encoded (43 chars). */
export function generateShlKey(): string {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  return base64url.encode(raw);
}

/**
 * Encrypt a UTF-8 string into a JWE compact serialization using direct (`dir`)
 * AES-256-GCM encryption. `cty` records the decrypted payload's content type per spec.
 */
export async function encryptToJwe(
  plaintext: string,
  keyB64url: string,
  contentType: string
): Promise<string> {
  const key = base64url.decode(keyB64url);
  return new CompactEncrypt(new TextEncoder().encode(plaintext))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM', cty: contentType })
    .encrypt(key);
}

/** Decrypt a JWE compact serialization back to its UTF-8 plaintext. */
export async function decryptJwe(jwe: string, keyB64url: string): Promise<string> {
  const key = base64url.decode(keyB64url);
  const { plaintext } = await compactDecrypt(jwe, key);
  return new TextDecoder().decode(plaintext);
}
