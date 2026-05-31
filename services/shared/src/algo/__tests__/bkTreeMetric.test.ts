import { describe, it, expect } from 'vitest';
import { BkTreeMetric, hammingDistance } from '../bkTreeMetric';

describe('BkTreeMetric', () => {
  it('empty has size 0', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    expect(t.size).toBe(0);
    expect(t.search('abc', 1)).toEqual([]);
  });

  it('single insert', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    t.add('abc');
    expect(t.size).toBe(1);
    expect(t.search('abc', 0)).toEqual([{ item: 'abc', distance: 0 }]);
  });

  it('finds within threshold', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    ['abc', 'abd', 'abe', 'xyz'].forEach((w) => t.add(w));
    const res = t.search('abc', 1);
    const items = res.map((r) => r.item).sort();
    expect(items).toEqual(['abc', 'abd', 'abe']);
  });

  it('threshold 0 returns only exact', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    ['cat', 'bat', 'rat'].forEach((w) => t.add(w));
    const res = t.search('cat', 0);
    expect(res).toEqual([{ item: 'cat', distance: 0 }]);
  });

  it('threshold large returns all', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    ['cat', 'bat', 'rat'].forEach((w) => t.add(w));
    expect(t.search('cat', 3).length).toBe(3);
  });

  it('results sorted by distance', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    ['cat', 'bat', 'baa'].forEach((w) => t.add(w));
    const res = t.search('cat', 2);
    expect(res[0].distance).toBeLessThanOrEqual(res[1].distance);
    expect(res[1].distance).toBeLessThanOrEqual(res[2].distance);
  });

  it('throws on negative threshold', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    expect(() => t.search('x', -1)).toThrow(RangeError);
  });

  it('throws on non-finite threshold', () => {
    const t = new BkTreeMetric<string>(hammingDistance);
    expect(() => t.search('x', NaN)).toThrow(RangeError);
  });

  it('throws when metric returns negative', () => {
    const t = new BkTreeMetric<number>(() => -1);
    t.add(1);
    expect(() => t.add(2)).toThrow(TypeError);
  });

  it('handles integer metric on numbers', () => {
    const t = new BkTreeMetric<number>((a, b) => Math.abs(a - b));
    [10, 20, 30, 40].forEach((n) => t.add(n));
    const res = t.search(25, 5);
    const items = res.map((r) => r.item).sort((a, b) => a - b);
    expect(items).toEqual([20, 30]);
  });

  it('many items', () => {
    const t = new BkTreeMetric<number>((a, b) => Math.abs(a - b));
    for (let i = 0; i < 100; i += 1) t.add(i);
    expect(t.size).toBe(100);
    const res = t.search(50, 3);
    expect(res.length).toBe(7);
  });
});

describe('hammingDistance', () => {
  it('equal strings => 0', () => {
    expect(hammingDistance('hello', 'hello')).toBe(0);
  });

  it('single diff', () => {
    expect(hammingDistance('hello', 'hxllo')).toBe(1);
  });

  it('all diff', () => {
    expect(hammingDistance('aaa', 'bbb')).toBe(3);
  });

  it('throws on different lengths', () => {
    expect(() => hammingDistance('abc', 'abcd')).toThrow(RangeError);
  });
});
