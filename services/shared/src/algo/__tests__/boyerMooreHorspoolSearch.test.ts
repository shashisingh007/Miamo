import { describe, it, expect } from 'vitest';
import { boyerMooreHorspoolSearch } from '../boyerMooreHorspoolSearch';

describe('boyerMooreHorspoolSearch', () => {
  it('rejects non-string', () => {
    expect(() => boyerMooreHorspoolSearch(42 as any, 'a')).toThrow(TypeError);
    expect(() => boyerMooreHorspoolSearch('a', 42 as any)).toThrow(TypeError);
  });

  it('empty pattern: returns every index', () => {
    expect(boyerMooreHorspoolSearch('abc', '')).toEqual([0, 1, 2, 3]);
  });

  it('empty text non-empty pattern: []', () => {
    expect(boyerMooreHorspoolSearch('', 'abc')).toEqual([]);
  });

  it('pattern longer than text: []', () => {
    expect(boyerMooreHorspoolSearch('abc', 'abcd')).toEqual([]);
  });

  it('single match', () => {
    expect(boyerMooreHorspoolSearch('hello world', 'world')).toEqual([6]);
  });

  it('multiple matches', () => {
    expect(boyerMooreHorspoolSearch('abababab', 'ab')).toEqual([0, 2, 4, 6]);
  });

  it('overlapping matches', () => {
    expect(boyerMooreHorspoolSearch('aaaa', 'aa')).toEqual([0, 1, 2]);
  });

  it('no match', () => {
    expect(boyerMooreHorspoolSearch('abcdef', 'xyz')).toEqual([]);
  });

  it('whole-text match', () => {
    expect(boyerMooreHorspoolSearch('exact', 'exact')).toEqual([0]);
  });

  it('case sensitive', () => {
    expect(boyerMooreHorspoolSearch('Hello', 'hello')).toEqual([]);
  });

  it('matches at end', () => {
    expect(boyerMooreHorspoolSearch('xyzabc', 'abc')).toEqual([3]);
  });

  it('matches at start and end', () => {
    expect(boyerMooreHorspoolSearch('abcxxxabc', 'abc')).toEqual([0, 6]);
  });

  it('long pattern', () => {
    const text = 'the quick brown fox jumps over the lazy dog';
    expect(boyerMooreHorspoolSearch(text, 'brown fox')).toEqual([10]);
  });

  it('single character pattern', () => {
    expect(boyerMooreHorspoolSearch('banana', 'a')).toEqual([1, 3, 5]);
  });

  it('matches naive on random strings', () => {
    const charset = 'ab';
    const rand = (n: number): string => {
      let s = '';
      for (let i = 0; i < n; i += 1) s += charset[Math.floor(Math.random() * charset.length)];
      return s;
    };
    for (let trial = 0; trial < 5; trial += 1) {
      const text = rand(200);
      const pat = rand(3);
      const naive: number[] = [];
      for (let i = 0; i + pat.length <= text.length; i += 1) {
        if (text.substr(i, pat.length) === pat) naive.push(i);
      }
      expect(boyerMooreHorspoolSearch(text, pat)).toEqual(naive);
    }
  });

  it('unicode strings (code unit basis)', () => {
    expect(boyerMooreHorspoolSearch('αβγδαβ', 'αβ')).toEqual([0, 4]);
  });

  it('pattern containing repeated chars', () => {
    expect(boyerMooreHorspoolSearch('xxaaaayy', 'aaa')).toEqual([2, 3]);
  });

  it('multiple non-overlapping matches with shift', () => {
    expect(boyerMooreHorspoolSearch('foofoofoo', 'foo')).toEqual([0, 3, 6]);
  });
});
