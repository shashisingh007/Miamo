import { describe, it, expect } from 'vitest';
import { dijkstraShortestPath, reconstructPath } from '../dijkstraShortestPath';

describe('dijkstraShortestPath', () => {
  it('source distance is 0', () => {
    const r = dijkstraShortestPath([[]], 0);
    expect(r.dist[0]).toBe(0);
  });

  it('unreachable node is Infinity', () => {
    const g = [[{ to: 1, weight: 1 }], [], []];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[2]).toBe(Infinity);
  });

  it('simple chain', () => {
    const g = [
      [{ to: 1, weight: 2 }],
      [{ to: 2, weight: 3 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist).toEqual([0, 2, 5]);
  });

  it('chooses shorter alternate path', () => {
    const g = [
      [{ to: 1, weight: 10 }, { to: 2, weight: 1 }],
      [],
      [{ to: 1, weight: 2 }],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[1]).toBe(3);
  });

  it('prev allows path reconstruction', () => {
    const g = [
      [{ to: 1, weight: 1 }],
      [{ to: 2, weight: 1 }],
      [{ to: 3, weight: 1 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(reconstructPath(r.prev, 3)).toEqual([0, 1, 2, 3]);
  });

  it('reconstructPath single node', () => {
    const r = dijkstraShortestPath([[]], 0);
    expect(reconstructPath(r.prev, 0)).toEqual([0]);
  });

  it('throws on negative weight', () => {
    const g = [[{ to: 1, weight: -1 }], []];
    expect(() => dijkstraShortestPath(g, 0)).toThrow(RangeError);
  });

  it('throws on out-of-range source', () => {
    expect(() => dijkstraShortestPath([[]], 5)).toThrow(RangeError);
    expect(() => dijkstraShortestPath([[]], -1)).toThrow(RangeError);
  });

  it('zero-weight edges allowed', () => {
    const g = [[{ to: 1, weight: 0 }], []];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[1]).toBe(0);
  });

  it('handles diamond graph', () => {
    const g = [
      [{ to: 1, weight: 1 }, { to: 2, weight: 4 }],
      [{ to: 2, weight: 2 }, { to: 3, weight: 5 }],
      [{ to: 3, weight: 1 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist).toEqual([0, 1, 3, 4]);
    expect(reconstructPath(r.prev, 3)).toEqual([0, 1, 2, 3]);
  });

  it('handles disconnected graph', () => {
    const g = [
      [{ to: 1, weight: 1 }],
      [],
      [{ to: 3, weight: 1 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[0]).toBe(0);
    expect(r.dist[1]).toBe(1);
    expect(r.dist[2]).toBe(Infinity);
    expect(r.dist[3]).toBe(Infinity);
  });

  it('handles single-node graph', () => {
    const r = dijkstraShortestPath([[]], 0);
    expect(r.dist).toEqual([0]);
    expect(r.prev).toEqual([null]);
  });

  it('handles self-loop without infinite loop', () => {
    const g = [[{ to: 0, weight: 1 }, { to: 1, weight: 2 }], []];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist).toEqual([0, 2]);
  });

  it('handles parallel edges and picks the smallest', () => {
    const g = [
      [{ to: 1, weight: 10 }, { to: 1, weight: 3 }, { to: 1, weight: 7 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[1]).toBe(3);
  });

  it('large fractional weights', () => {
    const g = [[{ to: 1, weight: 0.1 }], [{ to: 2, weight: 0.2 }], []];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist[2]).toBeCloseTo(0.3, 10);
  });

  it('cyclic graph still terminates', () => {
    const g = [
      [{ to: 1, weight: 1 }],
      [{ to: 2, weight: 1 }],
      [{ to: 0, weight: 1 }],
    ];
    const r = dijkstraShortestPath(g, 0);
    expect(r.dist).toEqual([0, 1, 2]);
  });

  it('source 1 in 3-node chain', () => {
    const g = [
      [{ to: 1, weight: 5 }],
      [{ to: 2, weight: 5 }],
      [],
    ];
    const r = dijkstraShortestPath(g, 1);
    expect(r.dist[0]).toBe(Infinity);
    expect(r.dist[1]).toBe(0);
    expect(r.dist[2]).toBe(5);
  });

  it('empty graph (single isolated node)', () => {
    const r = dijkstraShortestPath([[]], 0);
    expect(r.dist).toEqual([0]);
  });
});
