import { describe, it, expect } from 'vitest';
import { P2QuantileEstimator } from '../p2QuantileEstimator';

describe('P2QuantileEstimator', () => {
  it('throws on bad p', () => {
    expect(() => new P2QuantileEstimator(0)).toThrow();
    expect(() => new P2QuantileEstimator(1)).toThrow();
    expect(() => new P2QuantileEstimator(-0.1)).toThrow();
    expect(() => new P2QuantileEstimator(NaN)).toThrow();
  });

  it('throws on non-finite add', () => {
    const e = new P2QuantileEstimator(0.5);
    expect(() => e.add(NaN)).toThrow();
  });

  it('throws on empty quantile', () => {
    const e = new P2QuantileEstimator(0.5);
    expect(() => e.quantile()).toThrow();
  });

  it('total tracks count', () => {
    const e = new P2QuantileEstimator(0.5);
    [1, 2, 3].forEach((v) => e.add(v));
    expect(e.total()).toBe(3);
  });

  it('approximates median of uniform [0,1]', () => {
    const e = new P2QuantileEstimator(0.5);
    let seed = 42;
    for (let i = 0; i < 1000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      e.add((seed % 1000000) / 1000000);
    }
    expect(e.quantile()).toBeGreaterThan(0.4);
    expect(e.quantile()).toBeLessThan(0.6);
  });

  it('approximates p=0.95 of uniform', () => {
    const e = new P2QuantileEstimator(0.95);
    let seed = 7;
    for (let i = 0; i < 2000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      e.add((seed % 1000000) / 1000000);
    }
    expect(e.quantile()).toBeGreaterThan(0.9);
    expect(e.quantile()).toBeLessThan(1.0);
  });

  it('approximates p=0.05 of uniform', () => {
    const e = new P2QuantileEstimator(0.05);
    let seed = 999;
    for (let i = 0; i < 2000; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      e.add((seed % 1000000) / 1000000);
    }
    expect(e.quantile()).toBeGreaterThan(0.0);
    expect(e.quantile()).toBeLessThan(0.1);
  });

  it('handles fewer than 5 values', () => {
    const e = new P2QuantileEstimator(0.5);
    [3, 1, 2].forEach((v) => e.add(v));
    expect(Number.isFinite(e.quantile())).toBe(true);
  });

  it('single value', () => {
    const e = new P2QuantileEstimator(0.5);
    e.add(42);
    expect(e.quantile()).toBe(42);
  });

  it('exactly 5 values uses sorted q', () => {
    const e = new P2QuantileEstimator(0.5);
    [5, 1, 4, 2, 3].forEach((v) => e.add(v));
    expect(e.quantile()).toBe(3);
  });

  it('handles negatives', () => {
    const e = new P2QuantileEstimator(0.5);
    for (let i = -50; i <= 50; i++) e.add(i);
    expect(e.quantile()).toBeGreaterThan(-10);
    expect(e.quantile()).toBeLessThan(10);
  });

  it('all equal => same value', () => {
    const e = new P2QuantileEstimator(0.5);
    for (let i = 0; i < 50; i++) e.add(7);
    expect(e.quantile()).toBe(7);
  });

  it('large monotonic stream', () => {
    const e = new P2QuantileEstimator(0.5);
    for (let i = 1; i <= 1000; i++) e.add(i);
    expect(e.quantile()).toBeGreaterThan(400);
    expect(e.quantile()).toBeLessThan(600);
  });

  it('large reversed stream', () => {
    const e = new P2QuantileEstimator(0.5);
    for (let i = 1000; i >= 1; i--) e.add(i);
    expect(e.quantile()).toBeGreaterThan(400);
    expect(e.quantile()).toBeLessThan(600);
  });
});
