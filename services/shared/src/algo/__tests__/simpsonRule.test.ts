import { describe, it, expect } from 'vitest';
import { simpsonRule } from '../simpsonRule';

describe('simpsonRule', () => {
  it('integrates a constant exactly', () => {
    expect(simpsonRule(() => 5, 0, 4, 2)).toBeCloseTo(20, 12);
  });

  it('integrates a linear function exactly', () => {
    expect(simpsonRule((x) => 2 * x + 3, 0, 5, 4)).toBeCloseTo(40, 12);
  });

  it('integrates a quadratic exactly', () => {
    expect(simpsonRule((x) => x * x, 0, 1, 2)).toBeCloseTo(1 / 3, 12);
  });

  it('integrates a cubic exactly', () => {
    expect(simpsonRule((x) => x ** 3, 0, 2, 4)).toBeCloseTo(4, 12);
  });

  it('integrates sin(x) over [0, pi]', () => {
    expect(simpsonRule(Math.sin, 0, Math.PI, 100)).toBeCloseTo(2, 6);
  });

  it('integrates exp(x) over [0, 1]', () => {
    expect(simpsonRule(Math.exp, 0, 1, 100)).toBeCloseTo(Math.E - 1, 6);
  });

  it('a == b returns 0', () => {
    expect(simpsonRule((x) => x * x + 1, 3, 3)).toBe(0);
  });

  it('reverses sign for swapped bounds', () => {
    const f = (x: number) => x * x;
    expect(simpsonRule(f, 1, 0, 4)).toBeCloseTo(-1 / 3, 12);
  });

  it('rejects odd n', () => {
    expect(() => simpsonRule((x) => x, 0, 1, 3)).toThrow();
  });

  it('rejects non-positive n', () => {
    expect(() => simpsonRule((x) => x, 0, 1, 0)).toThrow();
  });

  it('rejects non-finite bounds', () => {
    expect(() => simpsonRule((x) => x, 0, Infinity, 4)).toThrow();
  });
});
