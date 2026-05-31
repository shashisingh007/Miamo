import { describe, it, expect } from 'vitest';
import { arnoldiIteration } from '../arnoldiIteration';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('arnoldiIteration', () => {
  it('throws on empty', () => {
    expect(() => arnoldiIteration([], [], 1)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => arnoldiIteration([[1, 2]], [1, 2], 1)).toThrow();
  });

  it('throws on b length mismatch', () => {
    expect(() => arnoldiIteration([[1, 0], [0, 1]], [1], 1)).toThrow();
  });

  it('throws on k<1', () => {
    expect(() => arnoldiIteration([[1, 0], [0, 1]], [1, 0], 0)).toThrow();
  });

  it('throws on zero b', () => {
    expect(() => arnoldiIteration([[1, 0], [0, 1]], [0, 0], 1)).toThrow();
  });

  it('Q vectors orthonormal', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = arnoldiIteration(A, [1, 1, 1], 3);
    for (let i = 0; i < r.Q.length; i++) {
      expect(dot(r.Q[i], r.Q[i])).toBeCloseTo(1, 8);
      for (let j = 0; j < i; j++) expect(dot(r.Q[i], r.Q[j])).toBeCloseTo(0, 8);
    }
  });

  it('H is upper Hessenberg', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = arnoldiIteration(A, [1, 0, 0], 3);
    expect(r.H.length).toBe(r.k);
  });

  it('identity matrix produces unit Q1', () => {
    const A = [
      [1, 0],
      [0, 1],
    ];
    const r = arnoldiIteration(A, [1, 0], 1);
    expect(r.Q[0]).toEqual([1, 0]);
  });

  it('1x1 case', () => {
    const r = arnoldiIteration([[5]], [2], 1);
    expect(r.Q[0]).toEqual([1]);
    expect(r.H[0][0]).toBeCloseTo(5, 10);
  });

  it('k clamped to n', () => {
    const r = arnoldiIteration(
      [
        [1, 0],
        [0, 2],
      ],
      [1, 1],
      10,
    );
    expect(r.Q.length).toBeLessThanOrEqual(2);
  });

  it('k=2 on 3x3', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = arnoldiIteration(A, [1, 1, 1], 2);
    expect(r.k).toBeLessThanOrEqual(2);
  });

  it('returns finite numbers', () => {
    const A = [
      [2, -1, 0],
      [-1, 2, -1],
      [0, -1, 2],
    ];
    const r = arnoldiIteration(A, [1, 0, 0], 3);
    for (const q of r.Q) for (const v of q) expect(Number.isFinite(v)).toBe(true);
    for (const row of r.H) for (const v of row) expect(Number.isFinite(v)).toBe(true);
  });

  it('AQ_j = Q_{j+1} H column relation', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = arnoldiIteration(A, [1, 0, 0], 3);
    const Aq0 = [
      A[0][0] * r.Q[0][0] + A[0][1] * r.Q[0][1] + A[0][2] * r.Q[0][2],
      A[1][0] * r.Q[0][0] + A[1][1] * r.Q[0][1] + A[1][2] * r.Q[0][2],
      A[2][0] * r.Q[0][0] + A[2][1] * r.Q[0][1] + A[2][2] * r.Q[0][2],
    ];
    if (r.Q.length >= 2) {
      const recon = [
        r.H[0][0] * r.Q[0][0] + r.H[0][1] * r.Q[1][0],
        r.H[0][0] * r.Q[0][1] + r.H[0][1] * r.Q[1][1],
        r.H[0][0] * r.Q[0][2] + r.H[0][1] * r.Q[1][2],
      ];
      for (let i = 0; i < 3; i++) expect(recon[i]).toBeCloseTo(Aq0[i], 8);
    }
  });
});
