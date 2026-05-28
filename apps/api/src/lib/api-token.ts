/**
 * API token helpers.
 *
 * Token format: `synapse_<32 base32 chars>`. The prefix lets a user
 * recognise a leaked token at a glance; the body is 160 bits of
 * crypto.getRandomValues entropy. Only the SHA-256 hex hash hits the
 * DB — the plaintext is shown exactly once at creation.
 *
 * Web Crypto is portable across workerd, Node 22, and Bun without
 * polyfills.
 */
const PREFIX = 'synapse_';
const BODY_BYTES = 20; // 160 bits

const encoder = new TextEncoder();

/** Generate a new plaintext token. Caller must hash + persist immediately. */
export function generateToken(): string {
  const bytes = new Uint8Array(BODY_BYTES);
  crypto.getRandomValues(bytes);
  return PREFIX + base32(bytes);
}

export async function hashToken(plaintext: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(plaintext));
  return hex(new Uint8Array(buf));
}

/** Display-only short fingerprint (last 8 chars). */
export function tokenSuffix(plaintext: string): string {
  return plaintext.slice(-8);
}

export function isPlausibleToken(value: string): boolean {
  return value.startsWith(PREFIX) && value.length >= PREFIX.length + 16;
}

// --- helpers -----------------------------------------------------------------

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

function hex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}
