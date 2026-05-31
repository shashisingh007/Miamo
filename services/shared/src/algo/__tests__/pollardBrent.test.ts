import { describe, it, expect } from 'vitest';
import { pollardBrent } from '../pollardBrent';

function isFactor(n: bigint, f: bigint): boolean {
  return f > 1n && f < n && n % f === 0n;
}

describe('pollardBrent', () => {
  it('throws on n<=1', () => {
    expect(() => pollardBrent(1n)).toThrow();
    expect(() => pollardBrent(0n)).toThrow();
  });

  it('returns 2 for even', () => {
    expect(pollardBrent(2n * 7919n)).toBe(2n);
    expect(pollardBrent(4n)).toBe(2n);
  });

  it('factors small composite', () => {
    const n = 15n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
  });

  it('factors product of two primes', () => {
    const n = 1009n * 1013n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
    expect([1009n, 1013n]).toContain(f);
  });

  it('factors larger composite', () => {
    const n = 100003n * 100019n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
  });

  it('factors RSA-like', () => {
    const n = 1000003n * 1000033n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
  });

  it('factors square', () => {
    const n = 7919n * 7919n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
    expect(f).toBe(7919n);
  });

  it('factors 9', () => {
    expect(pollardBrent(9n)).toBe(3n);
  });

  it('factors 21', () => {
    const f = pollardBrent(21n);
    expect([3n, 7n]).toContain(f);
  });

  it('multiple seeds yield factor', () => {
    const n = 65537n * 65539n;
    for (const s of [1n, 2n, 3n, 5n, 7n]) {
      const f = pollardBrent(n, s);
      expect(isFactor(n, f)).toBe(true);
    }
  });

  it('big composite', () => {
    const n = 999961n * 999979n;
    const f = pollardBrent(n);
    expect(isFactor(n, f)).toBe(true);
  });

  it('returns bigint', () => {
    expect(typeof pollardBrent(91n)).toBe('bigint');
  });
});
