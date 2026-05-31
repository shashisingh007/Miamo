import { describe, it, expect } from 'vitest';
import { lemireFastBoundedRandom, lemireSampleArray } from '../lemireFastBoundedRandom';
import { xorshiftStarRng } from '../xorshiftStarRng';

const MASK64 = (1n << 64n) - 1n;

function counter(start = 0n): () => bigint {
  let c = start;
  return () => {
    c = (c + 1n) & MASK64;
    return c;
  };
}

describe('lemireFastBoundedRandom', () => {
  it('always in [0, bound)', () => {
    const r = xorshiftStarRng(7n);
    const next = () => r.nextUint64();
    for (let i = 0; i < 1000; i += 1) {
      const v = lemireFastBoundedRandom(13, next);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(13);
    }
  });

  it('bound=1 always 0', () => {
    const next = counter();
    for (let i = 0; i < 100; i += 1) expect(lemireFastBoundedRandom(1, next)).toBe(0);
  });

  it('throws on non-integer bound', () => {
    expect(() => lemireFastBoundedRandom(2.5, counter())).toThrow();
  });

  it('throws on bound <= 0', () => {
    expect(() => lemireFastBoundedRandom(0, counter())).toThrow();
    expect(() => lemireFastBoundedRandom(-1, counter())).toThrow();
  });

  it('covers all values', () => {
    const r = xorshiftStarRng(1n);
    const next = () => r.nextUint64();
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i += 1) seen.add(lemireFastBoundedRandom(10, next));
    expect(seen.size).toBe(10);
  });

  it('approximately uniform across 6 bins on 6000 draws', () => {
    const r = xorshiftStarRng(99n);
    const next = () => r.nextUint64();
    const counts = new Array(6).fill(0);
    const n = 6000;
    for (let i = 0; i < n; i += 1) counts[lemireFastBoundedRandom(6, next)] += 1;
    for (const c of counts) {
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('deterministic with deterministic rng', () => {
    const a = xorshiftStarRng(5n);
    const b = xorshiftStarRng(5n);
    for (let i = 0; i < 50; i += 1) {
      expect(lemireFastBoundedRandom(7, () => a.nextUint64())).toBe(
        lemireFastBoundedRandom(7, () => b.nextUint64()),
      );
    }
  });

  it('lemireSampleArray length and range', () => {
    const r = xorshiftStarRng(1n);
    const arr = lemireSampleArray(50, 4, () => r.nextUint64());
    expect(arr).toHaveLength(50);
    for (const v of arr) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
    }
  });

  it('lemireSampleArray n=0 returns []', () => {
    expect(lemireSampleArray(0, 4, counter())).toEqual([]);
  });

  it('lemireSampleArray throws on negative n', () => {
    expect(() => lemireSampleArray(-1, 4, counter())).toThrow();
  });

  it('large bound works', () => {
    const r = xorshiftStarRng(33n);
    const v = lemireFastBoundedRandom(1_000_000, () => r.nextUint64());
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1_000_000);
  });
});
