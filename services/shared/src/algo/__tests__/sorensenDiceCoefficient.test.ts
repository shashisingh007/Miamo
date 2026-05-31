import { describe, it, expect } from 'vitest';
import {
  sorensenDiceCoefficient,
  sorensenDiceDistance,
} from '../sorensenDiceCoefficient';

describe('sorensenDiceCoefficient', () => {
  it('identical => 1', () => {
    expect(sorensenDiceCoefficient([1, 2, 3], [1, 2, 3])).toBe(1);
  });

  it('disjoint => 0', () => {
    expect(sorensenDiceCoefficient([1, 2], [3, 4])).toBe(0);
  });

  it('subset of size 2 in 4 => 2/3', () => {
    expect(sorensenDiceCoefficient([1, 2], [1, 2, 3, 4])).toBeCloseTo(2 / 3, 12);
  });

  it('symmetric', () => {
    const a = sorensenDiceCoefficient([1, 2, 3], [2, 3, 4]);
    const b = sorensenDiceCoefficient([2, 3, 4], [1, 2, 3]);
    expect(a).toBeCloseTo(b, 12);
  });

  it('handles strings', () => {
    expect(sorensenDiceCoefficient(['a', 'b'], ['b', 'c'])).toBeCloseTo(0.5, 12);
  });

  it('handles duplicates as set', () => {
    expect(sorensenDiceCoefficient([1, 1, 2], [1, 2])).toBe(1);
  });

  it('bounded in [0, 1]', () => {
    const v = sorensenDiceCoefficient([1, 2, 3], [3, 4, 5]);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on both empty', () => {
    expect(() => sorensenDiceCoefficient([], [])).toThrow();
  });

  it('one empty => 0', () => {
    expect(sorensenDiceCoefficient([1, 2], [])).toBe(0);
  });

  it('distance is 1 - coefficient', () => {
    expect(sorensenDiceDistance([1, 2], [2, 3])).toBeCloseTo(
      1 - sorensenDiceCoefficient([1, 2], [2, 3]),
      12
    );
  });

  it('distance identical => 0', () => {
    expect(sorensenDiceDistance([1, 2], [1, 2])).toBe(0);
  });

  it('distance disjoint => 1', () => {
    expect(sorensenDiceDistance([1, 2], [3, 4])).toBe(1);
  });

  it('handles large sets', () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const b = Array.from({ length: 100 }, (_, i) => i + 50);
    expect(sorensenDiceCoefficient(a, b)).toBeCloseTo((2 * 50) / 200, 12);
  });

  it('greater than or equal jaccard equivalent', () => {
    const v = sorensenDiceCoefficient([1, 2, 3], [2, 3, 4]);
    expect(v).toBeGreaterThan(0.5);
  });
});
