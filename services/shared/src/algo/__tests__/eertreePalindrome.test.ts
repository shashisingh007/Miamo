import { describe, it, expect } from 'vitest';
import { eertreePalindrome, Eertree } from '../eertreePalindrome';

describe('eertreePalindrome', () => {
  it('empty has 0 unique palindromes', () => {
    expect(eertreePalindrome().uniquePalindromeCount()).toBe(0);
  });

  it('single char => 1', () => {
    const t = eertreePalindrome();
    t.add('a');
    expect(t.uniquePalindromeCount()).toBe(1);
    expect(t.palindromes()).toEqual(['a']);
  });

  it('all-same characters create n palindromes', () => {
    const t = eertreePalindrome();
    t.addString('aaaa');
    expect(t.uniquePalindromeCount()).toBe(4);
    expect(t.palindromes().sort()).toEqual(['a', 'aa', 'aaa', 'aaaa']);
  });

  it('counts "abba" palindromes', () => {
    const t = eertreePalindrome();
    t.addString('abba');
    // distinct palindromes: a, b, bb, abba
    expect(t.uniquePalindromeCount()).toBe(4);
    expect(new Set(t.palindromes())).toEqual(new Set(['a', 'b', 'bb', 'abba']));
  });

  it('counts "abcba"', () => {
    const t = eertreePalindrome();
    t.addString('abcba');
    expect(new Set(t.palindromes())).toEqual(new Set(['a', 'b', 'c', 'bcb', 'abcba']));
  });

  it('throws on multi-char add', () => {
    const t = eertreePalindrome();
    expect(() => t.add('ab')).toThrow();
  });

  it('throws on non-string add', () => {
    const t = eertreePalindrome();
    expect(() => t.add(1 as any)).toThrow();
  });

  it('factory + class equivalent', () => {
    const t = new Eertree();
    t.add('a');
    expect(t.uniquePalindromeCount()).toBe(1);
  });

  it('addString chains', () => {
    const t = eertreePalindrome();
    t.addString('aba');
    expect(t.uniquePalindromeCount()).toBe(3);
  });

  it('distinct chars produce n palindromes (each char is one)', () => {
    const t = eertreePalindrome();
    t.addString('abcdef');
    expect(t.uniquePalindromeCount()).toBe(6);
  });
});
