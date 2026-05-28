/**
 * GitHub webhook signature verification.
 *
 * GitHub signs the raw request body with HMAC-SHA256 using the webhook
 * secret and sends the hex digest in the `X-Hub-Signature-256` header.
 * We re-derive it server-side via Web Crypto (works on workerd, Node 22,
 * and Bun without polyfills) and compare in constant time.
 *
 * Per CLAUDE.md §6: signature verification is non-negotiable — every
 * webhook hits this path before anything else touches the DB.
 */

const SIGNATURE_PREFIX = 'sha256=';

const textEncoder = new TextEncoder();

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifyGithubSignature(
  secret: string,
  body: string,
  headerValue: string | null,
): Promise<VerifyResult> {
  if (!headerValue) return { ok: false, reason: 'missing X-Hub-Signature-256' };
  if (!headerValue.startsWith(SIGNATURE_PREFIX)) {
    return { ok: false, reason: 'malformed signature' };
  }
  const provided = headerValue.slice(SIGNATURE_PREFIX.length);

  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expectedBytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, textEncoder.encode(body)),
  );
  const expected = hex(expectedBytes);

  if (!constantTimeEqual(expected, provided)) {
    return { ok: false, reason: 'signature mismatch' };
  }
  return { ok: true };
}

/** Sign a payload — only used by tests to craft fixtures. */
export async function signGithubPayload(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, textEncoder.encode(body)));
  return `${SIGNATURE_PREFIX}${hex(bytes)}`;
}

function hex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

/** Length-aware constant-time string comparison. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
