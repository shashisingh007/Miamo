import { describe, it, expect } from 'vitest';
import { weightBalancedTree, WeightBalancedTree } from '../weightBalancedTree';

describe('weightBalancedTree', () => {
  it('factory + class', () => {
    expect(weightBalancedTree<number>() instanceof WeightBalancedTree).toBe(true);
  });

  it('empty size=0, no contains', () => {
    const t = weightBalancedTree<number>();
    expect(t.size()).toBe(0);
    expect(t.has(1)).toBe(false);
    expect(t.inOrder()).toEqual([]);
  });

  it('insert + has', () => {
    const t = weightBalancedTree<number>();
    [5, 3, 8, 1, 4, 7, 9].forEach((v) => t.insert(v));
    [5, 3, 8, 1, 4, 7, 9].forEach((v) => expect(t.has(v)).toBe(true));
    expect(t.has(2)).toBe(false);
  });

  it('duplicate insert ignored', () => {
    const t = weightBalancedTree<number>();
    t.insert(1);
    t.insert(1);
    expect(t.size()).toBe(1);
  });

  it('inOrder is sorted', () => {
    const t = weightBalancedTree<number>();
    [10, 3, 7, 1, 5, 8, 2, 9, 4, 6].forEach((v) => t.insert(v));
    expect(t.inOrder()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('delete existing returns true', () => {
    const t = weightBalancedTree<number>();
    [5, 3, 8, 1].forEach((v) => t.insert(v));
    expect(t.delete(3)).toBe(true);
    expect(t.has(3)).toBe(false);
    expect(t.size()).toBe(3);
  });

  it('delete missing returns false', () => {
    const t = weightBalancedTree<number>();
    t.insert(1);
    expect(t.delete(99)).toBe(false);
  });

  it('delete root', () => {
    const t = weightBalancedTree<number>();
    [5, 3, 8].forEach((v) => t.insert(v));
    expect(t.delete(5)).toBe(true);
    expect(t.inOrder()).toEqual([3, 8]);
  });

  it('custom comparator', () => {
    const t = weightBalancedTree<string>((a, b) => b.localeCompare(a));
    ['a', 'b', 'c'].forEach((v) => t.insert(v));
    expect(t.inOrder()).toEqual(['c', 'b', 'a']);
  });

  it('large insert preserves sort and size (stress balance)', () => {
    const t = weightBalancedTree<number>();
    const xs: number[] = [];
    for (let i = 0; i < 500; i += 1) xs.push(i);
    // insert in sorted order — would unbalance a naive BST
    xs.forEach((v) => t.insert(v));
    expect(t.size()).toBe(500);
    expect(t.inOrder()).toEqual(xs);
  });

  it('insert + delete mixed workload matches set', () => {
    const t = weightBalancedTree<number>();
    const ref = new Set<number>();
    for (let i = 0; i < 300; i += 1) {
      const v = Math.floor(Math.random() * 100);
      if (Math.random() < 0.7) {
        t.insert(v);
        ref.add(v);
      } else {
        const had = ref.has(v);
        expect(t.delete(v)).toBe(had);
        ref.delete(v);
      }
    }
    expect(t.inOrder()).toEqual([...ref].sort((a, b) => a - b));
  });
});
