import { describe, it, expect } from 'vitest';
import { persistentSegmentTree, PersistentSegmentTree } from '../persistentSegmentTree';

describe('persistentSegmentTree', () => {
  it('factory + class', () => {
    expect(persistentSegmentTree([1, 2, 3]) instanceof PersistentSegmentTree).toBe(true);
  });

  it('initial query', () => {
    const t = persistentSegmentTree([1, 2, 3, 4, 5]);
    expect(t.query(0, 0, 4)).toBe(15);
    expect(t.query(0, 1, 3)).toBe(9);
  });

  it('update creates new version, old unchanged', () => {
    const t = persistentSegmentTree([1, 2, 3]);
    const v1 = t.update(0, 1, 100);
    expect(t.query(0, 0, 2)).toBe(6);
    expect(t.query(v1, 0, 2)).toBe(106);
    expect(v1).toBe(1);
  });

  it('chained updates produce independent versions', () => {
    const t = persistentSegmentTree([0, 0, 0]);
    const v1 = t.update(0, 0, 5);
    const v2 = t.update(v1, 2, 7);
    expect(t.query(0, 0, 2)).toBe(0);
    expect(t.query(v1, 0, 2)).toBe(5);
    expect(t.query(v2, 0, 2)).toBe(12);
  });

  it('size constructor', () => {
    const t = persistentSegmentTree(4);
    expect(t.query(0, 0, 3)).toBe(0);
    t.update(0, 0, 10);
    expect(t.query(1, 0, 3)).toBe(10);
  });

  it('versionCount grows', () => {
    const t = persistentSegmentTree([1, 2]);
    expect(t.versionCount()).toBe(1);
    t.update(0, 0, 1);
    expect(t.versionCount()).toBe(2);
  });

  it('throws on bad version', () => {
    const t = persistentSegmentTree([1]);
    expect(() => t.query(5, 0, 0)).toThrow();
    expect(() => t.update(5, 0, 1)).toThrow();
  });

  it('throws on bad index', () => {
    const t = persistentSegmentTree([1, 2]);
    expect(() => t.update(0, 5, 1)).toThrow();
    expect(() => t.update(0, -1, 1)).toThrow();
  });

  it('throws on bad range', () => {
    const t = persistentSegmentTree([1, 2, 3]);
    expect(() => t.query(0, -1, 1)).toThrow();
    expect(() => t.query(0, 0, 5)).toThrow();
    expect(() => t.query(0, 2, 1)).toThrow();
  });

  it('large workload', () => {
    const n = 50;
    const arr = new Array<number>(n).fill(0);
    const t = persistentSegmentTree(n);
    let v = 0;
    for (let i = 0; i < 100; i += 1) {
      const idx = Math.floor(Math.random() * n);
      const d = Math.floor(Math.random() * 10) - 5;
      arr[idx] += d;
      v = t.update(v, idx, d);
    }
    let s = 0;
    for (const x of arr) s += x;
    expect(t.query(v, 0, n - 1)).toBe(s);
  });

  it('throws on negative size', () => {
    expect(() => persistentSegmentTree(-1)).toThrow();
  });
});
