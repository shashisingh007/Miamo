import { describe, it, expect } from 'vitest';
import { blockTridiagSolve } from '../blockTridiagSolve';

function buildDense(A: number[][][], B: number[][][], C: number[][][]): number[][] {
  const N = B.length;
  const m = B[0].length;
  const M: number[][] = Array.from({ length: N * m }, () => new Array(N * m).fill(0));
  for (let i = 0; i < N; i++) {
    for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) M[i * m + r][i * m + c] = B[i][r][c];
    if (i > 0) for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) M[i * m + r][(i - 1) * m + c] = A[i][r][c];
    if (i < N - 1) for (let r = 0; r < m; r++) for (let c = 0; c < m; c++) M[i * m + r][(i + 1) * m + c] = C[i][r][c];
  }
  return M;
}

function matVec(A: number[][], x: number[]): number[] {
  const m = A.length;
  const out = new Array(m).fill(0);
  for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < x.length; j++) s += A[i][j] * x[j]; out[i] = s; }
  return out;
}

describe('blockTridiagSolve', () => {
  it('throws on empty', () => {
    expect(() => blockTridiagSolve({ A: [], B: [], C: [], d: [] })).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => blockTridiagSolve({ A: [[[1]]], B: [[[1]]], C: [[[0]]], d: [[1], [2]] } as any)).toThrow();
  });

  it('1 block solves like dense linear system', () => {
    const B = [[[2, 1], [1, 3]]];
    const A = [[[0, 0], [0, 0]]];
    const C = [[[0, 0], [0, 0]]];
    const d = [[3, 4]];
    const x = blockTridiagSolve({ A, B, C, d });
    expect(x).toHaveLength(1);
    const y = matVec(B[0], x[0]);
    expect(y[0]).toBeCloseTo(3, 8);
    expect(y[1]).toBeCloseTo(4, 8);
  });

  it('2 blocks 1x1 reduces to scalar tridiag', () => {
    const A = [[[0]], [[1]]];
    const B = [[[2]], [[2]]];
    const C = [[[1]], [[0]]];
    const d = [[3], [3]];
    const x = blockTridiagSolve({ A, B, C, d });
    // 2x2 system: [2 1; 1 2][x;y]=[3;3] => x=y=1
    expect(x[0][0]).toBeCloseTo(1, 8);
    expect(x[1][0]).toBeCloseTo(1, 8);
  });

  it('3 blocks 2x2 matches dense solve', () => {
    const D = [[4, 1], [1, 5]];
    const Z = [[0, 0], [0, 0]];
    const Off = [[0.5, 0], [0, 0.5]];
    const A = [Z, Off, Off];
    const B = [D, D, D];
    const C = [Off, Off, Z];
    const d = [[1, 0], [0, 0], [0, 1]];
    const x = blockTridiagSolve({ A, B, C, d });
    const M = buildDense(A, B, C);
    const flat: number[] = [];
    for (const v of x) flat.push(...v);
    const recon = matVec(M, flat);
    const expected: number[] = [];
    for (const v of d) expected.push(...v);
    for (let i = 0; i < expected.length; i++) expect(recon[i]).toBeCloseTo(expected[i], 6);
  });

  it('singular block throws', () => {
    const A = [[[0]]];
    const B = [[[0]]];
    const C = [[[0]]];
    const d = [[1]];
    expect(() => blockTridiagSolve({ A, B, C, d })).toThrow();
  });

  it('returns array of N block vectors', () => {
    const A = [[[0]], [[1]]];
    const B = [[[2]], [[2]]];
    const C = [[[1]], [[0]]];
    const d = [[1], [1]];
    const x = blockTridiagSolve({ A, B, C, d });
    expect(x.length).toBe(2);
    expect(x[0].length).toBe(1);
  });

  it('handles diagonal-dominant 4 blocks 1x1', () => {
    const A = [[[0]], [[-1]], [[-1]], [[-1]]];
    const B = [[[3]], [[3]], [[3]], [[3]]];
    const C = [[[-1]], [[-1]], [[-1]], [[0]]];
    const d = [[1], [2], [3], [4]];
    const x = blockTridiagSolve({ A, B, C, d });
    // verify by reconstructing
    expect(x.length).toBe(4);
    const M = buildDense(A, B, C);
    const flat: number[] = [];
    for (const v of x) flat.push(...v);
    const recon = matVec(M, flat);
    expect(recon[0]).toBeCloseTo(1, 8);
    expect(recon[3]).toBeCloseTo(4, 8);
  });

  it('does not mutate inputs', () => {
    const A = [[[0]], [[1]]];
    const B = [[[2]], [[2]]];
    const C = [[[1]], [[0]]];
    const d = [[1], [1]];
    const ref = JSON.parse(JSON.stringify({ A, B, C, d }));
    blockTridiagSolve({ A, B, C, d });
    expect({ A, B, C, d }).toEqual(ref);
  });

  it('zero rhs gives zero solution', () => {
    const A = [[[0]], [[1]]];
    const B = [[[2]], [[2]]];
    const C = [[[1]], [[0]]];
    const d = [[0], [0]];
    const x = blockTridiagSolve({ A, B, C, d });
    expect(x[0][0]).toBeCloseTo(0, 10);
    expect(x[1][0]).toBeCloseTo(0, 10);
  });

  it('linear in d', () => {
    const A = [[[0]], [[1]]];
    const B = [[[2]], [[2]]];
    const C = [[[1]], [[0]]];
    const x1 = blockTridiagSolve({ A, B, C, d: [[1], [1]] });
    const x2 = blockTridiagSolve({ A, B, C, d: [[2], [2]] });
    expect(x2[0][0]).toBeCloseTo(2 * x1[0][0], 8);
    expect(x2[1][0]).toBeCloseTo(2 * x1[1][0], 8);
  });

  it('handles 2x2 blocks identity diagonal', () => {
    const I2 = [[1, 0], [0, 1]];
    const Z2 = [[0, 0], [0, 0]];
    const x = blockTridiagSolve({ A: [Z2, Z2], B: [I2, I2], C: [Z2, Z2], d: [[3, 4], [5, 6]] });
    expect(x[0]).toEqual([3, 4]);
    expect(x[1]).toEqual([5, 6]);
  });
});
