import { describe, it, expect } from 'vitest';
import { heldKarpTSP } from '../heldKarpTSP';

function tourCost(c: number[][], tour: number[]): number {
  let s = 0;
  for (let i = 0; i + 1 < tour.length; i += 1) s += c[tour[i]][tour[i + 1]];
  return s;
}

describe('heldKarpTSP', () => {
  it('rejects non-array', () => {
    expect(() => heldKarpTSP('x' as any)).toThrow(TypeError);
  });

  it('rejects non-square', () => {
    expect(() => heldKarpTSP([[0, 1]])).toThrow(RangeError);
  });

  it('rejects non-finite entry', () => {
    expect(() => heldKarpTSP([[0, NaN], [1, 0]])).toThrow(RangeError);
  });

  it('rejects n > 16', () => {
    const big = Array.from({ length: 17 }, () => new Array(17).fill(0));
    expect(() => heldKarpTSP(big)).toThrow(RangeError);
  });

  it('empty matrix => cost 0', () => {
    expect(heldKarpTSP([])).toEqual({ minCost: 0, tour: [] });
  });

  it('single city => trivial tour', () => {
    expect(heldKarpTSP([[0]])).toEqual({ minCost: 0, tour: [0, 0] });
  });

  it('two cities symmetric', () => {
    const r = heldKarpTSP([[0, 5], [5, 0]]);
    expect(r.minCost).toBe(10);
    expect(r.tour).toEqual([0, 1, 0]);
  });

  it('classic 4-city problem', () => {
    // standard problem; optimal tour cost 80 (CLRS-style)
    const cost = [
      [0, 10, 15, 20],
      [10, 0, 35, 25],
      [15, 35, 0, 30],
      [20, 25, 30, 0],
    ];
    const r = heldKarpTSP(cost);
    expect(r.minCost).toBe(80);
    expect(r.tour[0]).toBe(0);
    expect(r.tour[r.tour.length - 1]).toBe(0);
  });

  it('tour visits every city exactly once', () => {
    const cost = [
      [0, 2, 9, 10],
      [1, 0, 6, 4],
      [15, 7, 0, 8],
      [6, 3, 12, 0],
    ];
    const r = heldKarpTSP(cost);
    const visited = new Set(r.tour);
    expect(visited.size).toBe(4);
    expect(r.tour.length).toBe(5);
  });

  it('reported cost matches tour cost', () => {
    const cost = [
      [0, 3, 1, 5, 8],
      [3, 0, 6, 7, 9],
      [1, 6, 0, 4, 2],
      [5, 7, 4, 0, 3],
      [8, 9, 2, 3, 0],
    ];
    const r = heldKarpTSP(cost);
    expect(r.minCost).toBe(tourCost(cost, r.tour));
  });

  it('asymmetric matrix', () => {
    const cost = [
      [0, 1, 4],
      [3, 0, 1],
      [2, 5, 0],
    ];
    // tours: 0->1->2->0 = 1+1+2=4 ; 0->2->1->0 = 4+5+3=12
    const r = heldKarpTSP(cost);
    expect(r.minCost).toBe(4);
    expect(r.tour).toEqual([0, 1, 2, 0]);
  });

  it('triangle inequality not required', () => {
    const cost = [
      [0, 100, 1],
      [100, 0, 1],
      [1, 1, 0],
    ];
    const r = heldKarpTSP(cost);
    expect(r.minCost).toBe(102);
  });

  it('large symmetric n=8 sanity', () => {
    const n = 8;
    const cost: number[][] = [];
    for (let i = 0; i < n; i += 1) {
      const row: number[] = [];
      for (let j = 0; j < n; j += 1) row.push(i === j ? 0 : (i + j + 1) % 7 + 1);
      cost.push(row);
    }
    const r = heldKarpTSP(cost);
    expect(r.tour[0]).toBe(0);
    expect(r.tour[r.tour.length - 1]).toBe(0);
    expect(new Set(r.tour).size).toBe(n);
    expect(r.minCost).toBe(tourCost(cost, r.tour));
  });

  it('zero-cost matrix gives 0', () => {
    const n = 5;
    const cost = Array.from({ length: n }, () => new Array(n).fill(0));
    const r = heldKarpTSP(cost);
    expect(r.minCost).toBe(0);
  });

  it('matches brute force on n=5', () => {
    const cost = [
      [0, 2, 9, 10, 7],
      [1, 0, 6, 4, 3],
      [5, 7, 0, 8, 2],
      [6, 3, 12, 0, 4],
      [8, 5, 6, 1, 0],
    ];
    const n = 5;
    // brute force all permutations starting at 0
    const perm = [1, 2, 3, 4];
    let best = Infinity;
    const permute = (arr: number[], k: number): void => {
      if (k === arr.length) {
        let c = cost[0][arr[0]];
        for (let i = 0; i + 1 < arr.length; i += 1) c += cost[arr[i]][arr[i + 1]];
        c += cost[arr[arr.length - 1]][0];
        if (c < best) best = c;
        return;
      }
      for (let i = k; i < arr.length; i += 1) {
        [arr[k], arr[i]] = [arr[i], arr[k]];
        permute(arr, k + 1);
        [arr[k], arr[i]] = [arr[i], arr[k]];
      }
    };
    permute(perm, 0);
    expect(heldKarpTSP(cost).minCost).toBe(best);
  });
});
