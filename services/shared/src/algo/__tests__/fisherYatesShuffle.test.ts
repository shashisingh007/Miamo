import { describe, it, expect } from 'vitest';
import { fisherYatesShuffle, seededRng } from '../fisherYatesShuffle';

describe('fisherYatesShuffle', () => {
  it('empty array => empty', () => {
    expect(fisherYatesShuffle([])).toEqual([]);
  });

  it('single element => same', () => {
    expect(fisherYatesShuffle([42])).toEqual([42]);
  });

  it('does not mutate input', () => {
    const a = [1, 2, 3, 4, 5];
    const copy = [...a];
    fisherYatesShuffle(a);
    expect(a).toEqual(copy);
  });

  it('result is a permutation', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng = seededRng(123);
    const out = fisherYatesShuffle(a, rng);
    expect([...out].sort((x, y) => x - y)).toEqual(a);
  });

  it('deterministic with same seed', () => {
    const a = [1, 2, 3, 4, 5];
    const r1 = fisherYatesShuffle(a, seededRng(7));
    const r2 = fisherYatesShuffle(a, seededRng(7));
    expect(r1).toEqual(r2);
  });

  it('different seeds produce different orders (likely)', () => {
    const a = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const r1 = fisherYatesShuffle(a, seededRng(1));
    const r2 = fisherYatesShuffle(a, seededRng(2));
    expect(r1).not.toEqual(r2);
  });

  it('throws when rng returns 1', () => {
    expect(() => fisherYatesShuffle([1, 2, 3], () => 1)).toThrow(RangeError);
  });

  it('throws when rng returns negative', () => {
    expect(() => fisherYatesShuffle([1, 2, 3], () => -0.1)).toThrow(RangeError);
  });

  it('rng=0 reverses array (every swap with index 0)', () => {
    expect(fisherYatesShuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });

  it('default rng works', () => {
    const out = fisherYatesShuffle([1, 2, 3, 4, 5]);
    expect(out).toHaveLength(5);
    expect([...out].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles strings', () => {
    const a = ['a', 'b', 'c'];
    const out = fisherYatesShuffle(a, seededRng(42));
    expect([...out].sort()).toEqual(['a', 'b', 'c']);
  });

  it('large array preserves multiset', () => {
    const a = Array.from({ length: 100 }, (_, i) => i);
    const out = fisherYatesShuffle(a, seededRng(99));
    expect([...out].sort((x, y) => x - y)).toEqual(a);
  });
});

describe('seededRng', () => {
  it('returns values in [0,1)', () => {
    const rng = seededRng(5);
    for (let i = 0; i < 100; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('deterministic', () => {
    const a = seededRng(11);
    const b = seededRng(11);
    for (let i = 0; i < 10; i += 1) expect(a()).toBe(b());
  });
});
