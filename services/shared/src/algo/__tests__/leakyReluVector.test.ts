import { describe, it, expect } from 'vitest';
import { leakyReluVector } from '../leakyReluVector';

describe('leakyReluVector', () => {
  it('empty returns empty', () => {
    expect(leakyReluVector([])).toEqual([]);
  });

  it('positives unchanged', () => {
    expect(leakyReluVector([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it('zero unchanged', () => {
    expect(leakyReluVector([0, 0])).toEqual([0, 0]);
  });

  it('default slope 0.01 for negatives', () => {
    const r = leakyReluVector([-1, -10]);
    expect(r[0]).toBeCloseTo(-0.01, 12);
    expect(r[1]).toBeCloseTo(-0.1, 12);
  });

  it('custom alpha', () => {
    expect(leakyReluVector([-2, -4], 0.5)).toEqual([-1, -2]);
  });

  it('alpha=0 acts as ReLU', () => {
    const r = leakyReluVector([-3, 2, -1, 5], 0);
    expect(r[0]).toBeCloseTo(0, 12);
    expect(r[1]).toBe(2);
    expect(r[2]).toBeCloseTo(0, 12);
    expect(r[3]).toBe(5);
  });

  it('alpha=1 acts as identity', () => {
    expect(leakyReluVector([-3, 2, -1, 5], 1)).toEqual([-3, 2, -1, 5]);
  });

  it('mixed signs', () => {
    const r = leakyReluVector([-2, 3, -5, 0, 1], 0.1);
    expect(r).toEqual([-0.2, 3, -0.5, 0, 1]);
  });

  it('does not mutate input', () => {
    const x = [-1, 2, -3];
    const ref = x.slice();
    leakyReluVector(x);
    expect(x).toEqual(ref);
  });

  it('returns new array', () => {
    const x = [1, 2];
    const y = leakyReluVector(x);
    expect(y).not.toBe(x);
  });

  it('throws on non-finite alpha', () => {
    expect(() => leakyReluVector([1], NaN)).toThrow();
  });

  it('throws on non-finite entry', () => {
    expect(() => leakyReluVector([1, NaN])).toThrow();
    expect(() => leakyReluVector([Infinity])).toThrow();
  });

  it('preserves length', () => {
    expect(leakyReluVector(new Array(100).fill(-1))).toHaveLength(100);
  });
});
