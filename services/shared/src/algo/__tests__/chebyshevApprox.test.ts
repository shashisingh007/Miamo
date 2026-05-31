import { describe, it, expect } from 'vitest';
import { chebyshevApprox, chebyshevEval } from '../chebyshevApprox';

describe('chebyshevApprox', () => {
  it('throws on b<=a', () => {
    expect(() => chebyshevApprox(Math.sin, 1, 1, 8)).toThrow();
    expect(() => chebyshevApprox(Math.sin, 2, 1, 8)).toThrow();
  });

  it('throws on n<1', () => {
    expect(() => chebyshevApprox(Math.sin, 0, 1, 0)).toThrow();
  });

  it('throws on non-integer n', () => {
    expect(() => chebyshevApprox(Math.sin, 0, 1, 2.5)).toThrow();
  });

  it('throws on non-finite f', () => {
    expect(() => chebyshevApprox(() => NaN, 0, 1, 4)).toThrow();
  });

  it('approximates sin on [0, pi]', () => {
    const c = chebyshevApprox(Math.sin, 0, Math.PI, 16);
    for (const x of [0.1, 0.7, 1.5, 2.3, 3.0]) {
      expect(chebyshevEval(c, 0, Math.PI, x)).toBeCloseTo(Math.sin(x), 8);
    }
  });

  it('approximates exp on [-1,1]', () => {
    const c = chebyshevApprox(Math.exp, -1, 1, 12);
    for (const x of [-0.9, -0.3, 0, 0.4, 0.95]) {
      expect(chebyshevEval(c, -1, 1, x)).toBeCloseTo(Math.exp(x), 8);
    }
  });

  it('exact for low-degree polynomial', () => {
    const f = (x: number) => 3 * x * x - 2 * x + 1;
    const c = chebyshevApprox(f, -1, 1, 8);
    for (const x of [-0.8, -0.2, 0, 0.5, 0.9]) {
      expect(chebyshevEval(c, -1, 1, x)).toBeCloseTo(f(x), 10);
    }
  });

  it('returns N coefficients', () => {
    expect(chebyshevApprox(Math.sin, 0, 1, 5).length).toBe(5);
    expect(chebyshevApprox(Math.sin, 0, 1, 20).length).toBe(20);
  });

  it('eval throws on empty coeffs', () => {
    expect(() => chebyshevEval([], 0, 1, 0.5)).toThrow();
  });

  it('eval throws on bad range', () => {
    expect(() => chebyshevEval([1, 0], 1, 1, 0.5)).toThrow();
  });

  it('eval throws on x out of range', () => {
    const c = chebyshevApprox(Math.sin, 0, 1, 6);
    expect(() => chebyshevEval(c, 0, 1, 2)).toThrow();
    expect(() => chebyshevEval(c, 0, 1, -1)).toThrow();
  });

  it('eval at endpoints', () => {
    const c = chebyshevApprox(Math.cos, 0, Math.PI, 16);
    expect(chebyshevEval(c, 0, Math.PI, 0)).toBeCloseTo(1, 6);
    expect(chebyshevEval(c, 0, Math.PI, Math.PI)).toBeCloseTo(-1, 6);
  });

  it('linear function', () => {
    const c = chebyshevApprox((x) => 2 * x + 3, 0, 4, 6);
    expect(chebyshevEval(c, 0, 4, 1.5)).toBeCloseTo(6, 10);
    expect(chebyshevEval(c, 0, 4, 3.7)).toBeCloseTo(10.4, 10);
  });
});
