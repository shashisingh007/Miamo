import { describe, it, expect } from 'vitest';
import { tarjanStronglyConnected } from '../tarjanStronglyConnected';

function normalize(c: number[][]): number[][] {
  return c.map((g) => [...g].sort((a, b) => a - b)).sort((a, b) => a[0] - b[0]);
}

describe('tarjanStronglyConnected', () => {
  it('empty graph', () => {
    expect(tarjanStronglyConnected([])).toEqual([]);
  });

  it('single node', () => {
    expect(tarjanStronglyConnected([[]])).toEqual([[0]]);
  });

  it('two-node cycle', () => {
    expect(normalize(tarjanStronglyConnected([[1], [0]]))).toEqual([[0, 1]]);
  });

  it('two disjoint nodes', () => {
    const c = tarjanStronglyConnected([[], []]);
    expect(c).toHaveLength(2);
  });

  it('DAG yields singleton components', () => {
    const c = tarjanStronglyConnected([[1, 2], [3], [3], []]);
    expect(c).toHaveLength(4);
  });

  it('classic textbook example', () => {
    const g = [
      [1],
      [2, 4, 5],
      [3, 6],
      [2, 7],
      [0, 5],
      [6],
      [5],
      [3, 6],
    ];
    const c = normalize(tarjanStronglyConnected(g));
    expect(c).toEqual([[0, 1, 4], [2, 3, 7], [5, 6]]);
  });

  it('self-loop creates 1-node SCC', () => {
    const c = tarjanStronglyConnected([[0]]);
    expect(c).toEqual([[0]]);
  });

  it('three-node cycle', () => {
    expect(normalize(tarjanStronglyConnected([[1], [2], [0]]))).toEqual([[0, 1, 2]]);
  });

  it('partition into two cycles', () => {
    const g = [[1], [0], [3], [2]];
    expect(normalize(tarjanStronglyConnected(g))).toEqual([[0, 1], [2, 3]]);
  });

  it('every node appears exactly once', () => {
    const g = [[1, 2], [3], [3], [0], [5], []];
    const c = tarjanStronglyConnected(g);
    const seen = new Set<number>();
    for (const comp of c) for (const v of comp) seen.add(v);
    expect(seen.size).toBe(6);
  });

  it('throws on out-of-bounds edge target', () => {
    expect(() => tarjanStronglyConnected([[5]])).toThrow(RangeError);
  });

  it('iterative implementation handles deep linear chain', () => {
    const n = 1000;
    const g: number[][] = [];
    for (let i = 0; i < n; i++) g.push(i < n - 1 ? [i + 1] : []);
    const c = tarjanStronglyConnected(g);
    expect(c).toHaveLength(n);
  });

  it('big cycle returns single SCC', () => {
    const n = 500;
    const g: number[][] = [];
    for (let i = 0; i < n; i++) g.push([(i + 1) % n]);
    const c = tarjanStronglyConnected(g);
    expect(c).toHaveLength(1);
    expect(c[0]).toHaveLength(n);
  });

  it('disconnected mixed graph', () => {
    const g = [[1], [0], [], [4], [3]];
    const c = normalize(tarjanStronglyConnected(g));
    expect(c).toEqual([[0, 1], [2], [3, 4]]);
  });

  it('star graph yields singletons', () => {
    const g = [[1, 2, 3, 4], [], [], [], []];
    expect(tarjanStronglyConnected(g)).toHaveLength(5);
  });

  it('parallel edges still single SCC for cycle', () => {
    const g = [[1, 1], [0]];
    expect(normalize(tarjanStronglyConnected(g))).toEqual([[0, 1]]);
  });
});
