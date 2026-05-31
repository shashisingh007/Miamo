import { describe, it, expect } from 'vitest';
import { shermanMorrisonUpdate } from '../shermanMorrisonUpdate';

function matMul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(n).fill(0);
    for (let p = 0; p < k; p++) {
      const aip = A[i][p];
      for (let j = 0; j < n; j++) row[j] += aip * B[p][j];
    }
    C.push(row);
  }
  return C;
}

function outer(u: number[], v: number[]): number[][] {
  return u.map((ui) => v.map((vj) => ui * vj));
}

function add(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((v, j) => v + B[i][j]));
}

function id(n: number): number[][] {
  const I: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I.push(row);
  }
  return I;
}

function close(A: number[][], B: number[][], digits = 8) {
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) {
    expect(A[i][j]).toBeCloseTo(B[i][j], digits);
  }
}

describe('shermanMorrisonUpdate', () => {
  it('throws on empty', () => {
    expect(() => shermanMorrisonUpdate([], [], [])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => shermanMorrisonUpdate([[1, 2, 3]], [1], [1])).toThrow();
  });

  it('throws on u length mismatch', () => {
    expect(() => shermanMorrisonUpdate([[1, 0], [0, 1]], [1], [1, 0])).toThrow();
  });

  it('throws on v length mismatch', () => {
    expect(() => shermanMorrisonUpdate([[1, 0], [0, 1]], [1, 0], [1])).toThrow();
  });

  it('throws on singular update', () => {
    // For Ainv = I, 1 + v^T u = 0 when v=u=[1,0,...]? need v^T u = -1
    // u=[1,0], v=[-1,0]: 1 + (-1*1 + 0) = 0
    expect(() => shermanMorrisonUpdate([[1, 0], [0, 1]], [1, 0], [-1, 0])).toThrow();
  });

  it('zero update returns same Ainv (u=0)', () => {
    const Ainv = [[2, 0], [0, 3]];
    const out = shermanMorrisonUpdate(Ainv, [0, 0], [1, 1]);
    close(out, Ainv, 12);
  });

  it('zero update returns same Ainv (v=0)', () => {
    const Ainv = [[2, 0], [0, 3]];
    const out = shermanMorrisonUpdate(Ainv, [1, 1], [0, 0]);
    close(out, Ainv, 12);
  });

  it('matches direct inversion 2x2', () => {
    const A = [[2, 0], [0, 3]];
    const Ainv = [[0.5, 0], [0, 1 / 3]];
    const u = [1, 1];
    const v = [1, 1];
    const Bnew = add(A, outer(u, v));
    // direct inverse of Bnew: 2x2
    const a = Bnew[0][0], b = Bnew[0][1], c = Bnew[1][0], d = Bnew[1][1];
    const det = a * d - b * c;
    const direct = [[d / det, -b / det], [-c / det, a / det]];
    const sm = shermanMorrisonUpdate(Ainv, u, v);
    close(sm, direct, 8);
  });

  it('round-trip Sherman-Morrison cancels itself', () => {
    // Adding uv^T then subtracting uv^T (via -u, v) should restore Ainv
    const Ainv = [[1, 0.2], [0.2, 1]];
    const u = [0.3, 0.5];
    const v = [0.4, 0.1];
    const step1 = shermanMorrisonUpdate(Ainv, u, v);
    const step2 = shermanMorrisonUpdate(step1, [-u[0], -u[1]], v);
    close(step2, Ainv, 6);
  });

  it('verifies (A + uv^T)(A+uv^T)^{-1} = I', () => {
    const A = [[4, 1], [2, 3]];
    const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
    const Ainv = [[A[1][1] / det, -A[0][1] / det], [-A[1][0] / det, A[0][0] / det]];
    const u = [1, 0];
    const v = [0, 1];
    const Bnew = add(A, outer(u, v));
    const Bnew_inv = shermanMorrisonUpdate(Ainv, u, v);
    const prod = matMul(Bnew, Bnew_inv);
    close(prod, id(2), 8);
  });

  it('3x3 identity update', () => {
    const Ainv = id(3);
    const u = [1, 0, 0];
    const v = [0, 1, 0];
    const out = shermanMorrisonUpdate(Ainv, u, v);
    // (I + e1 e2^T)^{-1} = I - e1 e2^T  (since 1 + v^T u = 1)
    const expected = [[1, -1, 0], [0, 1, 0], [0, 0, 1]];
    close(out, expected, 12);
  });

  it('does not mutate inputs', () => {
    const Ainv = [[1, 0], [0, 1]];
    const u = [1, 0];
    const v = [0, 1];
    const Aref = Ainv.map((r) => r.slice());
    shermanMorrisonUpdate(Ainv, u, v);
    expect(Ainv).toEqual(Aref);
    expect(u).toEqual([1, 0]);
    expect(v).toEqual([0, 1]);
  });

  it('output dims n x n', () => {
    const out = shermanMorrisonUpdate(id(4), [1, 2, 3, 4], [4, 3, 2, 1]);
    expect(out).toHaveLength(4);
    expect(out[0]).toHaveLength(4);
  });
});
