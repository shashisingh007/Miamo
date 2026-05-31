import { describe, it, expect } from 'vitest';
import {
  sokalSneathDistance,
  sokalSneathSimilarity,
} from '../sokalSneathDistance';

describe('sokalSneathDistance', () => {
  it('identical => 0', () => {
    expect(sokalSneathDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('disjoint => 1', () => {
    expect(sokalSneathDistance([1, 2], [3, 4])).toBe(1);
  });

  it('half overlap matches formula', () => {
    // A={1,2,3}, B={1,2,4}: inter=2, onlyA=1, onlyB=1; num=4, den=2+4=6 => 2/3
    expect(sokalSneathDistance([1, 2, 3], [1, 2, 4])).toBeCloseTo(2 / 3, 12);
  });

  it('symmetric', () => {
    const a = sokalSneathDistance([1, 2, 3], [2, 3, 4]);
    const b = sokalSneathDistance([2, 3, 4], [1, 2, 3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('handles strings', () => {
    // inter=1, onlyA=1, onlyB=1; num=4, den=1+4=5 => 4/5
    expect(sokalSneathDistance(['a', 'b'], ['a', 'c'])).toBeCloseTo(4 / 5, 12);
  });

  it('handles duplicates as set', () => {
    expect(sokalSneathDistance([1, 1, 2], [1, 2])).toBe(0);
  });

  it('bounded in [0, 1]', () => {
    const v = sokalSneathDistance([1, 2, 3], [3, 4, 5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on both empty', () => {
    expect(() => sokalSneathDistance([], [])).toThrow();
  });

  it('one empty => 1', () => {
    expect(sokalSneathDistance([1, 2], [])).toBe(1);
  });

  it('similarity complementary', () => {
    expect(sokalSneathSimilarity([1, 2, 3], [1, 2, 4])).toBeCloseTo(
      1 - sokalSneathDistance([1, 2, 3], [1, 2, 4]),
      12
    );
  });

  it('similarity identical => 1', () => {
    expect(sokalSneathSimilarity([1, 2], [1, 2])).toBe(1);
  });

  it('similarity disjoint => 0', () => {
    expect(sokalSneathSimilarity([1, 2], [3, 4])).toBe(0);
  });

  it('larger penalty than jaccard for same diff', () => {
    // jaccard for {1,2,3} vs {1,2,4} = 2/4 = 0.5; sokal-sneath should be larger
    expect(sokalSneathDistance([1, 2, 3], [1, 2, 4])).toBeGreaterThan(0.5);
  });

  it('handles large sets', () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const b = Array.from({ length: 100 }, (_, i) => i + 50);
    // inter=50, onlyA=50, onlyB=50; num=200, den=50+200=250 => 0.8
    expect(sokalSneathDistance(a, b)).toBeCloseTo(0.8, 12);
  });
});
