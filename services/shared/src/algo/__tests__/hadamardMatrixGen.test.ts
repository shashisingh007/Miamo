import { describe, it, expect } from 'vitest';
import { hadamardMatrixGen } from '../hadamardMatrixGen';

describe('hadamardMatrixGen', () => {
  it('throws on 0', () => {
    expect(() => hadamardMatrixGen(0)).toThrow();
  });

  it('throws on negative', () => {
    expect(() => hadamardMatrixGen(-2)).toThrow();
  });

  it('throws on non-integer', () => {
    expect(() => hadamardMatrixGen(2.5)).toThrow();
  });

  it('throws on non-power-of-2', () => {
    expect(() => hadamardMatrixGen(3)).toThrow();
    expect(() => hadamardMatrixGen(6)).toThrow();
  });

  it('order 1', () => {
    expect(hadamardMatrixGen(1)).toEqual([[1]]);
  });

  it('order 2', () => {
    expect(hadamardMatrixGen(2)).toEqual([[1, 1], [1, -1]]);
  });

  it('order 4 dimensions', () => {
    const H = hadamardMatrixGen(4);
    expect(H).toHaveLength(4);
    for (const row of H) expect(row).toHaveLength(4);
  });

  it('all entries +/- 1', () => {
    const H = hadamardMatrixGen(8);
    for (const row of H) for (const v of row) expect(Math.abs(v)).toBe(1);
  });

  it('orthogonal rows (H Hᵀ = nI)', () => {
    const n = 8;
    const H = hadamardMatrixGen(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += H[i][k] * H[j][k];
        expect(s).toBe(i === j ? n : 0);
      }
    }
  });

  it('orthogonal columns (Hᵀ H = nI)', () => {
    const n = 4;
    const H = hadamardMatrixGen(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let s = 0;
        for (let k = 0; k < n; k++) s += H[k][i] * H[k][j];
        expect(s).toBe(i === j ? n : 0);
      }
    }
  });

  it('first row all ones', () => {
    const H = hadamardMatrixGen(8);
    for (const v of H[0]) expect(v).toBe(1);
  });

  it('first column all ones', () => {
    const H = hadamardMatrixGen(8);
    for (const row of H) expect(row[0]).toBe(1);
  });

  it('symmetric', () => {
    const H = hadamardMatrixGen(8);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) expect(H[i][j]).toBe(H[j][i]);
  });

  it('order 16 still orthogonal', () => {
    const n = 16;
    const H = hadamardMatrixGen(n);
    expect(H).toHaveLength(n);
    let s = 0;
    for (let k = 0; k < n; k++) s += H[1][k] * H[2][k];
    expect(s).toBe(0);
  });
});
