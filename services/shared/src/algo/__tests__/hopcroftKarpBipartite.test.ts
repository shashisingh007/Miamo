import { describe, it, expect } from 'vitest';
import { hopcroftKarpBipartite } from '../hopcroftKarpBipartite';

describe('hopcroftKarpBipartite', () => {
  it('empty graph', () => {
    const r = hopcroftKarpBipartite(0, 0, []);
    expect(r.matchingSize).toBe(0);
  });

  it('no edges', () => {
    const r = hopcroftKarpBipartite(3, 3, []);
    expect(r.matchingSize).toBe(0);
  });

  it('single edge', () => {
    const r = hopcroftKarpBipartite(1, 1, [[0, 0]]);
    expect(r.matchingSize).toBe(1);
    expect(r.pairsForLeft[0]).toBe(0);
    expect(r.pairsForRight[0]).toBe(0);
  });

  it('perfect matching 3x3', () => {
    const r = hopcroftKarpBipartite(3, 3, [
      [0, 0], [1, 1], [2, 2],
    ]);
    expect(r.matchingSize).toBe(3);
  });

  it('bottleneck 2 lefts share 1 right', () => {
    const r = hopcroftKarpBipartite(2, 1, [[0, 0], [1, 0]]);
    expect(r.matchingSize).toBe(1);
  });

  it('augmenting path needed', () => {
    const r = hopcroftKarpBipartite(3, 3, [
      [0, 0], [0, 1],
      [1, 0],
      [2, 1], [2, 2],
    ]);
    expect(r.matchingSize).toBe(3);
  });

  it('complete bipartite K(3,3) => 3', () => {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) edges.push([i, j]);
    const r = hopcroftKarpBipartite(3, 3, edges);
    expect(r.matchingSize).toBe(3);
  });

  it('asymmetric 4 left, 2 right', () => {
    const r = hopcroftKarpBipartite(4, 2, [
      [0, 0], [1, 0], [2, 1], [3, 1],
    ]);
    expect(r.matchingSize).toBe(2);
  });

  it('throws on negative counts', () => {
    expect(() => hopcroftKarpBipartite(-1, 0, [])).toThrow(RangeError);
  });

  it('throws on out-of-bounds edge', () => {
    expect(() => hopcroftKarpBipartite(2, 2, [[0, 5]])).toThrow(RangeError);
  });

  it('pairs are mutually consistent', () => {
    const r = hopcroftKarpBipartite(3, 3, [
      [0, 0], [0, 1], [1, 0], [2, 2],
    ]);
    for (let u = 0; u < 3; u++) {
      if (r.pairsForLeft[u] !== -1) {
        expect(r.pairsForRight[r.pairsForLeft[u]]).toBe(u);
      }
    }
  });

  it('parallel edges no double-count', () => {
    const r = hopcroftKarpBipartite(1, 1, [[0, 0], [0, 0]]);
    expect(r.matchingSize).toBe(1);
  });

  it('disconnected left vertices left unmatched', () => {
    const r = hopcroftKarpBipartite(3, 1, [[0, 0]]);
    expect(r.matchingSize).toBe(1);
    expect(r.pairsForLeft[1]).toBe(-1);
    expect(r.pairsForLeft[2]).toBe(-1);
  });

  it('larger random-ish', () => {
    const edges: Array<[number, number]> = [];
    for (let i = 0; i < 10; i++) edges.push([i, (i * 3) % 10]);
    for (let i = 0; i < 10; i++) edges.push([i, (i + 7) % 10]);
    const r = hopcroftKarpBipartite(10, 10, edges);
    expect(r.matchingSize).toBe(10);
  });

  it('star pattern (one center on right)', () => {
    const r = hopcroftKarpBipartite(5, 1, [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
    ]);
    expect(r.matchingSize).toBe(1);
  });
});
