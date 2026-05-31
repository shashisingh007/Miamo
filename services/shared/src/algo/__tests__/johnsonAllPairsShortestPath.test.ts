import { describe, it, expect } from 'vitest';
import {
  johnsonAllPairsShortestPath,
  JOHNSON_INF,
  JohnsonEdge,
} from '../johnsonAllPairsShortestPath';

function floydWarshall(n: number, edges: JohnsonEdge[]): number[][] {
  const d: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(JOHNSON_INF));
  for (let i = 0; i < n; i += 1) d[i][i] = 0;
  for (const e of edges) if (e.weight < d[e.from][e.to]) d[e.from][e.to] = e.weight;
  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
      }
    }
  }
  return d;
}

describe('johnsonAllPairsShortestPath', () => {
  it('rejects bad nodeCount', () => {
    expect(() => johnsonAllPairsShortestPath({ nodeCount: -1, edges: [] })).toThrow(RangeError);
  });

  it('rejects non-array edges', () => {
    expect(() => johnsonAllPairsShortestPath({ nodeCount: 1, edges: 'x' as any })).toThrow(
      TypeError,
    );
  });

  it('rejects bad indices', () => {
    expect(() =>
      johnsonAllPairsShortestPath({ nodeCount: 2, edges: [{ from: 0, to: 9, weight: 1 }] }),
    ).toThrow(RangeError);
  });

  it('rejects non-finite weight', () => {
    expect(() =>
      johnsonAllPairsShortestPath({
        nodeCount: 2,
        edges: [{ from: 0, to: 1, weight: NaN }],
      }),
    ).toThrow(RangeError);
  });

  it('empty graph', () => {
    const r = johnsonAllPairsShortestPath({ nodeCount: 0, edges: [] });
    expect(r.distances).toEqual([]);
  });

  it('single node, distance to self = 0', () => {
    const r = johnsonAllPairsShortestPath({ nodeCount: 1, edges: [] });
    expect(r.distances).toEqual([[0]]);
  });

  it('disconnected = INF', () => {
    const r = johnsonAllPairsShortestPath({ nodeCount: 2, edges: [] });
    expect(r.distances[0][1]).toBe(JOHNSON_INF);
    expect(r.distances[1][0]).toBe(JOHNSON_INF);
  });

  it('simple chain', () => {
    const r = johnsonAllPairsShortestPath({
      nodeCount: 3,
      edges: [{ from: 0, to: 1, weight: 5 }, { from: 1, to: 2, weight: 7 }],
    });
    expect(r.distances[0][2]).toBe(12);
    expect(r.distances[2][0]).toBe(JOHNSON_INF);
  });

  it('handles negative edges (no cycle)', () => {
    const edges: JohnsonEdge[] = [
      { from: 0, to: 1, weight: 4 },
      { from: 0, to: 2, weight: 5 },
      { from: 1, to: 2, weight: -2 },
    ];
    const r = johnsonAllPairsShortestPath({ nodeCount: 3, edges });
    expect(r.distances[0][2]).toBe(2);
  });

  it('detects negative cycle', () => {
    expect(() =>
      johnsonAllPairsShortestPath({
        nodeCount: 2,
        edges: [
          { from: 0, to: 1, weight: 1 },
          { from: 1, to: 0, weight: -2 },
        ],
      }),
    ).toThrow(RangeError);
  });

  it('matches Floyd-Warshall on small graph', () => {
    const edges: JohnsonEdge[] = [
      { from: 0, to: 1, weight: 3 },
      { from: 0, to: 2, weight: 8 },
      { from: 1, to: 2, weight: 2 },
      { from: 2, to: 3, weight: 1 },
      { from: 0, to: 3, weight: 10 },
    ];
    const r = johnsonAllPairsShortestPath({ nodeCount: 4, edges });
    const f = floydWarshall(4, edges);
    expect(r.distances).toEqual(f);
  });

  it('matches Floyd on neg-edge graph', () => {
    const edges: JohnsonEdge[] = [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: -3 },
      { from: 2, to: 3, weight: 2 },
      { from: 3, to: 1, weight: 5 }, // no negative cycle
    ];
    const r = johnsonAllPairsShortestPath({ nodeCount: 4, edges });
    const f = floydWarshall(4, edges);
    expect(r.distances).toEqual(f);
  });

  it('diagonal = 0', () => {
    const r = johnsonAllPairsShortestPath({
      nodeCount: 5,
      edges: [{ from: 0, to: 1, weight: 2 }, { from: 2, to: 3, weight: 4 }],
    });
    for (let i = 0; i < 5; i += 1) expect(r.distances[i][i]).toBe(0);
  });

  it('parallel edges take min', () => {
    const r = johnsonAllPairsShortestPath({
      nodeCount: 2,
      edges: [
        { from: 0, to: 1, weight: 5 },
        { from: 0, to: 1, weight: 2 },
      ],
    });
    expect(r.distances[0][1]).toBe(2);
  });

  it('cycle in graph', () => {
    const r = johnsonAllPairsShortestPath({
      nodeCount: 3,
      edges: [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 0, weight: 1 },
      ],
    });
    expect(r.distances[0][2]).toBe(2);
    expect(r.distances[2][0]).toBe(1);
  });

  it('random sparse graphs match floyd', () => {
    for (let trial = 0; trial < 5; trial += 1) {
      const n = 5 + Math.floor(Math.random() * 4);
      const edges: JohnsonEdge[] = [];
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          if (i !== j && Math.random() < 0.4) {
            edges.push({ from: i, to: j, weight: 1 + Math.floor(Math.random() * 10) });
          }
        }
      }
      const r = johnsonAllPairsShortestPath({ nodeCount: n, edges });
      const f = floydWarshall(n, edges);
      expect(r.distances).toEqual(f);
    }
  });

  it('result is n x n matrix', () => {
    const r = johnsonAllPairsShortestPath({ nodeCount: 4, edges: [] });
    expect(r.distances).toHaveLength(4);
    for (const row of r.distances) expect(row).toHaveLength(4);
  });
});
