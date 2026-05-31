import { describe, it, expect } from 'vitest';
import { hermiteInterp } from '../hermiteInterp';

describe('hermiteInterp', () => {
  it('passes through knots', () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 4, 9, 16];
    const ms = [0, 0, 0, 0];
    const I = hermiteInterp(xs, ys, ms);
    for (let i = 0; i < xs.length; i++) expect(I.evaluate(xs[i])).toBeCloseTo(ys[i], 12);
  });

  it('linear function reproduced when derivatives match slope', () => {
    const xs = [0, 1, 2];
    const ys = [1, 3, 5];
    const ms = [2, 2, 2];
    const I = hermiteInterp(xs, ys, ms);
    for (const x of [0.1, 0.7, 1.3, 1.9]) {
      expect(I.evaluate(x)).toBeCloseTo(1 + 2 * x, 10);
    }
  });

  it('cubic reproduced exactly on a single segment', () => {
    const f = (x: number) => 2 * x * x * x - x + 1;
    const df = (x: number) => 6 * x * x - 1;
    const xs = [0, 1];
    const ys = [f(0), f(1)];
    const ms = [df(0), df(1)];
    const I = hermiteInterp(xs, ys, ms);
    for (const x of [0.1, 0.4, 0.6, 0.9]) expect(I.evaluate(x)).toBeCloseTo(f(x), 10);
  });

  it('uses correct segment via binary search', () => {
    const xs = [0, 1, 10, 100];
    const ys = [0, 1, 10, 100];
    const ms = [1, 1, 1, 1];
    const I = hermiteInterp(xs, ys, ms);
    expect(I.evaluate(50)).toBeCloseTo(50, 6);
  });

  it('evaluating at right endpoint', () => {
    const I = hermiteInterp([0, 2], [0, 4], [0, 4]);
    expect(I.evaluate(2)).toBeCloseTo(4, 12);
  });

  it('rejects too few knots', () => {
    expect(() => hermiteInterp([0], [0], [0])).toThrow();
  });

  it('rejects ys length mismatch', () => {
    expect(() => hermiteInterp([0, 1], [0], [0, 0])).toThrow();
  });

  it('rejects ms length mismatch', () => {
    expect(() => hermiteInterp([0, 1], [0, 1], [0])).toThrow();
  });

  it('rejects non-increasing xs', () => {
    expect(() => hermiteInterp([0, 1, 1], [0, 1, 2], [0, 0, 0])).toThrow();
  });

  it('rejects x outside range', () => {
    const I = hermiteInterp([0, 1], [0, 1], [1, 1]);
    expect(() => I.evaluate(-0.1)).toThrow();
    expect(() => I.evaluate(1.1)).toThrow();
  });

  it('rejects non-finite x', () => {
    const I = hermiteInterp([0, 1], [0, 1], [1, 1]);
    expect(() => I.evaluate(NaN)).toThrow();
  });
});
