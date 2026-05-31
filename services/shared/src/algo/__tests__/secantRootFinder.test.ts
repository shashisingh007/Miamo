import { describe, it, expect } from 'vitest';
import { secantRootFinder } from '../secantRootFinder';

describe('secantRootFinder', () => {
  it('finds root of x^2 - 2', () => {
    const r = secantRootFinder((x) => x * x - 2, 1, 2);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(Math.SQRT2, 8);
  });

  it('finds root of cubic', () => {
    const r = secantRootFinder((x) => x ** 3 - x - 2, 1, 2);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root ** 3 - r.root - 2)).toBeLessThan(1e-8);
  });

  it('linear root', () => {
    const r = secantRootFinder((x) => 3 * x - 9, 0, 10);
    expect(r.root).toBeCloseTo(3, 8);
  });

  it('finds root of cos(x) - x', () => {
    const r = secantRootFinder((x) => Math.cos(x) - x, 0, 1);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(0.7390851332, 6);
  });

  it('throws on equal guesses', () => {
    expect(() => secantRootFinder((x) => x, 1, 1)).toThrow(/differ/);
  });

  it('throws on non-finite guess', () => {
    expect(() => secantRootFinder((x) => x, NaN, 1)).toThrow(/finite/);
  });

  it('throws on non-finite f', () => {
    expect(() => secantRootFinder((x) => (x === 0 ? Infinity : x), 0, 1)).toThrow(/non-finite/);
  });

  it('throws on flat secant', () => {
    expect(() => secantRootFinder(() => 1, 0, 1)).toThrow(/zero denominator/);
  });

  it('reports iteration count', () => {
    const r = secantRootFinder((x) => x * x - 2, 1, 2);
    expect(r.iterations).toBeGreaterThan(0);
  });

  it('honours maxIterations', () => {
    const r = secantRootFinder((x) => x - 0.1234567, 0, 1, { tol: 1e-20, maxIterations: 2 });
    expect(r.iterations).toBe(2);
  });

  it('honours custom tolerance', () => {
    const r = secantRootFinder((x) => x * x - 2, 1, 2, { tol: 1e-3 });
    expect(Math.abs(r.root - Math.SQRT2)).toBeLessThan(1e-2);
  });

  it('returns iteration 0 when fcurr already zero', () => {
    const r = secantRootFinder((x) => x - 5, 4, 5);
    expect(r.root).toBe(5);
    expect(r.iterations).toBe(0);
  });
});
