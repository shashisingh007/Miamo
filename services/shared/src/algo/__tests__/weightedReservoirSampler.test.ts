import { describe, it, expect } from 'vitest';
import {
  sampleWeightedReservoir,
  deterministicRngFromSeed,
} from '../weightedReservoirSampler';

describe('weightedReservoirSampler', () => {
  it('k=0 returns []', () => {
    expect(sampleWeightedReservoir([{ value: 'a', weight: 1 }], 0)).toEqual([]);
  });

  it('empty items returns []', () => {
    expect(sampleWeightedReservoir([], 5)).toEqual([]);
  });

  it('k >= n returns all items', () => {
    const out = sampleWeightedReservoir(
      [
        { value: 'a', weight: 1 },
        { value: 'b', weight: 1 },
      ],
      5
    );
    expect(out.sort()).toEqual(['a', 'b']);
  });

  it('k exact returns k items', () => {
    const out = sampleWeightedReservoir(
      [
        { value: 'a', weight: 1 },
        { value: 'b', weight: 1 },
        { value: 'c', weight: 1 },
      ],
      2
    );
    expect(out).toHaveLength(2);
  });

  it('throws on non-integer k', () => {
    expect(() => sampleWeightedReservoir([], 1.5)).toThrow();
  });

  it('throws on negative k', () => {
    expect(() => sampleWeightedReservoir([], -1)).toThrow();
  });

  it('throws on zero weight', () => {
    expect(() => sampleWeightedReservoir([{ value: 'a', weight: 0 }], 1)).toThrow();
  });

  it('throws on negative weight', () => {
    expect(() => sampleWeightedReservoir([{ value: 'a', weight: -1 }], 1)).toThrow();
  });

  it('throws on NaN weight', () => {
    expect(() => sampleWeightedReservoir([{ value: 'a', weight: NaN }], 1)).toThrow();
  });

  it('deterministic with seeded rng', () => {
    const items = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 1 },
      { value: 'c', weight: 1 },
      { value: 'd', weight: 1 },
      { value: 'e', weight: 1 },
    ];
    const a = sampleWeightedReservoir(items, 3, deterministicRngFromSeed(42));
    const b = sampleWeightedReservoir(items, 3, deterministicRngFromSeed(42));
    expect(a).toEqual(b);
  });

  it('different seeds yield different samples (usually)', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ value: i, weight: 1 }));
    const a = sampleWeightedReservoir(items, 5, deterministicRngFromSeed(1));
    const b = sampleWeightedReservoir(items, 5, deterministicRngFromSeed(2));
    expect(a).not.toEqual(b);
  });

  it('massively skewed weight dominates selection', () => {
    const items = [
      { value: 'rare1', weight: 0.0001 },
      { value: 'rare2', weight: 0.0001 },
      { value: 'whale', weight: 1_000_000 },
    ];
    let whaleCount = 0;
    for (let i = 0; i < 100; i++) {
      const r = sampleWeightedReservoir(items, 1, deterministicRngFromSeed(100 + i));
      if (r[0] === 'whale') whaleCount++;
    }
    expect(whaleCount).toBeGreaterThan(95);
  });

  it('uniform weights produce roughly uniform distribution', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ value: i, weight: 1 }));
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5000; i++) {
      const r = sampleWeightedReservoir(items, 1, deterministicRngFromSeed(i));
      counts[r[0] as number]++;
    }
    for (const c of counts) {
      expect(c).toBeGreaterThan(800);
      expect(c).toBeLessThan(1200);
    }
  });

  it('weight 2x is sampled roughly 2x as often (single sample)', () => {
    const items = [
      { value: 'a', weight: 1 },
      { value: 'b', weight: 2 },
    ];
    let aCount = 0;
    let bCount = 0;
    for (let i = 0; i < 6000; i++) {
      const r = sampleWeightedReservoir(items, 1, deterministicRngFromSeed(i));
      if (r[0] === 'a') aCount++;
      else bCount++;
    }
    // ratio b:a should be ~2:1; allow generous tolerance
    expect(bCount / aCount).toBeGreaterThan(1.5);
    expect(bCount / aCount).toBeLessThan(2.7);
  });

  it('does not duplicate items', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ value: i, weight: i + 1 }));
    const r = sampleWeightedReservoir(items, 5, deterministicRngFromSeed(7));
    expect(new Set(r).size).toBe(r.length);
  });

  it('preserves all items when n equals k', () => {
    const items = [
      { value: 'x', weight: 1 },
      { value: 'y', weight: 2 },
    ];
    const r = sampleWeightedReservoir(items, 2, deterministicRngFromSeed(0));
    expect(r.sort()).toEqual(['x', 'y']);
  });

  it('rng returning exactly 0 still works (no log(0))', () => {
    const r = sampleWeightedReservoir(
      [
        { value: 'a', weight: 1 },
        { value: 'b', weight: 1 },
      ],
      1,
      () => 0
    );
    expect(r).toHaveLength(1);
  });

  it('rng returning >=1 clamped', () => {
    const r = sampleWeightedReservoir(
      [{ value: 'a', weight: 1 }],
      1,
      () => 1
    );
    expect(r).toEqual(['a']);
  });

  it('handles large input efficiently', () => {
    const items = Array.from({ length: 5000 }, (_, i) => ({ value: i, weight: 1 }));
    const r = sampleWeightedReservoir(items, 50, deterministicRngFromSeed(99));
    expect(r).toHaveLength(50);
    expect(new Set(r).size).toBe(50);
  });
});
