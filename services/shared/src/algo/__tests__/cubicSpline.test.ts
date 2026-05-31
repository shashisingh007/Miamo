import { describe, it, expect } from 'vitest';
import { cubicSplineBuild, cubicSplineEval } from '../cubicSpline';

describe('cubicSpline', () => {
  it('passes through samples', () => {
    const xs = [0, 1, 2, 3];
    const ys = [0, 1, 4, 9];
    const s = cubicSplineBuild(xs, ys);
    for (let i = 0; i < xs.length; i++) {
      expect(cubicSplineEval(s, xs[i])).toBeCloseTo(ys[i], 9);
    }
  });

  it('linear data => approx linear', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((t) => 2 * t + 1);
    const s = cubicSplineBuild(xs, ys);
    expect(cubicSplineEval(s, 1.5)).toBeCloseTo(4, 6);
    expect(cubicSplineEval(s, 2.7)).toBeCloseTo(2 * 2.7 + 1, 6);
  });

  it('two-point spline => linear', () => {
    const s = cubicSplineBuild([0, 2], [0, 4]);
    expect(cubicSplineEval(s, 1)).toBeCloseTo(2, 9);
  });

  it('rejects <2 points', () => {
    expect(() => cubicSplineBuild([1], [2])).toThrow();
  });

  it('rejects length mismatch', () => {
    expect(() => cubicSplineBuild([0, 1], [1])).toThrow();
  });

  it('rejects non-increasing xs', () => {
    expect(() => cubicSplineBuild([0, 2, 2], [0, 1, 2])).toThrow();
  });

  it('extrapolates left', () => {
    const s = cubicSplineBuild([0, 1, 2], [0, 1, 4]);
    expect(typeof cubicSplineEval(s, -1)).toBe('number');
  });

  it('extrapolates right', () => {
    const s = cubicSplineBuild([0, 1, 2], [0, 1, 4]);
    expect(typeof cubicSplineEval(s, 5)).toBe('number');
  });

  it('continuous at internal knot', () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 2, 0, 4];
    const s = cubicSplineBuild(xs, ys);
    const left = cubicSplineEval(s, 1 - 1e-9);
    const right = cubicSplineEval(s, 1 + 1e-9);
    expect(Math.abs(left - right)).toBeLessThan(1e-6);
  });

  it('cubic data exact', () => {
    const f = (t: number) => t * t * t;
    const xs = [0, 1, 2, 3, 4];
    const s = cubicSplineBuild(xs, xs.map(f));
    expect(cubicSplineEval(s, 2.5)).toBeCloseTo(f(2.5), 0);
  });
});
