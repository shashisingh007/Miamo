import { describe, it, expect } from 'vitest';
import { ridderRoot } from '../ridderRoot';

describe('ridderRoot', () => {
  it('finds sqrt(2)', () => {
    const r = ridderRoot((x) => x * x - 2, 1, 2);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(Math.SQRT2, 12);
  });

  it('finds root of cubic', () => {
    const r = ridderRoot((x) => x * x * x - x - 2, 1, 2);
    expect(r.root).toBeCloseTo(1.521379706804568, 10);
  });

  it('handles negative bracket', () => {
    const r = ridderRoot((x) => x * x - 9, -5, 0);
    expect(r.root).toBeCloseTo(-3, 10);
  });

  it('reverse bracket [b, a] accepted', () => {
    const r = ridderRoot((x) => x * x - 2, 2, 1);
    expect(r.root).toBeCloseTo(Math.SQRT2, 10);
  });

  it('endpoint root detected immediately', () => {
    const r = ridderRoot((x) => x - 1, 1, 5);
    expect(r.converged).toBe(true);
    expect(r.root).toBeCloseTo(1, 14);
  });

  it('cos(x) - x = 0', () => {
    const r = ridderRoot((x) => Math.cos(x) - x, 0, 1);
    expect(r.root).toBeCloseTo(0.7390851332151607, 10);
  });

  it('rejects bracket that does not straddle root', () => {
    expect(() => ridderRoot((x) => x * x + 1, -1, 1)).toThrow(/bracket/);
  });

  it('rejects degenerate bracket', () => {
    expect(() => ridderRoot((x) => x, 1, 1)).toThrow();
  });

  it('rejects non-finite bracket', () => {
    expect(() => ridderRoot((x) => x, -Infinity, 1)).toThrow();
  });

  it('rejects bad tolerance', () => {
    expect(() => ridderRoot((x) => x * x - 2, 1, 2, { tolerance: -1 })).toThrow();
  });

  it('non-convergence with tight maxIterations', () => {
    const r = ridderRoot((x) => x * x - 2, 1, 2, { maxIterations: 1, tolerance: 1e-20 });
    // 1 iteration may or may not converge; just assert structure
    expect(r.iterations).toBeLessThanOrEqual(1);
  });
});
