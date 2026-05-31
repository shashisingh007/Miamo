import { describe, it, expect } from 'vitest';
import { buildAkimaSpline, evalAkimaSpline, akimaInterpolate } from '../akimaSpline';

describe('akimaSpline', () => {
  it('passes through knots', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 4, 9, 16];
    const s = buildAkimaSpline(x, y);
    for (let i = 0; i < x.length; i++) {
      expect(evalAkimaSpline(s, x[i])).toBeCloseTo(y[i], 9);
    }
  });

  it('linear data => linear interp', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 2, 4, 6, 8];
    const s = buildAkimaSpline(x, y);
    expect(evalAkimaSpline(s, 1.5)).toBeCloseTo(3, 9);
    expect(evalAkimaSpline(s, 3.25)).toBeCloseTo(6.5, 9);
  });

  it('constant data => constant', () => {
    const x = [0, 1, 2, 3];
    const y = [5, 5, 5, 5];
    const s = buildAkimaSpline(x, y);
    expect(evalAkimaSpline(s, 1.7)).toBeCloseTo(5, 9);
  });

  it('throws on length mismatch', () => {
    expect(() => buildAkimaSpline([0, 1], [0])).toThrow();
  });

  it('throws on n<2', () => {
    expect(() => buildAkimaSpline([0], [0])).toThrow();
  });

  it('throws on non-increasing x', () => {
    expect(() => buildAkimaSpline([0, 1, 1, 2], [0, 1, 2, 3])).toThrow();
  });

  it('eval throws out of range low', () => {
    const s = buildAkimaSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalAkimaSpline(s, -0.1)).toThrow();
  });

  it('eval throws out of range high', () => {
    const s = buildAkimaSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalAkimaSpline(s, 2.1)).toThrow();
  });

  it('eval throws on non-finite', () => {
    const s = buildAkimaSpline([0, 1, 2], [0, 1, 4]);
    expect(() => evalAkimaSpline(s, NaN)).toThrow();
  });

  it('interpolates smooth quadratic moderately well', () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = x.map((v) => v * v);
    const v = akimaInterpolate(x, y, [0.5, 2.5, 4.5]);
    expect(v[0]).toBeCloseTo(0.25, 0);
    expect(v[1]).toBeCloseTo(6.25, 0);
    expect(v[2]).toBeCloseTo(20.25, 0);
  });

  it('akimaInterpolate empty queries', () => {
    expect(akimaInterpolate([0, 1, 2], [0, 1, 4], [])).toEqual([]);
  });

  it('handles 2-point input as linear', () => {
    const s = buildAkimaSpline([0, 10], [0, 5]);
    expect(evalAkimaSpline(s, 5)).toBeCloseTo(2.5, 9);
  });

  it('matches at right boundary', () => {
    const x = [0, 1, 2, 3];
    const y = [1, 3, 2, 5];
    const s = buildAkimaSpline(x, y);
    expect(evalAkimaSpline(s, 3)).toBeCloseTo(5, 9);
  });

  it('robust to abrupt local change', () => {
    const x = [0, 1, 2, 3, 4, 5];
    const y = [0, 0, 0, 1, 1, 1];
    const v = akimaInterpolate(x, y, [1.5, 3.5]);
    expect(v[0]).toBeGreaterThanOrEqual(-0.01);
    expect(v[0]).toBeLessThan(0.5);
    expect(v[1]).toBeGreaterThan(0.5);
    expect(v[1]).toBeLessThanOrEqual(1.01);
  });

  it('preserves monotone segments locally', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 2, 3, 4];
    const s = buildAkimaSpline(x, y);
    expect(evalAkimaSpline(s, 2.5)).toBeCloseTo(2.5, 9);
  });
});
