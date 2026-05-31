import { describe, it, expect } from 'vitest';
import { htreeMatching, hopcroftKarpMatching } from '../htreeMatching';

describe('htreeMatching (Hopcroft-Karp)', () => {
  it('empty graph', () => {
    const r = htreeMatching(0, 0, []);
    expect(r.size).toBe(0);
    expect(r.matchLeft).toEqual([]);
  });

  it('single edge matched', () => {
    const r = htreeMatching(1, 1, [[0]]);
    expect(r.size).toBe(1);
    expect(r.matchLeft[0]).toBe(0);
    expect(r.matchRight[0]).toBe(0);
  });

  it('perfect matching on n=3', () => {
    const r = htreeMatching(3, 3, [[0, 1], [1, 2], [0, 2]]);
    expect(r.size).toBe(3);
  });

  it('partial matching', () => {
    const r = htreeMatching(3, 2, [[0], [0], [1]]);
    expect(r.size).toBe(2);
  });

  it('no edges => 0', () => {
    const r = htreeMatching(3, 3, [[], [], []]);
    expect(r.size).toBe(0);
    expect(r.matchLeft).toEqual([-1, -1, -1]);
  });

  it('bipartite K_{3,3}', () => {
    const adj = [
      [0, 1, 2],
      [0, 1, 2],
      [0, 1, 2],
    ];
    expect(htreeMatching(3, 3, adj).size).toBe(3);
  });

  it('unequal sides', () => {
    const r = htreeMatching(2, 5, [[0, 1, 2], [3, 4]]);
    expect(r.size).toBe(2);
  });

  it('augmenting path needed', () => {
    // left 0 -> [0], left 1 -> [0, 1], left 2 -> [1]
    // greedy can match 0-0 then fail 2; HK finds size 3
    const r = htreeMatching(3, 2, [[0], [0, 1], [1]]);
    expect(r.size).toBe(2);
  });

  it('alias htreeMatching === hopcroftKarpMatching', () => {
    expect(htreeMatching(1, 1, [[0]]).size).toBe(hopcroftKarpMatching(1, 1, [[0]]).size);
  });

  it('throws on bad sizes', () => {
    expect(() => htreeMatching(-1, 1, [])).toThrow();
    expect(() => htreeMatching(1, -1, [[0]])).toThrow();
    expect(() => htreeMatching(2, 2, [[0]])).toThrow();
  });

  it('pair consistency', () => {
    const r = htreeMatching(4, 4, [[0, 1], [1, 2], [2, 3], [3, 0]]);
    for (let u = 0; u < 4; u += 1) {
      const v = r.matchLeft[u];
      if (v !== -1) expect(r.matchRight[v]).toBe(u);
    }
  });
});
