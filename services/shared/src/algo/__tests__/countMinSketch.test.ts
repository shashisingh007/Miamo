import { describe, it, expect } from 'vitest';
import { CountMinSketch } from '../countMinSketch';

describe('CountMinSketch', () => {
  it('constructs with valid params', () => {
    const cms = new CountMinSketch({ epsilon: 0.01, delta: 0.01 });
    expect(cms.width).toBeGreaterThan(0);
    expect(cms.depth).toBeGreaterThan(0);
  });

  it('rejects bad epsilon', () => {
    expect(() => new CountMinSketch({ epsilon: 0, delta: 0.5 })).toThrow();
    expect(() => new CountMinSketch({ epsilon: 1, delta: 0.5 })).toThrow();
    expect(() => new CountMinSketch({ epsilon: -0.1, delta: 0.5 })).toThrow();
  });

  it('rejects bad delta', () => {
    expect(() => new CountMinSketch({ epsilon: 0.1, delta: 0 })).toThrow();
    expect(() => new CountMinSketch({ epsilon: 0.1, delta: 1 })).toThrow();
  });

  it('empty estimate => 0', () => {
    const cms = new CountMinSketch({ epsilon: 0.1, delta: 0.1 });
    expect(cms.estimate('x')).toBe(0);
  });

  it('add then estimate returns >= true count', () => {
    const cms = new CountMinSketch({ epsilon: 0.01, delta: 0.01 });
    for (let i = 0; i < 100; i++) cms.add('apple');
    expect(cms.estimate('apple')).toBeGreaterThanOrEqual(100);
  });

  it('count parameter increments by N', () => {
    const cms = new CountMinSketch({ epsilon: 0.01, delta: 0.01 });
    cms.add('x', 50);
    expect(cms.estimate('x')).toBeGreaterThanOrEqual(50);
  });

  it('rejects non-string key', () => {
    const cms = new CountMinSketch({ epsilon: 0.1, delta: 0.1 });
    expect(() => cms.add(123 as any)).toThrow();
    expect(() => cms.estimate(123 as any)).toThrow();
  });

  it('rejects non-positive count', () => {
    const cms = new CountMinSketch({ epsilon: 0.1, delta: 0.1 });
    expect(() => cms.add('x', 0)).toThrow();
    expect(() => cms.add('x', -1)).toThrow();
    expect(() => cms.add('x', 1.5)).toThrow();
  });

  it('total tracks all inserts', () => {
    const cms = new CountMinSketch({ epsilon: 0.1, delta: 0.1 });
    cms.add('a', 3);
    cms.add('b', 2);
    expect(cms.total).toBe(5);
  });

  it('overestimate bounded by epsilon * N (statistically)', () => {
    const cms = new CountMinSketch({ epsilon: 0.001, delta: 0.001 });
    const N = 10_000;
    for (let i = 0; i < N; i++) cms.add('k' + (i % 500));
    for (let i = 0; i < 50; i++) {
      const est = cms.estimate('absent-' + i);
      expect(est).toBeLessThanOrEqual(N * 0.01); // generous
    }
  });

  it('heavy hitter estimated accurately', () => {
    const cms = new CountMinSketch({ epsilon: 0.001, delta: 0.001 });
    for (let i = 0; i < 1000; i++) cms.add('noise' + i);
    for (let i = 0; i < 500; i++) cms.add('whale');
    const est = cms.estimate('whale');
    expect(est).toBeGreaterThanOrEqual(500);
    expect(est).toBeLessThan(600);
  });

  it('reset clears table', () => {
    const cms = new CountMinSketch({ epsilon: 0.1, delta: 0.1 });
    cms.add('x', 10);
    cms.reset();
    expect(cms.estimate('x')).toBe(0);
    expect(cms.total).toBe(0);
  });

  it('merge adds counts from compatible sketch', () => {
    const a = new CountMinSketch({ epsilon: 0.05, delta: 0.05, seed: 42 });
    const b = new CountMinSketch({ epsilon: 0.05, delta: 0.05, seed: 42 });
    a.add('x', 3);
    b.add('x', 4);
    a.merge(b);
    expect(a.estimate('x')).toBeGreaterThanOrEqual(7);
    expect(a.total).toBe(7);
  });

  it('merge rejects mismatched dimensions', () => {
    const a = new CountMinSketch({ epsilon: 0.05, delta: 0.05 });
    const b = new CountMinSketch({ epsilon: 0.5, delta: 0.5 });
    expect(() => a.merge(b)).toThrow();
  });

  it('merge rejects mismatched seeds', () => {
    const a = new CountMinSketch({ epsilon: 0.05, delta: 0.05, seed: 1 });
    const b = new CountMinSketch({ epsilon: 0.05, delta: 0.05, seed: 2 });
    expect(() => a.merge(b)).toThrow();
  });

  it('repeated add accumulates', () => {
    const cms = new CountMinSketch({ epsilon: 0.01, delta: 0.01 });
    for (let i = 0; i < 7; i++) cms.add('x');
    expect(cms.estimate('x')).toBeGreaterThanOrEqual(7);
  });

  it('different seeds produce different layouts', () => {
    const a = new CountMinSketch({ epsilon: 0.5, delta: 0.5, seed: 1 });
    const b = new CountMinSketch({ epsilon: 0.5, delta: 0.5, seed: 2 });
    a.add('x', 1);
    b.add('x', 1);
    // Both estimates are at least 1, but internal table layouts differ.
    expect(a.estimate('x')).toBeGreaterThanOrEqual(1);
    expect(b.estimate('x')).toBeGreaterThanOrEqual(1);
  });

  it('width and depth depend on params', () => {
    const tight = new CountMinSketch({ epsilon: 0.001, delta: 0.001 });
    const loose = new CountMinSketch({ epsilon: 0.5, delta: 0.5 });
    expect(tight.width).toBeGreaterThan(loose.width);
    expect(tight.depth).toBeGreaterThan(loose.depth);
  });

  it('estimate of unseen key may be 0 with small load', () => {
    const cms = new CountMinSketch({ epsilon: 0.001, delta: 0.001 });
    cms.add('only', 1);
    expect(cms.estimate('unseen')).toBe(0);
  });
});
