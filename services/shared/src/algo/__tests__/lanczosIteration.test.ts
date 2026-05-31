import { describe, it, expect } from 'vitest';
import { lanczosIteration } from '../lanczosIteration';

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

describe('lanczosIteration', () => {
  it('throws on empty', () => {
    expect(() => lanczosIteration([], [], 1)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => lanczosIteration([[1, 2]], [1, 2], 1)).toThrow();
  });

  it('throws on v length mismatch', () => {
    expect(() => lanczosIteration([[1, 0], [0, 1]], [1], 1)).toThrow();
  });

  it('throws on k<1', () => {
    expect(() => lanczosIteration([[1, 0], [0, 1]], [1, 0], 0)).toThrow();
  });

  it('throws on non-symmetric', () => {
    expect(() => lanczosIteration([[1, 2], [3, 4]], [1, 0], 2)).toThrow();
  });

  it('throws on zero v', () => {
    expect(() => lanczosIteration([[1, 0], [0, 1]], [0, 0], 1)).toThrow();
  });

  it('Q vectors orthonormal', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = lanczosIteration(A, [1, 1, 1], 3);
    for (let i = 0; i < r.Q.length; i++) {
      expect(dot(r.Q[i], r.Q[i])).toBeCloseTo(1, 6);
      for (let j = 0; j < i; j++) expect(dot(r.Q[i], r.Q[j])).toBeCloseTo(0, 6);
    }
  });

  it('alpha[i] = <Aq_i, q_i>', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = lanczosIteration(A, [1, 0, 0], 3);
    for (let i = 0; i < r.alpha.length; i++) {
      const Aqi = [
        A[0][0] * r.Q[i][0] + A[0][1] * r.Q[i][1] + A[0][2] * r.Q[i][2],
        A[1][0] * r.Q[i][0] + A[1][1] * r.Q[i][1] + A[1][2] * r.Q[i][2],
        A[2][0] * r.Q[i][0] + A[2][1] * r.Q[i][1] + A[2][2] * r.Q[i][2],
      ];
      expect(dot(Aqi, r.Q[i])).toBeCloseTo(r.alpha[i], 6);
    }
  });

  it('1x1 case', () => {
    const r = lanczosIteration([[5]], [3], 1);
    expect(r.alpha[0]).toBeCloseTo(5, 10);
  });

  it('identity matrix', () => {
    const r = lanczosIteration([[1, 0], [0, 1]], [1, 0], 2);
    expect(r.alpha[0]).toBeCloseTo(1, 10);
  });

  it('k clamped to n', () => {
    const r = lanczosIteration([[2, 0], [0, 3]], [1, 1], 100);
    expect(r.Q.length).toBeLessThanOrEqual(2);
  });

  it('returns finite numbers', () => {
    const A = [
      [2, -1, 0],
      [-1, 2, -1],
      [0, -1, 2],
    ];
    const r = lanczosIteration(A, [1, 0, 0], 3);
    for (const q of r.Q) for (const v of q) expect(Number.isFinite(v)).toBe(true);
    for (const v of r.alpha) expect(Number.isFinite(v)).toBe(true);
    for (const v of r.beta) expect(Number.isFinite(v)).toBe(true);
  });

  it('beta length is alpha length - 1 or 0', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = lanczosIteration(A, [1, 0, 0], 3);
    expect([r.alpha.length - 1, r.alpha.length]).toContain(r.beta.length);
  });

  it('alpha sums to trace when full reduction', () => {
    const A = [
      [4, 1, 0],
      [1, 3, 1],
      [0, 1, 2],
    ];
    const r = lanczosIteration(A, [1, 0.5, -0.3], 3);
    if (r.k === 3) {
      const sum = r.alpha.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(4 + 3 + 2, 6);
    }
  });
});
