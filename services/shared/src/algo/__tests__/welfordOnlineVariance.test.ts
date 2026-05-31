import { describe, it, expect } from 'vitest';
import { WelfordOnlineVariance } from '../welfordOnlineVariance';

describe('WelfordOnlineVariance', () => {
  it('starts empty', () => {
    const w = new WelfordOnlineVariance();
    expect(w.count).toBe(0);
    expect(w.average).toBe(0);
    expect(w.variancePopulation).toBe(0);
    expect(w.varianceSample).toBe(0);
  });

  it('rejects non-finite', () => {
    const w = new WelfordOnlineVariance();
    expect(() => w.add(NaN)).toThrow();
    expect(() => w.add(Infinity)).toThrow();
    expect(() => w.add('1' as any)).toThrow();
  });

  it('single value', () => {
    const w = new WelfordOnlineVariance();
    w.add(5);
    expect(w.count).toBe(1);
    expect(w.average).toBe(5);
    expect(w.variancePopulation).toBe(0);
    expect(w.varianceSample).toBe(0);
  });

  it('mean of [2,4,6]', () => {
    const w = new WelfordOnlineVariance();
    [2, 4, 6].forEach((v) => w.add(v));
    expect(w.average).toBeCloseTo(4, 10);
  });

  it('population variance of [2,4,4,4,5,5,7,9]', () => {
    const w = new WelfordOnlineVariance();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((v) => w.add(v));
    // variance = 4
    expect(w.variancePopulation).toBeCloseTo(4, 10);
  });

  it('sample variance of [2,4,4,4,5,5,7,9]', () => {
    const w = new WelfordOnlineVariance();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((v) => w.add(v));
    // 32/7
    expect(w.varianceSample).toBeCloseTo(32 / 7, 10);
  });

  it('stdDev', () => {
    const w = new WelfordOnlineVariance();
    [2, 4, 4, 4, 5, 5, 7, 9].forEach((v) => w.add(v));
    expect(w.stdDevPopulation).toBeCloseTo(2, 10);
  });

  it('chainable add', () => {
    const w = new WelfordOnlineVariance();
    w.add(1).add(2).add(3);
    expect(w.average).toBeCloseTo(2, 10);
  });

  it('reset', () => {
    const w = new WelfordOnlineVariance();
    w.add(1).add(2);
    w.reset();
    expect(w.count).toBe(0);
  });

  it('merge with empty', () => {
    const a = new WelfordOnlineVariance();
    a.add(1).add(2);
    a.merge(new WelfordOnlineVariance());
    expect(a.average).toBeCloseTo(1.5, 10);
  });

  it('merge empty with full', () => {
    const a = new WelfordOnlineVariance();
    const b = new WelfordOnlineVariance();
    b.add(1).add(2);
    a.merge(b);
    expect(a.average).toBeCloseTo(1.5, 10);
  });

  it('merge equivalent to single stream', () => {
    const a = new WelfordOnlineVariance();
    const b = new WelfordOnlineVariance();
    [1, 2, 3, 4].forEach((v) => a.add(v));
    [5, 6, 7, 8].forEach((v) => b.add(v));
    a.merge(b);
    const single = new WelfordOnlineVariance();
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((v) => single.add(v));
    expect(a.average).toBeCloseTo(single.average, 10);
    expect(a.variancePopulation).toBeCloseTo(single.variancePopulation, 10);
  });

  it('handles 10k stream', () => {
    const w = new WelfordOnlineVariance();
    for (let i = 0; i < 10000; i++) w.add(i);
    expect(w.average).toBeCloseTo(4999.5, 6);
  });

  it('constant stream variance 0', () => {
    const w = new WelfordOnlineVariance();
    for (let i = 0; i < 100; i++) w.add(7);
    expect(w.variancePopulation).toBeCloseTo(0, 10);
  });

  it('numerical stability for large mean', () => {
    const w = new WelfordOnlineVariance();
    for (let i = 0; i < 1000; i++) w.add(1e9 + Math.random());
    expect(w.variancePopulation).toBeGreaterThanOrEqual(0);
    expect(w.variancePopulation).toBeLessThan(1);
  });

  it('count increments', () => {
    const w = new WelfordOnlineVariance();
    w.add(1).add(2).add(3);
    expect(w.count).toBe(3);
  });
});
