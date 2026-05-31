import { describe, it, expect } from 'vitest';
import { solovayStrassen } from '../solovayStrassen';

function seedRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('solovayStrassen', () => {
  it('rejects non-positive rounds', () => {
    expect(() => solovayStrassen(7, { rounds: 0 })).toThrow();
    expect(() => solovayStrassen(7, { rounds: -1 })).toThrow();
  });

  it('handles small non-primes', () => {
    expect(solovayStrassen(0)).toBe(false);
    expect(solovayStrassen(1)).toBe(false);
    expect(solovayStrassen(4)).toBe(false);
  });

  it('handles small primes', () => {
    expect(solovayStrassen(2)).toBe(true);
    expect(solovayStrassen(3)).toBe(true);
  });

  it('detects even composites', () => {
    expect(solovayStrassen(100)).toBe(false);
    expect(solovayStrassen(1000)).toBe(false);
  });

  it('identifies known primes', () => {
    const primes = [5, 7, 11, 13, 17, 19, 23, 29, 31, 97, 101, 257, 521];
    for (const p of primes) {
      expect(solovayStrassen(p, { rng: seedRng(42) })).toBe(true);
    }
  });

  it('identifies known composites', () => {
    const comps = [9, 15, 21, 25, 27, 33, 49, 51, 121, 169, 221];
    for (const c of comps) {
      expect(solovayStrassen(c, { rng: seedRng(42) })).toBe(false);
    }
  });

  it('Carmichael 561 detected as composite', () => {
    expect(solovayStrassen(561, { rng: seedRng(7), rounds: 30 })).toBe(false);
  });

  it('Carmichael 1105 detected as composite', () => {
    expect(solovayStrassen(1105, { rng: seedRng(7), rounds: 30 })).toBe(false);
  });

  it('large prime 7919', () => {
    expect(solovayStrassen(7919, { rng: seedRng(11) })).toBe(true);
  });

  it('bigint input', () => {
    expect(solovayStrassen(7919n, { rng: seedRng(11) })).toBe(true);
    expect(solovayStrassen(7918n, { rng: seedRng(11) })).toBe(false);
  });

  it('respects custom rounds', () => {
    expect(solovayStrassen(101, { rounds: 1, rng: seedRng(99) })).toBe(true);
  });
});
