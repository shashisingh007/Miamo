import { describe, it, expect } from 'vitest';
import { aStarPathfind } from '../aStarPathfind';

const zero = () => 0;

describe('aStarPathfind', () => {
  it('empty graph returns null', () => {
    expect(aStarPathfind([], 0, 0, zero)).toBe(null);
  });

  it('start === goal returns trivial path', () => {
    const r = aStarPathfind([[]], 0, 0, zero);
    expect(r).toEqual({ path: [0], cost: 0 });
  });

  it('simple chain finds shortest path', () => {
    const g = [
      [{ to: 1, cost: 1 }],
      [{ to: 2, cost: 1 }],
      [],
    ];
    const r = aStarPathfind(g, 0, 2, zero);
    expect(r).toEqual({ path: [0, 1, 2], cost: 2 });
  });

  it('returns null when unreachable', () => {
    const g = [[{ to: 1, cost: 1 }], [], []];
    expect(aStarPathfind(g, 0, 2, zero)).toBe(null);
  });

  it('picks cheaper alternate path', () => {
    const g = [
      [{ to: 1, cost: 10 }, { to: 2, cost: 1 }],
      [],
      [{ to: 1, cost: 2 }],
    ];
    const r = aStarPathfind(g, 0, 1, zero);
    expect(r!.cost).toBe(3);
    expect(r!.path).toEqual([0, 2, 1]);
  });

  it('admissible heuristic still finds optimum', () => {
    const g = [
      [{ to: 1, cost: 10 }, { to: 2, cost: 1 }],
      [],
      [{ to: 1, cost: 2 }],
    ];
    const h = (n: number) => (n === 1 ? 0 : 1);
    const r = aStarPathfind(g, 0, 1, h);
    expect(r!.cost).toBe(3);
  });

  it('throws on negative edge cost', () => {
    const g = [[{ to: 1, cost: -1 }], []];
    expect(() => aStarPathfind(g, 0, 1, zero)).toThrow(RangeError);
  });

  it('throws on negative heuristic', () => {
    const g = [[{ to: 1, cost: 1 }], []];
    expect(() => aStarPathfind(g, 0, 1, () => -1)).toThrow(RangeError);
  });

  it('throws on out-of-bounds start', () => {
    expect(() => aStarPathfind([[]], 5, 0, zero)).toThrow(RangeError);
  });

  it('throws on out-of-bounds goal', () => {
    expect(() => aStarPathfind([[]], 0, 5, zero)).toThrow(RangeError);
  });

  it('handles diamond DAG', () => {
    const g = [
      [{ to: 1, cost: 1 }, { to: 2, cost: 4 }],
      [{ to: 2, cost: 2 }, { to: 3, cost: 5 }],
      [{ to: 3, cost: 1 }],
      [],
    ];
    const r = aStarPathfind(g, 0, 3, zero);
    expect(r!.cost).toBe(4);
    expect(r!.path).toEqual([0, 1, 2, 3]);
  });

  it('reaches goal with non-trivial heuristic', () => {
    const g = [
      [{ to: 1, cost: 1 }, { to: 2, cost: 2 }],
      [{ to: 3, cost: 5 }],
      [{ to: 3, cost: 2 }],
      [],
    ];
    const h = (n: number) => (n === 3 ? 0 : 1);
    const r = aStarPathfind(g, 0, 3, h);
    expect(r!.cost).toBe(4);
  });

  it('graph with self-loops still terminates', () => {
    const g = [[{ to: 0, cost: 1 }, { to: 1, cost: 2 }], []];
    const r = aStarPathfind(g, 0, 1, zero);
    expect(r!.cost).toBe(2);
  });

  it('throws on out-of-bounds edge target', () => {
    const g = [[{ to: 9, cost: 1 }], []];
    expect(() => aStarPathfind(g, 0, 1, zero)).toThrow(RangeError);
  });

  it('returns first-found optimal path for cyclic graph', () => {
    const g = [
      [{ to: 1, cost: 1 }],
      [{ to: 2, cost: 1 }],
      [{ to: 0, cost: 1 }, { to: 3, cost: 1 }],
      [],
    ];
    const r = aStarPathfind(g, 0, 3, zero);
    expect(r!.cost).toBe(3);
    expect(r!.path).toEqual([0, 1, 2, 3]);
  });

  it('fractional costs', () => {
    const g = [[{ to: 1, cost: 0.5 }], [{ to: 2, cost: 0.25 }], []];
    const r = aStarPathfind(g, 0, 2, zero);
    expect(r!.cost).toBeCloseTo(0.75, 10);
  });
});
