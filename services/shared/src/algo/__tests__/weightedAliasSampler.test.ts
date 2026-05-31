import { describe, it, expect } from 'vitest';
import { WeightedAliasSampler } from '../weightedAliasSampler';

describe('WeightedAliasSampler', () => {
  it('rejects non-array', () => {
    expect(() => new WeightedAliasSampler('x' as any)).toThrow();
  });

  it('rejects empty', () => {
    expect(() => new WeightedAliasSampler([])).toThrow();
  });

  it('rejects negative weight', () => {
    expect(() => new WeightedAliasSampler([1, -1])).toThrow();
  });

  it('rejects NaN weight', () => {
    expect(() => new WeightedAliasSampler([1, NaN])).toThrow();
  });

  it('rejects zero-sum weights', () => {
    expect(() => new WeightedAliasSampler([0, 0])).toThrow();
  });

  it('single bucket always returns 0', () => {
    const s = new WeightedAliasSampler([1]);
    for (let i = 0; i < 50; i++) expect(s.sample()).toBe(0);
  });

  it('returns indices in range', () => {
    const s = new WeightedAliasSampler([1, 1, 1, 1]);
    for (let i = 0; i < 100; i++) {
      const v = s.sample();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
    }
  });

  it('uniform 4-way approx 25%', () => {
    const s = new WeightedAliasSampler([1, 1, 1, 1]);
    const N = 40000;
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < N; i++) counts[s.sample()]++;
    for (const c of counts) {
      expect(Math.abs(c / N - 0.25)).toBeLessThan(0.02);
    }
  });

  it('skewed 9:1 ratio', () => {
    const s = new WeightedAliasSampler([9, 1]);
    const N = 40000;
    let c0 = 0;
    for (let i = 0; i < N; i++) if (s.sample() === 0) c0++;
    expect(Math.abs(c0 / N - 0.9)).toBeLessThan(0.02);
  });

  it('zero weights are never sampled', () => {
    const s = new WeightedAliasSampler([1, 0, 1]);
    for (let i = 0; i < 5000; i++) expect(s.sample()).not.toBe(1);
  });

  it('respects custom rng', () => {
    let n = 0;
    const rng = () => {
      const vals = [0.1, 0.5, 0.9];
      return vals[n++ % 3];
    };
    const s = new WeightedAliasSampler([1, 1], rng);
    for (let i = 0; i < 10; i++) {
      const v = s.sample();
      expect([0, 1]).toContain(v);
    }
  });

  it('sampleMany returns k indices', () => {
    const s = new WeightedAliasSampler([1, 1]);
    expect(s.sampleMany(50).length).toBe(50);
  });

  it('sampleMany rejects bad k', () => {
    const s = new WeightedAliasSampler([1, 1]);
    expect(() => s.sampleMany(-1)).toThrow();
    expect(() => s.sampleMany(1.5)).toThrow();
  });

  it('handles 100-bucket weights', () => {
    const weights = new Array(100).fill(1);
    weights[0] = 100;
    const s = new WeightedAliasSampler(weights);
    let zeroCount = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (s.sample() === 0) zeroCount++;
    // expected 100 / 199 ≈ 0.502
    expect(Math.abs(zeroCount / N - 100 / 199)).toBeLessThan(0.03);
  });

  it('all-equal weights produce all indices', () => {
    const s = new WeightedAliasSampler([1, 1, 1, 1, 1]);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(s.sample());
    expect(seen.size).toBe(5);
  });

  it('n property reflects bucket count', () => {
    expect(new WeightedAliasSampler([1, 2, 3]).n).toBe(3);
  });
});
