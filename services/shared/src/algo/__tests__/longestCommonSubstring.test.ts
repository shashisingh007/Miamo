import { describe, it, expect } from 'vitest';
import {
  longestCommonSubstring,
  longestCommonSubstringLength,
} from '../longestCommonSubstring';

describe('longestCommonSubstring', () => {
  it('identical full match', () => {
    expect(longestCommonSubstring('abc', 'abc')).toBe('abc');
    expect(longestCommonSubstringLength('abc', 'abc')).toBe(3);
  });

  it('disjoint => empty', () => {
    expect(longestCommonSubstring('abc', 'xyz')).toBe('');
    expect(longestCommonSubstringLength('abc', 'xyz')).toBe(0);
  });

  it('classic example', () => {
    expect(longestCommonSubstring('abcdef', 'zcdex')).toBe('cde');
  });

  it('empty inputs => empty', () => {
    expect(longestCommonSubstring('', '')).toBe('');
    expect(longestCommonSubstring('abc', '')).toBe('');
    expect(longestCommonSubstring('', 'abc')).toBe('');
  });

  it('substring is contiguous (vs subsequence)', () => {
    expect(longestCommonSubstringLength('abcde', 'aXbXcXdXe')).toBe(1);
  });

  it('symmetric length', () => {
    expect(longestCommonSubstringLength('hello', 'world')).toBe(
      longestCommonSubstringLength('world', 'hello')
    );
  });

  it('throws on non-string a', () => {
    expect(() => longestCommonSubstring(1 as any, 'a')).toThrow();
  });

  it('throws on non-string b', () => {
    expect(() => longestCommonSubstring('a', 2 as any)).toThrow();
  });

  it('finds longest of multiple equal-length matches', () => {
    expect(longestCommonSubstringLength('abcXYabc', 'YYabc')).toBe(4);
  });

  it('handles repeated chars', () => {
    expect(longestCommonSubstring('aaaa', 'aaa')).toBe('aaa');
  });

  it('handles unicode BMP', () => {
    expect(longestCommonSubstring('café', 'cafestreet')).toBe('caf');
  });

  it('length lengthOnly variant agrees', () => {
    expect(longestCommonSubstringLength('abcdef', 'zcdex')).toBe(3);
  });

  it('length bounded by min input length', () => {
    expect(longestCommonSubstringLength('abc', 'abcdef')).toBeLessThanOrEqual(3);
  });
});
