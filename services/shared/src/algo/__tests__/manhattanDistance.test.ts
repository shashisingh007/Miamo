import { describe, it, expect } from 'vitest';
import { manhattanDistance } from '../manhattanDistance';

describe('manhattanDistance', () => {
  it('zero for identical', () => {
    expect(manhattanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('sum of abs diffs', () => {
    expect(manhattanDistance([0, 0], [3, 4])).toBe(7);
  });

  it('1D', () => {
    expect(manhattanDistance([5], [2])).toBe(3);
  });

  it('symmetric', () => {
    expect(manhattanDistance([1, 2, 3], [4, 5, 6])).toBe(
      manhattanDistance([4, 5, 6], [1, 2, 3])
    );
  });

  it('handles negatives', () => {
    expect(manhattanDistance([-1, -2], [1, 2])).toBe(6);
  });

  it('non-negative', () => {
    expect(manhattanDistance([1, 2], [3, 4])).toBeGreaterThan(0);
  });

  it('greater than or equal to euclidean', () => {
    const a = [3, 4];
    const b = [0, 0];
    expect(manhattanDistance(a, b)).toBeGreaterThanOrEqual(Math.sqrt(9 + 16));
  });

  it('triangle inequality', () => {
    const a = [0, 0];
    const b = [1, 1];
    const c = [2, 0];
    expect(manhattanDistance(a, c)).toBeLessThanOrEqual(
      manhattanDistance(a, b) + manhattanDistance(b, c) + 1e-12
    );
  });

  it('throws on length mismatch', () => {
    expect(() => manhattanDistance([1, 2], [1])).toThrow();
  });

  it('throws on empty', () => {
    expect(() => manhattanDistance([], [])).toThrow();
  });

  it('throws on NaN', () => {
    expect(() => manhattanDistance([NaN], [0])).toThrow();
  });

  it('throws on Infinity', () => {
    expect(() => manhattanDistance([0], [Infinity])).toThrow();
  });

  it('handles high dim', () => {
    const a = Array.from({ length: 100 }, () => 0);
    const b = Array.from({ length: 100 }, () => 2);
    expect(manhattanDistance(a, b)).toBe(200);
  });
});
