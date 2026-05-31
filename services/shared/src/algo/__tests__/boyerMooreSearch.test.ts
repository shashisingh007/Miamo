import { describe, it, expect } from 'vitest';
import { boyerMooreSearch, boyerMooreSearchAll } from '../boyerMooreSearch';

describe('boyerMooreSearch', () => {
  it('finds at start', () => {
    expect(boyerMooreSearch('hello world', 'hello')).toBe(0);
  });

  it('finds in middle', () => {
    expect(boyerMooreSearch('hello world', 'world')).toBe(6);
  });

  it('finds at end', () => {
    expect(boyerMooreSearch('abcdef', 'ef')).toBe(4);
  });

  it('returns -1 when not found', () => {
    expect(boyerMooreSearch('hello', 'xyz')).toBe(-1);
  });

  it('empty pattern returns 0', () => {
    expect(boyerMooreSearch('hello', '')).toBe(0);
  });

  it('pattern longer than text returns -1', () => {
    expect(boyerMooreSearch('hi', 'hello')).toBe(-1);
  });

  it('single char match', () => {
    expect(boyerMooreSearch('abcdef', 'd')).toBe(3);
  });

  it('full string match', () => {
    expect(boyerMooreSearch('abc', 'abc')).toBe(0);
  });

  it('repeated pattern returns first', () => {
    expect(boyerMooreSearch('ababab', 'ab')).toBe(0);
  });

  it('empty text non-empty pattern => -1', () => {
    expect(boyerMooreSearch('', 'a')).toBe(-1);
  });

  it('case sensitive', () => {
    expect(boyerMooreSearch('Hello', 'hello')).toBe(-1);
  });

  it('finds with skip', () => {
    expect(boyerMooreSearch('THIS IS A SIMPLE EXAMPLE', 'EXAMPLE')).toBe(17);
  });

  it('classic Knuth-Morris example', () => {
    expect(boyerMooreSearch('ABAAABCD', 'ABC')).toBe(4);
  });

  it('overlapping suffix-prefix', () => {
    expect(boyerMooreSearch('abcabcabc', 'abcabc')).toBe(0);
  });
});

describe('boyerMooreSearchAll', () => {
  it('finds all non-overlapping/overlapping occurrences', () => {
    expect(boyerMooreSearchAll('ababab', 'ab')).toEqual([0, 2, 4]);
  });

  it('returns [] for no match', () => {
    expect(boyerMooreSearchAll('hello', 'xyz')).toEqual([]);
  });

  it('returns [] for empty pattern', () => {
    expect(boyerMooreSearchAll('hello', '')).toEqual([]);
  });

  it('overlapping aaa pattern', () => {
    expect(boyerMooreSearchAll('aaaaa', 'aa')).toEqual([0, 1, 2, 3]);
  });

  it('finds single match list', () => {
    expect(boyerMooreSearchAll('hello world', 'world')).toEqual([6]);
  });

  it('finds all word occurrences', () => {
    expect(boyerMooreSearchAll('the cat and the dog and the bird', 'the')).toEqual([0, 12, 24]);
  });
});
