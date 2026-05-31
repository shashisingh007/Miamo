import { describe, it, expect } from 'vitest';
import { longestCommonSubsequence, lcsLength } from '../longestCommonSubsequence';

describe('longestCommonSubsequence', () => {
  it('rejects type mismatch', () => {
    expect(() => longestCommonSubsequence('abc', [1, 2] as any)).toThrow(TypeError);
  });

  it('empty inputs', () => {
    expect(longestCommonSubsequence('', '')).toEqual({ length: 0, sequence: [] });
    expect(longestCommonSubsequence('abc', '')).toEqual({ length: 0, sequence: [] });
    expect(longestCommonSubsequence('', 'abc')).toEqual({ length: 0, sequence: [] });
  });

  it('identical strings', () => {
    const r = longestCommonSubsequence('hello', 'hello');
    expect(r.length).toBe(5);
    expect(r.sequence.join('')).toBe('hello');
  });

  it('disjoint strings', () => {
    const r = longestCommonSubsequence('abc', 'xyz');
    expect(r).toEqual({ length: 0, sequence: [] });
  });

  it('classic ABCBDAB / BDCAB => BCAB or BDAB', () => {
    const r = longestCommonSubsequence('ABCBDAB', 'BDCAB');
    expect(r.length).toBe(4);
    expect(['BCAB', 'BDAB']).toContain(r.sequence.join(''));
  });

  it('one is subsequence of the other', () => {
    const r = longestCommonSubsequence('ace', 'abcde');
    expect(r.length).toBe(3);
    expect(r.sequence.join('')).toBe('ace');
  });

  it('arrays of numbers', () => {
    const r = longestCommonSubsequence([1, 2, 3, 4, 5], [2, 4, 6, 4, 5]);
    expect(r.length).toBe(3);
    expect(r.sequence).toEqual([2, 4, 5]);
  });

  it('arrays empty', () => {
    expect(longestCommonSubsequence([], [1, 2])).toEqual({ length: 0, sequence: [] });
  });

  it('single matching char', () => {
    const r = longestCommonSubsequence('abc', 'xbz');
    expect(r.length).toBe(1);
    expect(r.sequence).toEqual(['b']);
  });

  it('all same char', () => {
    const r = longestCommonSubsequence('aaaa', 'aaa');
    expect(r.length).toBe(3);
    expect(r.sequence.join('')).toBe('aaa');
  });

  it('lcsLength matches', () => {
    expect(lcsLength('ABCBDAB', 'BDCAB')).toBe(4);
    expect(lcsLength('ace', 'abcde')).toBe(3);
    expect(lcsLength('', 'abc')).toBe(0);
  });

  it('lcsLength on arrays', () => {
    expect(lcsLength([1, 2, 3], [3, 2, 1])).toBe(1);
  });

  it('lcsLength rejects type mismatch', () => {
    expect(() => lcsLength('a', [1] as any)).toThrow(TypeError);
  });

  it('LCS is subsequence of both inputs', () => {
    const a = 'longest';
    const b = 'stone';
    const { sequence } = longestCommonSubsequence(a, b);
    const isSubseq = (s: string, arr: string[]): boolean => {
      let i = 0;
      for (const c of s) {
        if (i < arr.length && arr[i] === c) i += 1;
      }
      return i === arr.length;
    };
    expect(isSubseq(a, sequence as string[])).toBe(true);
    expect(isSubseq(b, sequence as string[])).toBe(true);
  });

  it('symmetric length', () => {
    const a = 'abcdefg';
    const b = 'aceg';
    expect(lcsLength(a, b)).toBe(lcsLength(b, a));
  });

  it('long random strings consistent with lcsLength', () => {
    const a = Array.from({ length: 100 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 4))).join('');
    const b = Array.from({ length: 100 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 4))).join('');
    const { length } = longestCommonSubsequence(a, b);
    expect(length).toBe(lcsLength(a, b));
  });

  it('case sensitive', () => {
    expect(lcsLength('abc', 'ABC')).toBe(0);
  });

  it('LCS of identical arrays equals array', () => {
    const r = longestCommonSubsequence([1, 2, 3], [1, 2, 3]);
    expect(r.sequence).toEqual([1, 2, 3]);
    expect(r.length).toBe(3);
  });
});
