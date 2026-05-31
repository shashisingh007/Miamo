import { describe, it, expect } from 'vitest';
import {
  levenshteinNormalized,
  levenshteinSimilarity,
} from '../levenshteinNormalized';

describe('levenshteinNormalized', () => {
  it('identical => 0', () => {
    expect(levenshteinNormalized('abc', 'abc')).toBe(0);
  });

  it('both empty => 0', () => {
    expect(levenshteinNormalized('', '')).toBe(0);
  });

  it('one empty => 1', () => {
    expect(levenshteinNormalized('abc', '')).toBe(1);
  });

  it('single substitution', () => {
    expect(levenshteinNormalized('abc', 'abd')).toBeCloseTo(1 / 3, 12);
  });

  it('single insertion', () => {
    expect(levenshteinNormalized('abc', 'abxc')).toBeCloseTo(1 / 4, 12);
  });

  it('single deletion', () => {
    expect(levenshteinNormalized('abcd', 'abc')).toBeCloseTo(1 / 4, 12);
  });

  it('completely different (same length)', () => {
    expect(levenshteinNormalized('abc', 'xyz')).toBe(1);
  });

  it('symmetric', () => {
    expect(levenshteinNormalized('kitten', 'sitting')).toBeCloseTo(
      levenshteinNormalized('sitting', 'kitten'),
      12
    );
  });

  it('classic kitten/sitting', () => {
    expect(levenshteinNormalized('kitten', 'sitting')).toBeCloseTo(3 / 7, 12);
  });

  it('bounded in [0, 1]', () => {
    const v = levenshteinNormalized('abc', 'xy');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('throws on non-string', () => {
    expect(() => levenshteinNormalized(1 as any, 'a')).toThrow();
  });

  it('similarity complementary', () => {
    expect(levenshteinSimilarity('abc', 'abd')).toBeCloseTo(
      1 - levenshteinNormalized('abc', 'abd'),
      12
    );
  });

  it('similarity identical => 1', () => {
    expect(levenshteinSimilarity('abc', 'abc')).toBe(1);
  });

  it('handles unicode codepoints (BMP)', () => {
    expect(levenshteinNormalized('café', 'cafe')).toBeCloseTo(1 / 4, 12);
  });
});
