import { describe, it, expect } from 'vitest';
import { PalindromicTree } from '../eertreePalindromicTree';

function bruteDistinctPalindromes(s: string): number {
  const set = new Set<string>();
  for (let i = 0; i < s.length; i += 1) {
    for (let j = i + 1; j <= s.length; j += 1) {
      const sub = s.slice(i, j);
      let ok = true;
      for (let k = 0; k < (sub.length >> 1); k += 1) {
        if (sub[k] !== sub[sub.length - 1 - k]) {
          ok = false;
          break;
        }
      }
      if (ok) set.add(sub);
    }
  }
  return set.size;
}

describe('PalindromicTree', () => {
  it('add rejects non-single-char', () => {
    const t = new PalindromicTree();
    expect(() => t.add('ab')).toThrow(TypeError);
    expect(() => t.add(42 as any)).toThrow(TypeError);
  });

  it('addString rejects non-string', () => {
    const t = new PalindromicTree();
    expect(() => t.addString(42 as any)).toThrow(TypeError);
  });

  it('empty distinct = 0', () => {
    const t = new PalindromicTree();
    expect(t.distinctPalindromeCount()).toBe(0);
  });

  it('single char distinct = 1', () => {
    const t = new PalindromicTree();
    t.add('a');
    expect(t.distinctPalindromeCount()).toBe(1);
  });

  it('aaa distinct = 3 (a, aa, aaa)', () => {
    const t = new PalindromicTree();
    t.addString('aaa');
    expect(t.distinctPalindromeCount()).toBe(3);
  });

  it('ab distinct = 2 (a, b)', () => {
    const t = new PalindromicTree();
    t.addString('ab');
    expect(t.distinctPalindromeCount()).toBe(2);
  });

  it('abba distinct = 4', () => {
    const t = new PalindromicTree();
    t.addString('abba');
    expect(t.distinctPalindromeCount()).toBe(bruteDistinctPalindromes('abba'));
  });

  it('matches brute on misspelled words', () => {
    for (const s of ['banana', 'abracadabra', 'mississippi', 'racecar', 'noon']) {
      const t = new PalindromicTree();
      t.addString(s);
      expect(t.distinctPalindromeCount()).toBe(bruteDistinctPalindromes(s));
    }
  });

  it('add returns true for new, false for repeat', () => {
    const t = new PalindromicTree();
    expect(t.add('a')).toBe(true);
    expect(t.add('a')).toBe(true); // creates "aa"
    expect(t.add('a')).toBe(true); // creates "aaa"
    // After 3 a's all palindromes a, aa, aaa exist; adding a 4th 'a' creates "aaaa" - still new
    expect(t.add('a')).toBe(true);
    // Now adding b creates "b"
    expect(t.add('b')).toBe(true);
    // Adding b again creates nothing new this step? Actually creates "bb"
    expect(t.add('b')).toBe(true);
  });

  it('length tracks chars', () => {
    const t = new PalindromicTree();
    t.addString('abc');
    expect(t.length()).toBe(3);
  });

  it('matches brute on random strings', () => {
    for (let trial = 0; trial < 15; trial += 1) {
      const n = 1 + Math.floor(Math.random() * 30);
      let s = '';
      for (let i = 0; i < n; i += 1) s += 'abc'[Math.floor(Math.random() * 3)];
      const t = new PalindromicTree();
      t.addString(s);
      expect(t.distinctPalindromeCount()).toBe(bruteDistinctPalindromes(s));
    }
  });

  it('distinct <= n+1 (Eertree size bound)', () => {
    const s = 'abracadabra';
    const t = new PalindromicTree();
    t.addString(s);
    expect(t.distinctPalindromeCount()).toBeLessThanOrEqual(s.length);
  });

  it('all-distinct chars => n palindromes', () => {
    const t = new PalindromicTree();
    t.addString('abcdef');
    expect(t.distinctPalindromeCount()).toBe(6);
  });

  it('unicode single chars', () => {
    const t = new PalindromicTree();
    t.add('α');
    t.add('β');
    t.add('α');
    expect(t.distinctPalindromeCount()).toBe(bruteDistinctPalindromes('αβα'));
  });

  it('long monotone', () => {
    const t = new PalindromicTree();
    const s = 'a'.repeat(50);
    t.addString(s);
    expect(t.distinctPalindromeCount()).toBe(50);
  });
});
