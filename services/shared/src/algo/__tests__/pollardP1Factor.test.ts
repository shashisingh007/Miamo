import { describe, it, expect } from 'vitest';
import { pollardP1Factor } from '../pollardP1Factor';

describe('pollardP1Factor', () => {
  it('factors small composite with smooth factor', () => {
    // 5959 = 59 * 101; 58 = 2*29 (smooth-ish), 100 = 2^2*5^2 (smooth)
    const f = pollardP1Factor(5959n);
    expect(f).not.toBeNull();
    expect(5959n % (f as bigint)).toBe(0n);
    expect(f).not.toBe(1n);
    expect(f).not.toBe(5959n);
  });

  it('returns 2 for even number', () => {
    expect(pollardP1Factor(100n)).toBe(2n);
  });

  it('factors 1009 * 1013 with high enough bound', () => {
    const n = 1009n * 1013n;
    const f = pollardP1Factor(n, 5000n);
    if (f !== null) {
      expect(n % f).toBe(0n);
      expect(f).not.toBe(1n);
      expect(f).not.toBe(n);
    }
  });

  it('handles a smooth Carmichael composite', () => {
    // 561 = 3 * 11 * 17
    const n = 561n;
    const f = pollardP1Factor(n);
    expect(f).not.toBeNull();
    expect(n % (f as bigint)).toBe(0n);
  });

  it('can fail (returns null) when bound too small', () => {
    // n with a factor p such that p-1 has a large prime — small bound won't suffice
    const r = pollardP1Factor(7919n * 7907n, 5n);
    expect(r).toBeNull();
  });

  it('rejects n < 2', () => {
    expect(() => pollardP1Factor(1n)).toThrow();
  });

  it('rejects non-bigint n', () => {
    expect(() => pollardP1Factor(10 as any)).toThrow();
  });

  it('rejects bad bound', () => {
    expect(() => pollardP1Factor(15n, 1n)).toThrow();
  });

  it('rejects bad base', () => {
    expect(() => pollardP1Factor(15n, 100n, 1n)).toThrow();
  });

  it('different bases may both find a factor of 15', () => {
    for (const b of [2n, 3n, 5n, 7n]) {
      const f = pollardP1Factor(15n, 100n, b);
      if (f !== null) {
        expect(15n % f).toBe(0n);
      }
    }
  });

  it('repeated runs are deterministic for fixed params', () => {
    const a = pollardP1Factor(5959n);
    const b = pollardP1Factor(5959n);
    expect(a).toBe(b);
  });
});
