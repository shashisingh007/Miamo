import { describe, it, expect } from 'vitest';
import { SuffixAutomaton } from '../suffixAutomaton';

function brute(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length; i += 1) {
    for (let j = i + 1; j <= s.length; j += 1) out.add(s.slice(i, j));
  }
  return out;
}

describe('SuffixAutomaton', () => {
  it('throws on non-string text', () => {
    expect(() => new SuffixAutomaton(42 as any)).toThrow(TypeError);
  });

  it('throws on non-string pattern', () => {
    const sa = new SuffixAutomaton('abc');
    expect(() => sa.contains(42 as any)).toThrow(TypeError);
  });

  it('empty text accepts empty pattern only', () => {
    const sa = new SuffixAutomaton('');
    expect(sa.contains('')).toBe(true);
    expect(sa.contains('a')).toBe(false);
  });

  it('contains matches all substrings', () => {
    const s = 'banana';
    const sa = new SuffixAutomaton(s);
    for (const sub of brute(s)) expect(sa.contains(sub)).toBe(true);
  });

  it('rejects non-substring', () => {
    const sa = new SuffixAutomaton('banana');
    expect(sa.contains('nab')).toBe(false);
    expect(sa.contains('xyz')).toBe(false);
    expect(sa.contains('banana!')).toBe(false);
  });

  it('distinctSubstringCount matches brute', () => {
    const cases = ['', 'a', 'aa', 'ab', 'aba', 'abab', 'banana', 'abracadabra', 'mississippi'];
    for (const s of cases) {
      const sa = new SuffixAutomaton(s);
      expect(sa.distinctSubstringCount()).toBe(brute(s).size);
    }
  });

  it('contains full text', () => {
    const sa = new SuffixAutomaton('hello');
    expect(sa.contains('hello')).toBe(true);
  });

  it('contains single chars', () => {
    const sa = new SuffixAutomaton('xyz');
    expect(sa.contains('x')).toBe(true);
    expect(sa.contains('y')).toBe(true);
    expect(sa.contains('z')).toBe(true);
    expect(sa.contains('w')).toBe(false);
  });

  it('handles repeated chars', () => {
    const sa = new SuffixAutomaton('aaaa');
    expect(sa.distinctSubstringCount()).toBe(4); // a, aa, aaa, aaaa
  });

  it('nodeCount reasonable', () => {
    const sa = new SuffixAutomaton('banana');
    expect(sa.nodeCount()).toBeGreaterThan(6);
    expect(sa.nodeCount()).toBeLessThanOrEqual(2 * 6);
  });

  it('source returns original', () => {
    const sa = new SuffixAutomaton('mango');
    expect(sa.source()).toBe('mango');
  });

  it('larger random text', () => {
    const chars = 'abc';
    let s = '';
    for (let i = 0; i < 200; i += 1) s += chars[Math.floor(Math.random() * chars.length)];
    const sa = new SuffixAutomaton(s);
    expect(sa.distinctSubstringCount()).toBe(brute(s).size);
  });

  it('suffix is substring', () => {
    const sa = new SuffixAutomaton('banana');
    expect(sa.contains('na')).toBe(true);
    expect(sa.contains('ana')).toBe(true);
    expect(sa.contains('nana')).toBe(true);
  });

  it('handles unicode codepoints', () => {
    const sa = new SuffixAutomaton('αβγαβ');
    expect(sa.contains('αβ')).toBe(true);
    expect(sa.contains('βγ')).toBe(true);
    expect(sa.contains('γα')).toBe(true);
    expect(sa.contains('δ')).toBe(false);
  });

  it('empty pattern always matches', () => {
    const sa = new SuffixAutomaton('whatever');
    expect(sa.contains('')).toBe(true);
  });

  it('matches across boundary', () => {
    const sa = new SuffixAutomaton('xyabxyab');
    expect(sa.contains('abxy')).toBe(true);
  });
});
