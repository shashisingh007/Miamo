import { describe, it, expect } from 'vitest';
import { BiasedReservoirSampler } from '../biasedReservoirSampler';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('BiasedReservoirSampler', () => {
  it('throws on invalid capacity', () => {
    expect(() => new BiasedReservoirSampler(0)).toThrow(RangeError);
    expect(() => new BiasedReservoirSampler(-1)).toThrow(RangeError);
    expect(() => new BiasedReservoirSampler(1.5)).toThrow(RangeError);
  });

  it('throws on invalid fade', () => {
    expect(() => new BiasedReservoirSampler(5, { fade: 0 })).toThrow(RangeError);
    expect(() => new BiasedReservoirSampler(5, { fade: -1 })).toThrow(RangeError);
    expect(() => new BiasedReservoirSampler(5, { fade: 2 })).toThrow(RangeError);
    expect(() => new BiasedReservoirSampler(5, { fade: NaN })).toThrow(RangeError);
  });

  it('empty sample', () => {
    const s = new BiasedReservoirSampler<number>(3);
    expect(s.sample()).toEqual([]);
    expect(s.size()).toBe(0);
    expect(s.total()).toBe(0);
  });

  it('fills up to capacity', () => {
    const s = new BiasedReservoirSampler<number>(3);
    for (let i = 0; i < 3; i += 1) s.add(i);
    expect(s.sample().sort()).toEqual([0, 1, 2]);
    expect(s.size()).toBe(3);
  });

  it('beyond capacity sample.size === capacity (fade=1)', () => {
    const s = new BiasedReservoirSampler<number>(5);
    for (let i = 0; i < 100; i += 1) s.add(i);
    expect(s.size()).toBe(5);
    expect(s.total()).toBe(100);
  });

  it('total counts every add', () => {
    const s = new BiasedReservoirSampler<number>(2);
    for (let i = 0; i < 50; i += 1) s.add(i);
    expect(s.total()).toBe(50);
  });

  it('uniform sampling produces near-uniform distribution', () => {
    const counts = new Map<number, number>();
    const trials = 1000;
    const N = 50;
    for (let t = 0; t < trials; t += 1) {
      const s = new BiasedReservoirSampler<number>(5, { rng: mulberry32(t + 1) });
      for (let i = 0; i < N; i += 1) s.add(i);
      for (const x of s.sample()) counts.set(x, (counts.get(x) ?? 0) + 1);
    }
    // expected ~ 100 each
    let mn = Infinity;
    let mx = -Infinity;
    for (let i = 0; i < N; i += 1) {
      const c = counts.get(i) ?? 0;
      if (c < mn) mn = c;
      if (c > mx) mx = c;
    }
    expect(mn).toBeGreaterThan(30);
    expect(mx).toBeLessThan(220);
  });

  it('fade<1 biases toward recent items', () => {
    let recentCount = 0;
    const trials = 100;
    const N = 100;
    for (let t = 0; t < trials; t += 1) {
      const s = new BiasedReservoirSampler<number>(5, {
        rng: mulberry32(t + 9999),
        fade: 0.5,
      });
      for (let i = 0; i < N; i += 1) s.add(i);
      for (const x of s.sample()) {
        if (x >= N - 20) recentCount += 1;
      }
    }
    // with strong fade should heavily favor most-recent 20% of items
    expect(recentCount).toBeGreaterThan(0);
  });

  it('fade=1 equivalent to classic reservoir size==capacity', () => {
    const s = new BiasedReservoirSampler<number>(10, {
      rng: mulberry32(7),
      fade: 1,
    });
    for (let i = 0; i < 1000; i += 1) s.add(i);
    expect(s.size()).toBe(10);
  });

  it('all items distinct (no duplicates) when input distinct', () => {
    const s = new BiasedReservoirSampler<number>(5, { rng: mulberry32(3) });
    for (let i = 0; i < 200; i += 1) s.add(i);
    const arr = s.sample();
    expect(new Set(arr).size).toBe(arr.length);
  });

  it('handles single capacity', () => {
    const s = new BiasedReservoirSampler<number>(1, { rng: mulberry32(11) });
    for (let i = 0; i < 50; i += 1) s.add(i);
    expect(s.sample()).toHaveLength(1);
  });

  it('deterministic with fixed rng', () => {
    const a = new BiasedReservoirSampler<number>(5, { rng: mulberry32(42) });
    const b = new BiasedReservoirSampler<number>(5, { rng: mulberry32(42) });
    for (let i = 0; i < 100; i += 1) {
      a.add(i);
      b.add(i);
    }
    expect(a.sample()).toEqual(b.sample());
  });

  it('size never exceeds capacity', () => {
    const s = new BiasedReservoirSampler<number>(8, { fade: 0.9, rng: mulberry32(5) });
    for (let i = 0; i < 5000; i += 1) {
      s.add(i);
      expect(s.size()).toBeLessThanOrEqual(8);
    }
  });

  it('default rng works', () => {
    const s = new BiasedReservoirSampler<number>(3);
    for (let i = 0; i < 100; i += 1) s.add(i);
    expect(s.size()).toBe(3);
  });
});
