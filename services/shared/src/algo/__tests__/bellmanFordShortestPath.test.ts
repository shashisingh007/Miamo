import { describe, it, expect } from 'vitest';
import { bellmanFordShortestPath } from '../bellmanFordShortestPath';

describe('bellmanFordShortestPath', () => {
  it('source distance is 0', () => {
    const r = bellmanFordShortestPath(1, [], 0);
    expect(r.dist[0]).toBe(0);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('unreachable is Infinity', () => {
    const r = bellmanFordShortestPath(3, [{ from: 0, to: 1, weight: 1 }], 0);
    expect(r.dist[2]).toBe(Infinity);
  });

  it('simple chain', () => {
    const r = bellmanFordShortestPath(3, [
      { from: 0, to: 1, weight: 2 },
      { from: 1, to: 2, weight: 3 },
    ], 0);
    expect(r.dist).toEqual([0, 2, 5]);
  });

  it('handles negative edges (no cycle)', () => {
    const r = bellmanFordShortestPath(4, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: -2 },
      { from: 2, to: 3, weight: 3 },
    ], 0);
    expect(r.dist).toEqual([0, 1, -1, 2]);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('detects negative cycle', () => {
    const r = bellmanFordShortestPath(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: -3 },
      { from: 2, to: 1, weight: 1 },
    ], 0);
    expect(r.hasNegativeCycle).toBe(true);
  });

  it('zero-edge graph yields source 0 others Infinity', () => {
    const r = bellmanFordShortestPath(3, [], 0);
    expect(r.dist).toEqual([0, Infinity, Infinity]);
  });

  it('throws on invalid nodeCount', () => {
    expect(() => bellmanFordShortestPath(0, [], 0)).toThrow(RangeError);
    expect(() => bellmanFordShortestPath(-1, [], 0)).toThrow(RangeError);
  });

  it('throws on out-of-bounds source', () => {
    expect(() => bellmanFordShortestPath(2, [], 5)).toThrow(RangeError);
    expect(() => bellmanFordShortestPath(2, [], -1)).toThrow(RangeError);
  });

  it('throws on edge endpoint out of bounds', () => {
    expect(() => bellmanFordShortestPath(2, [{ from: 0, to: 5, weight: 1 }], 0)).toThrow(RangeError);
  });

  it('picks shorter alternate', () => {
    const r = bellmanFordShortestPath(3, [
      { from: 0, to: 1, weight: 10 },
      { from: 0, to: 2, weight: 1 },
      { from: 2, to: 1, weight: 2 },
    ], 0);
    expect(r.dist[1]).toBe(3);
  });

  it('prev reconstructs path', () => {
    const r = bellmanFordShortestPath(3, [
      { from: 0, to: 1, weight: 1 },
      { from: 1, to: 2, weight: 1 },
    ], 0);
    expect(r.prev[2]).toBe(1);
    expect(r.prev[1]).toBe(0);
    expect(r.prev[0]).toBe(null);
  });

  it('disconnected components', () => {
    const r = bellmanFordShortestPath(4, [
      { from: 0, to: 1, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ], 0);
    expect(r.dist).toEqual([0, 1, Infinity, Infinity]);
  });

  it('source 2 in disconnected graph', () => {
    const r = bellmanFordShortestPath(4, [
      { from: 0, to: 1, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ], 2);
    expect(r.dist[2]).toBe(0);
    expect(r.dist[3]).toBe(1);
    expect(r.dist[0]).toBe(Infinity);
  });

  it('fractional weights', () => {
    const r = bellmanFordShortestPath(3, [
      { from: 0, to: 1, weight: 0.1 },
      { from: 1, to: 2, weight: 0.2 },
    ], 0);
    expect(r.dist[2]).toBeCloseTo(0.3, 10);
  });

  it('self-loop ignored when non-negative', () => {
    const r = bellmanFordShortestPath(2, [
      { from: 0, to: 0, weight: 1 },
      { from: 0, to: 1, weight: 2 },
    ], 0);
    expect(r.dist).toEqual([0, 2]);
    expect(r.hasNegativeCycle).toBe(false);
  });

  it('self-loop with negative weight => cycle', () => {
    const r = bellmanFordShortestPath(2, [
      { from: 0, to: 0, weight: -1 },
      { from: 0, to: 1, weight: 1 },
    ], 0);
    expect(r.hasNegativeCycle).toBe(true);
  });
});
