import { describe, it, expect } from 'vitest';
import { AhoCorasick } from '../ahoCorasick';

describe('AhoCorasick', () => {
  it('rejects non-array', () => {
    expect(() => new AhoCorasick('hi' as any)).toThrow();
  });

  it('rejects non-string pattern', () => {
    expect(() => new AhoCorasick([1 as any])).toThrow();
  });

  it('rejects non-string search', () => {
    const ac = new AhoCorasick(['a']);
    expect(() => ac.search(1 as any)).toThrow();
  });

  it('empty patterns => no matches', () => {
    const ac = new AhoCorasick([]);
    expect(ac.search('hello')).toEqual([]);
  });

  it('single-pattern hit', () => {
    const ac = new AhoCorasick(['ab']);
    const m = ac.search('cab');
    expect(m).toHaveLength(1);
    expect(m[0].start).toBe(1);
    expect(m[0].end).toBe(3);
    expect(m[0].patternIndex).toBe(0);
    expect(m[0].pattern).toBe('ab');
  });

  it('no match', () => {
    const ac = new AhoCorasick(['xyz']);
    expect(ac.search('hello')).toEqual([]);
  });

  it('multi-pattern overlapping', () => {
    const ac = new AhoCorasick(['he', 'she', 'his', 'hers']);
    const m = ac.search('ushers');
    const found = m.map((x) => x.pattern).sort();
    expect(found).toEqual(['he', 'hers', 'she']);
  });

  it('repeats counted', () => {
    const ac = new AhoCorasick(['ab']);
    const m = ac.search('abab');
    expect(m).toHaveLength(2);
    expect(m[0].start).toBe(0);
    expect(m[1].start).toBe(2);
  });

  it('substring containment via fail links', () => {
    const ac = new AhoCorasick(['abc', 'bc']);
    const m = ac.search('abc');
    const pats = m.map((x) => x.pattern).sort();
    expect(pats).toEqual(['abc', 'bc']);
  });

  it('single-char pattern', () => {
    const ac = new AhoCorasick(['a']);
    expect(ac.search('aaa')).toHaveLength(3);
  });

  it('patterns at start and end', () => {
    const ac = new AhoCorasick(['hello', 'world']);
    const m = ac.search('hello world');
    expect(m).toHaveLength(2);
  });

  it('overlapping with same suffix', () => {
    const ac = new AhoCorasick(['aab', 'ab']);
    const m = ac.search('aab');
    const pats = m.map((x) => x.pattern).sort();
    expect(pats).toEqual(['aab', 'ab']);
  });

  it('case-sensitive', () => {
    const ac = new AhoCorasick(['Hello']);
    expect(ac.search('hello')).toHaveLength(0);
    expect(ac.search('Hello')).toHaveLength(1);
  });

  it('unicode by code units', () => {
    const ac = new AhoCorasick(['café']);
    expect(ac.search('a café here')).toHaveLength(1);
  });

  it('pattern index preserved', () => {
    const ac = new AhoCorasick(['x', 'y', 'z']);
    const m = ac.search('zyx');
    const sorted = m.slice().sort((a, b) => a.start - b.start);
    expect(sorted[0].patternIndex).toBe(2);
    expect(sorted[1].patternIndex).toBe(1);
    expect(sorted[2].patternIndex).toBe(0);
  });

  it('long text many matches', () => {
    const ac = new AhoCorasick(['the']);
    const t = 'the cat saw the dog and the bird';
    expect(ac.search(t)).toHaveLength(3);
  });

  it('large pattern set', () => {
    const pats: string[] = [];
    for (let i = 0; i < 100; i++) pats.push('w' + i);
    const ac = new AhoCorasick(pats);
    // 'w5 and w50 and w99' has: w5, w5 (in w50), w50, w9 (in w99), w99 = 5
    expect(ac.search('w5 and w50 and w99')).toHaveLength(5);
  });

  it('start/end positions correct', () => {
    const ac = new AhoCorasick(['cat']);
    const m = ac.search('the cat sat');
    expect(m[0].start).toBe(4);
    expect(m[0].end).toBe(7);
  });

  it('empty pattern is a degenerate match at every position', () => {
    const ac = new AhoCorasick(['']);
    // Empty pattern reports once per text character (and at start when at root).
    expect(ac.search('abc').length).toBeGreaterThanOrEqual(3);
  });

  it('overlapping starting positions', () => {
    const ac = new AhoCorasick(['aaa']);
    const m = ac.search('aaaaa');
    expect(m).toHaveLength(3);
  });

  it('finds pattern containing common prefix', () => {
    const ac = new AhoCorasick(['ab', 'abc', 'abcd']);
    const m = ac.search('abcd');
    expect(m.map((x) => x.pattern).sort()).toEqual(['ab', 'abc', 'abcd']);
  });

  it('preserves duplicate pattern entries', () => {
    const ac = new AhoCorasick(['ab', 'ab']);
    const m = ac.search('ab');
    expect(m).toHaveLength(2);
  });
});
