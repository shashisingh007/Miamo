import { describe, it, expect } from 'vitest';
import { simplexLinearProg } from '../simplexLinearProg';

describe('simplexLinearProg', () => {
  it('trivial: maximize x s.t. x <= 5', () => {
    const r = simplexLinearProg([1], [[1]], [5]);
    expect(r.status).toBe('optimal');
    expect(r.value).toBeCloseTo(5, 9);
    expect(r.x[0]).toBeCloseTo(5, 9);
  });

  it('classic 2-var: max 3x+5y s.t. x<=4, 2y<=12, 3x+2y<=18', () => {
    const r = simplexLinearProg([3, 5], [[1, 0], [0, 2], [3, 2]], [4, 12, 18]);
    expect(r.status).toBe('optimal');
    expect(r.value).toBeCloseTo(36, 9);
    expect(r.x[0]).toBeCloseTo(2, 6);
    expect(r.x[1]).toBeCloseTo(6, 6);
  });

  it('unbounded: max x s.t. -x <= 1', () => {
    const r = simplexLinearProg([1], [[-1]], [1]);
    expect(r.status).toBe('unbounded');
    expect(r.value).toBe(Infinity);
  });

  it('zero objective => value 0', () => {
    const r = simplexLinearProg([0, 0], [[1, 0], [0, 1]], [3, 4]);
    expect(r.status).toBe('optimal');
    expect(r.value).toBeCloseTo(0, 9);
  });

  it('all-zero constraints yield 0 x but optimal', () => {
    // max x+y s.t. 0x+0y <= 0 => unbounded if c>0
    const r = simplexLinearProg([1, 1], [[0, 0]], [0]);
    expect(r.status).toBe('unbounded');
  });

  it('throws on empty c', () => {
    expect(() => simplexLinearProg([], [], [])).toThrow();
  });

  it('throws on mismatched b length', () => {
    expect(() => simplexLinearProg([1, 2], [[1, 0]], [1, 2])).toThrow();
  });

  it('throws on negative b', () => {
    expect(() => simplexLinearProg([1], [[1]], [-1])).toThrow();
  });

  it('throws on row length mismatch', () => {
    expect(() => simplexLinearProg([1, 2], [[1]], [1])).toThrow();
  });

  it('x is non-negative on optimal', () => {
    const r = simplexLinearProg([2, 3], [[1, 1], [2, 1]], [4, 6]);
    expect(r.status).toBe('optimal');
    for (const v of r.x) expect(v).toBeGreaterThanOrEqual(-1e-9);
  });

  it('value equals c·x on optimal', () => {
    const c = [4, 3];
    const r = simplexLinearProg(c, [[2, 3], [1, 1]], [12, 5]);
    expect(r.status).toBe('optimal');
    const dot = c[0] * r.x[0] + c[1] * r.x[1];
    expect(dot).toBeCloseTo(r.value, 6);
  });
});
