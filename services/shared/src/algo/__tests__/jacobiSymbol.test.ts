import { describe, it, expect } from 'vitest';
import { jacobiSymbol } from '../jacobiSymbol';

describe('jacobiSymbol', () => {
  it('rejects even n', () => {
    expect(() => jacobiSymbol(1, 4)).toThrow();
  });

  it('rejects zero/negative n', () => {
    expect(() => jacobiSymbol(1, 0)).toThrow();
    expect(() => jacobiSymbol(1, -3)).toThrow();
  });

  it('a=0 => 0 for n>1', () => {
    expect(jacobiSymbol(0, 3)).toBe(0);
    expect(jacobiSymbol(0, 15)).toBe(0);
  });

  it('gcd(a,n) > 1 => 0', () => {
    expect(jacobiSymbol(3, 9)).toBe(0);
    expect(jacobiSymbol(15, 21)).toBe(0);
  });

  it('agrees with Legendre for primes', () => {
    // (2/7)=1, (3/7)=-1
    expect(jacobiSymbol(2, 7)).toBe(1);
    expect(jacobiSymbol(3, 7)).toBe(-1);
    expect(jacobiSymbol(5, 11)).toBe(1);
    expect(jacobiSymbol(2, 11)).toBe(-1);
  });

  it('multiplicativity in numerator (mod 15)', () => {
    // (2/15)*(7/15) = (14/15)
    const j2 = jacobiSymbol(2, 15);
    const j7 = jacobiSymbol(7, 15);
    const j14 = jacobiSymbol(14, 15);
    expect(j2 * j7).toBe(j14);
  });

  it('multiplicativity in denominator (n=15=3*5)', () => {
    // (a/15) = (a/3)*(a/5)
    for (const a of [1, 2, 4, 7, 8, 11, 13, 14]) {
      const j15 = jacobiSymbol(a, 15);
      const j3 = jacobiSymbol(a, 3);
      const j5 = jacobiSymbol(a, 5);
      expect(j15).toBe(j3 * j5);
    }
  });

  it('(1/n) = 1 for any odd n', () => {
    for (const n of [3, 5, 7, 9, 15, 21, 35, 105]) expect(jacobiSymbol(1, n)).toBe(1);
  });

  it('(-1/n) follows n mod 4', () => {
    expect(jacobiSymbol(-1, 5)).toBe(1);
    expect(jacobiSymbol(-1, 7)).toBe(-1);
    expect(jacobiSymbol(-1, 9)).toBe(1);
    expect(jacobiSymbol(-1, 15)).toBe(-1); // (-1/3)*(-1/5) = -1*1 = -1
  });

  it('(2/n) follows n mod 8', () => {
    // (2/n) = 1 if n ≡ ±1 mod 8, -1 if n ≡ ±3 mod 8
    expect(jacobiSymbol(2, 7)).toBe(1); // 7 mod 8 = 7 = -1
    expect(jacobiSymbol(2, 17)).toBe(1); // 17 mod 8 = 1
    expect(jacobiSymbol(2, 11)).toBe(-1); // 11 mod 8 = 3
    expect(jacobiSymbol(2, 13)).toBe(-1); // 13 mod 8 = 5 = -3
  });

  it('handles bigint', () => {
    expect(jacobiSymbol(1001n, 9907n)).toBe(jacobiSymbol(1001, 9907));
  });

  it('n=1 => always 1', () => {
    expect(jacobiSymbol(0, 1)).toBe(1);
    expect(jacobiSymbol(7, 1)).toBe(1);
  });
});
