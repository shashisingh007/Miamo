import { describe, it, expect } from 'vitest';
import { gabowSCC } from '../gabowSCC';

describe('gabowSCC', () => {
  it('rejects bad n', () => {
    expect(() => gabowSCC(-1, [])).toThrow(RangeError);
  });

  it('rejects mismatched adj length', () => {
    expect(() => gabowSCC(3, [[]])).toThrow(RangeError);
  });

  it('rejects non-array row', () => {
    expect(() => gabowSCC(2, [[], 'x' as any])).toThrow(TypeError);
  });

  it('rejects out-of-range neighbor', () => {
    expect(() => gabowSCC(2, [[5], []])).toThrow(RangeError);
  });

  it('n=0 returns []', () => {
    expect(gabowSCC(0, [])).toEqual([]);
  });

  it('isolated vertices', () => {
    const c = gabowSCC(3, [[], [], []]);
    expect(c.length).toBe(3);
    expect(c.every((g) => g.length === 1)).toBe(true);
    const flat = c.flat().sort();
    expect(flat).toEqual([0, 1, 2]);
  });

  it('single self-loop', () => {
    const c = gabowSCC(1, [[0]]);
    expect(c).toEqual([[0]]);
  });

  it('single 2-cycle', () => {
    const c = gabowSCC(2, [[1], [0]]);
    expect(c).toEqual([[0, 1]]);
  });

  it('linear DAG => n singletons, sink first', () => {
    // 0 -> 1 -> 2
    const c = gabowSCC(3, [[1], [2], []]);
    expect(c).toEqual([[2], [1], [0]]);
  });

  it('classic 3-component graph', () => {
    // SCCs: {0,1,2}, {3,4}, {5}
    //   0->1->2->0; 2->3; 3->4->3; 4->5
    const adj = [[1], [2], [0, 3], [4], [3, 5], []];
    const c = gabowSCC(6, adj);
    // All three components present
    const sets = c.map((g) => new Set(g));
    const expects = [new Set([0, 1, 2]), new Set([3, 4]), new Set([5])];
    for (const expected of expects) {
      expect(sets.some((s) => s.size === expected.size && [...s].every((x) => expected.has(x)))).toBe(true);
    }
  });

  it('reverse-topological: sinks first', () => {
    // {0,1} -> {2}
    // 0<->1, 1->2
    const c = gabowSCC(3, [[1], [0, 2], []]);
    // {2} should come before {0,1}
    expect(c[0]).toEqual([2]);
    expect(c[1]).toEqual([0, 1]);
  });

  it('disconnected graph', () => {
    // Component A: 0<->1. Component B: 2->3->2.
    const c = gabowSCC(4, [[1], [0], [3], [2]]);
    expect(c.length).toBe(2);
    const sets = c.map((g) => new Set(g));
    expect(sets).toContainEqual(new Set([0, 1]));
    expect(sets).toContainEqual(new Set([2, 3]));
  });

  it('large cycle', () => {
    const n = 50;
    const adj: number[][] = [];
    for (let i = 0; i < n; i += 1) adj.push([(i + 1) % n]);
    const c = gabowSCC(n, adj);
    expect(c.length).toBe(1);
    expect(c[0].length).toBe(n);
  });

  it('two cycles joined by bridge', () => {
    // cycle A: 0->1->2->0; cycle B: 3->4->5->3; bridge 2->3.
    const adj = [[1], [2], [0, 3], [4], [5], [3]];
    const c = gabowSCC(6, adj);
    const sets = c.map((g) => new Set(g));
    expect(sets).toContainEqual(new Set([0, 1, 2]));
    expect(sets).toContainEqual(new Set([3, 4, 5]));
    // sink first
    expect(c[0]).toEqual([3, 4, 5]);
    expect(c[1]).toEqual([0, 1, 2]);
  });

  it('each vertex appears exactly once', () => {
    const adj = [[1, 2], [2], [0, 3], [4], [3, 5], [6], [4]];
    const c = gabowSCC(7, adj);
    const flat = c.flat();
    expect(new Set(flat).size).toBe(7);
    expect(flat.length).toBe(7);
  });

  it('inner arrays sorted', () => {
    const adj = [[1, 2], [0, 2], [0, 1]];
    const c = gabowSCC(3, adj);
    expect(c).toEqual([[0, 1, 2]]);
  });

  it('handles self-loops alongside cycles', () => {
    const adj = [[0, 1], [2], [1]];
    const c = gabowSCC(3, adj);
    const sets = c.map((g) => new Set(g));
    expect(sets).toContainEqual(new Set([0]));
    expect(sets).toContainEqual(new Set([1, 2]));
  });

  it('handles 100 random vertices completeness', () => {
    const n = 100;
    const adj: number[][] = [];
    for (let i = 0; i < n; i += 1) {
      const row: number[] = [];
      for (let j = 0; j < 3; j += 1) row.push(Math.floor(Math.random() * n));
      adj.push(row);
    }
    const c = gabowSCC(n, adj);
    expect(c.flat().length).toBe(n);
    expect(new Set(c.flat()).size).toBe(n);
  });
});
