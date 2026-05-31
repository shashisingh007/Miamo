import { describe, it, expect } from 'vitest';
import { montgomeryPowMod } from '../montgomeryPowMod';

function plain(base: bigint, exp: bigint, mod: bigint): bigint {
  let r = 1n % mod;
  let b = ((base % mod) + mod) % mod;
  let e = exp;
  while (e > 0n) {
    if (e & 1n) r = (r * b) % mod;
    b = (b * b) % mod;
    e >>= 1n;
  }
  return r;
}

describe('montgomeryPowMod', () => {
  it('throws on mod<=0', () => {
    expect(() => montgomeryPowMod(2n, 3n, 0n)).toThrow();
    expect(() => montgomeryPowMod(2n, 3n, -7n)).toThrow();
  });

  it('throws on exp<0', () => {
    expect(() => montgomeryPowMod(2n, -1n, 7n)).toThrow();
  });

  it('mod=1 => 0', () => {
    expect(montgomeryPowMod(5n, 7n, 1n)).toBe(0n);
  });

  it('exp=0 => 1', () => {
    expect(montgomeryPowMod(7n, 0n, 13n)).toBe(1n);
  });

  it('basic odd mod', () => {
    expect(montgomeryPowMod(2n, 10n, 1009n)).toBe(plain(2n, 10n, 1009n));
    expect(montgomeryPowMod(3n, 100n, 7919n)).toBe(plain(3n, 100n, 7919n));
  });

  it('large odd mod', () => {
    const m = 1000000007n;
    expect(montgomeryPowMod(2n, 1000n, m)).toBe(plain(2n, 1000n, m));
    expect(montgomeryPowMod(123456n, 789n, m)).toBe(plain(123456n, 789n, m));
  });

  it('even mod fallback', () => {
    expect(montgomeryPowMod(3n, 5n, 100n)).toBe(43n);
    expect(montgomeryPowMod(7n, 13n, 1024n)).toBe(plain(7n, 13n, 1024n));
  });

  it('Fermat little theorem', () => {
    const p = 7919n;
    expect(montgomeryPowMod(5n, p - 1n, p)).toBe(1n);
  });

  it('matches plain for many random cases', () => {
    const m = 999999937n;
    for (let i = 1; i < 20; i++) {
      const b = BigInt(i * 31 + 7);
      const e = BigInt(i * 13 + 5);
      expect(montgomeryPowMod(b, e, m)).toBe(plain(b, e, m));
    }
  });

  it('negative base normalized', () => {
    expect(montgomeryPowMod(-3n, 2n, 7n)).toBe(plain(-3n, 2n, 7n));
  });

  it('large prime modulus', () => {
    const p = 2147483647n;
    expect(montgomeryPowMod(2n, p - 1n, p)).toBe(1n);
  });

  it('64-bit modulus', () => {
    const p = 18446744073709551557n;
    expect(montgomeryPowMod(2n, p - 1n, p)).toBe(1n);
  });

  it('mod=3 small', () => {
    expect(montgomeryPowMod(2n, 5n, 3n)).toBe(2n);
  });
});
