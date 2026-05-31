import { describe, it, expect } from 'vitest';
import { qrAlgorithm } from '../qrAlgorithm';

describe('qrAlgorithm', () => {
  it('rejects empty', () => {
    expect(() => qrAlgorithm([])).toThrow();
  });

  it('rejects non-square', () => {
    expect(() => qrAlgorithm([[1, 2]])).toThrow();
  });

  it('1x1 trivial', () => {
    const r = qrAlgorithm([[5]]);
    expect(r.eigenvalues).toEqual([5]);
    expect(r.converged).toBe(true);
  });

  it('diagonal matrix returns sorted diagonal', () => {
    const r = qrAlgorithm([
      [2, 0, 0],
      [0, 5, 0],
      [0, 0, 1],
    ]);
    expect(r.eigenvalues[0]).toBeCloseTo(5, 6);
    expect(r.eigenvalues[1]).toBeCloseTo(2, 6);
    expect(r.eigenvalues[2]).toBeCloseTo(1, 6);
  });

  it('symmetric 2x2', () => {
    const r = qrAlgorithm([
      [4, 1],
      [1, 3],
    ]);
    const expected = [(7 + Math.sqrt(5)) / 2, (7 - Math.sqrt(5)) / 2];
    expect(r.eigenvalues[0]).toBeCloseTo(expected[0], 6);
    expect(r.eigenvalues[1]).toBeCloseTo(expected[1], 6);
  });

  it('symmetric 3x3 converges', () => {
    const A = [
      [4, 1, 2],
      [1, 3, 0],
      [2, 0, 5],
    ];
    const r = qrAlgorithm(A);
    expect(r.converged).toBe(true);
    // sum eigenvalues = trace
    const tr = A[0][0] + A[1][1] + A[2][2];
    const sum = r.eigenvalues.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(tr, 5);
  });

  it('product eigenvalues = determinant for symmetric 3x3', () => {
    const A = [
      [4, 1, 2],
      [1, 3, 0],
      [2, 0, 5],
    ];
    // det = 4*(15-0) - 1*(5-0) + 2*(0-6) = 60 - 5 - 12 = 43
    const r = qrAlgorithm(A);
    const prod = r.eigenvalues.reduce((a, b) => a * b, 1);
    expect(prod).toBeCloseTo(43, 4);
  });

  it('sorted descending', () => {
    const r = qrAlgorithm([
      [4, 1, 2],
      [1, 3, 0],
      [2, 0, 5],
    ]);
    for (let i = 1; i < r.eigenvalues.length; i++) {
      expect(r.eigenvalues[i - 1]).toBeGreaterThanOrEqual(r.eigenvalues[i]);
    }
  });

  it('identity has all eigenvalues 1', () => {
    const r = qrAlgorithm([
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]);
    expect(r.eigenvalues.every((v) => Math.abs(v - 1) < 1e-9)).toBe(true);
  });

  it('respects maxIter', () => {
    const r = qrAlgorithm(
      [
        [4, 1],
        [1, 3],
      ],
      { maxIter: 1 },
    );
    expect(r.iterations).toBeLessThanOrEqual(1);
  });

  it('returns iteration count', () => {
    const r = qrAlgorithm([
      [4, 1],
      [1, 3],
    ]);
    expect(r.iterations).toBeGreaterThan(0);
  });

  it('rejects ragged rows', () => {
    expect(() => qrAlgorithm([[1, 2], [3] as unknown as number[]])).toThrow();
  });
});
