import { describe, it, expect } from 'vitest';
import { bisectionRootFinder } from '../bisectionRootFinder';

describe('bisectionRootFinder', () => {
  it('finds root of x^2 - 2', () => {
    const r = bisectionRootFinder((x) => x * x - 2, 0, 2);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(Math.SQRT2, 8);
  });

  it('finds root of cubic', () => {
    const r = bisectionRootFinder((x) => x * x * x - x - 2, 1, 2);
    expect(r.converged).toBe(true);
    expect(Math.abs(r.root ** 3 - r.root - 2)).toBeLessThan(1e-8);
  });

  it('returns endpoint when f(a)=0', () => {
    const r = bisectionRootFinder((x) => x - 3, 3, 10);
    expect(r.root).toBe(3);
    expect(r.iterations).toBe(0);
  });

  it('returns endpoint when f(b)=0', () => {
    const r = bisectionRootFinder((x) => x - 3, 0, 3);
    expect(r.root).toBe(3);
    expect(r.iterations).toBe(0);
  });

  it('throws when no sign change', () => {
    expect(() => bisectionRootFinder((x) => x * x + 1, -1, 1)).toThrow(/sign change/);
  });

  it('throws when both endpoints positive', () => {
    expect(() => bisectionRootFinder((x) => x + 5, 1, 10)).toThrow(/sign change/);
  });

  it('throws on non-finite endpoint value', () => {
    expect(() => bisectionRootFinder((x) => (x === 0 ? Infinity : -1), 0, 2)).toThrow(/non-finite/);
  });

  it('throws on non-finite interval', () => {
    expect(() => bisectionRootFinder((x) => x, -Infinity, 1)).toThrow(/finite/);
  });

  it('handles reversed interval', () => {
    const r = bisectionRootFinder((x) => x - 1, 5, -5);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(1, 8);
  });

  it('records iteration count', () => {
    const r = bisectionRootFinder((x) => x - 0.1, 0, 1, { tol: 1e-12 });
    expect(r.iterations).toBeGreaterThan(0);
    expect(r.iterations).toBeLessThanOrEqual(200);
  });

  it('reports non-convergence at low maxIterations', () => {
    const r = bisectionRootFinder((x) => x - 0.1234567, 0, 1, { tol: 1e-15, maxIterations: 3 });
    expect(r.converged).toBe(false);
    expect(r.iterations).toBe(3);
  });

  it('linear root', () => {
    const r = bisectionRootFinder((x) => 2 * x - 6, 0, 10);
    expect(r.root).toBeCloseTo(3, 8);
  });

  it('honours custom tolerance', () => {
    const r = bisectionRootFinder((x) => x * x - 2, 0, 2, { tol: 1e-4 });
    expect(Math.abs(r.root - Math.SQRT2)).toBeLessThan(1e-3);
  });

  it('throws on non-finite midpoint', () => {
    let n = 0;
    expect(() =>
      bisectionRootFinder((x) => {
        n += 1;
        if (n > 2) return NaN;
        return x - 0.5;
      }, 0, 1),
    ).toThrow(/non-finite/);
  });
});
