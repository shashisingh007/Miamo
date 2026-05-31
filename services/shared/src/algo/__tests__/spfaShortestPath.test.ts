import { describe, it, expect } from 'vitest';
import { spfaShortestPath } from '../spfaShortestPath';

describe('spfaShortestPath', () => {
  it('throws on invalid vertices', () => {
    expect(() => spfaShortestPath(0, [], 0)).toThrow(RangeError);
    expect(() => spfaShortestPath(-1, [], 0)).toThrow(RangeError);
    expect(() => spfaShortestPath(1.5, [], 0)).toThrow(RangeError);
  });

  it('throws on invalid source', () => {
    expect(() => spfaShortestPath(3, [], 5)).toThrow(RangeError);
    expect(() => spfaShortestPath(3, [], -1)).toThrow(RangeError);
  });

  it('throws on out-of-range edge', () => {
    expect(() =>
      spfaShortestPath(2, [{ from: 0, to: 5, weight: 1 }], 0),
    ).toThrow(RangeError);
  });

  it('throws on non-finite weight', () => {
    expect(() =>
      spfaShortestPath(2, [{ from: 0, to: 1, weight: NaN }], 0),
    ).toThrow(TypeError);
  });

  it('single vertex', () => {
    const r = spfaShortestPath(1, [], 0);
    expect(r.distances).toEqual([0]);
    expect(r.negativeCycle).toBe(false);
  });

  it('unreachable vertex stays Infinity', () => {
    const r = spfaShortestPath(2, [], 0);
    expect(r.distances[0]).toBe(0);
    expect(r.distances[1]).toBe(Infinity);
  });

  it('simple chain', () => {
    const r = spfaShortestPath(
      4,
      [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: 2 },
        { from: 2, to: 3, weight: 3 },
      ],
      0,
    );
    expect(r.distances).toEqual([0, 1, 3, 6]);
  });

  it('chooses shorter alternative', () => {
    const r = spfaShortestPath(
      3,
      [
        { from: 0, to: 1, weight: 5 },
        { from: 0, to: 2, weight: 2 },
        { from: 2, to: 1, weight: 1 },
      ],
      0,
    );
    expect(r.distances[1]).toBe(3);
    expect(r.predecessor[1]).toBe(2);
  });

  it('handles negative edges (no cycle)', () => {
    const r = spfaShortestPath(
      3,
      [
        { from: 0, to: 1, weight: 4 },
        { from: 0, to: 2, weight: 5 },
        { from: 1, to: 2, weight: -3 },
      ],
      0,
    );
    expect(r.negativeCycle).toBe(false);
    expect(r.distances[2]).toBe(1);
  });

  it('detects negative cycle', () => {
    const r = spfaShortestPath(
      3,
      [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: -1 },
        { from: 2, to: 1, weight: -1 },
      ],
      0,
    );
    expect(r.negativeCycle).toBe(true);
  });

  it('disconnected components', () => {
    const r = spfaShortestPath(
      4,
      [
        { from: 0, to: 1, weight: 7 },
        { from: 2, to: 3, weight: 9 },
      ],
      0,
    );
    expect(r.distances[1]).toBe(7);
    expect(r.distances[2]).toBe(Infinity);
    expect(r.distances[3]).toBe(Infinity);
  });

  it('predecessor reconstructs path', () => {
    const r = spfaShortestPath(
      4,
      [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 3, weight: 1 },
      ],
      0,
    );
    const path: number[] = [];
    let cur = 3;
    while (cur !== -1) {
      path.push(cur);
      cur = r.predecessor[cur];
    }
    path.reverse();
    expect(path).toEqual([0, 1, 2, 3]);
  });

  it('self-loop with positive weight ignored', () => {
    const r = spfaShortestPath(
      2,
      [
        { from: 0, to: 0, weight: 5 },
        { from: 0, to: 1, weight: 1 },
      ],
      0,
    );
    expect(r.distances).toEqual([0, 1]);
  });

  it('multiple parallel edges', () => {
    const r = spfaShortestPath(
      2,
      [
        { from: 0, to: 1, weight: 10 },
        { from: 0, to: 1, weight: 3 },
        { from: 0, to: 1, weight: 7 },
      ],
      0,
    );
    expect(r.distances[1]).toBe(3);
  });

  it('cycle without negative weight terminates', () => {
    const r = spfaShortestPath(
      3,
      [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: 1 },
        { from: 2, to: 0, weight: 1 },
      ],
      0,
    );
    expect(r.negativeCycle).toBe(false);
    expect(r.distances).toEqual([0, 1, 2]);
  });

  it('source not 0', () => {
    const r = spfaShortestPath(
      3,
      [
        { from: 0, to: 1, weight: 1 },
        { from: 1, to: 2, weight: 1 },
      ],
      1,
    );
    expect(r.distances).toEqual([Infinity, 0, 1]);
  });
});
