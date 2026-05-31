import { describe, it, expect } from 'vitest';
import { eulerTourLCA } from '../eulerTourLCA';

describe('eulerTourLCA', () => {
  it('single node', () => {
    const t = eulerTourLCA(1, [], 0);
    expect(t.lca(0, 0)).toBe(0);
  });

  it('simple binary tree', () => {
    //      0
    //     / \
    //    1   2
    //   / \
    //  3   4
    const t = eulerTourLCA(5, [[0, 1], [0, 2], [1, 3], [1, 4]], 0);
    expect(t.lca(3, 4)).toBe(1);
    expect(t.lca(3, 2)).toBe(0);
    expect(t.lca(1, 4)).toBe(1);
    expect(t.lca(0, 2)).toBe(0);
  });

  it('lca with self', () => {
    const t = eulerTourLCA(3, [[0, 1], [1, 2]], 0);
    expect(t.lca(2, 2)).toBe(2);
  });

  it('path graph', () => {
    const t = eulerTourLCA(5, [[0, 1], [1, 2], [2, 3], [3, 4]], 0);
    expect(t.lca(4, 1)).toBe(1);
    expect(t.lca(3, 4)).toBe(3);
  });

  it('non-zero root', () => {
    const t = eulerTourLCA(4, [[0, 1], [1, 2], [1, 3]], 1);
    expect(t.lca(2, 3)).toBe(1);
    expect(t.lca(0, 2)).toBe(1);
  });

  it('star', () => {
    const t = eulerTourLCA(5, [[0, 1], [0, 2], [0, 3], [0, 4]], 0);
    expect(t.lca(1, 2)).toBe(0);
    expect(t.lca(3, 4)).toBe(0);
  });

  it('throws on invalid n', () => {
    expect(() => eulerTourLCA(0, [])).toThrow();
  });

  it('throws on root out of range', () => {
    expect(() => eulerTourLCA(3, [[0, 1], [1, 2]], 5)).toThrow();
  });

  it('throws on edge endpoint out of range', () => {
    expect(() => eulerTourLCA(3, [[0, 7]])).toThrow();
  });

  it('lca query out of range throws', () => {
    const t = eulerTourLCA(3, [[0, 1], [1, 2]], 0);
    expect(() => t.lca(0, 5)).toThrow();
  });

  it('deep tree LCA', () => {
    // build a chain 0-1-2-3-4-5 plus a branch 2-6
    const t = eulerTourLCA(7, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6]], 0);
    expect(t.lca(5, 6)).toBe(2);
    expect(t.lca(4, 6)).toBe(2);
    expect(t.lca(0, 6)).toBe(0);
  });
});
