import { describe, it, expect } from 'vitest';
import { barrettSetup, barrettReduce, barrettReduction } from '../barrettReduction';

describe('barrettReduction', () => {
  it('factory exposes both', () => {
    const api = barrettReduction();
    expect(typeof api.barrettSetup).toBe('function');
    expect(typeof api.barrettReduce).toBe('function');
  });

  it('matches native % for small inputs', () => {
    const m = 97n;
    const ctx = barrettSetup(m);
    for (let i = 0n; i < 1000n; i += 1n) {
      expect(barrettReduce(i, ctx)).toBe(i % m);
    }
  });

  it('matches native % for large inputs', () => {
    const m = (1n << 64n) - 59n; // a 64-bit prime-ish
    const ctx = barrettSetup(m);
    const samples = [0n, 1n, m - 1n, m, m + 1n, 1n << 100n, (1n << 128n) - 7n, 1234567890123456789012345678901234567890n];
    for (const x of samples) {
      expect(barrettReduce(x, ctx)).toBe(x % m);
    }
  });

  it('reduce 0 is 0', () => {
    const ctx = barrettSetup(13n);
    expect(barrettReduce(0n, ctx)).toBe(0n);
  });

  it('reduce m is 0', () => {
    const m = 257n;
    const ctx = barrettSetup(m);
    expect(barrettReduce(m, ctx)).toBe(0n);
  });

  it('reduce x < m returns x', () => {
    const ctx = barrettSetup(1000n);
    expect(barrettReduce(42n, ctx)).toBe(42n);
  });

  it('throws on non-bigint x', () => {
    const ctx = barrettSetup(7n);
    expect(() => barrettReduce(5 as any, ctx)).toThrow();
  });

  it('throws on negative x', () => {
    const ctx = barrettSetup(7n);
    expect(() => barrettReduce(-1n, ctx)).toThrow();
  });

  it('throws on bad modulus', () => {
    expect(() => barrettSetup(0n)).toThrow();
    expect(() => barrettSetup(-3n)).toThrow();
    expect(() => barrettSetup(5 as any)).toThrow();
  });

  it('ctx exposes m, k, mu', () => {
    const ctx = barrettSetup(13n);
    expect(ctx.m).toBe(13n);
    expect(typeof ctx.k).toBe('number');
    expect(typeof ctx.mu).toBe('bigint');
  });
});
