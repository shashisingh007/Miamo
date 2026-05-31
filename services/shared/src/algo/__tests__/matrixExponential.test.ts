import { describe, it, expect } from 'vitest';
import { matrixExponential } from '../matrixExponential';

function close(A: number[][], B: number[][], tol: number): void {
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) {
    expect(A[i][j]).toBeCloseTo(B[i][j], tol);
  }
}

describe('matrixExponential', () => {
  it('throws on empty', () => {
    expect(() => matrixExponential([])).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => matrixExponential([[1, 2, 3]])).toThrow();
  });

  it('1x1', () => {
    expect(matrixExponential([[0]])[0][0]).toBeCloseTo(1, 8);
    expect(matrixExponential([[1]])[0][0]).toBeCloseTo(Math.E, 5);
    expect(matrixExponential([[2]])[0][0]).toBeCloseTo(Math.exp(2), 4);
  });

  it('exp(0) = I', () => {
    const E = matrixExponential([[0, 0], [0, 0]]);
    close(E, [[1, 0], [0, 1]], 8);
  });

  it('exp(I) = e*I', () => {
    const E = matrixExponential([[1, 0], [0, 1]]);
    expect(E[0][0]).toBeCloseTo(Math.E, 6);
    expect(E[1][1]).toBeCloseTo(Math.E, 6);
    expect(Math.abs(E[0][1])).toBeLessThan(1e-6);
  });

  it('diagonal exp(diag(a,b)) = diag(e^a, e^b)', () => {
    const E = matrixExponential([[2, 0], [0, -1]]);
    expect(E[0][0]).toBeCloseTo(Math.exp(2), 5);
    expect(E[1][1]).toBeCloseTo(Math.exp(-1), 5);
  });

  it('rotation generator => rotation matrix', () => {
    const t = Math.PI / 4;
    const A = [[0, -t], [t, 0]];
    const E = matrixExponential(A);
    expect(E[0][0]).toBeCloseTo(Math.cos(t), 5);
    expect(E[0][1]).toBeCloseTo(-Math.sin(t), 5);
    expect(E[1][0]).toBeCloseTo(Math.sin(t), 5);
    expect(E[1][1]).toBeCloseTo(Math.cos(t), 5);
  });

  it('nilpotent: exp([[0,1],[0,0]]) = [[1,1],[0,1]]', () => {
    const E = matrixExponential([[0, 1], [0, 0]]);
    close(E, [[1, 1], [0, 1]], 6);
  });

  it('exp(-A) * exp(A) = I (commuting trivially)', () => {
    const A = [[2, 0], [0, -1]];
    const E1 = matrixExponential(A);
    const E2 = matrixExponential([[-2, 0], [0, 1]]);
    const P = [[E1[0][0] * E2[0][0], 0], [0, E1[1][1] * E2[1][1]]];
    close(P, [[1, 0], [0, 1]], 5);
  });

  it('does not mutate input', () => {
    const A = [[0.1, 0.2], [0, 0.3]];
    const ref = JSON.parse(JSON.stringify(A));
    matrixExponential(A);
    expect(A).toEqual(ref);
  });

  it('larger norm uses scaling', () => {
    const A = [[3, 0], [0, 5]];
    const E = matrixExponential(A);
    expect(E[0][0]).toBeCloseTo(Math.exp(3), 4);
    expect(E[1][1]).toBeCloseTo(Math.exp(5), 4);
  });

  it('3x3 diagonal', () => {
    const A = [[1, 0, 0], [0, 2, 0], [0, 0, 3]];
    const E = matrixExponential(A);
    expect(E[0][0]).toBeCloseTo(Math.E, 5);
    expect(E[1][1]).toBeCloseTo(Math.exp(2), 4);
    expect(E[2][2]).toBeCloseTo(Math.exp(3), 4);
  });

  it('3x3 nilpotent', () => {
    const A = [[0, 1, 0], [0, 0, 1], [0, 0, 0]];
    const E = matrixExponential(A);
    close(E, [[1, 1, 0.5], [0, 1, 1], [0, 0, 1]], 6);
  });

  it('output dims match', () => {
    const E = matrixExponential([[0.1, 0.2], [0.3, 0.4]]);
    expect(E).toHaveLength(2);
    expect(E[0]).toHaveLength(2);
  });

  it('small entries near identity', () => {
    const A = [[1e-6, 0], [0, 1e-6]];
    const E = matrixExponential(A);
    expect(E[0][0]).toBeCloseTo(1 + 1e-6, 10);
    expect(E[1][1]).toBeCloseTo(1 + 1e-6, 10);
  });
});
