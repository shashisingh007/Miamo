import { describe, it, expect } from 'vitest';
import {
  permutationRank,
  permutationUnrank,
  permutationRankUnrank,
} from '../permutationRankUnrank';

describe('permutationRankUnrank', () => {
  it('factory exposes both helpers', () => {
    const api = permutationRankUnrank();
    expect(typeof api.permutationRank).toBe('function');
    expect(typeof api.permutationUnrank).toBe('function');
  });

  it('empty perm => rank 0', () => {
    expect(permutationRank([])).toBe(0n);
    expect(permutationUnrank(0, 0n)).toEqual([]);
  });

  it('n=1 => only one permutation', () => {
    expect(permutationRank([0])).toBe(0n);
    expect(permutationUnrank(1, 0n)).toEqual([0]);
  });

  it('n=3 all 6 permutations roundtrip', () => {
    const perms = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];
    perms.forEach((p, idx) => {
      expect(permutationRank(p)).toBe(BigInt(idx));
      expect(permutationUnrank(3, BigInt(idx))).toEqual(p);
    });
  });

  it('n=5 lex order: rank 0 is identity, rank 119 is reverse', () => {
    expect(permutationUnrank(5, 0n)).toEqual([0, 1, 2, 3, 4]);
    expect(permutationUnrank(5, 119n)).toEqual([4, 3, 2, 1, 0]);
    expect(permutationRank([4, 3, 2, 1, 0])).toBe(119n);
  });

  it('round-trip random n=6', () => {
    for (let trial = 0; trial < 20; trial += 1) {
      const p = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
      const r = permutationRank(p);
      expect(permutationUnrank(6, r)).toEqual(p);
    }
  });

  it('rank accepts bigint or number', () => {
    expect(permutationUnrank(4, 5)).toEqual(permutationUnrank(4, 5n));
  });

  it('throws on non-permutation', () => {
    expect(() => permutationRank([0, 0, 1])).toThrow();
    expect(() => permutationRank([0, 2])).toThrow();
    expect(() => permutationRank([1.5, 0] as any)).toThrow();
  });

  it('throws on non-array', () => {
    expect(() => permutationRank('abc' as any)).toThrow();
  });

  it('throws on negative n / negative rank', () => {
    expect(() => permutationUnrank(-1, 0n)).toThrow();
    expect(() => permutationUnrank(3, -1n)).toThrow();
  });

  it('throws on rank out of range', () => {
    expect(() => permutationUnrank(3, 6n)).toThrow();
  });

  it('large n=8 stays in [0, 8!)', () => {
    const r = permutationRank([7, 6, 5, 4, 3, 2, 1, 0]);
    expect(r).toBe(40319n);
    expect(permutationUnrank(8, r)).toEqual([7, 6, 5, 4, 3, 2, 1, 0]);
  });
});
