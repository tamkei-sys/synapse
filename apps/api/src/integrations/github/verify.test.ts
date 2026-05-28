import { describe, expect, it } from 'vitest';

import { signGithubPayload, verifyGithubSignature } from './verify.js';

const SECRET = 'unit-test-secret';
const SAMPLE = JSON.stringify({ action: 'opened', issue: { number: 1 } });

describe('verifyGithubSignature', () => {
  it('accepts a valid signature', async () => {
    const sig = await signGithubPayload(SECRET, SAMPLE);
    const result = await verifyGithubSignature(SECRET, SAMPLE, sig);
    expect(result).toEqual({ ok: true });
  });

  it('rejects a tampered body', async () => {
    const sig = await signGithubPayload(SECRET, SAMPLE);
    const result = await verifyGithubSignature(SECRET, SAMPLE + '\n', sig);
    expect(result.ok).toBe(false);
  });

  it('rejects a wrong secret', async () => {
    const sig = await signGithubPayload('other-secret', SAMPLE);
    const result = await verifyGithubSignature(SECRET, SAMPLE, sig);
    expect(result.ok).toBe(false);
  });

  it('rejects a missing header', async () => {
    const result = await verifyGithubSignature(SECRET, SAMPLE, null);
    expect(result).toEqual({ ok: false, reason: 'missing X-Hub-Signature-256' });
  });

  it('rejects a malformed header', async () => {
    const result = await verifyGithubSignature(SECRET, SAMPLE, 'deadbeef');
    expect(result).toEqual({ ok: false, reason: 'malformed signature' });
  });

  it('produces signatures with the documented prefix and length', async () => {
    const sig = await signGithubPayload(SECRET, SAMPLE);
    expect(sig).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});
