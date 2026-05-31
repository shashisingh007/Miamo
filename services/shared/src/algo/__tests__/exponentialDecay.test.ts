import { describe, it, expect } from 'vitest';
import { ExponentialDecay } from '../exponentialDecay';

describe('ExponentialDecay', () => {
  it('throws on bad halfLife', () => {
    expect(() => new ExponentialDecay(0)).toThrow();
    expect(() => new ExponentialDecay(-1)).toThrow();
    expect(() => new ExponentialDecay(NaN)).toThrow();
    expect(() => new ExponentialDecay(Infinity)).toThrow();
  });

  it('throws on non-finite x or t', () => {
    const d = new ExponentialDecay(10);
    expect(() => d.add(NaN, 0)).toThrow();
    expect(() => d.add(1, NaN)).toThrow();
  });

  it('throws on out-of-order time', () => {
    const d = new ExponentialDecay(10);
    d.add(1, 5);
    expect(() => d.add(2, 4)).toThrow();
  });

  it('empty mean throws', () => {
    expect(() => new ExponentialDecay(10).mean()).toThrow();
  });

  it('single value mean = x', () => {
    const d = new ExponentialDecay(10);
    d.add(5, 0);
    expect(d.mean()).toBe(5);
  });

  it('same time => simple average', () => {
    const d = new ExponentialDecay(10);
    d.add(1, 0);
    d.add(3, 0);
    expect(d.mean()).toBe(2);
  });

  it('halfLife decay halves weight', () => {
    const d = new ExponentialDecay(10);
    d.add(1, 0);
    d.add(1, 10);
    expect(d.total()).toBeCloseTo(1.5, 6);
  });

  it('recent values dominate after long gap', () => {
    const d = new ExponentialDecay(1);
    d.add(0, 0);
    d.add(0, 0);
    d.add(0, 0);
    d.add(100, 100);
    expect(d.mean()).toBeCloseTo(100, 6);
  });

  it('total tracks decayed count', () => {
    const d = new ExponentialDecay(5);
    d.add(1, 0);
    expect(d.total()).toBe(1);
  });

  it('sum returns decayed value', () => {
    const d = new ExponentialDecay(5);
    d.add(2, 0);
    d.add(2, 0);
    expect(d.sum()).toBe(4);
  });

  it('getHalfLife returns input', () => {
    expect(new ExponentialDecay(7).getHalfLife()).toBe(7);
  });

  it('handles negatives', () => {
    const d = new ExponentialDecay(10);
    d.add(-1, 0);
    d.add(-3, 0);
    expect(d.mean()).toBe(-2);
  });

  it('large gap collapses old weight', () => {
    const d = new ExponentialDecay(1);
    d.add(1, 0);
    d.add(1, 1000);
    expect(d.total()).toBeCloseTo(1, 6);
  });

  it('monotonic equal times allowed', () => {
    const d = new ExponentialDecay(10);
    d.add(1, 5);
    d.add(2, 5);
    expect(d.total()).toBe(2);
  });
});
