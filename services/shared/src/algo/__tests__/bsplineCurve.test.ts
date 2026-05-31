import { describe, it, expect } from 'vitest';
import { buildBSpline, evalBSpline, clampedKnots, bsplineSample } from '../bsplineCurve';

describe('bsplineCurve', () => {
  it('clampedKnots cubic 5 control points', () => {
    const k = clampedKnots(3, 5);
    expect(k).toHaveLength(9);
    expect(k.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(k.slice(5, 9)).toEqual([1, 1, 1, 1]);
    expect(k[4]).toBeCloseTo(0.5, 9);
  });

  it('clampedKnots throws when nControl<=degree', () => {
    expect(() => clampedKnots(3, 3)).toThrow();
  });

  it('clampedKnots throws for non-int degree', () => {
    expect(() => clampedKnots(2.5, 5)).toThrow();
  });

  it('build throws on knot length mismatch', () => {
    expect(() => buildBSpline(2, [0, 0, 0, 1], [[0], [1], [2]])).toThrow();
  });

  it('build throws on non-monotone knots', () => {
    expect(() => buildBSpline(2, [0, 0, 0, 1, 0.5, 1], [[0], [1], [2]])).toThrow();
  });

  it('build throws on dim mismatch', () => {
    expect(() => buildBSpline(2, [0, 0, 0, 1, 1, 1], [[0, 0], [1], [2, 2]] as any)).toThrow();
  });

  it('eval at t=tmin equals first control', () => {
    const ctrl = [[0, 0], [1, 2], [3, 1], [4, 0]];
    const sp = buildBSpline(3, clampedKnots(3, 4), ctrl);
    const r = evalBSpline(sp, 0);
    expect(r[0]).toBeCloseTo(0, 9);
    expect(r[1]).toBeCloseTo(0, 9);
  });

  it('eval at t=tmax equals last control', () => {
    const ctrl = [[0, 0], [1, 2], [3, 1], [4, 0]];
    const sp = buildBSpline(3, clampedKnots(3, 4), ctrl);
    const r = evalBSpline(sp, 1);
    expect(r[0]).toBeCloseTo(4, 9);
    expect(r[1]).toBeCloseTo(0, 9);
  });

  it('linear B-spline with collinear controls is line', () => {
    const ctrl = [[0, 0], [1, 1], [2, 2], [3, 3]];
    const sp = buildBSpline(1, [0, 0, 1 / 3, 2 / 3, 1, 1], ctrl);
    const r = evalBSpline(sp, 0.5);
    expect(r[0]).toBeCloseTo(r[1], 9);
  });

  it('eval throws out of domain', () => {
    const ctrl = [[0], [1], [2], [3]];
    const sp = buildBSpline(2, [0, 0, 0, 0.5, 1, 1, 1], ctrl);
    expect(() => evalBSpline(sp, -0.01)).toThrow();
    expect(() => evalBSpline(sp, 1.01)).toThrow();
  });

  it('eval throws on non-finite t', () => {
    const ctrl = [[0], [1], [2], [3]];
    const sp = buildBSpline(2, [0, 0, 0, 0.5, 1, 1, 1], ctrl);
    expect(() => evalBSpline(sp, NaN)).toThrow();
  });

  it('partition of unity: convex combination stays in bbox', () => {
    const ctrl = [[0, 0], [1, 5], [3, 5], [4, 0]];
    const sp = buildBSpline(3, clampedKnots(3, 4), ctrl);
    for (let i = 0; i <= 10; i++) {
      const r = evalBSpline(sp, i / 10);
      expect(r[0]).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(r[0]).toBeLessThanOrEqual(4 + 1e-9);
      expect(r[1]).toBeGreaterThanOrEqual(0 - 1e-9);
      expect(r[1]).toBeLessThanOrEqual(5 + 1e-9);
    }
  });

  it('bsplineSample length and endpoints', () => {
    const ctrl = [[0, 0], [1, 1], [2, 0], [3, 1]];
    const sp = buildBSpline(3, clampedKnots(3, 4), ctrl);
    const s = bsplineSample(sp, 11);
    expect(s).toHaveLength(11);
    expect(s[0][0]).toBeCloseTo(0, 9);
    expect(s[10][0]).toBeCloseTo(3, 9);
  });

  it('bsplineSample throws on n<2', () => {
    const ctrl = [[0], [1], [2], [3]];
    const sp = buildBSpline(2, [0, 0, 0, 0.5, 1, 1, 1], ctrl);
    expect(() => bsplineSample(sp, 1)).toThrow();
  });

  it('linear segment midpoint', () => {
    const ctrl = [[0, 0], [10, 0]];
    const sp = buildBSpline(1, [0, 0, 1, 1], ctrl);
    const r = evalBSpline(sp, 0.5);
    expect(r[0]).toBeCloseTo(5, 9);
    expect(r[1]).toBeCloseTo(0, 9);
  });

  it('symmetric controls produce symmetric curve', () => {
    const ctrl = [[0, 0], [1, 1], [2, 0]];
    const sp = buildBSpline(2, clampedKnots(2, 3), ctrl);
    const a = evalBSpline(sp, 0.25);
    const b = evalBSpline(sp, 0.75);
    expect(a[0] + b[0]).toBeCloseTo(2, 6);
    expect(a[1]).toBeCloseTo(b[1], 6);
  });
});
