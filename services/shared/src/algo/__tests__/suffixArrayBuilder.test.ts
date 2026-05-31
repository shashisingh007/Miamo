import { describe, it, expect } from 'vitest';
import {
  buildSuffixArray,
  buildLcpArray,
  suffixArrayContains,
} from '../suffixArrayBuilder';

describe('buildSuffixArray', () => {
  it('empty', () => {
    expect(buildSuffixArray('')).toEqual([]);
  });

  it('single char', () => {
    expect(buildSuffixArray('a')).toEqual([0]);
  });

  it('banana', () => {
    expect(buildSuffixArray('banana')).toEqual([5, 3, 1, 0, 4, 2]);
  });

  it('aaaa', () => {
    expect(buildSuffixArray('aaaa')).toEqual([3, 2, 1, 0]);
  });

  it('abcde monotonic', () => {
    expect(buildSuffixArray('abcde')).toEqual([0, 1, 2, 3, 4]);
  });

  it('suffix array length matches input', () => {
    const text = 'mississippi';
    expect(buildSuffixArray(text)).toHaveLength(text.length);
  });

  it('all suffixes sorted', () => {
    const text = 'hello world';
    const sa = buildSuffixArray(text);
    for (let i = 1; i < sa.length; i++) {
      expect(text.slice(sa[i - 1]) <= text.slice(sa[i])).toBe(true);
    }
  });
});

describe('buildLcpArray', () => {
  it('empty', () => {
    expect(buildLcpArray('', [])).toEqual([]);
  });

  it('single char', () => {
    expect(buildLcpArray('a', [0])).toEqual([0]);
  });

  it('banana LCPs known', () => {
    const text = 'banana';
    const sa = buildSuffixArray(text);
    const lcp = buildLcpArray(text, sa);
    expect(lcp[0]).toBe(0);
    expect(lcp.length).toBe(6);
  });

  it('aaaa LCP', () => {
    const text = 'aaaa';
    const sa = buildSuffixArray(text);
    const lcp = buildLcpArray(text, sa);
    expect(lcp).toEqual([0, 1, 2, 3]);
  });
});

describe('suffixArrayContains', () => {
  it('empty pattern always true', () => {
    expect(suffixArrayContains('abc', buildSuffixArray('abc'), '')).toBe(true);
  });

  it('pattern found at start', () => {
    const t = 'banana';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'ban')).toBe(true);
  });

  it('pattern found in middle', () => {
    const t = 'banana';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'nan')).toBe(true);
  });

  it('pattern found at end', () => {
    const t = 'banana';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'ana')).toBe(true);
  });

  it('pattern missing', () => {
    const t = 'banana';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'apple')).toBe(false);
  });

  it('case sensitive', () => {
    const t = 'Banana';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'banana')).toBe(false);
  });

  it('pattern longer than text', () => {
    const t = 'ab';
    expect(suffixArrayContains(t, buildSuffixArray(t), 'abc')).toBe(false);
  });
});
