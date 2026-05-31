import { describe, it, expect } from 'vitest';
import { SegmentTreeMergePool } from '../segmentTreeMerge';

describe('SegmentTreeMergePool', () => {
  it('empty tree prefix returns 0', () => {
    const pool = new SegmentTreeMergePool(8);
    const t = pool.newTree();
    expect(pool.prefixSum(t, 7)).toBe(0);
  });

  it('point updates accumulate', () => {
    const pool = new SegmentTreeMergePool(8);
    const t = pool.newTree();
    pool.pointAdd(t, 2, 5);
    pool.pointAdd(t, 5, 3);
    expect(pool.prefixSum(t, 1)).toBe(0);
    expect(pool.prefixSum(t, 2)).toBe(5);
    expect(pool.prefixSum(t, 4)).toBe(5);
    expect(pool.prefixSum(t, 7)).toBe(8);
  });

  it('rangeSum works', () => {
    const pool = new SegmentTreeMergePool(8);
    const t = pool.newTree();
    pool.pointAdd(t, 1, 1);
    pool.pointAdd(t, 3, 2);
    pool.pointAdd(t, 5, 4);
    expect(pool.rangeSum(t, 0, 2)).toBe(1);
    expect(pool.rangeSum(t, 2, 5)).toBe(6);
    expect(pool.rangeSum(t, 6, 7)).toBe(0);
  });

  it('two trees independent', () => {
    const pool = new SegmentTreeMergePool(8);
    const a = pool.newTree();
    const b = pool.newTree();
    pool.pointAdd(a, 0, 1);
    pool.pointAdd(b, 0, 9);
    expect(pool.prefixSum(a, 0)).toBe(1);
    expect(pool.prefixSum(b, 0)).toBe(9);
  });

  it('merge sums two trees', () => {
    const pool = new SegmentTreeMergePool(8);
    const a = pool.newTree();
    const b = pool.newTree();
    pool.pointAdd(a, 1, 1);
    pool.pointAdd(a, 3, 2);
    pool.pointAdd(b, 1, 4);
    pool.pointAdd(b, 7, 5);
    pool.merge(a, b);
    expect(pool.prefixSum(a, 0)).toBe(0);
    expect(pool.prefixSum(a, 1)).toBe(5);
    expect(pool.prefixSum(a, 3)).toBe(7);
    expect(pool.prefixSum(a, 7)).toBe(12);
  });

  it('merge with empty tree', () => {
    const pool = new SegmentTreeMergePool(4);
    const a = pool.newTree();
    const b = pool.newTree();
    pool.pointAdd(a, 1, 7);
    pool.merge(a, b);
    expect(pool.prefixSum(a, 3)).toBe(7);
  });

  it('out-of-range pointAdd throws', () => {
    const pool = new SegmentTreeMergePool(4);
    const t = pool.newTree();
    expect(() => pool.pointAdd(t, 4, 1)).toThrow();
    expect(() => pool.pointAdd(t, -1, 1)).toThrow();
  });

  it('out-of-range prefix throws', () => {
    const pool = new SegmentTreeMergePool(4);
    const t = pool.newTree();
    expect(() => pool.prefixSum(t, 4)).toThrow();
  });

  it('invalid treeId throws', () => {
    const pool = new SegmentTreeMergePool(4);
    expect(() => pool.pointAdd(0, 0, 1)).toThrow();
  });

  it('cannot merge into self', () => {
    const pool = new SegmentTreeMergePool(4);
    const a = pool.newTree();
    expect(() => pool.merge(a, a)).toThrow();
  });

  it('treeCount tracks newTree calls', () => {
    const pool = new SegmentTreeMergePool(4);
    pool.newTree();
    pool.newTree();
    pool.newTree();
    expect(pool.treeCount()).toBe(3);
  });
});
