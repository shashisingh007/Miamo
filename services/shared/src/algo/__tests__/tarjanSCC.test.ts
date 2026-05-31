import { describe, it, expect } from 'vitest';
import { tarjanSCC } from '../tarjanSCC';

function setOfComps(comps: number[][]): Set<string> {
  return new Set(comps.map((c) => [...c].sort((a, b) => a - b).join(',')));
}

describe('tarjanSCC', () => {
  it('rejects bad nodeCount', () => {
    expect(() => tarjanSCC({ nodeCount: -1, edges: [] })).toThrow(RangeError);
    expect(() => tarjanSCC({ nodeCount: 1.5, edges: [] })).toThrow(RangeError);
  });

  it('rejects bad edges array', () => {
    expect(() => tarjanSCC({ nodeCount: 1, edges: 'x' as any })).toThrow(TypeError);
  });

  it('rejects edge with bad index', () => {
    expect(() => tarjanSCC({ nodeCount: 2, edges: [[0, 5]] })).toThrow(RangeError);
    expect(() => tarjanSCC({ nodeCount: 2, edges: [[-1, 0]] })).toThrow(RangeError);
  });

  it('empty graph', () => {
    expect(tarjanSCC({ nodeCount: 0, edges: [] })).toEqual([]);
  });

  it('single node, no edges', () => {
    const r = tarjanSCC({ nodeCount: 1, edges: [] });
    expect(r).toEqual([[0]]);
  });

  it('two unrelated nodes', () => {
    const r = tarjanSCC({ nodeCount: 2, edges: [] });
    expect(setOfComps(r)).toEqual(new Set(['0', '1']));
  });

  it('DAG: each node its own scc', () => {
    const r = tarjanSCC({ nodeCount: 3, edges: [[0, 1], [1, 2]] });
    expect(setOfComps(r)).toEqual(new Set(['0', '1', '2']));
    expect(r.length).toBe(3);
  });

  it('simple cycle = one component', () => {
    const r = tarjanSCC({ nodeCount: 3, edges: [[0, 1], [1, 2], [2, 0]] });
    expect(r).toEqual([[0, 1, 2]]);
  });

  it('two disjoint cycles', () => {
    const r = tarjanSCC({
      nodeCount: 4,
      edges: [[0, 1], [1, 0], [2, 3], [3, 2]],
    });
    expect(setOfComps(r)).toEqual(new Set(['0,1', '2,3']));
  });

  it('classic textbook example', () => {
    // Tarjan paper example: 8 nodes
    const edges: [number, number][] = [
      [0, 1], [1, 2], [2, 0],
      [3, 1], [3, 2], [3, 4],
      [4, 3], [4, 5],
      [5, 2], [5, 6],
      [6, 5],
      [7, 4], [7, 6], [7, 7],
    ];
    const r = tarjanSCC({ nodeCount: 8, edges });
    expect(setOfComps(r)).toEqual(new Set(['0,1,2', '3,4', '5,6', '7']));
  });

  it('self-loop forms own scc', () => {
    const r = tarjanSCC({ nodeCount: 2, edges: [[0, 0], [0, 1]] });
    expect(setOfComps(r)).toEqual(new Set(['0', '1']));
  });

  it('reverse-topological order property', () => {
    // After tarjan, components are emitted in reverse topological order:
    // a sink scc appears before its predecessors.
    const r = tarjanSCC({ nodeCount: 3, edges: [[0, 1], [1, 2]] });
    // r[0] is the deepest sink => 2
    expect(r[0]).toEqual([2]);
    expect(r[r.length - 1]).toEqual([0]);
  });

  it('large cycle', () => {
    const n = 200;
    const edges: [number, number][] = [];
    for (let i = 0; i < n; i += 1) edges.push([i, (i + 1) % n]);
    const r = tarjanSCC({ nodeCount: n, edges });
    expect(r).toHaveLength(1);
    expect(r[0]).toHaveLength(n);
  });

  it('handles parallel edges', () => {
    const r = tarjanSCC({ nodeCount: 2, edges: [[0, 1], [0, 1], [1, 0]] });
    expect(r).toEqual([[0, 1]]);
  });

  it('every node listed exactly once', () => {
    const edges: [number, number][] = [[0, 1], [1, 2], [2, 0], [3, 1]];
    const r = tarjanSCC({ nodeCount: 4, edges });
    const flat = r.flat().sort((a, b) => a - b);
    expect(flat).toEqual([0, 1, 2, 3]);
  });

  it('component count for sample', () => {
    const r = tarjanSCC({
      nodeCount: 5,
      edges: [[0, 1], [1, 2], [2, 0], [3, 4]],
    });
    expect(r.length).toBe(3);
  });
});
