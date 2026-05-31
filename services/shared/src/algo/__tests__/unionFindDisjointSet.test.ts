import { describe, it, expect } from 'vitest';
import { UnionFindDisjointSet } from '../unionFindDisjointSet';

describe('UnionFindDisjointSet', () => {
  it('initial state: each element its own component', () => {
    const u = new UnionFindDisjointSet(5);
    expect(u.size).toBe(5);
    expect(u.components).toBe(5);
    for (let i = 0; i < 5; i++) expect(u.find(i)).toBe(i);
  });

  it('zero-size construction', () => {
    const u = new UnionFindDisjointSet(0);
    expect(u.size).toBe(0);
    expect(u.components).toBe(0);
  });

  it('rejects non-integer size', () => {
    expect(() => new UnionFindDisjointSet(1.5)).toThrow();
  });

  it('rejects negative size', () => {
    expect(() => new UnionFindDisjointSet(-1)).toThrow();
  });

  it('union joins two components', () => {
    const u = new UnionFindDisjointSet(5);
    expect(u.union(0, 1)).toBe(true);
    expect(u.connected(0, 1)).toBe(true);
    expect(u.components).toBe(4);
  });

  it('union of already-connected is no-op', () => {
    const u = new UnionFindDisjointSet(3);
    u.union(0, 1);
    expect(u.union(0, 1)).toBe(false);
    expect(u.components).toBe(2);
  });

  it('chain of unions', () => {
    const u = new UnionFindDisjointSet(5);
    u.union(0, 1);
    u.union(1, 2);
    u.union(2, 3);
    u.union(3, 4);
    expect(u.components).toBe(1);
    for (let i = 1; i < 5; i++) expect(u.connected(0, i)).toBe(true);
  });

  it('separate components stay disjoint', () => {
    const u = new UnionFindDisjointSet(6);
    u.union(0, 1);
    u.union(2, 3);
    u.union(4, 5);
    expect(u.components).toBe(3);
    expect(u.connected(0, 2)).toBe(false);
    expect(u.connected(2, 4)).toBe(false);
  });

  it('componentSize reflects merged size', () => {
    const u = new UnionFindDisjointSet(4);
    u.union(0, 1);
    u.union(2, 3);
    u.union(1, 2);
    expect(u.componentSize(0)).toBe(4);
    expect(u.componentSize(3)).toBe(4);
  });

  it('out-of-bounds find throws', () => {
    const u = new UnionFindDisjointSet(3);
    expect(() => u.find(3)).toThrow();
    expect(() => u.find(-1)).toThrow();
  });

  it('out-of-bounds union throws via find', () => {
    const u = new UnionFindDisjointSet(2);
    expect(() => u.union(0, 5)).toThrow();
  });

  it('path compression flattens chain', () => {
    const u = new UnionFindDisjointSet(5);
    u.union(0, 1);
    u.union(1, 2);
    u.union(2, 3);
    u.union(3, 4);
    const r = u.find(4);
    // After find(4), 4's parent should point directly at the root.
    expect(u.find(4)).toBe(r);
  });

  it('union by rank preserves shallow tree', () => {
    const u = new UnionFindDisjointSet(8);
    for (let i = 0; i < 7; i++) u.union(i, i + 1);
    expect(u.components).toBe(1);
  });

  it('connected reflexive', () => {
    const u = new UnionFindDisjointSet(3);
    expect(u.connected(2, 2)).toBe(true);
  });

  it('connected symmetric', () => {
    const u = new UnionFindDisjointSet(3);
    u.union(0, 2);
    expect(u.connected(0, 2)).toBe(true);
    expect(u.connected(2, 0)).toBe(true);
  });

  it('components decreases monotonically', () => {
    const u = new UnionFindDisjointSet(10);
    let prev = u.components;
    u.union(0, 1); expect(u.components).toBe(prev - 1); prev = u.components;
    u.union(2, 3); expect(u.components).toBe(prev - 1); prev = u.components;
    u.union(1, 2); expect(u.components).toBe(prev - 1);
  });

  it('large random unions terminate with single component when fully connected', () => {
    const N = 200;
    const u = new UnionFindDisjointSet(N);
    for (let i = 0; i < N - 1; i++) u.union(i, i + 1);
    expect(u.components).toBe(1);
    for (let i = 0; i < N; i++) expect(u.find(i)).toBe(u.find(0));
  });

  it('componentSize sums correctly across unions', () => {
    const u = new UnionFindDisjointSet(6);
    u.union(0, 1); // size 2
    u.union(2, 3); // size 2
    u.union(4, 5); // size 2
    u.union(0, 2); // size 4
    expect(u.componentSize(0)).toBe(4);
    expect(u.componentSize(4)).toBe(2);
  });

  it('size getter returns original count', () => {
    const u = new UnionFindDisjointSet(7);
    u.union(0, 1);
    u.union(2, 3);
    expect(u.size).toBe(7);
  });

  it('disjoint partitions counted correctly', () => {
    const u = new UnionFindDisjointSet(10);
    // 5 pairs
    for (let i = 0; i < 10; i += 2) u.union(i, i + 1);
    expect(u.components).toBe(5);
  });
});
