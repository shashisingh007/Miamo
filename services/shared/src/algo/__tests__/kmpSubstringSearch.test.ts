import { describe, it, expect } from 'vitest';
import { buildKmpFailure, kmpSearch, kmpSearchAll } from '../kmpSubstringSearch';

describe('kmpSubstringSearch', () => {
  it('buildKmpFailure on empty', () => {
    expect(Array.from(buildKmpFailure(''))).toEqual([]);
  });

  it('buildKmpFailure classic abacab', () => {
    expect(Array.from(buildKmpFailure('abacab'))).toEqual([0, 0, 1, 0, 1, 2]);
  });

  it('buildKmpFailure repeating', () => {
    expect(Array.from(buildKmpFailure('aaaa'))).toEqual([0, 1, 2, 3]);
  });

  it('search at start', () => {
    expect(kmpSearch('hello world', 'hello')).toBe(0);
  });

  it('search in middle', () => {
    expect(kmpSearch('xxxNEEDLExxx', 'NEEDLE')).toBe(3);
  });

  it('search at end', () => {
    expect(kmpSearch('abcdefg', 'efg')).toBe(4);
  });

  it('no match', () => {
    expect(kmpSearch('abcde', 'xyz')).toBe(-1);
  });

  it('empty pattern => -1 (no match by convention)', () => {
    expect(kmpSearch('abc', '')).toBe(-1);
  });

  it('pattern longer than text => -1', () => {
    expect(kmpSearch('abc', 'abcd')).toBe(-1);
  });

  it('searchAll non-overlapping by default? overlap default true', () => {
    expect(kmpSearchAll('aaaa', 'aa')).toEqual([0, 1, 2]);
  });

  it('searchAll overlap=false', () => {
    expect(kmpSearchAll('aaaa', 'aa', { overlap: false })).toEqual([0, 2]);
  });

  it('searchAll empty pattern => []', () => {
    expect(kmpSearchAll('abc', '')).toEqual([]);
  });

  it('searchAll respects limit=1', () => {
    expect(kmpSearchAll('xxxNEEDLExxxNEEDLE', 'NEEDLE', { limit: 1 })).toEqual([3]);
  });

  it('searchAll limit greater than matches returns all', () => {
    expect(kmpSearchAll('abcabcabc', 'abc', { limit: 10 })).toEqual([0, 3, 6]);
  });

  it('searchAll rejects bad limit', () => {
    expect(() => kmpSearchAll('abc', 'a', { limit: 0 })).toThrow();
    expect(() => kmpSearchAll('abc', 'a', { limit: -1 })).toThrow();
    expect(() => kmpSearchAll('abc', 'a', { limit: 1.5 })).toThrow();
  });

  it('non-string text throws', () => {
    expect(() => kmpSearchAll(123 as any, 'a')).toThrow();
  });

  it('non-string pattern throws', () => {
    expect(() => kmpSearchAll('abc', 123 as any)).toThrow();
  });

  it('matches at every position when pattern fits everywhere', () => {
    expect(kmpSearchAll('aaaaa', 'a')).toEqual([0, 1, 2, 3, 4]);
  });

  it('case sensitive', () => {
    expect(kmpSearch('Hello', 'hello')).toBe(-1);
  });

  it('unicode codeUnits', () => {
    expect(kmpSearch('café', 'fé')).toBe(2);
  });

  it('long pattern at end', () => {
    const t = 'x'.repeat(1000) + 'needle';
    expect(kmpSearch(t, 'needle')).toBe(1000);
  });

  it('worst-case repeating pattern', () => {
    const t = 'aaaaab';
    expect(kmpSearch(t, 'aaab')).toBe(2);
  });

  it('overlapping matches like "abab"', () => {
    expect(kmpSearchAll('abababa', 'aba')).toEqual([0, 2, 4]);
  });

  it('non-overlapping aba in abababa', () => {
    expect(kmpSearchAll('abababa', 'aba', { overlap: false })).toEqual([0, 4]);
  });

  it('match returns earliest index for kmpSearch', () => {
    expect(kmpSearch('abcabc', 'abc')).toBe(0);
  });
});
