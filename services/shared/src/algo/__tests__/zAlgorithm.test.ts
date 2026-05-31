import { describe, it, expect } from 'vitest';
import { zAlgorithm, zAlgorithmFindAll } from '../zAlgorithm';

describe('zAlgorithm', () => {
  it('empty string => []', () => {
    expect(zAlgorithm('')).toEqual([]);
  });

  it('single char', () => {
    expect(zAlgorithm('a')).toEqual([1]);
  });

  it('all-same-char', () => {
    expect(zAlgorithm('aaaa')).toEqual([4, 3, 2, 1]);
  });

  it('classic "aabcaabxaaaz"', () => {
    expect(zAlgorithm('aabcaabxaaaz')).toEqual([12, 1, 0, 0, 3, 1, 0, 0, 2, 2, 1, 0]);
  });

  it('distinct characters => zeros after [0]', () => {
    expect(zAlgorithm('abcdef')).toEqual([6, 0, 0, 0, 0, 0]);
  });

  it('throws on non-string', () => {
    expect(() => zAlgorithm(42 as any)).toThrow();
  });
});

describe('zAlgorithmFindAll', () => {
  it('finds pattern occurrences', () => {
    expect(zAlgorithmFindAll('ababab', 'ab')).toEqual([0, 2, 4]);
  });

  it('returns [] when not found', () => {
    expect(zAlgorithmFindAll('abc', 'd')).toEqual([]);
  });

  it('handles full overlap', () => {
    expect(zAlgorithmFindAll('aaaa', 'aa')).toEqual([0, 1, 2]);
  });

  it('empty pattern => []', () => {
    expect(zAlgorithmFindAll('abc', '')).toEqual([]);
  });

  it('throws on non-string input', () => {
    expect(() => zAlgorithmFindAll(1 as any, 'a')).toThrow();
  });

  it('throws when separator appears in text', () => {
    expect(() => zAlgorithmFindAll('a\u0001b', 'a')).toThrow();
  });
});
