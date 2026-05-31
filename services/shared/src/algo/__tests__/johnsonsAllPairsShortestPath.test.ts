import { describe, it, expect } from 'vitest';
import { johnsonsAllPairsShortestPath } from '../johnsonsAllPairsShortestPath';

describe('johnsonsAllPairsShortestPath', () => {
  it('empty graph', () => {
    const r = johnsonsAllPairsShortestPath(0, []);
    expect(r.distance).toEqual([]);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('throws on bad vertexCount', () => {
    expect(() => johnsonsAllPairsShortestPath(-1, [])).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() => johnsonsAllPairsShortestPath(2, [{ from: 0, to: 5, weight: 1 }])).toThrow(RangeError);
  });

  it('single vertex => [[0]]', () => {
    const r = johnsonsAllPairsShortestPath(1, []);
    expect(r.distance).toEqual([[0]]);
  });

  it('two vertices no edge => INF off-diagonal', () => {
    const r = johnsonsAllPairsShortestPath(2, []);
    expect(r.distance[0][1]).toBe(Infinity);
    expect(r.distance[1][0]).toBe(Infinity);
    expect(r.distance[0][0]).toBe(0);
  });

  it('linear path', () => {
    const r = johnsonsAllPairsShortestPath(3, [
      { from: 0, to: 1, weight: 5 },
      { from: 1, to: 2, weight: 7 },
    ]);
    expect(r.distance[0][2]).toBe(12);
    expect(r.distance[2][0]).toBe(Infinity);
  });

  it('handles negative edges (no cycle)', () => {
    const r = johnsonsAllPairsShortestPath(4, [
      { from: 0, to: 1, weight: -2 },
      { from: 1, to: 2, weight: 3 },
      { from: 2, to: 3, weight: 1 },
      { from: 0, to: 3, weight: 10 },
    ]);
    expect(r.distance[0][3]).toBe(2);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('detects negative cycle', () => {
    const r = johnsonsAllPairsShortestPath(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: -3 },
      { from: 2, to: 0, weight: 1 },
    ]);
    expect(r.hasNegativeCycle).toBe(true);
  });

  it('matches Floyd-Warshall on small graph', () => {
    const r = johnsonsAllPairsShortestPath(4, [
      { from: 0, to: 1, weight: 3 },
      { from: 0, to: 3, weight: 7 },
      { from: 1, to: 2, weight: 2 },
      { from: 2, to: 3, weight: 1 },
      { from: 3, to: 1, weight: 2 },
    ]);
    expect(r.distance[0][3]).toBe(6);
    expect(r.distance[3][2]).toBe(4);
  });

  it('self-distance is 0', () => {
    const r = johnsonsAllPairsShortestPath(3, [
      { from: 0, to: 1, weight: 1 },
    ]);
    for (let i = 0; i < 3; i++) expect(r.distance[i][i]).toBe(0);
  });

  it('parallel edges => min taken', () => {
    const r = johnsonsAllPairsShortestPath(2, [
      { from: 0, to: 1, weight: 5 },
      { from: 0, to: 1, weight: 2 },
    ]);
    expect(r.distance[0][1]).toBe(2);
  });

  it('star to center via positive weights', () => {
    const r = johnsonsAllPairsShortestPath(4, [
      { from: 0, to: 1, weight: 4 },
      { from: 0, to: 2, weight: 3 },
      { from: 0, to: 3, weight: 5 },
    ]);
    expect(r.distance[0][1]).toBe(4);
    expect(r.distance[0][2]).toBe(3);
    expect(r.distance[0][3]).toBe(5);
  });

  it('disconnected stays INF', () => {
    const r = johnsonsAllPairsShortestPath(4, [
      { from: 0, to: 1, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ]);
    expect(r.distance[0][3]).toBe(Infinity);
  });
});
