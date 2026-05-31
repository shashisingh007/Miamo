import { describe, it, expect } from 'vitest';
import { neumannSeries } from '../neumannSeries';

describe('neumannSeries', () => {
  it('throws on empty', () => {
    expect(() => neumannSeries([], 0)).toThrow();
  });

  it('throws on non-square', () => {
    expect(() => neumannSeries([[1, 2, 3]], 0)).toThrow();
  });

  it('throws on negative K', () => {
    expect(() => neumannSeries([[0]], -1)).toThrow();
  });

  it('throws on non-integer K', () => {
    expect(() => neumannSeries([[0]], 1.5)).toThrow();
  });

  it('K=0 returns identity', () => {
    const S = neumannSeries([[0.5, 0], [0, 0.3]], 0);
    expect(S).toEqual([[1, 0], [0, 1]]);
  });

  it('K=1 returns I + A', () => {
    const A = [[0.5, 0.1], [0, 0.3]];
    const S = neumannSeries(A, 1);
    expect(S[0][0]).toBeCloseTo(1.5, 10);
    expect(S[0][1]).toBeCloseTo(0.1, 10);
    expect(S[1][0]).toBeCloseTo(0, 10);
    expect(S[1][1]).toBeCloseTo(1.3, 10);
  });

  it('zero matrix => identity for any K', () => {
    const Z = [[0, 0], [0, 0]];
    const S = neumannSeries(Z, 5);
    expect(S).toEqual([[1, 0], [0, 1]]);
  });

  it('1x1 geometric series', () => {
    // sum_{k=0..K} a^k for a=0.5
    const a = 0.5;
    const K = 10;
    const S = neumannSeries([[a]], K);
    let expected = 0;
    for (let k = 0; k <= K; k++) expected += Math.pow(a, k);
    expect(S[0][0]).toBeCloseTo(expected, 10);
  });

  it('1x1 converges to 1/(1-a)', () => {
    const S = neumannSeries([[0.5]], 100);
    expect(S[0][0]).toBeCloseTo(2, 8);
  });

  it('diagonal converges to (I-A)^-1', () => {
    const S = neumannSeries([[0.5, 0], [0, 0.25]], 100);
    expect(S[0][0]).toBeCloseTo(2, 8);
    expect(S[1][1]).toBeCloseTo(4 / 3, 8);
  });

  it('output dims n x n', () => {
    const S = neumannSeries([[0.1, 0.2], [0.3, 0.4]], 3);
    expect(S).toHaveLength(2);
    expect(S[0]).toHaveLength(2);
  });

  it('does not mutate input', () => {
    const A = [[0.1, 0.2], [0.3, 0.4]];
    const ref = JSON.parse(JSON.stringify(A));
    neumannSeries(A, 5);
    expect(A).toEqual(ref);
  });

  it('partial sum monotone for non-negative A', () => {
    const A = [[0.2, 0.3], [0.1, 0.4]];
    const S2 = neumannSeries(A, 2);
    const S5 = neumannSeries(A, 5);
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      expect(S5[i][j]).toBeGreaterThanOrEqual(S2[i][j] - 1e-12);
    }
  });

  it('linearity of next term', () => {
    const A = [[0.3, 0], [0, 0.2]];
    const S5 = neumannSeries(A, 5);
    const S6 = neumannSeries(A, 6);
    expect(S6[0][0] - S5[0][0]).toBeCloseTo(Math.pow(0.3, 6), 10);
    expect(S6[1][1] - S5[1][1]).toBeCloseTo(Math.pow(0.2, 6), 10);
  });

  it('nilpotent stabilizes', () => {
    const N = [[0, 1, 0], [0, 0, 1], [0, 0, 0]];
    // I + N + N^2 + (N^3=0) — same for K>=2
    const S2 = neumannSeries(N, 2);
    const S5 = neumannSeries(N, 5);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      expect(S5[i][j]).toBeCloseTo(S2[i][j], 10);
    }
    // S2 should equal [[1,1,1],[0,1,1],[0,0,1]]
    expect(S2).toEqual([[1, 1, 1], [0, 1, 1], [0, 0, 1]]);
  });

  it('K=0 with 3x3', () => {
    const S = neumannSeries([[0.1, 0.2, 0.3], [0.4, 0.1, 0.2], [0.1, 0.1, 0.1]], 0);
    expect(S).toEqual([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  });
});
