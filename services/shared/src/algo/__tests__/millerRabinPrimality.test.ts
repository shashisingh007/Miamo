import { describe, it, expect } from 'vitest';
import { millerRabinIsPrime } from '../millerRabinPrimality';

describe('millerRabinIsPrime', () => {
  it('< 2 => false', () => {
    expect(millerRabinIsPrime(0)).toBe(false);
    expect(millerRabinIsPrime(1)).toBe(false);
    expect(millerRabinIsPrime(-7)).toBe(false);
  });

  it('2 and 3 are prime', () => {
    expect(millerRabinIsPrime(2)).toBe(true);
    expect(millerRabinIsPrime(3)).toBe(true);
  });

  it('small primes', () => {
    for (const p of [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]) {
      expect(millerRabinIsPrime(p)).toBe(true);
    }
  });

  it('small composites', () => {
    for (const c of [4, 6, 8, 9, 10, 12, 14, 15, 16, 21, 25]) {
      expect(millerRabinIsPrime(c)).toBe(false);
    }
  });

  it('large prime 7919', () => {
    expect(millerRabinIsPrime(7919)).toBe(true);
  });

  it('Mersenne-like 8191', () => {
    expect(millerRabinIsPrime(8191)).toBe(true);
  });

  it('large composite 7921 = 89*89', () => {
    expect(millerRabinIsPrime(7921)).toBe(false);
  });

  it('large prime 999983', () => {
    expect(millerRabinIsPrime(999983)).toBe(true);
  });

  it('large composite 999999', () => {
    expect(millerRabinIsPrime(999999)).toBe(false);
  });

  it('accepts bigint', () => {
    expect(millerRabinIsPrime(2n ** 31n - 1n)).toBe(true); // 2147483647 prime
  });

  it('bigint composite', () => {
    expect(millerRabinIsPrime(2n ** 31n)).toBe(false);
  });

  it('Carmichael 561 detected as composite', () => {
    expect(millerRabinIsPrime(561)).toBe(false);
  });

  it('Carmichael 1729 detected as composite', () => {
    expect(millerRabinIsPrime(1729)).toBe(false);
  });

  it('cross-check vs trial division for 0..200', () => {
    const ref = (n: number) => {
      if (n < 2) return false;
      for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
      return true;
    };
    for (let n = 0; n <= 200; n++) {
      expect(millerRabinIsPrime(n)).toBe(ref(n));
    }
  });
});
