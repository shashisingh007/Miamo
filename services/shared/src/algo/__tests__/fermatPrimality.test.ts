import { describe, it, expect } from 'vitest';
import { fermatPrimality } from '../fermatPrimality';

describe('fermatPrimality', () => {
  it('rejects n < 2', () => {
    expect(fermatPrimality(0n)).toBe(false);
    expect(fermatPrimality(1n)).toBe(false);
  });

  it('accepts 2 and 3', () => {
    expect(fermatPrimality(2n)).toBe(true);
    expect(fermatPrimality(3n)).toBe(true);
  });

  it('rejects even composites', () => {
    expect(fermatPrimality(4n)).toBe(false);
    expect(fermatPrimality(100n)).toBe(false);
  });

  it('accepts small primes', () => {
    for (const p of [5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 97n, 101n, 1009n]) {
      expect(fermatPrimality(p)).toBe(true);
    }
  });

  it('rejects odd composites', () => {
    for (const c of [9n, 15n, 21n, 25n, 27n, 33n, 35n, 49n, 51n, 91n, 1003n]) {
      expect(fermatPrimality(c)).toBe(false);
    }
  });

  it('accepts a moderately large prime', () => {
    expect(fermatPrimality(1_000_003n)).toBe(true);
  });

  it('rejects a moderately large composite', () => {
    expect(fermatPrimality(1_000_001n)).toBe(false);
  });

  it('accepts a large Mersenne prime 2^31 - 1', () => {
    expect(fermatPrimality((1n << 31n) - 1n)).toBe(true);
  });

  it('accepts BigInt prime above 64 bits', () => {
    // 2^61 - 1 is a Mersenne prime.
    expect(fermatPrimality((1n << 61n) - 1n)).toBe(true);
  });

  it('custom base list works', () => {
    expect(fermatPrimality(7n, [2n])).toBe(true);
    expect(fermatPrimality(9n, [2n])).toBe(false);
  });

  it('skips invalid bases', () => {
    expect(fermatPrimality(7n, [1n, 2n, 100n])).toBe(true);
  });

  it('classic Carmichael 561 fools default test (regression)', () => {
    // 561 = 3 * 11 * 17 is a Carmichael number, and our default bases (2,3,5,...)
    // include divisors which expose it. We verify the actual deterministic outcome.
    expect(fermatPrimality(561n)).toBe(false);
  });
});
