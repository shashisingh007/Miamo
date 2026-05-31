import { describe, it, expect } from 'vitest';
import {
  montgomerySetup,
  montgomeryMul,
  montgomeryToForm,
  montgomeryFromForm,
  montgomeryReduction,
} from '../montgomeryReduction';

describe('montgomeryReduction', () => {
  it('factory exposes functions', () => {
    const api = montgomeryReduction();
    expect(typeof api.montgomerySetup).toBe('function');
    expect(typeof api.montgomeryMul).toBe('function');
  });

  it('round-trip: from(to(x)) == x mod n', () => {
    const n = 97n;
    const ctx = montgomerySetup(n);
    for (let x = 0n; x < n; x += 1n) {
      expect(montgomeryFromForm(montgomeryToForm(x, ctx), ctx)).toBe(x);
    }
  });

  it('multiplication agrees with native % for small n', () => {
    const n = 97n;
    const ctx = montgomerySetup(n);
    for (let a = 0n; a < 20n; a += 1n) {
      for (let b = 0n; b < 20n; b += 1n) {
        const aM = montgomeryToForm(a, ctx);
        const bM = montgomeryToForm(b, ctx);
        const rM = montgomeryMul(aM, bM, ctx);
        expect(montgomeryFromForm(rM, ctx)).toBe((a * b) % n);
      }
    }
  });

  it('works with large odd modulus', () => {
    const n = (1n << 127n) - 1n; // Mersenne prime, odd
    const ctx = montgomerySetup(n);
    const a = 12345678901234567890n % n;
    const b = 98765432109876543210n % n;
    const aM = montgomeryToForm(a, ctx);
    const bM = montgomeryToForm(b, ctx);
    expect(montgomeryFromForm(montgomeryMul(aM, bM, ctx), ctx)).toBe((a * b) % n);
  });

  it('reduce of 0 is 0', () => {
    const ctx = montgomerySetup(13n);
    expect(montgomeryFromForm(0n, ctx)).toBe(0n);
  });

  it('multiplicative identity in Montgomery form', () => {
    const n = 13n;
    const ctx = montgomerySetup(n);
    const oneM = montgomeryToForm(1n, ctx);
    const aM = montgomeryToForm(7n, ctx);
    expect(montgomeryFromForm(montgomeryMul(aM, oneM, ctx), ctx)).toBe(7n);
  });

  it('throws on even modulus', () => {
    expect(() => montgomerySetup(10n)).toThrow();
  });

  it('throws on n <= 1', () => {
    expect(() => montgomerySetup(1n)).toThrow();
    expect(() => montgomerySetup(0n)).toThrow();
  });

  it('throws on non-bigint inputs', () => {
    expect(() => montgomerySetup(7 as any)).toThrow();
    const ctx = montgomerySetup(7n);
    expect(() => montgomeryFromForm(-1n, ctx)).toThrow();
    expect(() => montgomeryFromForm(1 as any, ctx)).toThrow();
  });

  it('ctx fields exist', () => {
    const ctx = montgomerySetup(13n);
    expect(ctx.n).toBe(13n);
    expect(typeof ctx.k).toBe('number');
    expect(typeof ctx.r).toBe('bigint');
    expect(typeof ctx.ninv).toBe('bigint');
    expect(typeof ctx.rSquaredModN).toBe('bigint');
  });
});
