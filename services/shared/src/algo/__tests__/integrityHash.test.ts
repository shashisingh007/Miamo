import { describe, it, expect } from 'vitest';
import { integrityHash, verifyIntegrity } from '../integrityHash';

describe('integrityHash', () => {
  it('returns a 64-char lowercase hex digest', () => {
    const h = integrityHash({ a: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is stable across key order', () => {
    expect(integrityHash({ a: 1, b: 2 })).toBe(integrityHash({ b: 2, a: 1 }));
  });

  it('changes when payload changes', () => {
    expect(integrityHash({ a: 1 })).not.toBe(integrityHash({ a: 2 }));
    expect(integrityHash([1, 2])).not.toBe(integrityHash([2, 1]));
  });

  it('matches the known SHA-256 of a string', () => {
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(integrityHash('hello'))
      .toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('verifyIntegrity accepts a matching hex', () => {
    const payload = { user: 'u1', score: 0.9 };
    expect(verifyIntegrity(payload, integrityHash(payload))).toBe(true);
  });

  it('verifyIntegrity is case-insensitive on the expected hex', () => {
    const payload = { x: 1 };
    expect(verifyIntegrity(payload, integrityHash(payload).toUpperCase())).toBe(true);
  });

  it('verifyIntegrity rejects mutated payload', () => {
    const payload = { x: 1 };
    const tag = integrityHash(payload);
    expect(verifyIntegrity({ x: 2 }, tag)).toBe(false);
  });

  it('verifyIntegrity rejects malformed hex', () => {
    expect(verifyIntegrity({ x: 1 }, 'not-hex')).toBe(false);
    expect(verifyIntegrity({ x: 1 }, '')).toBe(false);
    expect(verifyIntegrity({ x: 1 }, 'a'.repeat(63))).toBe(false);
    expect(verifyIntegrity({ x: 1 }, 'g'.repeat(64))).toBe(false);
  });

  it('handles null, arrays, nested objects', () => {
    expect(integrityHash(null)).toMatch(/^[0-9a-f]{64}$/);
    expect(integrityHash([{ a: 1, b: [2, 3] }])).toMatch(/^[0-9a-f]{64}$/);
  });
});
