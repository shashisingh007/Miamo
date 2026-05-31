import { describe, it, expect } from 'vitest';
import { discreteLogarithmBSGS } from '../discreteLogarithmBabyStepGiantStep';

function modPow(b: bigint, e: bigint, m: bigint): bigint {
  let base = ((b % m) + m) % m;
  let exp = e;
  let r = 1n;
  while (exp > 0n) {
    if (exp & 1n) r = (r * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return r;
}

describe('discreteLogarithmBSGS', () => {
  it('throws on p <= 1', () => {
    expect(() => discreteLogarithmBSGS(2n, 1n, 1n)).toThrow(RangeError);
  });

  it('g=2, h=1, p=5 => x=0', () => {
    expect(discreteLogarithmBSGS(2n, 1n, 5n)).toBe(0n);
  });

  it('g=2, h=3, p=5 => 2^x=3 mod 5 => x=3', () => {
    const x = discreteLogarithmBSGS(2n, 3n, 5n)!;
    expect(modPow(2n, x, 5n)).toBe(3n);
  });

  it('g=3, h=13, p=17', () => {
    const x = discreteLogarithmBSGS(3n, 13n, 17n)!;
    expect(modPow(3n, x, 17n)).toBe(13n);
  });

  it('g=2, h=22, p=29', () => {
    const x = discreteLogarithmBSGS(2n, 22n, 29n)!;
    expect(modPow(2n, x, 29n)).toBe(22n);
  });

  it('g=5, h=33, p=37', () => {
    const x = discreteLogarithmBSGS(5n, 33n, 37n)!;
    expect(modPow(5n, x, 37n)).toBe(33n);
  });

  it('answer satisfies g^x = h mod p for many cases', () => {
    const cases: Array<[bigint, bigint, bigint]> = [
      [2n, 1n, 11n],
      [3n, 4n, 7n],
      [2n, 7n, 13n],
      [5n, 8n, 23n],
      [7n, 15n, 31n],
    ];
    for (const [g, h, p] of cases) {
      const x = discreteLogarithmBSGS(g, h, p);
      if (x !== null) expect(modPow(g, x, p)).toBe(h % p);
    }
  });

  it('h=g => x=1', () => {
    const x = discreteLogarithmBSGS(3n, 3n, 17n)!;
    expect(modPow(3n, x, 17n)).toBe(3n);
  });

  it('large prime case', () => {
    const p = 1009n;
    const g = 11n;
    const x0 = 137n;
    const h = modPow(g, x0, p);
    const x = discreteLogarithmBSGS(g, h, p)!;
    expect(modPow(g, x, p)).toBe(h);
  });

  it('h=1 returns 0', () => {
    expect(discreteLogarithmBSGS(2n, 1n, 11n)).toBe(0n);
  });

  it('different g produces consistent answer', () => {
    const x = discreteLogarithmBSGS(6n, 7n, 13n);
    if (x !== null) expect(modPow(6n, x, 13n)).toBe(7n);
  });

  it('powers of 2 mod 13 round-trip', () => {
    for (let x0 = 0n; x0 < 12n; x0 += 1n) {
      const h = modPow(2n, x0, 13n);
      const x = discreteLogarithmBSGS(2n, h, 13n)!;
      expect(modPow(2n, x, 13n)).toBe(h);
    }
  });
});
