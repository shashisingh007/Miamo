import { describe, it, expect } from 'vitest';
import { primMST } from '../primMST';

describe('primMST', () => {
  it('empty graph connected, weight 0', () => {
    const r = primMST([]);
    expect(r.mst).toEqual([]);
    expect(r.totalWeight).toBe(0);
    expect(r.connected).toBe(true);
  });

  it('single node connected, weight 0', () => {
    const r = primMST([[]]);
    expect(r.mst).toEqual([]);
    expect(r.connected).toBe(true);
  });

  it('two-node MST', () => {
    const r = primMST([[{ to: 1, weight: 5 }], [{ to: 0, weight: 5 }]]);
    expect(r.totalWeight).toBe(5);
    expect(r.mst).toHaveLength(1);
    expect(r.connected).toBe(true);
  });

  it('triangle picks two cheapest', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }, { to: 2, weight: 5 }],
      [{ to: 0, weight: 1 }, { to: 2, weight: 2 }],
      [{ to: 0, weight: 5 }, { to: 1, weight: 2 }],
    ]);
    expect(r.totalWeight).toBe(3);
    expect(r.mst).toHaveLength(2);
  });

  it('mst has n-1 edges when connected', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }],
      [{ to: 0, weight: 1 }, { to: 2, weight: 2 }],
      [{ to: 1, weight: 2 }, { to: 3, weight: 3 }],
      [{ to: 2, weight: 3 }, { to: 4, weight: 4 }],
      [{ to: 3, weight: 4 }],
    ]);
    expect(r.mst).toHaveLength(4);
    expect(r.totalWeight).toBe(10);
    expect(r.connected).toBe(true);
  });

  it('disconnected graph reports connected=false', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }],
      [{ to: 0, weight: 1 }],
      [{ to: 3, weight: 1 }],
      [{ to: 2, weight: 1 }],
    ]);
    expect(r.connected).toBe(false);
  });

  it('handles zero-weight edges', () => {
    const r = primMST([
      [{ to: 1, weight: 0 }],
      [{ to: 0, weight: 0 }],
    ]);
    expect(r.totalWeight).toBe(0);
    expect(r.connected).toBe(true);
  });

  it('handles negative weights', () => {
    const r = primMST([
      [{ to: 1, weight: -1 }],
      [{ to: 0, weight: -1 }, { to: 2, weight: -2 }],
      [{ to: 1, weight: -2 }],
    ]);
    expect(r.totalWeight).toBe(-3);
  });

  it('throws on out-of-bounds edge', () => {
    expect(() => primMST([[{ to: 5, weight: 1 }]])).toThrow(RangeError);
  });

  it('isolated last node disconnects', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }],
      [{ to: 0, weight: 1 }],
      [],
    ]);
    expect(r.connected).toBe(false);
  });

  it('parallel edges pick the cheapest', () => {
    const r = primMST([
      [{ to: 1, weight: 10 }, { to: 1, weight: 3 }],
      [{ to: 0, weight: 10 }, { to: 0, weight: 3 }],
    ]);
    expect(r.totalWeight).toBe(3);
  });

  it('long chain MST', () => {
    const n = 20;
    const graph: { to: number; weight: number }[][] = [];
    for (let i = 0; i < n; i++) graph.push([]);
    for (let i = 0; i < n - 1; i++) {
      graph[i].push({ to: i + 1, weight: 1 });
      graph[i + 1].push({ to: i, weight: 1 });
    }
    const r = primMST(graph);
    expect(r.totalWeight).toBe(n - 1);
    expect(r.mst).toHaveLength(n - 1);
  });

  it('mst total matches kruskal-like cheapest', () => {
    const r = primMST([
      [{ to: 1, weight: 10 }, { to: 2, weight: 6 }, { to: 3, weight: 5 }],
      [{ to: 0, weight: 10 }, { to: 3, weight: 15 }],
      [{ to: 0, weight: 6 }, { to: 3, weight: 4 }],
      [{ to: 0, weight: 5 }, { to: 1, weight: 15 }, { to: 2, weight: 4 }],
    ]);
    expect(r.totalWeight).toBe(19);
  });

  it('mst edges have valid endpoints', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }, { to: 2, weight: 2 }],
      [{ to: 0, weight: 1 }],
      [{ to: 0, weight: 2 }],
    ]);
    for (const e of r.mst) {
      expect(e.from).toBeGreaterThanOrEqual(0);
      expect(e.to).toBeGreaterThanOrEqual(0);
      expect(e.weight).toBeGreaterThanOrEqual(0);
    }
  });

  it('two-cluster bridge included', () => {
    const r = primMST([
      [{ to: 1, weight: 1 }, { to: 2, weight: 100 }],
      [{ to: 0, weight: 1 }],
      [{ to: 0, weight: 100 }, { to: 3, weight: 1 }],
      [{ to: 2, weight: 1 }],
    ]);
    expect(r.totalWeight).toBe(102);
    expect(r.connected).toBe(true);
  });
});
