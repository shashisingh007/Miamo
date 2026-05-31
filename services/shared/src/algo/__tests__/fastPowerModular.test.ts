import { describe, it, expect } from 'vitest';
import { fastPowerModular } from '../fastPowerModular';

describe('fastPowerModular', () => {
  it('base^0 mod m = 1', () => {
    expect(fastPowerModular(7n, 0n, 13n)).toBe(1n);
  });

  it('matches small cases', () => {
    expect(fastPowerModular(2n, 10n, 1000n)).toBe(24n);
  });

  it('Fermat: 2^16 mod 17 = 1', () => {
    expect(fastPowerModular(2n, 16n, 17n)).toBe(1n);
  });

  it('handles large exponent', () => {
    const r = fastPowerModular(3n, 200n, 1000000007n);
    expect(r >= 0n && r < 1000000007n).toBe(true);
  });

  it('mod 1 = 0', () => {
    expect(fastPowerModular(99n, 99n, 1n)).toBe(0n);
  });

  it('handles negative base', () => {
    expect(fastPowerModular(-3n, 3n, 7n)).toBe(fastPowerModular(4n, 3n, 7n));
  });

  it('throws on non-positive modulus', () => {
    expect(() => fastPowerModular(2n, 3n, 0n)).toThrow();
    expect(() => fastPowerModular(2n, 3n, -1n)).toThrow();
  });

  it('throws on negative exponent', () => {
    expect(() => fastPowerModular(2n, -1n, 5n)).toThrow();
  });

  it('agrees with naive for small inputs', () => {
    for (let b = 0n; b < 10n; b += 1n) {
      for (let e = 0n; e < 8n; e += 1n) {
        for (let m = 1n; m < 11n; m += 1n) {
          let naive = 1n % m;
          for (let i = 0n; i < e; i += 1n) naive = (naive * b) % m;
          expect(fastPowerModular(b, e, m)).toBe(naive);
        }
      }
    }
  });

  it('base 0 with positive exponent => 0', () => {
    expect(fastPowerModular(0n, 5n, 7n)).toBe(0n);
  });

  it('exponent 1 returns base mod m', () => {
    expect(fastPowerModular(15n, 1n, 7n)).toBe(1n);
  });
});
