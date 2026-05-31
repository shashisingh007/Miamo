import { describe, it, expect } from 'vitest';
import { cgnrSolve } from '../cgnrSolve';

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0; for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}

describe('cgnrSolve', () => {
  it('throws on empty', () => {
    expect(() => cgnrSolve([], [])).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => cgnrSolve([[1, 2], [3, 4]], [1])).toThrow();
  });

  it('throws on ragged', () => {
    expect(() => cgnrSolve([[1, 2], [3]] as any, [1, 1])).toThrow();
  });

  it('throws on x0 mismatch', () => {
    expect(() => cgnrSolve([[1, 2], [3, 4]], [1, 1], { x0: [1] })).toThrow();
  });

  it('square SPD-like exact solve', () => {
    const A = [[4, 1], [1, 3]];
    const b = [1, 2];
    const { x, residualNorm } = cgnrSolve(A, b, { tol: 1e-12, maxIter: 50 });
    expect(residualNorm).toBeLessThan(1e-8);
    const recon = matVec(A, x);
    expect(recon[0]).toBeCloseTo(1, 8);
    expect(recon[1]).toBeCloseTo(2, 8);
  });

  it('overdetermined least squares', () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3]];
    const b = [1, 2, 3, 4]; // exact line y = 1 + x
    const { x } = cgnrSolve(A, b, { tol: 1e-12, maxIter: 100 });
    expect(x[0]).toBeCloseTo(1, 6);
    expect(x[1]).toBeCloseTo(1, 6);
  });

  it('underdetermined min-norm-ish solution still residual=0', () => {
    const A = [[1, 1, 1]];
    const b = [3];
    const { x, residualNorm } = cgnrSolve(A, b, { tol: 1e-12, maxIter: 50 });
    expect(residualNorm).toBeLessThan(1e-8);
    expect(x[0] + x[1] + x[2]).toBeCloseTo(3, 8);
  });

  it('zero rhs gives zero', () => {
    const A = [[2, 1], [1, 3]];
    const { x } = cgnrSolve(A, [0, 0]);
    expect(x[0]).toBeCloseTo(0, 10);
    expect(x[1]).toBeCloseTo(0, 10);
  });

  it('iteration count bounded', () => {
    const A = [[1, 0], [0, 1]];
    const { iterations } = cgnrSolve(A, [3, 4]);
    expect(iterations).toBeLessThanOrEqual(2);
  });

  it('respects maxIter cap', () => {
    const A = [[1, 0.5], [0.5, 1]];
    const { iterations } = cgnrSolve(A, [1, 1], { maxIter: 1 });
    expect(iterations).toBeLessThanOrEqual(1);
  });

  it('x0 warm start works', () => {
    const A = [[2, 0], [0, 2]];
    const b = [4, 6];
    const { x } = cgnrSolve(A, b, { x0: [2, 3] });
    expect(x[0]).toBeCloseTo(2, 10);
    expect(x[1]).toBeCloseTo(3, 10);
  });

  it('does not mutate input', () => {
    const A = [[1, 2], [3, 4]];
    const b = [5, 6];
    const refA = JSON.parse(JSON.stringify(A));
    const refB = b.slice();
    cgnrSolve(A, b);
    expect(A).toEqual(refA);
    expect(b).toEqual(refB);
  });

  it('residual decreases in least squares', () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]];
    const b = [1, 2, 3, 4, 6]; // not exactly linear
    const { residualNorm } = cgnrSolve(A, b, { tol: 1e-12, maxIter: 100 });
    // OLS residual norm should be small, finite
    expect(residualNorm).toBeGreaterThan(0);
    expect(residualNorm).toBeLessThan(1);
  });

  it('default tol works', () => {
    const A = [[3, 0], [0, 4]];
    const { x } = cgnrSolve(A, [3, 8]);
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(2, 8);
  });

  it('handles 1x1', () => {
    const { x } = cgnrSolve([[5]], [10]);
    expect(x[0]).toBeCloseTo(2, 10);
  });
});
