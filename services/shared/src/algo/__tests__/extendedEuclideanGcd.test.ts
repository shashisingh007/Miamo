import { describe, it, expect } from 'vitest';
import { extendedEuclideanGcd, modularInverse } from '../extendedEuclideanGcd';

describe('extendedEuclideanGcd', () => {
  it('throws on non-integer', () => {
    expect(() => extendedEuclideanGcd(1.5, 2)).toThrow(RangeError);
  });

  it('gcd(0,0) = 0', () => {
    const r = extendedEuclideanGcd(0, 0);
    expect(r.gcd).toBe(0);
  });

  it('gcd(0,5) = 5', () => {
    expect(extendedEuclideanGcd(0, 5).gcd).toBe(5);
  });

  it('gcd(5,0) = 5', () => {
    expect(extendedEuclideanGcd(5, 0).gcd).toBe(5);
  });

  it('gcd(12,18) = 6', () => {
    expect(extendedEuclideanGcd(12, 18).gcd).toBe(6);
  });

  it('Bezout identity holds', () => {
    const pairs: Array<[number, number]> = [[12, 18], [240, 46], [99, 78], [101, 13]];
    for (const [a, b] of pairs) {
      const { gcd, x, y } = extendedEuclideanGcd(a, b);
      expect(a * x + b * y).toBe(gcd);
    }
  });

  it('handles coprime', () => {
    expect(extendedEuclideanGcd(7, 11).gcd).toBe(1);
  });

  it('negative inputs => positive gcd', () => {
    expect(extendedEuclideanGcd(-12, 18).gcd).toBe(6);
    expect(extendedEuclideanGcd(12, -18).gcd).toBe(6);
    expect(extendedEuclideanGcd(-12, -18).gcd).toBe(6);
  });

  it('large coprime', () => {
    expect(extendedEuclideanGcd(1000003, 999983).gcd).toBe(1);
  });

  it('modularInverse throws on m<=0', () => {
    expect(() => modularInverse(3, 0)).toThrow(RangeError);
    expect(() => modularInverse(3, -7)).toThrow(RangeError);
  });

  it('modularInverse throws when no inverse', () => {
    expect(() => modularInverse(6, 9)).toThrow(RangeError);
  });

  it('modularInverse 3 mod 11 = 4', () => {
    const inv = modularInverse(3, 11);
    expect((3 * inv) % 11).toBe(1);
  });

  it('modularInverse 17 mod 3120 = 2753', () => {
    const inv = modularInverse(17, 3120);
    expect((17 * inv) % 3120).toBe(1);
  });

  it('modularInverse handles negative a', () => {
    const inv = modularInverse(-3, 11);
    expect(((-3 * inv) % 11 + 11) % 11).toBe(1);
  });

  it('modularInverse non-integer throws', () => {
    expect(() => modularInverse(1.5, 11)).toThrow(RangeError);
  });
});
