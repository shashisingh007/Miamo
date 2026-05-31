import { describe, it, expect } from 'vitest';
import { bronKerboschCliques } from '../bronKerboschCliques';

describe('bronKerboschCliques', () => {
  it('empty graph => one empty clique', () => {
    expect(bronKerboschCliques([])).toEqual([[]]);
  });

  it('single isolated vertex', () => {
    expect(bronKerboschCliques([[]])).toEqual([[0]]);
  });

  it('two isolated vertices', () => {
    const c = bronKerboschCliques([[], []]);
    expect(c).toContainEqual([0]);
    expect(c).toContainEqual([1]);
    expect(c).toHaveLength(2);
  });

  it('single edge => one clique of 2', () => {
    const c = bronKerboschCliques([[1], [0]]);
    expect(c).toEqual([[0, 1]]);
  });

  it('triangle => one clique of 3', () => {
    const c = bronKerboschCliques([[1, 2], [0, 2], [0, 1]]);
    expect(c).toEqual([[0, 1, 2]]);
  });

  it('K4', () => {
    const adj = [[1, 2, 3], [0, 2, 3], [0, 1, 3], [0, 1, 2]];
    const c = bronKerboschCliques(adj);
    expect(c).toEqual([[0, 1, 2, 3]]);
  });

  it('two disjoint edges', () => {
    const adj = [[1], [0], [3], [2]];
    const c = bronKerboschCliques(adj);
    expect(c).toContainEqual([0, 1]);
    expect(c).toContainEqual([2, 3]);
    expect(c).toHaveLength(2);
  });

  it('path of 3 yields two 2-cliques', () => {
    const adj = [[1], [0, 2], [1]];
    const c = bronKerboschCliques(adj);
    expect(c).toContainEqual([0, 1]);
    expect(c).toContainEqual([1, 2]);
    expect(c).toHaveLength(2);
  });

  it('star graph K_{1,3}', () => {
    const adj = [[1, 2, 3], [0], [0], [0]];
    const c = bronKerboschCliques(adj);
    expect(c).toHaveLength(3);
    for (const x of c) expect(x).toContain(0);
  });

  it('triangle + pendant', () => {
    const adj = [[1, 2], [0, 2], [0, 1, 3], [2]];
    const c = bronKerboschCliques(adj);
    expect(c).toContainEqual([0, 1, 2]);
    expect(c).toContainEqual([2, 3]);
  });

  it('cliques sorted by size descending', () => {
    const adj = [[1, 2], [0, 2], [0, 1, 3], [2]];
    const c = bronKerboschCliques(adj);
    expect(c[0].length).toBeGreaterThanOrEqual(c[c.length - 1].length);
  });

  it('symmetric edges normalized', () => {
    const adj = [[1, 2], [], []];
    const c = bronKerboschCliques(adj);
    expect(c).toContainEqual([0, 1]);
    expect(c).toContainEqual([0, 2]);
  });

  it('ignores self-loops', () => {
    const adj = [[0, 1], [0]];
    const c = bronKerboschCliques(adj);
    expect(c).toEqual([[0, 1]]);
  });

  it('K5 single 5-clique', () => {
    const n = 5;
    const adj: number[][] = [];
    for (let i = 0; i < n; i++) {
      const r: number[] = [];
      for (let j = 0; j < n; j++) if (i !== j) r.push(j);
      adj.push(r);
    }
    expect(bronKerboschCliques(adj)).toEqual([[0, 1, 2, 3, 4]]);
  });
});
