import { describe, it, expect } from 'vitest';
import {
  manacherLongestPalindrome,
  manacherAllPalindromeRadii,
} from '../manacherPalindrome';

describe('manacherLongestPalindrome', () => {
  it('empty', () => {
    expect(manacherLongestPalindrome('')).toEqual({ start: 0, length: 0, value: '' });
  });

  it('single char', () => {
    const r = manacherLongestPalindrome('a');
    expect(r.length).toBe(1);
    expect(r.value).toBe('a');
  });

  it('two same', () => {
    const r = manacherLongestPalindrome('aa');
    expect(r.length).toBe(2);
    expect(r.value).toBe('aa');
  });

  it('two diff', () => {
    const r = manacherLongestPalindrome('ab');
    expect(r.length).toBe(1);
  });

  it('odd palindrome racecar', () => {
    const r = manacherLongestPalindrome('racecar');
    expect(r.value).toBe('racecar');
    expect(r.length).toBe(7);
  });

  it('even palindrome abba', () => {
    const r = manacherLongestPalindrome('abba');
    expect(r.value).toBe('abba');
  });

  it('embedded palindrome', () => {
    const r = manacherLongestPalindrome('babad');
    expect(['bab', 'aba']).toContain(r.value);
    expect(r.length).toBe(3);
  });

  it('cbbd => bb', () => {
    const r = manacherLongestPalindrome('cbbd');
    expect(r.value).toBe('bb');
  });

  it('all same chars', () => {
    const r = manacherLongestPalindrome('aaaaa');
    expect(r.length).toBe(5);
  });

  it('no palindrome longer than 1', () => {
    const r = manacherLongestPalindrome('abcde');
    expect(r.length).toBe(1);
  });

  it('long mixed', () => {
    const r = manacherLongestPalindrome('forgeeksskeegfor');
    expect(r.value).toBe('geeksskeeg');
  });

  it('start index correct', () => {
    const text = 'abacdfgdcaba';
    const r = manacherLongestPalindrome(text);
    expect(text.slice(r.start, r.start + r.length)).toBe(r.value);
  });
});

describe('manacherAllPalindromeRadii', () => {
  it('empty', () => {
    expect(manacherAllPalindromeRadii('')).toEqual([]);
  });

  it('returns 2n+1 radii', () => {
    const r = manacherAllPalindromeRadii('abc');
    expect(r).toHaveLength(7);
  });

  it('aaa radii', () => {
    const r = manacherAllPalindromeRadii('aaa');
    expect(r[3]).toBeGreaterThanOrEqual(3);
  });
});
