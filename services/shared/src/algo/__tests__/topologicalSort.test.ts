import { describe, it, expect } from 'vitest';
import { topologicalSort } from '../topologicalSort';

describe('topologicalSort', () => {
  it('empty graph', () => {
    const r = topologicalSort([]);
    expect(r.order).toEqual([]);
    expect(r.hasCycle).toBe(false);
  });

  it('single node', () => {
    const r = topologicalSort([[]]);
    expect(r.order).toEqual([0]);
    expect(r.hasCycle).toBe(false);
  });

  it('simple chain 0->1->2', () => {
    const r = topologicalSort([[1], [2], []]);
    expect(r.order).toEqual([0, 1, 2]);
    expect(r.hasCycle).toBe(false);
  });

  it('detects 2-cycle', () => {
    const r = topologicalSort([[1], [0]]);
    expect(r.hasCycle).toBe(true);
  });

  it('detects 3-cycle', () => {
    const r = topologicalSort([[1], [2], [0]]);
    expect(r.hasCycle).toBe(true);
  });

  it('detects self-loop', () => {
    const r = topologicalSort([[0]]);
    expect(r.hasCycle).toBe(true);
  });

  it('diamond DAG order is valid', () => {
    const g = [[1, 2], [3], [3], []];
    const r = topologicalSort(g);
    expect(r.hasCycle).toBe(false);
    const pos = new Map(r.order.map((n, i) => [n, i]));
    expect(pos.get(0)!).toBeLessThan(pos.get(1)!);
    expect(pos.get(0)!).toBeLessThan(pos.get(2)!);
    expect(pos.get(1)!).toBeLessThan(pos.get(3)!);
    expect(pos.get(2)!).toBeLessThan(pos.get(3)!);
  });

  it('throws on out-of-range edge', () => {
    expect(() => topologicalSort([[5]])).toThrow(RangeError);
    expect(() => topologicalSort([[-1]])).toThrow(RangeError);
  });

  it('disconnected DAG sorts all nodes', () => {
    const r = topologicalSort([[1], [], [3], []]);
    expect(r.order).toHaveLength(4);
    expect(r.hasCycle).toBe(false);
  });

  it('parallel edges still valid', () => {
    const g = [[1, 1, 1], []];
    const r = topologicalSort(g);
    expect(r.hasCycle).toBe(false);
    expect(r.order).toEqual([0, 1]);
  });

  it('long linear chain', () => {
    const n = 50;
    const g: number[][] = [];
    for (let i = 0; i < n; i++) g.push(i < n - 1 ? [i + 1] : []);
    const r = topologicalSort(g);
    expect(r.order).toHaveLength(n);
    expect(r.order[0]).toBe(0);
    expect(r.order[n - 1]).toBe(n - 1);
    expect(r.hasCycle).toBe(false);
  });

  it('cycle in larger graph', () => {
    const g = [[1], [2], [3], [1], []];
    const r = topologicalSort(g);
    expect(r.hasCycle).toBe(true);
  });

  it('all isolated', () => {
    const r = topologicalSort([[], [], [], []]);
    expect(r.order).toHaveLength(4);
    expect(r.hasCycle).toBe(false);
  });

  it('order respects all dependencies', () => {
    const g = [[1, 2], [3], [3, 4], [5], [5], []];
    const r = topologicalSort(g);
    expect(r.hasCycle).toBe(false);
    const pos = new Map(r.order.map((v, i) => [v, i]));
    for (let u = 0; u < g.length; u++) {
      for (const v of g[u]) {
        expect(pos.get(u)!).toBeLessThan(pos.get(v)!);
      }
    }
  });

  it('two-node DAG 0->1', () => {
    const r = topologicalSort([[1], []]);
    expect(r.order).toEqual([0, 1]);
  });

  it('cycle detection returns partial order', () => {
    const r = topologicalSort([[1], [2], [0], [4], []]);
    expect(r.hasCycle).toBe(true);
    expect(r.order.length).toBeLessThan(5);
    expect(r.order).toContain(3);
    expect(r.order).toContain(4);
  });
});
