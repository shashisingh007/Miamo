import { describe, it, expect } from 'vitest';
import { lstsqQr } from '../lstsqQr';

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) {
    let s = 0; for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    out[i] = s;
  }
  return out;
}

describe('lstsqQr', () => {
  it('throws on empty', () => {
    expect(() => lstsqQr([], [])).toThrow();
  });

  it('throws on b mismatch', () => {
    expect(() => lstsqQr([[1, 0], [0, 1]], [1])).toThrow();
  });

  it('square exact 2x2', () => {
    const A = [[2, 1], [1, 3]];
    const x = lstsqQr(A, [3, 4]);
    const recon = matVec(A, x);
    expect(recon[0]).toBeCloseTo(3, 8);
    expect(recon[1]).toBeCloseTo(4, 8);
  });

  it('square exact 3x3', () => {
    const A = [
      [4, 1, 0],
      [1, 4, 1],
      [0, 1, 4],
    ];
    const x = lstsqQr(A, [5, 6, 5]);
    const recon = matVec(A, x);
    for (let i = 0; i < 3; i++) expect(recon[i]).toBeCloseTo([5, 6, 5][i], 8);
  });

  it('overdetermined exact line', () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3]];
    const x = lstsqQr(A, [1, 2, 3, 4]);
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(1, 8);
  });

  it('overdetermined least squares', () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3]];
    const b = [1.1, 1.9, 3.05, 4.0];
    const x = lstsqQr(A, b);
    expect(x[1]).toBeCloseTo(0.985, 1);
    // residual better than zero solution
    const recon = matVec(A, x);
    let sse = 0;
    for (let i = 0; i < 4; i++) sse += (recon[i] - b[i]) ** 2;
    expect(sse).toBeLessThan(1);
  });

  it('quadratic fit interpolates', () => {
    const xs = [-1, 0, 1, 2];
    const ys = xs.map((x) => 2 * x * x - x + 3);
    const A: number[][] = xs.map((x) => [1, x, x * x]);
    const c = lstsqQr(A, ys);
    expect(c[0]).toBeCloseTo(3, 8);
    expect(c[1]).toBeCloseTo(-1, 8);
    expect(c[2]).toBeCloseTo(2, 8);
  });

  it('rank deficient throws', () => {
    const A = [[1, 2], [2, 4], [3, 6]];
    expect(() => lstsqQr(A, [1, 2, 3])).toThrow();
  });

  it('zero rhs gives zero', () => {
    const A = [[1, 2], [3, 4], [5, 6]];
    const x = lstsqQr(A, [0, 0, 0]);
    expect(x[0]).toBeCloseTo(0, 8);
    expect(x[1]).toBeCloseTo(0, 8);
  });

  it('1x1 trivial', () => {
    const x = lstsqQr([[3]], [9]);
    expect(x[0]).toBeCloseTo(3, 12);
  });

  it('linear in b', () => {
    const A = [[1, 0], [1, 1], [1, 2]];
    const b1 = [1, 2, 3];
    const b2 = [2, 4, 6];
    const x1 = lstsqQr(A, b1);
    const x2 = lstsqQr(A, b2);
    for (let i = 0; i < 2; i++) expect(x2[i]).toBeCloseTo(2 * x1[i], 6);
  });

  it('does not mutate input', () => {
    const A = [[1, 0], [0, 1], [1, 1]];
    const b = [1, 2, 3];
    const refA = JSON.parse(JSON.stringify(A));
    const refB = b.slice();
    lstsqQr(A, b);
    expect(A).toEqual(refA);
    expect(b).toEqual(refB);
  });

  it('residual orthogonal to column space', () => {
    const A = [[1, 0], [1, 1], [1, 2], [1, 3]];
    const b = [1.5, 1.5, 3.5, 3.5];
    const x = lstsqQr(A, b);
    const recon = matVec(A, x);
    const r = b.map((v, i) => v - recon[i]);
    // sum r = 0 (since first column is ones)
    let s = 0; for (const v of r) s += v;
    expect(Math.abs(s)).toBeLessThan(1e-8);
  });

  it('handles negative entries', () => {
    const A = [[-1, 1], [0, 1], [1, 1]];
    const b = [-1, 0, 1];
    const x = lstsqQr(A, b);
    expect(x[0]).toBeCloseTo(1, 8);
    expect(x[1]).toBeCloseTo(0, 8);
  });
});
