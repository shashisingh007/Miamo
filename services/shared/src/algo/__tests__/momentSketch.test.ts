import { describe, it, expect } from 'vitest';
import { MomentSketch, momentSketch } from '../momentSketch';

describe('MomentSketch', () => {
  it('throws on bad k', () => {
    expect(() => new MomentSketch(0)).toThrow();
    expect(() => new MomentSketch(-1)).toThrow();
    expect(() => new MomentSketch(1.5)).toThrow();
  });

  it('throws on non-finite add', () => {
    const s = new MomentSketch(3);
    expect(() => s.add(NaN)).toThrow();
    expect(() => s.add(Infinity)).toThrow();
  });

  it('total tracks count', () => {
    const s = new MomentSketch(2);
    [1, 2, 3].forEach((v) => s.add(v));
    expect(s.total()).toBe(3);
  });

  it('order returns k', () => {
    expect(new MomentSketch(4).order()).toBe(4);
  });

  it('mean of [1..5] = 3', () => {
    const s = momentSketch([1, 2, 3, 4, 5], 2);
    expect(s.mean()).toBeCloseTo(3, 12);
  });

  it('variance of [1..5] = 2', () => {
    const s = momentSketch([1, 2, 3, 4, 5], 2);
    expect(s.variance()).toBeCloseTo(2, 12);
  });

  it('powerSum j=1 = sum', () => {
    const s = momentSketch([1, 2, 3], 3);
    expect(s.powerSum(1)).toBe(6);
  });

  it('powerSum j=2 = sum of squares', () => {
    const s = momentSketch([1, 2, 3], 3);
    expect(s.powerSum(2)).toBe(14);
  });

  it('powerSum j=3 = sum of cubes', () => {
    const s = momentSketch([1, 2, 3], 3);
    expect(s.powerSum(3)).toBe(36);
  });

  it('powerSum out of range throws', () => {
    const s = new MomentSketch(2);
    s.add(1);
    expect(() => s.powerSum(0)).toThrow();
    expect(() => s.powerSum(3)).toThrow();
  });

  it('mean on empty throws', () => {
    expect(() => new MomentSketch(2).mean()).toThrow();
  });

  it('variance with k=1 throws', () => {
    const s = new MomentSketch(1);
    s.add(1);
    expect(() => s.variance()).toThrow();
  });

  it('rawMoment matches powerSum/n', () => {
    const s = momentSketch([2, 4, 6], 2);
    expect(s.rawMoment(1)).toBeCloseTo(4, 12);
    expect(s.rawMoment(2)).toBeCloseTo((4 + 16 + 36) / 3, 12);
  });

  it('handles negatives', () => {
    const s = momentSketch([-2, -1, 0, 1, 2], 2);
    expect(s.mean()).toBeCloseTo(0, 12);
    expect(s.variance()).toBeCloseTo(2, 12);
  });
});
