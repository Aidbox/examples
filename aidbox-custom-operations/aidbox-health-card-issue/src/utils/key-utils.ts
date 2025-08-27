import * as crypto from 'crypto';

/**
 * Generates a consistent key ID based on the public key content
 * Uses SHA-256 hash of the key content and returns first 16 characters
 */
export function generateKeyId(publicKeyPem: string): string {
  const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
  return hash.substring(0, 16);
}

/**
 * Generates a key ID from a file path with fallback to timestamp-based ID
 * Used for configuration loading when file might not exist yet
 */
export function generateKeyIdFromFile(publicKeyPath: string): string {
  try {
    const fs = require('fs');
    const publicKeyPem = fs.readFileSync(publicKeyPath, 'utf8');
    return generateKeyId(publicKeyPem);
  } catch (error) {
    // Fallback to timestamp-based key ID if file doesn't exist yet
    return `key-${Date.now().toString().slice(-8)}`;
  }
}