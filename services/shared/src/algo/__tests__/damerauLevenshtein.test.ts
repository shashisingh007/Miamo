import { describe, it, expect } from 'vitest';
import {
  damerauLevenshteinDistance,
  damerauLevenshteinSimilarity,
} from '../damerauLevenshtein';

describe('damerauLevenshteinDistance', () => {
  it('identical strings => 0', () => {
    expect(damerauLevenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('empty a => |b|', () => {
    expect(damerauLevenshteinDistance('', 'abc')).toBe(3);
  });

  it('empty b => |a|', () => {
    expect(damerauLevenshteinDistance('abc', '')).toBe(3);
  });

  it('both empty => 0', () => {
    expect(damerauLevenshteinDistance('', '')).toBe(0);
  });

  it('single substitution => 1', () => {
    expect(damerauLevenshteinDistance('cat', 'cot')).toBe(1);
  });

  it('single insertion => 1', () => {
    expect(damerauLevenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('single deletion => 1', () => {
    expect(damerauLevenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('transposition (ab vs ba) => 1', () => {
    expect(damerauLevenshteinDistance('ab', 'ba')).toBe(1);
  });

  it('CA -> ABC (OSA distance) => 3', () => {
    expect(damerauLevenshteinDistance('ca', 'abc')).toBe(3);
  });

  it('classic kitten -> sitting => 3', () => {
    expect(damerauLevenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('TEALCKHE -> TACKLER >= 1', () => {
    expect(damerauLevenshteinDistance('TEAL', 'TALE')).toBeLessThanOrEqual(2);
  });

  it('symmetric', () => {
    expect(damerauLevenshteinDistance('abc', 'xyz')).toBe(damerauLevenshteinDistance('xyz', 'abc'));
  });

  it('transposition beats two substitutions', () => {
    const trans = damerauLevenshteinDistance('abcd', 'abdc');
    expect(trans).toBe(1);
  });
});

describe('damerauLevenshteinSimilarity', () => {
  it('identical strings => 1', () => {
    expect(damerauLevenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('both empty => 1', () => {
    expect(damerauLevenshteinSimilarity('', '')).toBe(1);
  });

  it('completely different => 0', () => {
    expect(damerauLevenshteinSimilarity('abc', 'xyz')).toBe(0);
  });

  it('one transposition out of 5 chars => 0.8', () => {
    expect(damerauLevenshteinSimilarity('abcde', 'abced')).toBeCloseTo(0.8, 5);
  });

  it('similarity in [0,1]', () => {
    const s = damerauLevenshteinSimilarity('kitten', 'sitting');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('empty vs non-empty => 0', () => {
    expect(damerauLevenshteinSimilarity('', 'abc')).toBe(0);
  });

  it('case-sensitive', () => {
    expect(damerauLevenshteinSimilarity('Hello', 'hello')).toBeLessThan(1);
  });
});
