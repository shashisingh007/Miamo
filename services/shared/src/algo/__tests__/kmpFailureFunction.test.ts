import { describe, it, expect } from 'vitest';
import { kmpFailure, kmpSearchAll, kmpFailureFunction } from '../kmpFailureFunction';

describe('kmpFailureFunction', () => {
  it('factory exposes both', () => {
    const api = kmpFailureFunction();
    expect(typeof api.kmpFailure).toBe('function');
    expect(typeof api.kmpSearchAll).toBe('function');
  });

  it('failure of empty pattern is empty', () => {
    expect(kmpFailure('')).toEqual([]);
  });

  it('failure of "abcabcabd"', () => {
    expect(kmpFailure('abcabcabd')).toEqual([0, 0, 0, 1, 2, 3, 4, 5, 0]);
  });

  it('failure of "aaaa" is [0,1,2,3]', () => {
    expect(kmpFailure('aaaa')).toEqual([0, 1, 2, 3]);
  });

  it('finds all occurrences', () => {
    expect(kmpSearchAll('abababab', 'abab')).toEqual([0, 2, 4]);
  });

  it('non-overlapping single hit', () => {
    expect(kmpSearchAll('hello world', 'world')).toEqual([6]);
  });

  it('no matches', () => {
    expect(kmpSearchAll('abcdef', 'gh')).toEqual([]);
  });

  it('empty pattern => no matches', () => {
    expect(kmpSearchAll('abc', '')).toEqual([]);
  });

  it('pattern equals text', () => {
    expect(kmpSearchAll('hello', 'hello')).toEqual([0]);
  });

  it('throws on non-string', () => {
    expect(() => kmpFailure(1 as any)).toThrow();
    expect(() => kmpSearchAll(1 as any, 'x')).toThrow();
    expect(() => kmpSearchAll('x', 1 as any)).toThrow();
  });

  it('matches naive search on random-ish cases', () => {
    const cases: [string, string][] = [
      ['mississippi', 'issi'],
      ['aaaaaa', 'aa'],
      ['xyzxyz', 'yz'],
      ['banana', 'ana'],
    ];
    for (const [t, p] of cases) {
      const naive: number[] = [];
      for (let i = 0; i + p.length <= t.length; i += 1) {
        if (t.slice(i, i + p.length) === p) naive.push(i);
      }
      expect(kmpSearchAll(t, p)).toEqual(naive);
    }
  });
});
