import { describe, it, expect } from 'vitest';
import { kruskalMST } from '../kruskalMST';

describe('kruskalMST', () => {
  it('single-node graph is trivially connected', () => {
    const r = kruskalMST(1, []);
    expect(r.mst).toEqual([]);
    expect(r.totalWeight).toBe(0);
    expect(r.connected).toBe(true);
  });

  it('two-node single edge', () => {
    const r = kruskalMST(2, [{ from: 0, to: 1, weight: 5 }]);
    expect(r.mst).toHaveLength(1);
    expect(r.totalWeight).toBe(5);
    expect(r.connected).toBe(true);
  });

  it('triangle picks two cheapest', () => {
    const r = kruskalMST(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 2 },
      { from: 0, to: 2, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(3);
    expect(r.mst).toHaveLength(2);
    expect(r.connected).toBe(true);
  });

  it('mst has exactly n-1 edges when connected', () => {
    const r = kruskalMST(5, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 2 },
      { from: 2, to: 3, weight: 3 },
      { from: 3, to: 4, weight: 4 },
      { from: 0, to: 4, weight: 100 },
    ]);
    expect(r.mst).toHaveLength(4);
    expect(r.totalWeight).toBe(10);
  });

  it('disconnected graph reports connected=false', () => {
    const r = kruskalMST(4, [
      { from: 0, to: 1, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ]);
    expect(r.connected).toBe(false);
    expect(r.mst).toHaveLength(2);
  });

  it('skips cycle-forming edges', () => {
    const r = kruskalMST(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 2 },
      { from: 0, to: 2, weight: 100 },
    ]);
    expect(r.totalWeight).toBe(3);
  });

  it('throws on negative nodeCount', () => {
    expect(() => kruskalMST(0, [])).toThrow(RangeError);
    expect(() => kruskalMST(-1, [])).toThrow(RangeError);
  });

  it('throws on out-of-bounds edge', () => {
    expect(() => kruskalMST(2, [{ from: 0, to: 5, weight: 1 }])).toThrow(RangeError);
  });

  it('handles zero-weight edges', () => {
    const r = kruskalMST(2, [{ from: 0, to: 1, weight: 0 }]);
    expect(r.totalWeight).toBe(0);
    expect(r.connected).toBe(true);
  });

  it('handles negative weights', () => {
    const r = kruskalMST(3, [
      { from: 0, to: 1, weight: -1 },
      { from: 1, to: 2, weight: -2 },
      { from: 0, to: 2, weight: 5 },
    ]);
    expect(r.totalWeight).toBe(-3);
  });

  it('stable when multiple equal weights', () => {
    const r = kruskalMST(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 1 },
      { from: 0, to: 2, weight: 1 },
    ]);
    expect(r.mst).toHaveLength(2);
    expect(r.totalWeight).toBe(2);
  });

  it('isolated node makes graph disconnected', () => {
    const r = kruskalMST(3, [{ from: 0, to: 1, weight: 1 }]);
    expect(r.connected).toBe(false);
    expect(r.mst).toHaveLength(1);
  });

  it('does not mutate input edges', () => {
    const edges = [
      { from: 0, to: 1, weight: 3 },
      { from: 1, to: 2, weight: 1 },
    ];
    const snap = JSON.stringify(edges);
    kruskalMST(3, edges);
    expect(JSON.stringify(edges)).toBe(snap);
  });

  it('chooses globally cheapest spanning tree', () => {
    const r = kruskalMST(4, [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 2, weight: 6 },
      { from: 0, to: 3, weight: 5 },
      { from: 1, to: 3, weight: 15 },
      { from: 2, to: 3, weight: 4 },
    ]);
    expect(r.totalWeight).toBe(19);
    expect(r.mst).toHaveLength(3);
  });

  it('mst edges are unique', () => {
    const r = kruskalMST(5, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
      { from: 3, to: 4, weight: 1 },
      { from: 0, to: 4, weight: 10 },
    ]);
    const keys = r.mst.map((e) => `${e.from}-${e.to}-${e.weight}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
