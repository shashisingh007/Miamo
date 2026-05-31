import { describe, it, expect } from 'vitest';
import { lspApprox, lspEval } from '../lspApprox';

describe('lspApprox', () => {
  it('throws on empty', () => {
    expect(() => lspApprox([], [], 1)).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => lspApprox([1, 2], [1], 1)).toThrow();
  });

  it('throws on negative degree', () => {
    expect(() => lspApprox([1, 2], [1, 2], -1)).toThrow();
  });

  it('throws on non-integer degree', () => {
    expect(() => lspApprox([1, 2], [1, 2], 1.5)).toThrow();
  });

  it('throws on too few points', () => {
    expect(() => lspApprox([1], [1], 2)).toThrow();
  });

  it('fits constant', () => {
    const c = lspApprox([1, 2, 3, 4, 5], [7, 7, 7, 7, 7], 0);
    expect(c).toHaveLength(1);
    expect(c[0]).toBeCloseTo(7, 10);
  });

  it('fits linear exactly', () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => 2 * x + 1);
    const c = lspApprox(xs, ys, 1);
    expect(c[0]).toBeCloseTo(1, 8);
    expect(c[1]).toBeCloseTo(2, 8);
  });

  it('fits quadratic exactly', () => {
    const xs = [-2, -1, 0, 1, 2];
    const ys = xs.map((x) => 3 * x * x - 2 * x + 1);
    const c = lspApprox(xs, ys, 2);
    expect(c[0]).toBeCloseTo(1, 6);
    expect(c[1]).toBeCloseTo(-2, 6);
    expect(c[2]).toBeCloseTo(3, 6);
  });

  it('lspEval reproduces polynomial', () => {
    const xs = [-1, 0, 1, 2];
    const ys = xs.map((x) => x * x);
    const c = lspApprox(xs, ys, 2);
    expect(lspEval(c, 3)).toBeCloseTo(9, 6);
  });

  it('linear regression slope/intercept', () => {
    const xs = [1, 2, 3, 4];
    const ys = [2.1, 3.9, 6.1, 7.9];
    const c = lspApprox(xs, ys, 1);
    expect(c[1]).toBeCloseTo(1.96, 1);
    expect(c[0]).toBeCloseTo(0.1, 1);
  });

  it('reduces residual to ~0 when interpolating', () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 2, 5, 10];
    const c = lspApprox(xs, ys, 3);
    let resid = 0;
    for (let i = 0; i < xs.length; i++) {
      const e = lspEval(c, xs[i]) - ys[i];
      resid += e * e;
    }
    expect(resid).toBeLessThan(1e-8);
  });

  it('overfit not allowed (degree==n-1 still works)', () => {
    const xs = [0, 1, 2];
    const ys = [1, 4, 9];
    const c = lspApprox(xs, ys, 2);
    expect(c[2]).toBeCloseTo(1, 6);
    expect(c[1]).toBeCloseTo(2, 6);
    expect(c[0]).toBeCloseTo(1, 6);
  });

  it('handles negative ys', () => {
    const xs = [0, 1, 2, 3];
    const ys = xs.map((x) => -x - 1);
    const c = lspApprox(xs, ys, 1);
    expect(c[0]).toBeCloseTo(-1, 8);
    expect(c[1]).toBeCloseTo(-1, 8);
  });

  it('lspEval at zero returns constant term', () => {
    const c = [3, -2, 5];
    expect(lspEval(c, 0)).toBe(3);
  });
});
