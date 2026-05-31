import { describe, it, expect } from 'vitest';
import { jaccardSimilarity, jaccardDistance } from '../jaccardSimilarity';

describe('jaccardSimilarity', () => {
  it('identical => 1', () => {
    expect(jaccardSimilarity([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it('disjoint => 0', () => {
    expect(jaccardSimilarity([1, 2], [3, 4])).toBe(0);
  });

  it('subset', () => {
    expect(jaccardSimilarity([1, 2], [1, 2, 3, 4])).toBe(0.5);
  });

  it('symmetric', () => {
    const a = jaccardSimilarity([1, 2, 3], [2, 3, 4]);
    const b = jaccardSimilarity([2, 3, 4], [1, 2, 3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('handles strings', () => {
    expect(jaccardSimilarity(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3, 12);
  });

  it('handles duplicates as set', () => {
    expect(jaccardSimilarity([1, 1, 2], [1, 2])).toBe(1);
  });

  it('bounded in [0, 1]', () => {
    const v = jaccardSimilarity([1, 2, 3], [3, 4, 5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on both empty', () => {
    expect(() => jaccardSimilarity([], [])).toThrow();
  });

  it('one empty => 0', () => {
    expect(jaccardSimilarity([1, 2], [])).toBe(0);
  });

  it('jaccardDistance is 1 - similarity', () => {
    expect(jaccardDistance([1, 2], [2, 3])).toBeCloseTo(
      1 - jaccardSimilarity([1, 2], [2, 3]),
      12
    );
  });

  it('jaccardDistance identical => 0', () => {
    expect(jaccardDistance([1, 2], [1, 2])).toBe(0);
  });

  it('jaccardDistance disjoint => 1', () => {
    expect(jaccardDistance([1, 2], [3, 4])).toBe(1);
  });

  it('handles large sets', () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const b = Array.from({ length: 100 }, (_, i) => i + 50);
    expect(jaccardSimilarity(a, b)).toBeCloseTo(50 / 150, 12);
  });

  it('triangle inequality on distance', () => {
    const a = jaccardDistance([1, 2], [2, 3]);
    const b = jaccardDistance([2, 3], [3, 4]);
    const c = jaccardDistance([1, 2], [3, 4]);
    expect(a + b).toBeGreaterThanOrEqual(c - 1e-12);
  });
});
