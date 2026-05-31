import { describe, it, expect } from 'vitest';
import { zFunction, zSearch } from '../zFunction';

function bruteZ(s: string): number[] {
  const n = s.length;
  const z = new Array<number>(n).fill(0);
  if (n === 0) return z;
  z[0] = n;
  for (let i = 1; i < n; i += 1) {
    let k = 0;
    while (i + k < n && s[k] === s[i + k]) k += 1;
    z[i] = k;
  }
  return z;
}

function bruteSearch(text: string, p: string): number[] {
  const out: number[] = [];
  if (p.length === 0) return out;
  for (let i = 0; i + p.length <= text.length; i += 1) {
    if (text.slice(i, i + p.length) === p) out.push(i);
  }
  return out;
}

describe('zFunction', () => {
  it('rejects non-string', () => {
    expect(() => zFunction(42 as any)).toThrow(TypeError);
  });

  it('empty string', () => {
    expect(zFunction('')).toEqual([]);
  });

  it('single char', () => {
    expect(zFunction('a')).toEqual([1]);
  });

  it('aaaa', () => {
    expect(zFunction('aaaa')).toEqual([4, 3, 2, 1]);
  });

  it('abcab', () => {
    expect(zFunction('abcab')).toEqual(bruteZ('abcab'));
  });

  it('matches brute on random', () => {
    for (let t = 0; t < 20; t += 1) {
      const n = 1 + Math.floor(Math.random() * 50);
      let s = '';
      for (let i = 0; i < n; i += 1) s += 'abc'[Math.floor(Math.random() * 3)];
      expect(zFunction(s)).toEqual(bruteZ(s));
    }
  });

  it('z[0] = length', () => {
    expect(zFunction('xyz')[0]).toBe(3);
  });

  it('unicode', () => {
    const s = 'αβαβ';
    expect(zFunction(s)).toEqual(bruteZ(s));
  });
});

describe('zSearch', () => {
  it('rejects bad inputs', () => {
    expect(() => zSearch(42 as any, 'x')).toThrow(TypeError);
    expect(() => zSearch('x', 42 as any)).toThrow(TypeError);
  });

  it('empty pattern returns []', () => {
    expect(zSearch('abc', '')).toEqual([]);
  });

  it('finds single occurrence', () => {
    expect(zSearch('hello world', 'world')).toEqual([6]);
  });

  it('finds overlapping', () => {
    expect(zSearch('aaaaa', 'aa')).toEqual([0, 1, 2, 3]);
  });

  it('no match', () => {
    expect(zSearch('hello', 'xyz')).toEqual([]);
  });

  it('match at end', () => {
    expect(zSearch('abcabc', 'bc')).toEqual([1, 4]);
  });

  it('whole text match', () => {
    expect(zSearch('abc', 'abc')).toEqual([0]);
  });

  it('matches brute on random', () => {
    for (let t = 0; t < 20; t += 1) {
      const tlen = 5 + Math.floor(Math.random() * 60);
      let txt = '';
      for (let i = 0; i < tlen; i += 1) txt += 'ab'[Math.floor(Math.random() * 2)];
      const plen = 1 + Math.floor(Math.random() * 4);
      let p = '';
      for (let i = 0; i < plen; i += 1) p += 'ab'[Math.floor(Math.random() * 2)];
      expect(zSearch(txt, p)).toEqual(bruteSearch(txt, p));
    }
  });

  it('rejects separator in inputs', () => {
    expect(() => zSearch('a\u0001b', 'a')).toThrow(RangeError);
    expect(() => zSearch('abc', '\u0001')).toThrow(RangeError);
  });
});
