import { describe, it, expect } from 'vitest';
import { floydWarshallAllPairs } from '../floydWarshallAllPairs';

const INF = Infinity;

describe('floydWarshallAllPairs', () => {
  it('empty', () => {
    const r = floydWarshallAllPairs([]);
    expect(r.distance).toEqual([]);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('throws on non-square', () => {
    expect(() => floydWarshallAllPairs([[1, 2]])).toThrow(RangeError);
  });

  it('1x1 zero', () => {
    expect(floydWarshallAllPairs([[0]])).toEqual({ distance: [[0]], hasNegativeCycle: false });
  });

  it('basic graph', () => {
    const w = [
      [0, 3, INF, 7],
      [8, 0, 2, INF],
      [5, INF, 0, 1],
      [2, INF, INF, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][2]).toBe(5);
    expect(r.distance[0][3]).toBe(6);
    expect(r.distance[3][2]).toBe(7);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('disconnected stays INF', () => {
    const w = [[0, INF], [INF, 0]];
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][1]).toBe(INF);
    expect(r.distance[1][0]).toBe(INF);
  });

  it('zero self distance', () => {
    const w = [
      [0, 5],
      [2, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][0]).toBe(0);
    expect(r.distance[1][1]).toBe(0);
  });

  it('detects negative cycle', () => {
    const w = [
      [0, 1, INF],
      [INF, 0, -3],
      [1, INF, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.hasNegativeCycle).toBe(true);
  });

  it('shortest path uses intermediate node', () => {
    const w = [
      [0, 4, INF, 5, INF],
      [INF, 0, 1, INF, 6],
      [2, INF, 0, 3, INF],
      [INF, INF, 1, 0, 2],
      [1, INF, INF, 4, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][2]).toBe(5);
    expect(r.distance[0][4]).toBe(7);
  });

  it('symmetric undirected graph', () => {
    const w = [
      [0, 1, 4],
      [1, 0, 2],
      [4, 2, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][2]).toBe(3);
    expect(r.distance[2][0]).toBe(3);
  });

  it('does not mutate input', () => {
    const w = [[0, 1], [1, 0]];
    floydWarshallAllPairs(w);
    expect(w).toEqual([[0, 1], [1, 0]]);
  });

  it('negative edge but no cycle ok', () => {
    const w = [
      [0, -2, INF],
      [INF, 0, 3],
      [INF, INF, 0],
    ];
    const r = floydWarshallAllPairs(w);
    expect(r.hasNegativeCycle).toBe(false);
    expect(r.distance[0][2]).toBe(1);
  });

  it('larger graph', () => {
    const n = 8;
    const w: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) row.push(i === j ? 0 : INF);
      w.push(row);
    }
    for (let i = 0; i < n - 1; i++) w[i][i + 1] = 1;
    const r = floydWarshallAllPairs(w);
    expect(r.distance[0][n - 1]).toBe(n - 1);
  });
});
