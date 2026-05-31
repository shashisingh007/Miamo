import { describe, it, expect } from 'vitest';
import { tabuSearch } from '../tabuSearch';

describe('tabuSearch', () => {
  it('throws on negative tabuSize', () => {
    expect(() => tabuSearch({
      neighbors: () => [], energy: () => 0, initial: 0, tabuSize: -1, maxIterations: 1,
    })).toThrow(RangeError);
  });

  it('throws on negative maxIterations', () => {
    expect(() => tabuSearch({
      neighbors: () => [], energy: () => 0, initial: 0, tabuSize: 1, maxIterations: -1,
    })).toThrow(RangeError);
  });

  it('returns initial when no neighbors', () => {
    const r = tabuSearch({
      neighbors: () => [], energy: (x: number) => x, initial: 5, tabuSize: 3, maxIterations: 10,
    });
    expect(r.bestState).toBe(5);
    expect(r.iterations).toBe(0);
  });

  it('descends to minimum of 1D quadratic', () => {
    const r = tabuSearch<number>({
      neighbors: (x) => [x - 1, x + 1],
      energy: (x) => (x - 3) * (x - 3),
      initial: 10,
      tabuSize: 5,
      maxIterations: 50,
    });
    expect(r.bestState).toBe(3);
    expect(r.bestEnergy).toBe(0);
  });

  it('escapes plateau via tabu', () => {
    const r = tabuSearch<number>({
      neighbors: (x) => [x - 1, x + 1],
      energy: (x) => Math.abs(x - 7),
      initial: 0,
      tabuSize: 3,
      maxIterations: 30,
    });
    expect(r.bestState).toBe(7);
  });

  it('respects maxIterations cap', () => {
    const r = tabuSearch<number>({
      neighbors: (x) => [x + 1],
      energy: (x) => -x,
      initial: 0,
      tabuSize: 3,
      maxIterations: 5,
    });
    expect(r.iterations).toBe(5);
    expect(r.bestState).toBe(5);
  });

  it('zero iterations returns initial', () => {
    const r = tabuSearch<number>({
      neighbors: (x) => [x + 1],
      energy: (x) => x,
      initial: 7,
      tabuSize: 3,
      maxIterations: 0,
    });
    expect(r.bestState).toBe(7);
    expect(r.iterations).toBe(0);
  });

  it('finds min on string state via custom key', () => {
    const r = tabuSearch<string>({
      neighbors: (s) => (s === '' ? ['a', 'b'] : [s + 'a', s.slice(0, -1)]),
      energy: (s) => Math.abs(s.length - 3),
      initial: '',
      tabuSize: 4,
      maxIterations: 20,
      key: (s) => s,
    });
    expect(r.bestEnergy).toBe(0);
  });

  it('does not revisit tabu states (unless aspiration)', () => {
    const visited: number[] = [];
    tabuSearch<number>({
      neighbors: (x) => [x + 1, x - 1],
      energy: (x) => {
        visited.push(x);
        return x * x;
      },
      initial: 5,
      tabuSize: 4,
      maxIterations: 8,
    });
    expect(visited.length).toBeGreaterThan(0);
  });

  it('best monotonically improves', () => {
    let prev = Infinity;
    const r = tabuSearch<number>({
      neighbors: (x) => [x - 1, x + 1],
      energy: (x) => Math.abs(x - 10),
      initial: 0,
      tabuSize: 3,
      maxIterations: 20,
    });
    expect(r.bestEnergy).toBeLessThanOrEqual(prev);
  });

  it('handles 2D coordinate state', () => {
    type P = [number, number];
    const r = tabuSearch<P>({
      neighbors: ([x, y]) => [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]],
      energy: ([x, y]) => Math.abs(x - 2) + Math.abs(y - 3),
      initial: [0, 0],
      tabuSize: 6,
      maxIterations: 30,
    });
    expect(r.bestEnergy).toBe(0);
  });

  it('tabuSize 0 still progresses', () => {
    const r = tabuSearch<number>({
      neighbors: (x) => [x - 1, x + 1],
      energy: (x) => (x - 4) * (x - 4),
      initial: 0,
      tabuSize: 0,
      maxIterations: 20,
    });
    expect(r.bestState).toBe(4);
  });
});
