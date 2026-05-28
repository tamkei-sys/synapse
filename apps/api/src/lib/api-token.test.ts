import { describe, expect, it } from 'vitest';

import { generateToken, hashToken, isPlausibleToken, tokenSuffix } from './api-token.js';

describe('api-token helpers', () => {
  it('generates plaintext with the documented prefix', () => {
    const t = generateToken();
    expect(t).toMatch(/^synapse_[a-z2-7]+$/);
    expect(isPlausibleToken(t)).toBe(true);
  });

  it('produces 64-char sha256 hex hash', async () => {
    const h = await hashToken('synapse_aaaaaaaaaaaaaa');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hashes deterministically', async () => {
    const t = generateToken();
    expect(await hashToken(t)).toBe(await hashToken(t));
  });

  it('hashes differently for different inputs', async () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(await hashToken(a)).not.toBe(await hashToken(b));
  });

  it('suffix is the last 8 chars', () => {
    const t = 'synapse_abcdefghij';
    expect(tokenSuffix(t)).toBe('cdefghij');
  });

  it('rejects obviously bad tokens', () => {
    expect(isPlausibleToken('hello')).toBe(false);
    expect(isPlausibleToken('synapse_')).toBe(false);
    expect(isPlausibleToken('not_synapse_aaaaaaaaaaaaaaaa')).toBe(false);
  });
});
