import { describe, it, expect } from 'vitest';
import { buildLcaBinaryLift, lcaQuery, lcaBinaryLifting } from '../lcaBinaryLifting';

// helper: build adj from undirected edges
function adjOf(n: number, edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

describe('lcaBinaryLifting', () => {
  it('factory exposes both', () => {
    const api = lcaBinaryLifting();
    expect(typeof api.buildLcaBinaryLift).toBe('function');
    expect(typeof api.lcaQuery).toBe('function');
  });

  it('single node', () => {
    const idx = buildLcaBinaryLift([[]], 0);
    expect(lcaQuery(idx, 0, 0)).toBe(0);
  });

  it('linear chain 0-1-2-3', () => {
    const idx = buildLcaBinaryLift(adjOf(4, [[0, 1], [1, 2], [2, 3]]), 0);
    expect(lcaQuery(idx, 3, 1)).toBe(1);
    expect(lcaQuery(idx, 3, 2)).toBe(2);
    expect(lcaQuery(idx, 0, 3)).toBe(0);
  });

  it('binary tree of 7 nodes', () => {
    //       0
    //      / \
    //     1   2
    //    / \ / \
    //   3  4 5  6
    const idx = buildLcaBinaryLift(
      adjOf(7, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]),
      0,
    );
    expect(lcaQuery(idx, 3, 4)).toBe(1);
    expect(lcaQuery(idx, 5, 6)).toBe(2);
    expect(lcaQuery(idx, 3, 6)).toBe(0);
    expect(lcaQuery(idx, 4, 1)).toBe(1);
  });

  it('lca(u,u) = u', () => {
    const idx = buildLcaBinaryLift(adjOf(5, [[0, 1], [0, 2], [1, 3], [1, 4]]), 0);
    for (let v = 0; v < 5; v += 1) expect(lcaQuery(idx, v, v)).toBe(v);
  });

  it('lca with root is root', () => {
    const idx = buildLcaBinaryLift(adjOf(5, [[0, 1], [1, 2], [2, 3], [2, 4]]), 0);
    for (let v = 0; v < 5; v += 1) expect(lcaQuery(idx, 0, v)).toBe(0);
  });

  it('symmetric: lca(u,v) = lca(v,u)', () => {
    const idx = buildLcaBinaryLift(adjOf(7, [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]), 0);
    expect(lcaQuery(idx, 3, 6)).toBe(lcaQuery(idx, 6, 3));
  });

  it('non-zero root', () => {
    //  rooted at 2
    //    2
    //   / \
    //  0   4
    //  |
    //  1
    const idx = buildLcaBinaryLift(adjOf(5, [[0, 1], [0, 2], [2, 4]]), 2);
    expect(lcaQuery(idx, 1, 4)).toBe(2);
    expect(lcaQuery(idx, 0, 1)).toBe(0);
  });

  it('throws on bad inputs', () => {
    expect(() => buildLcaBinaryLift(null as any, 0)).toThrow();
    expect(() => buildLcaBinaryLift([[]], 5)).toThrow();
    const idx = buildLcaBinaryLift(adjOf(3, [[0, 1], [0, 2]]), 0);
    expect(() => lcaQuery(idx, -1, 0)).toThrow();
    expect(() => lcaQuery(idx, 0, 99)).toThrow();
    expect(() => lcaQuery(idx, 1.5 as any, 0)).toThrow();
  });

  it('depth field reflects tree distance from root', () => {
    const idx = buildLcaBinaryLift(adjOf(4, [[0, 1], [1, 2], [2, 3]]), 0);
    expect(idx.depth).toEqual([0, 1, 2, 3]);
  });
});
