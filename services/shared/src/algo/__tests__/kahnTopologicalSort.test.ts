import { describe, it, expect } from 'vitest';
import { kahnTopologicalSort } from '../kahnTopologicalSort';

function isValidTopo(n: number, adj: number[][], order: number[]): boolean {
  if (order.length !== n) return false;
  const pos = new Array(n).fill(-1);
  for (let i = 0; i < order.length; i++) pos[order[i]] = i;
  for (let u = 0; u < n; u++) {
    for (const v of adj[u]) if (pos[u] >= pos[v]) return false;
  }
  return true;
}

describe('kahnTopologicalSort', () => {
  it('throws on bad n', () => {
    expect(() => kahnTopologicalSort(-1, [])).toThrow();
    expect(() => kahnTopologicalSort(1.5 as any, [])).toThrow();
  });

  it('throws on adj length mismatch', () => {
    expect(() => kahnTopologicalSort(2, [[]])).toThrow();
  });

  it('throws on edge out of range', () => {
    expect(() => kahnTopologicalSort(2, [[5], []])).toThrow();
  });

  it('throws on cycle', () => {
    expect(() => kahnTopologicalSort(2, [[1], [0]])).toThrow();
  });

  it('throws on self-loop (cycle)', () => {
    expect(() => kahnTopologicalSort(1, [[0]])).toThrow();
  });

  it('empty graph', () => {
    expect(kahnTopologicalSort(0, [])).toEqual([]);
  });

  it('isolated nodes', () => {
    const o = kahnTopologicalSort(3, [[], [], []]);
    expect(o.sort()).toEqual([0, 1, 2]);
  });

  it('linear chain', () => {
    const adj = [[1], [2], [3], []];
    expect(kahnTopologicalSort(4, adj)).toEqual([0, 1, 2, 3]);
  });

  it('diamond DAG', () => {
    const adj = [[1, 2], [3], [3], []];
    const o = kahnTopologicalSort(4, adj);
    expect(isValidTopo(4, adj, o)).toBe(true);
  });

  it('multiple roots', () => {
    const adj = [[2], [2], [3], []];
    const o = kahnTopologicalSort(4, adj);
    expect(isValidTopo(4, adj, o)).toBe(true);
  });

  it('larger DAG validity', () => {
    const adj = [[1, 2], [3, 4], [4, 5], [6], [6], [6], []];
    const o = kahnTopologicalSort(7, adj);
    expect(isValidTopo(7, adj, o)).toBe(true);
  });

  it('returns permutation of 0..n-1', () => {
    const adj = [[1], [2], []];
    const o = kahnTopologicalSort(3, adj);
    expect(o.slice().sort((a, b) => a - b)).toEqual([0, 1, 2]);
  });

  it('cycle in larger graph', () => {
    expect(() => kahnTopologicalSort(4, [[1], [2], [3], [1]])).toThrow();
  });

  it('does not mutate adj', () => {
    const adj = [[1, 2], [3], [3], []];
    const ref = JSON.parse(JSON.stringify(adj));
    kahnTopologicalSort(4, adj);
    expect(adj).toEqual(ref);
  });
});
