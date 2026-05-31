import { describe, it, expect } from 'vitest';
import { gcdBezout, modInverseBezout } from '../gcdBezout';

describe('gcdBezout', () => {
  it('coprime', () => {
    const r = gcdBezout(5, 3);
    expect(r.gcd).toBe(1n);
    expect(r.x * 5n + r.y * 3n).toBe(1n);
  });

  it('shared factor', () => {
    const r = gcdBezout(12, 18);
    expect(r.gcd).toBe(6n);
    expect(r.x * 12n + r.y * 18n).toBe(6n);
  });

  it('a divides b', () => {
    const r = gcdBezout(7, 21);
    expect(r.gcd).toBe(7n);
    expect(r.x * 7n + r.y * 21n).toBe(7n);
  });

  it('one zero', () => {
    const r = gcdBezout(0, 9);
    expect(r.gcd).toBe(9n);
    expect(r.x * 0n + r.y * 9n).toBe(9n);
  });

  it('both zero => 0', () => {
    const r = gcdBezout(0, 0);
    expect(r.gcd).toBe(0n);
  });

  it('large bigints', () => {
    const a = 12345678901234567890n;
    const b = 98765432109876543210n;
    const r = gcdBezout(a, b);
    expect(r.x * a + r.y * b).toBe(r.gcd);
  });

  it('negatives normalized to positive gcd', () => {
    const r = gcdBezout(-12, 18);
    expect(r.gcd).toBe(6n);
    expect(r.x * -12n + r.y * 18n).toBe(6n);
  });

  it('both negative', () => {
    const r = gcdBezout(-12, -18);
    expect(r.gcd).toBe(6n);
    expect(r.x * -12n + r.y * -18n).toBe(6n);
  });

  it('modInverse exists', () => {
    expect(modInverseBezout(3, 11)).toBe(4n);
    expect((4n * 3n) % 11n).toBe(1n);
  });

  it('modInverse non-existent', () => {
    expect(modInverseBezout(2, 4)).toBeNull();
  });

  it('modInverse rejects non-positive modulus', () => {
    expect(() => modInverseBezout(3, 0)).toThrow();
    expect(() => modInverseBezout(3, -5)).toThrow();
  });
});
