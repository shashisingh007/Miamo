import { describe, it, expect } from 'vitest';
import { nevilleInterp } from '../nevilleInterp';

describe('nevilleInterp', () => {
  it('reproduces sample point', () => {
    expect(nevilleInterp([0, 1, 2], [1, 3, 7], 1)).toBeCloseTo(3, 12);
  });

  it('linear', () => {
    expect(nevilleInterp([0, 2], [0, 4], 1)).toBeCloseTo(2, 12);
  });

  it('quadratic exact', () => {
    const f = (t: number) => t * t + 2 * t + 1;
    const xs = [0, 1, 2];
    const ys = xs.map(f);
    expect(nevilleInterp(xs, ys, 1.5)).toBeCloseTo(f(1.5), 9);
  });

  it('cubic exact', () => {
    const f = (t: number) => t ** 3 - t;
    const xs = [-1, 0, 1, 2];
    const ys = xs.map(f);
    expect(nevilleInterp(xs, ys, 0.7)).toBeCloseTo(f(0.7), 9);
  });

  it('single point => constant', () => {
    expect(nevilleInterp([5], [9], 100)).toBe(9);
  });

  it('rejects empty', () => {
    expect(() => nevilleInterp([], [], 0)).toThrow();
  });

  it('rejects length mismatch', () => {
    expect(() => nevilleInterp([0, 1], [1], 0)).toThrow();
  });

  it('rejects duplicate x', () => {
    expect(() => nevilleInterp([0, 1, 1], [0, 1, 2], 0.5)).toThrow();
  });

  it('extrapolation', () => {
    const f = (t: number) => 2 * t + 1;
    const xs = [0, 1, 2];
    const ys = xs.map(f);
    expect(nevilleInterp(xs, ys, 5)).toBeCloseTo(f(5), 9);
  });

  it('matches at all sample points', () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 4, 9, 16];
    for (let i = 0; i < xs.length; i++) {
      expect(nevilleInterp(xs, ys, xs[i])).toBeCloseTo(ys[i], 12);
    }
  });
});
