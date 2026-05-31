import { describe, it, expect } from 'vitest';
import {
  canonicalRootedTree,
  treeIsomorphismAhu,
} from '../treeIsomorphismAhu';

describe('treeIsomorphismAhu', () => {
  it('canonicalRootedTree throws on invalid n', () => {
    expect(() => canonicalRootedTree({ n: 0, edges: [] }, 0)).toThrow(RangeError);
  });

  it('canonicalRootedTree throws on invalid root', () => {
    expect(() => canonicalRootedTree({ n: 2, edges: [[0, 1]] }, 5)).toThrow(RangeError);
  });

  it('canonicalRootedTree throws on bad edge', () => {
    expect(() => canonicalRootedTree({ n: 2, edges: [[0, 5]] }, 0)).toThrow(RangeError);
    expect(() => canonicalRootedTree({ n: 2, edges: [[0, 0]] }, 0)).toThrow(RangeError);
  });

  it('single node canonical is "()"', () => {
    expect(canonicalRootedTree({ n: 1, edges: [] }, 0)).toBe('()');
  });

  it('two nodes canonical', () => {
    expect(canonicalRootedTree({ n: 2, edges: [[0, 1]] }, 0)).toBe('(())');
  });

  it('same tree from different roots can differ', () => {
    const t: { n: number; edges: [number, number][] } = {
      n: 3,
      edges: [[0, 1], [1, 2]],
    };
    expect(canonicalRootedTree(t, 0)).toBe('((()))');
    expect(canonicalRootedTree(t, 1)).toBe('(()())');
  });

  it('isomorphic same labeling', () => {
    const a = { n: 3, edges: [[0, 1], [1, 2]] as [number, number][] };
    expect(treeIsomorphismAhu(a, a)).toBe(true);
  });

  it('non-isomorphic by size', () => {
    const a = { n: 2, edges: [[0, 1]] as [number, number][] };
    const b = { n: 3, edges: [[0, 1], [1, 2]] as [number, number][] };
    expect(treeIsomorphismAhu(a, b)).toBe(false);
  });

  it('non-isomorphic same size, different shape', () => {
    // P4 (path) vs Y (star on 3 leaves)
    const path = { n: 4, edges: [[0, 1], [1, 2], [2, 3]] as [number, number][] };
    const star = { n: 4, edges: [[0, 1], [0, 2], [0, 3]] as [number, number][] };
    expect(treeIsomorphismAhu(path, star)).toBe(false);
  });

  it('isomorphic with relabeling', () => {
    const a = { n: 4, edges: [[0, 1], [1, 2], [1, 3]] as [number, number][] };
    const b = { n: 4, edges: [[2, 0], [0, 1], [0, 3]] as [number, number][] };
    expect(treeIsomorphismAhu(a, b)).toBe(true);
  });

  it('two single-node trees are isomorphic', () => {
    expect(treeIsomorphismAhu({ n: 1, edges: [] }, { n: 1, edges: [] })).toBe(true);
  });

  it('two paths of same length are isomorphic', () => {
    const a = { n: 5, edges: [[0, 1], [1, 2], [2, 3], [3, 4]] as [number, number][] };
    const b = { n: 5, edges: [[4, 3], [3, 2], [2, 1], [1, 0]] as [number, number][] };
    expect(treeIsomorphismAhu(a, b)).toBe(true);
  });

  it('two stars same size are isomorphic', () => {
    const a = { n: 5, edges: [[0, 1], [0, 2], [0, 3], [0, 4]] as [number, number][] };
    const b = { n: 5, edges: [[1, 2], [1, 3], [1, 4], [1, 0]] as [number, number][] };
    expect(treeIsomorphismAhu(a, b)).toBe(true);
  });

  it('caterpillar vs Y-shape distinguished', () => {
    // path 0-1-2-3 with one leaf 4 attached to 1 vs 4 attached to 2
    const a = {
      n: 5,
      edges: [[0, 1], [1, 2], [2, 3], [1, 4]] as [number, number][],
    };
    const b = {
      n: 5,
      edges: [[0, 1], [1, 2], [2, 3], [2, 4]] as [number, number][],
    };
    // Both are actually isomorphic (caterpillars with same degree sequence)
    expect(treeIsomorphismAhu(a, b)).toBe(true);
  });

  it('different shapes 6-node', () => {
    // Two distinct trees on 6 nodes: caterpillar vs ternary
    const cat = {
      n: 6,
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] as [number, number][],
    };
    const ternary = {
      n: 6,
      edges: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]] as [number, number][],
    };
    expect(treeIsomorphismAhu(cat, ternary)).toBe(false);
  });

  it('different edge count fails fast', () => {
    const a = { n: 3, edges: [[0, 1], [1, 2]] as [number, number][] };
    const b = { n: 3, edges: [[0, 1]] as [number, number][] };
    expect(treeIsomorphismAhu(a, b)).toBe(false);
  });
});
