import { base64url } from 'jose';
import type { SHLPayload } from '../types/shl.ts';

/**
 * Encode an SHL payload into a `shlink:` URI.
 *
 *   1. minify the JSON payload
 *   2. base64url-encode it
 *   3. prefix with `shlink:/`
 *   4. optionally prepend a viewer URL ending in `#`
 *
 * e.g. https://viewer.example.org#shlink:/eyJ1cmwiOiI...
 */
export function encodeShlink(payload: SHLPayload, viewerUrl = ''): string {
  const json = JSON.stringify(payload);
  const encoded = base64url.encode(new TextEncoder().encode(json));
  return `${viewerUrl}shlink:/${encoded}`;
}

/** Decode a `shlink:` URI (with or without a viewer prefix) back to its payload. */
export function decodeShlink(shlink: string): SHLPayload {
  const marker = 'shlink:/';
  const idx = shlink.indexOf(marker);
  if (idx === -1) {
    throw new Error('Not a shlink: URI');
  }
  const encoded = shlink.slice(idx + marker.length);
  const json = new TextDecoder().decode(base64url.decode(encoded));
  return JSON.parse(json) as SHLPayload;
}
