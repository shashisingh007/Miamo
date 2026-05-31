import { describe, it, expect } from 'vitest';
import { tonelliShanksSqrt, tonelliShanksRoot } from '../tonelliShanksRoot';

describe('tonelliShanksRoot', () => {
  it('factory exposes function', () => {
    const api = tonelliShanksRoot();
    expect(typeof api.tonelliShanksSqrt).toBe('function');
  });

  it('p=2 trivial', () => {
    expect(tonelliShanksSqrt(0n, 2n)).toBe(0n);
    expect(tonelliShanksSqrt(1n, 2n)).toBe(1n);
  });

  it('sqrt(0) = 0', () => {
    expect(tonelliShanksSqrt(0n, 7n)).toBe(0n);
  });

  it('non-residue returns null (e.g. n=2 mod p=5)', () => {
    expect(tonelliShanksSqrt(2n, 5n)).toBe(null);
  });

  it('small prime p=13, n=10 has roots', () => {
    const r = tonelliShanksSqrt(10n, 13n);
    expect(r).not.toBeNull();
    expect((r! * r!) % 13n).toBe(10n);
  });

  it('p ≡ 3 mod 4 fast path', () => {
    const p = 7n;
    for (let n = 0n; n < p; n += 1n) {
      const r = tonelliShanksSqrt(n, p);
      if (r !== null) expect((r * r) % p).toBe(n);
    }
  });

  it('p ≡ 1 mod 4 general path', () => {
    const p = 17n;
    for (let n = 0n; n < p; n += 1n) {
      const r = tonelliShanksSqrt(n, p);
      if (r !== null) expect((r * r) % p).toBe(n);
    }
  });

  it('large prime', () => {
    const p = (1n << 61n) - 1n; // Mersenne prime
    const n = 25n;
    const r = tonelliShanksSqrt(n, p);
    expect(r).not.toBeNull();
    expect((r! * r!) % p).toBe(n % p);
  });

  it('roots come in pairs r and p-r', () => {
    const p = 41n;
    const n = 25n;
    const r = tonelliShanksSqrt(n, p);
    expect(r).not.toBeNull();
    const r2 = (p - r!) % p;
    expect((r2 * r2) % p).toBe(n);
  });

  it('throws on bad input', () => {
    expect(() => tonelliShanksSqrt(1 as any, 7n)).toThrow();
    expect(() => tonelliShanksSqrt(1n, 7 as any)).toThrow();
    expect(() => tonelliShanksSqrt(1n, 1n)).toThrow();
  });

  it('handles negative n via modular reduction', () => {
    const p = 13n;
    const r = tonelliShanksSqrt(-3n, p);
    if (r !== null) expect(((r * r) % p + p) % p).toBe(((-3n) % p + p) % p);
  });
});
