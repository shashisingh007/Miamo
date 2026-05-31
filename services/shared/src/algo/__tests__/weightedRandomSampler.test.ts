import { describe, it, expect } from 'vitest';
import { createWeightedSampler } from '../weightedRandomSampler';

function seededRng(seed: number): () => number {
  // mulberry32
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('weightedRandomSampler', () => {
  it('throws on empty', () => {
    expect(() => createWeightedSampler([])).toThrow();
  });

  it('throws if all zero weights', () => {
    expect(() => createWeightedSampler([{ value: 'a', weight: 0 }])).toThrow();
  });

  it('throws on negative or non-finite weight', () => {
    expect(() => createWeightedSampler([{ value: 'a', weight: -1 }])).toThrow();
    expect(() => createWeightedSampler([{ value: 'a', weight: Infinity }])).toThrow();
    expect(() => createWeightedSampler([{ value: 'a', weight: NaN }])).toThrow();
  });

  it('size and totalWeight ignore zero-weight items', () => {
    const s = createWeightedSampler([
      { value: 'a', weight: 1 },
      { value: 'b', weight: 0 },
      { value: 'c', weight: 3 },
    ]);
    expect(s.size).toBe(2);
    expect(s.totalWeight).toBe(4);
  });

  it('single item always returns that item', () => {
    const s = createWeightedSampler([{ value: 'solo', weight: 1 }]);
    for (let i = 0; i < 50; i++) expect(s.pickOne()).toBe('solo');
  });

  it('respects weighting approximately', () => {
    const s = createWeightedSampler([
      { value: 'a', weight: 1 },
      { value: 'b', weight: 9 },
    ]);
    const rng = seededRng(42);
    const counts: Record<string, number> = { a: 0, b: 0 };
    const N = 10000;
    for (let i = 0; i < N; i++) counts[s.pickOne(rng) as 'a' | 'b']++;
    const ratio = counts.b / N;
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(0.95);
  });

  it('uniform when weights equal', () => {
    const s = createWeightedSampler(
      ['a', 'b', 'c', 'd'].map((v) => ({ value: v, weight: 1 }))
    );
    const rng = seededRng(7);
    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const N = 8000;
    for (let i = 0; i < N; i++) counts[s.pickOne(rng) as keyof typeof counts]++;
    for (const k of Object.keys(counts)) {
      const r = counts[k] / N;
      expect(r).toBeGreaterThan(0.2);
      expect(r).toBeLessThan(0.3);
    }
  });

  it('zero-weight items are never selected', () => {
    const s = createWeightedSampler([
      { value: 'keep', weight: 5 },
      { value: 'skip', weight: 0 },
    ]);
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) expect(s.pickOne(rng)).toBe('keep');
  });

  it('pickMany length matches count', () => {
    const s = createWeightedSampler([{ value: 1, weight: 1 }, { value: 2, weight: 1 }]);
    expect(s.pickMany(0).length).toBe(0);
    expect(s.pickMany(7).length).toBe(7);
  });

  it('pickMany throws on negative count', () => {
    const s = createWeightedSampler([{ value: 1, weight: 1 }]);
    expect(() => s.pickMany(-1)).toThrow();
    expect(() => s.pickMany(1.5)).toThrow();
  });

  it('custom rng is used deterministically', () => {
    const s = createWeightedSampler([
      { value: 'a', weight: 1 },
      { value: 'b', weight: 1 },
      { value: 'c', weight: 1 },
    ]);
    const a = s.pickMany(10, seededRng(123));
    const b = s.pickMany(10, seededRng(123));
    expect(a).toEqual(b);
  });

  it('different seeds usually yield different sequences', () => {
    const s = createWeightedSampler([
      { value: 'a', weight: 1 },
      { value: 'b', weight: 1 },
    ]);
    const a = s.pickMany(20, seededRng(1));
    const b = s.pickMany(20, seededRng(2));
    expect(a).not.toEqual(b);
  });

  it('supports objects as values', () => {
    const obj = { id: 1 };
    const s = createWeightedSampler([{ value: obj, weight: 1 }]);
    expect(s.pickOne()).toBe(obj);
  });

  it('totalWeight is sum of provided weights', () => {
    const s = createWeightedSampler([
      { value: 'x', weight: 2.5 },
      { value: 'y', weight: 7.5 },
    ]);
    expect(s.totalWeight).toBeCloseTo(10);
  });
});
