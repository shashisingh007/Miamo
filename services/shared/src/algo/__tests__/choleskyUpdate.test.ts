import { describe, it, expect } from 'vitest';
import { choleskyUpdate } from '../choleskyUpdate';

function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length, k = A[0].length, n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    let s = 0; for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
    C[i][j] = s;
  }
  return C;
}
function transpose(A: number[][]): number[][] {
  return A[0].map((_, j) => A.map((r) => r[j]));
}
function outer(x: number[], y: number[]): number[][] {
  return x.map((xi) => y.map((yj) => xi * yj));
}
function add(A: number[][], B: number[][], scale = 1): number[][] {
  return A.map((r, i) => r.map((v, j) => v + scale * B[i][j]));
}

describe('choleskyUpdate', () => {
  it('throws on empty', () => {
    expect(() => choleskyUpdate([], [])).toThrow();
  });

  it('throws on size mismatch', () => {
    expect(() => choleskyUpdate([[1]], [1, 2])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => choleskyUpdate([[1, 0]] as any, [1])).toThrow();
  });

  it('rank-1 update preserves L L^T', () => {
    const L = [
      [2, 0, 0],
      [1, Math.sqrt(3), 0],
      [1, 1 / Math.sqrt(3), Math.sqrt(8 / 3)],
    ];
    const x = [1, 2, 3];
    const Lp = choleskyUpdate(L, x, 1);
    const A = matmul(L, transpose(L));
    const Ap = matmul(Lp, transpose(Lp));
    const expected = add(A, outer(x, x), 1);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(Math.abs(Ap[i][j] - expected[i][j])).toBeLessThan(1e-8);
    }
  });

  it('downdate inverse of update', () => {
    const L = [
      [2, 0],
      [1, Math.sqrt(3)],
    ];
    const x = [0.5, 0.4];
    const Lp = choleskyUpdate(L, x, 1);
    const Ldd = choleskyUpdate(Lp, x, -1);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(Ldd[i][j] - L[i][j])).toBeLessThan(1e-8);
    }
  });

  it('downdate to non-PD throws', () => {
    const L = [[1, 0], [0, 1]];
    const x = [10, 0];
    expect(() => choleskyUpdate(L, x, -1)).toThrow();
  });

  it('1x1 update', () => {
    const Lp = choleskyUpdate([[2]], [1], 1);
    expect(Lp[0][0]).toBeCloseTo(Math.sqrt(5), 10);
  });

  it('zero vector update unchanged', () => {
    const L = [[2, 0], [1, Math.sqrt(3)]];
    const Lp = choleskyUpdate(L, [0, 0], 1);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(Lp[i][j] - L[i][j])).toBeLessThan(1e-10);
    }
  });

  it('returns new matrix (no mutate)', () => {
    const L = [[2, 0], [1, Math.sqrt(3)]];
    const ref = JSON.parse(JSON.stringify(L));
    const x = [1, 1];
    choleskyUpdate(L, x, 1);
    expect(L).toEqual(ref);
  });

  it('result remains lower triangular', () => {
    const L = [
      [2, 0, 0],
      [1, Math.sqrt(3), 0],
      [1, 1 / Math.sqrt(3), Math.sqrt(8 / 3)],
    ];
    const Lp = choleskyUpdate(L, [0.5, 0.5, 0.5], 1);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      expect(Lp[i][j]).toBe(0);
    }
  });

  it('positive diagonal', () => {
    const L = [
      [2, 0, 0],
      [1, Math.sqrt(3), 0],
      [1, 1 / Math.sqrt(3), Math.sqrt(8 / 3)],
    ];
    const Lp = choleskyUpdate(L, [1, 1, 1], 1);
    for (let i = 0; i < 3; i++) expect(Lp[i][i]).toBeGreaterThan(0);
  });

  it('large vector update', () => {
    const L = [[3, 0], [1, 2]];
    const x = [4, 5];
    const Lp = choleskyUpdate(L, x, 1);
    const A = matmul(L, transpose(L));
    const expected = add(A, outer(x, x), 1);
    const Ap = matmul(Lp, transpose(Lp));
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(Math.abs(Ap[i][j] - expected[i][j])).toBeLessThan(1e-8);
    }
  });

  it('default sign is +1', () => {
    const L = [[2, 0], [1, Math.sqrt(3)]];
    const a = choleskyUpdate(L, [0.3, 0.4]);
    const b = choleskyUpdate(L, [0.3, 0.4], 1);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(a[i][j]).toBeCloseTo(b[i][j], 12);
    }
  });
});
