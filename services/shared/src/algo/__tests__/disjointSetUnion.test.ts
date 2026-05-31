import { describe, it, expect } from 'vitest';
import { DisjointSetUnion, disjointSetUnion } from '../disjointSetUnion';

describe('disjointSetUnion', () => {
  it('factory returns instance', () => {
    expect(disjointSetUnion(5)).toBeInstanceOf(DisjointSetUnion);
  });

  it('initial state: each its own component', () => {
    const d = new DisjointSetUnion(5);
    for (let i = 0; i < 5; i += 1) expect(d.find(i)).toBe(i);
    expect(d.componentCount()).toBe(5);
  });

  it('union merges components', () => {
    const d = new DisjointSetUnion(4);
    expect(d.union(0, 1)).toBe(true);
    expect(d.connected(0, 1)).toBe(true);
    expect(d.connected(0, 2)).toBe(false);
    expect(d.componentCount()).toBe(3);
  });

  it('union of already-connected returns false', () => {
    const d = new DisjointSetUnion(3);
    d.union(0, 1);
    expect(d.union(1, 0)).toBe(false);
  });

  it('chain unions all connected', () => {
    const d = new DisjointSetUnion(5);
    d.union(0, 1);
    d.union(1, 2);
    d.union(2, 3);
    d.union(3, 4);
    expect(d.componentCount()).toBe(1);
    for (let i = 1; i < 5; i += 1) expect(d.connected(0, i)).toBe(true);
  });

  it('size returns initial n', () => {
    expect(new DisjointSetUnion(7).size()).toBe(7);
    expect(new DisjointSetUnion(0).size()).toBe(0);
  });

  it('find compresses path', () => {
    const d = new DisjointSetUnion(5);
    d.union(0, 1);
    d.union(1, 2);
    d.union(2, 3);
    const root = d.find(3);
    expect(d.find(0)).toBe(root);
    expect(d.find(1)).toBe(root);
    expect(d.find(2)).toBe(root);
  });

  it('throws on out-of-range', () => {
    const d = new DisjointSetUnion(3);
    expect(() => d.find(-1)).toThrow();
    expect(() => d.find(99)).toThrow();
    expect(() => d.find(1.5 as any)).toThrow();
    expect(() => d.union(0, 5)).toThrow();
  });

  it('throws on bad n', () => {
    expect(() => new DisjointSetUnion(-1)).toThrow();
    expect(() => new DisjointSetUnion(1.5)).toThrow();
  });

  it('builds spanning forest via repeated unions', () => {
    const d = new DisjointSetUnion(6);
    const edges: [number, number][] = [
      [0, 1], [1, 2], [3, 4], [2, 3], [4, 5],
    ];
    for (const [a, b] of edges) d.union(a, b);
    expect(d.componentCount()).toBe(1);
  });

  it('two disjoint trees stay disjoint', () => {
    const d = new DisjointSetUnion(6);
    d.union(0, 1);
    d.union(1, 2);
    d.union(3, 4);
    d.union(4, 5);
    expect(d.connected(2, 5)).toBe(false);
    expect(d.componentCount()).toBe(2);
  });
});
