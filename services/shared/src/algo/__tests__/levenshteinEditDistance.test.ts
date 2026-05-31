import { describe, it, expect } from 'vitest';
import {
  levenshteinDistance,
  levenshteinSimilarity,
  isWithinLevenshtein,
} from '../levenshteinEditDistance';

describe('levenshteinEditDistance', () => {
  it('identical strings => 0', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('empty vs string => length', () => {
    expect(levenshteinDistance('', 'abc')).toBe(3);
    expect(levenshteinDistance('abc', '')).toBe(3);
  });

  it('both empty => 0', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('single substitution', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('single insertion', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('single deletion', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('classic "kitten" → "sitting" = 3', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('"Saturday" → "Sunday" = 3', () => {
    expect(levenshteinDistance('Saturday', 'Sunday')).toBe(3);
  });

  it('case-sensitive by default', () => {
    expect(levenshteinDistance('Cat', 'cat')).toBe(1);
  });

  it('caseSensitive=false', () => {
    expect(levenshteinDistance('Cat', 'cat', { caseSensitive: false })).toBe(0);
  });

  it('throws on non-string', () => {
    expect(() => levenshteinDistance(1 as any, 'a')).toThrow();
  });

  it('maxDistance early-exit returns >threshold value', () => {
    const d = levenshteinDistance('abc', 'xyz', { maxDistance: 1 });
    expect(d).toBe(2);
  });

  it('maxDistance does not affect under-threshold result', () => {
    expect(levenshteinDistance('cat', 'cot', { maxDistance: 10 })).toBe(1);
  });

  it('unicode chars (no normalization)', () => {
    expect(levenshteinDistance('café', 'cafe')).toBe(1);
  });

  it('symmetric', () => {
    expect(levenshteinDistance('aaa', 'aab')).toBe(levenshteinDistance('aab', 'aaa'));
  });

  it('handles longer strings', () => {
    const a = 'a'.repeat(200);
    const b = 'a'.repeat(190) + 'b'.repeat(10);
    expect(levenshteinDistance(a, b)).toBe(10);
  });

  it('levenshteinSimilarity identical = 1', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('levenshteinSimilarity empty/empty = 1', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('levenshteinSimilarity bounded [0,1]', () => {
    const s = levenshteinSimilarity('abcdef', 'xyz');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('levenshteinSimilarity completely different = 0', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBe(0);
  });

  it('isWithinLevenshtein within threshold', () => {
    expect(isWithinLevenshtein('kitten', 'sitten', 1)).toBe(true);
  });

  it('isWithinLevenshtein outside threshold', () => {
    expect(isWithinLevenshtein('kitten', 'sitting', 2)).toBe(false);
  });

  it('isWithinLevenshtein threshold 0 = exact', () => {
    expect(isWithinLevenshtein('a', 'a', 0)).toBe(true);
    expect(isWithinLevenshtein('a', 'b', 0)).toBe(false);
  });

  it('isWithinLevenshtein rejects bad threshold', () => {
    expect(() => isWithinLevenshtein('a', 'a', -1)).toThrow();
    expect(() => isWithinLevenshtein('a', 'a', 1.5)).toThrow();
  });
});
