import { describe, it, expect } from 'vitest';
import { cyclicReductionTridiag } from '../cyclicReductionTridiag';

function tridiagMul(sub: number[], diag: number[], sup: number[], x: number[]): number[] {
  const n = x.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    y[i] = diag[i] * x[i];
    if (i > 0) y[i] += sub[i] * x[i - 1];
    if (i < n - 1) y[i] += sup[i] * x[i + 1];
  }
  return y;
}

describe('cyclicReductionTridiag', () => {
  it('throws on empty', () => {
    expect(() => cyclicReductionTridiag([], [], [], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => cyclicReductionTridiag([0], [1, 2], [0, 0], [1, 1])).toThrow();
  });

  it('1x1 trivial', () => {
    expect(cyclicReductionTridiag([0], [2], [0], [4])).toEqual([2]);
  });

  it('throws on zero pivot 1x1', () => {
    expect(() => cyclicReductionTridiag([0], [0], [0], [1])).toThrow();
  });

  it('2x2 identity-like', () => {
    const x = cyclicReductionTridiag([0, 0], [1, 1], [0, 0], [3, 5]);
    expect(x[0]).toBeCloseTo(3, 12);
    expect(x[1]).toBeCloseTo(5, 12);
  });

  it('3x3 Poisson [-1,2,-1]', () => {
    const sub = [0, -1, -1];
    const diag = [2, 2, 2];
    const sup = [-1, -1, 0];
    const xstar = [1, 2, 3];
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < 3; i++) expect(x[i]).toBeCloseTo(xstar[i], 10);
  });

  it('5x5 Poisson', () => {
    const n = 5;
    const sub = [0, -1, -1, -1, -1];
    const diag = [2, 2, 2, 2, 2];
    const sup = [-1, -1, -1, -1, 0];
    const xstar = [1, -2, 3, -4, 5];
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xstar[i], 10);
  });

  it('7x7 odd power-of-two-minus-one', () => {
    const n = 7;
    const sub = new Array(n).fill(-1); sub[0] = 0;
    const diag = new Array(n).fill(4);
    const sup = new Array(n).fill(-1); sup[n - 1] = 0;
    const xstar = [1, 2, 3, 4, 5, 6, 7];
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xstar[i], 10);
  });

  it('6x6 even size', () => {
    const n = 6;
    const sub = new Array(n).fill(-1); sub[0] = 0;
    const diag = new Array(n).fill(3);
    const sup = new Array(n).fill(-1); sup[n - 1] = 0;
    const xstar = [1, 2, 3, 4, 5, 6];
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xstar[i], 10);
  });

  it('asymmetric tridiagonal', () => {
    const sub = [0, -2, -3, -4];
    const diag = [5, 6, 7, 8];
    const sup = [-1, -1, -1, 0];
    const xstar = [1, 1, 1, 1];
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < 4; i++) expect(x[i]).toBeCloseTo(xstar[i], 8);
  });

  it('does not mutate inputs', () => {
    const sub = [0, -1, -1];
    const diag = [2, 2, 2];
    const sup = [-1, -1, 0];
    const rhs = [1, 0, 1];
    const sref = sub.slice();
    const dref = diag.slice();
    const upref = sup.slice();
    const rref = rhs.slice();
    cyclicReductionTridiag(sub, diag, sup, rhs);
    expect(sub).toEqual(sref);
    expect(diag).toEqual(dref);
    expect(sup).toEqual(upref);
    expect(rhs).toEqual(rref);
  });

  it('returns vector of correct length', () => {
    const x = cyclicReductionTridiag([0, -1, -1, -1], [2, 2, 2, 2], [-1, -1, -1, 0], [1, 0, 0, 1]);
    expect(x).toHaveLength(4);
  });

  it('arbitrary RHS produces residual ~ 0', () => {
    const sub = [0, 1, 2, 1, 1];
    const diag = [4, 5, 6, 5, 4];
    const sup = [1, 2, 1, 1, 0];
    const rhs = [10, -3, 7, 2, 5];
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    const y = tridiagMul(sub, diag, sup, x);
    for (let i = 0; i < 5; i++) expect(y[i]).toBeCloseTo(rhs[i], 8);
  });

  it('large diagonally-dominant n=8', () => {
    const n = 8;
    const sub = new Array(n).fill(-1); sub[0] = 0;
    const diag = new Array(n).fill(10);
    const sup = new Array(n).fill(-1); sup[n - 1] = 0;
    const xstar = Array.from({ length: n }, (_, i) => i + 1);
    const rhs = tridiagMul(sub, diag, sup, xstar);
    const x = cyclicReductionTridiag(sub, diag, sup, rhs);
    for (let i = 0; i < n; i++) expect(x[i]).toBeCloseTo(xstar[i], 8);
  });
});
