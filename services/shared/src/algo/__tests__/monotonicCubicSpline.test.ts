import { describe, it, expect } from 'vitest';
import {
  buildMonotonicCubicSpline,
  evalMonotonicCubicSpline,
  monotonicCubicInterpolate,
} from '../monotonicCubicSpline';

describe('monotonicCubicSpline', () => {
  it('passes through knots', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 4, 9, 16];
    const s = buildMonotonicCubicSpline(x, y);
    for (let i = 0; i < x.length; i++) {
      expect(evalMonotonicCubicSpline(s, x[i])).toBeCloseTo(y[i], 9);
    }
  });

  it('linear data => linear interp', () => {
    const x = [0, 1, 2, 3];
    const y = [0, 2, 4, 6];
    const s = buildMonotonicCubicSpline(x, y);
    expect(evalMonotonicCubicSpline(s, 1.5)).toBeCloseTo(3, 9);
  });

  it('preserves monotonicity on sigmoid-like steps', () => {
    const x = [0, 1, 2, 3, 4, 5, 6];
    const y = [0, 0, 0, 1, 1, 1, 1];
    const s = buildMonotonicCubicSpline(x, y);
    let prev = -Infinity;
    for (let i = 0; i <= 60; i++) {
      const v = evalMonotonicCubicSpline(s, (i / 60) * 6);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('throws on length mismatch', () => {
    expect(() => buildMonotonicCubicSpline([0, 1], [0])).toThrow();
  });

  it('throws on n<2', () => {
    expect(() => buildMonotonicCubicSpline([0], [0])).toThrow();
  });

  it('throws on non-increasing x', () => {
    expect(() => buildMonotonicCubicSpline([0, 1, 1], [0, 1, 2])).toThrow();
  });

  it('eval throws below range', () => {
    const s = buildMonotonicCubicSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalMonotonicCubicSpline(s, -0.1)).toThrow();
  });

  it('eval throws above range', () => {
    const s = buildMonotonicCubicSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalMonotonicCubicSpline(s, 2.1)).toThrow();
  });

  it('eval throws on non-finite', () => {
    const s = buildMonotonicCubicSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalMonotonicCubicSpline(s, NaN)).toThrow();
  });

  it('constant data => constant', () => {
    const x = [0, 1, 2, 3];
    const y = [5, 5, 5, 5];
    const s = buildMonotonicCubicSpline(x, y);
    expect(evalMonotonicCubicSpline(s, 1.7)).toBeCloseTo(5, 9);
  });

  it('no overshoot at sharp local max', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 0, 1, 0, 0];
    const s = buildMonotonicCubicSpline(x, y);
    for (let i = 0; i <= 40; i++) {
      const v = evalMonotonicCubicSpline(s, (i / 40) * 4);
      expect(v).toBeGreaterThanOrEqual(-1e-9);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('interpolate batch', () => {
    const x = [0, 1, 2];
    const y = [0, 1, 0];
    const r = monotonicCubicInterpolate(x, y, [0, 1, 2]);
    expect(r[0]).toBeCloseTo(0, 9);
    expect(r[1]).toBeCloseTo(1, 9);
    expect(r[2]).toBeCloseTo(0, 9);
  });

  it('interpolate empty', () => {
    expect(monotonicCubicInterpolate([0, 1], [0, 1], [])).toEqual([]);
  });

  it('strictly increasing input stays strictly increasing', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 3, 6, 10];
    const s = buildMonotonicCubicSpline(x, y);
    let prev = -Infinity;
    for (let i = 0; i <= 80; i++) {
      const v = evalMonotonicCubicSpline(s, (i / 80) * 4);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = v;
    }
  });

  it('matches at right boundary', () => {
    const s = buildMonotonicCubicSpline([0, 1, 2, 3], [1, 3, 2, 5]);
    expect(evalMonotonicCubicSpline(s, 3)).toBeCloseTo(5, 9);
  });

  it('two-point input is linear', () => {
    const s = buildMonotonicCubicSpline([0, 10], [0, 5]);
    expect(evalMonotonicCubicSpline(s, 4)).toBeCloseTo(2, 9);
  });
});
