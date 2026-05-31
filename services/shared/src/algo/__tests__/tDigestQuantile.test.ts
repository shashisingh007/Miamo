import { describe, it, expect } from 'vitest';
import { TDigestQuantile } from '../tDigestQuantile';

describe('TDigestQuantile', () => {
  it('throws on invalid maxCentroids', () => {
    expect(() => new TDigestQuantile({ maxCentroids: 0 })).toThrow(RangeError);
    expect(() => new TDigestQuantile({ maxCentroids: 3 })).toThrow(RangeError);
    expect(() => new TDigestQuantile({ maxCentroids: 1.5 })).toThrow(RangeError);
  });

  it('empty returns NaN', () => {
    const d = new TDigestQuantile();
    expect(Number.isNaN(d.quantile(0.5))).toBe(true);
  });

  it('single value', () => {
    const d = new TDigestQuantile();
    d.add(42);
    expect(d.quantile(0.5)).toBe(42);
  });

  it('throws on non-finite value', () => {
    const d = new TDigestQuantile();
    expect(() => d.add(NaN)).toThrow(TypeError);
    expect(() => d.add(Infinity)).toThrow(TypeError);
  });

  it('throws on non-positive weight', () => {
    const d = new TDigestQuantile();
    expect(() => d.add(1, 0)).toThrow(RangeError);
    expect(() => d.add(1, -1)).toThrow(RangeError);
  });

  it('throws on q out of range', () => {
    const d = new TDigestQuantile();
    d.add(1);
    expect(() => d.quantile(-0.1)).toThrow(RangeError);
    expect(() => d.quantile(1.1)).toThrow(RangeError);
    expect(() => d.quantile(NaN)).toThrow(RangeError);
  });

  it('uniform distribution approx', () => {
    const d = new TDigestQuantile({ maxCentroids: 100 });
    for (let i = 1; i <= 1000; i += 1) d.add(i);
    expect(d.quantile(0.5)).toBeGreaterThan(450);
    expect(d.quantile(0.5)).toBeLessThan(550);
    expect(d.quantile(0.99)).toBeGreaterThan(960);
  });

  it('respects bounded centroid count', () => {
    const d = new TDigestQuantile({ maxCentroids: 50 });
    for (let i = 0; i < 5000; i += 1) d.add(Math.random());
    expect(d.centroidCount()).toBeLessThanOrEqual(50);
  });

  it('size returns total weight', () => {
    const d = new TDigestQuantile();
    d.add(1, 2);
    d.add(2, 3);
    expect(d.size()).toBe(5);
  });

  it('q=0 returns min-ish, q=1 returns max-ish', () => {
    const d = new TDigestQuantile();
    for (let i = 1; i <= 100; i += 1) d.add(i);
    expect(d.quantile(0)).toBeLessThanOrEqual(2);
    expect(d.quantile(1)).toBeGreaterThanOrEqual(99);
  });

  it('quantile monotonic', () => {
    const d = new TDigestQuantile({ maxCentroids: 60 });
    for (let i = 0; i < 1000; i += 1) d.add(Math.sqrt(i));
    let prev = -Infinity;
    for (let q = 0; q <= 1; q += 0.05) {
      const v = d.quantile(q);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('skewed distribution captures tail', () => {
    const d = new TDigestQuantile({ maxCentroids: 100 });
    for (let i = 0; i < 1000; i += 1) d.add(i);
    for (let i = 0; i < 5; i += 1) d.add(10_000);
    expect(d.quantile(0.999)).toBeGreaterThan(900);
  });

  it('weighted add accumulates', () => {
    const d = new TDigestQuantile();
    d.add(10, 5);
    d.add(20, 5);
    const median = d.quantile(0.5);
    expect(median).toBeGreaterThanOrEqual(10);
    expect(median).toBeLessThanOrEqual(20);
  });

  it('handles negatives', () => {
    const d = new TDigestQuantile();
    for (let i = -100; i <= 100; i += 1) d.add(i);
    expect(d.quantile(0.5)).toBeGreaterThan(-10);
    expect(d.quantile(0.5)).toBeLessThan(10);
  });

  it('stable on repeated identical values', () => {
    const d = new TDigestQuantile();
    for (let i = 0; i < 100; i += 1) d.add(7);
    expect(d.quantile(0.5)).toBe(7);
    expect(d.quantile(0.9)).toBe(7);
  });
});
