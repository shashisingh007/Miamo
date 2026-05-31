import { describe, it, expect } from 'vitest';
import { kosarajuSCC } from '../kosarajuSCC';

describe('kosarajuSCC', () => {
  it('empty graph', () => {
    expect(kosarajuSCC([])).toEqual({ componentOf: [], components: [] });
  });

  it('single node', () => {
    const r = kosarajuSCC([[]]);
    expect(r.components).toEqual([[0]]);
  });

  it('two disconnected nodes', () => {
    const r = kosarajuSCC([[], []]);
    expect(r.components).toHaveLength(2);
  });

  it('simple cycle 0->1->2->0', () => {
    const r = kosarajuSCC([[1], [2], [0]]);
    expect(r.components).toHaveLength(1);
    expect(r.components[0]).toEqual([0, 1, 2]);
  });

  it('two SCCs', () => {
    const r = kosarajuSCC([[1], [0], [3], [2]]);
    expect(r.components).toHaveLength(2);
    expect(r.componentOf[0]).toBe(r.componentOf[1]);
    expect(r.componentOf[2]).toBe(r.componentOf[3]);
    expect(r.componentOf[0]).not.toBe(r.componentOf[2]);
  });

  it('DAG => each node its own SCC', () => {
    const r = kosarajuSCC([[1], [2], []]);
    expect(r.components).toHaveLength(3);
  });

  it('classic CLRS 5-node SCC', () => {
    const r = kosarajuSCC([
      [1],
      [2, 4, 5],
      [3, 6],
      [2, 7],
      [0, 5],
      [6],
      [5, 7],
      [7],
    ]);
    expect(r.components).toHaveLength(4);
  });

  it('throws on out-of-bounds edge', () => {
    expect(() => kosarajuSCC([[5], []])).toThrow(RangeError);
  });

  it('self-loop is SCC with one node', () => {
    const r = kosarajuSCC([[0]]);
    expect(r.components).toEqual([[0]]);
  });

  it('componentOf assigns every node', () => {
    const r = kosarajuSCC([[1], [0], [3], [2]]);
    expect(r.componentOf.every((x) => x >= 0)).toBe(true);
  });

  it('long chain => n components', () => {
    const adj: number[][] = [];
    for (let i = 0; i < 10; i++) adj.push(i < 9 ? [i + 1] : []);
    const r = kosarajuSCC(adj);
    expect(r.components).toHaveLength(10);
  });

  it('large cycle', () => {
    const n = 50;
    const adj: number[][] = [];
    for (let i = 0; i < n; i++) adj.push([(i + 1) % n]);
    const r = kosarajuSCC(adj);
    expect(r.components).toHaveLength(1);
    expect(r.components[0]).toHaveLength(n);
  });

  it('1000-node chain (stack safety)', () => {
    const n = 1000;
    const adj: number[][] = [];
    for (let i = 0; i < n; i++) adj.push(i < n - 1 ? [i + 1] : []);
    const r = kosarajuSCC(adj);
    expect(r.components).toHaveLength(n);
  });
});
