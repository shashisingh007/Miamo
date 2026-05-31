import { describe, it, expect } from 'vitest';
import { chineseRemainderTheorem } from '../chineseRemainderTheorem';

describe('chineseRemainderTheorem', () => {
  it('throws on empty', () => {
    expect(() => chineseRemainderTheorem([])).toThrow(RangeError);
  });

  it('throws on non-integer remainder', () => {
    expect(() => chineseRemainderTheorem([{ remainder: 1.5, modulus: 3 }])).toThrow(RangeError);
  });

  it('throws on modulus <= 0', () => {
    expect(() => chineseRemainderTheorem([{ remainder: 1, modulus: 0 }])).toThrow(RangeError);
  });

  it('single entry returns normalized remainder', () => {
    const r = chineseRemainderTheorem([{ remainder: 7, modulus: 3 }]);
    expect(r).toEqual({ remainder: 1, modulus: 3 });
  });

  it('classic 2 mod 3, 3 mod 5, 2 mod 7 => 23 mod 105', () => {
    const r = chineseRemainderTheorem([
      { remainder: 2, modulus: 3 },
      { remainder: 3, modulus: 5 },
      { remainder: 2, modulus: 7 },
    ]);
    expect(r).toEqual({ remainder: 23, modulus: 105 });
  });

  it('1 mod 2, 2 mod 3 => 5 mod 6', () => {
    const r = chineseRemainderTheorem([
      { remainder: 1, modulus: 2 },
      { remainder: 2, modulus: 3 },
    ]);
    expect(r).toEqual({ remainder: 5, modulus: 6 });
  });

  it('non-coprime compatible: 4 mod 6, 7 mod 9 => 16 mod 18', () => {
    const r = chineseRemainderTheorem([
      { remainder: 4, modulus: 6 },
      { remainder: 7, modulus: 9 },
    ]);
    expect(r).toEqual({ remainder: 16, modulus: 18 });
  });

  it('throws on incompatible', () => {
    expect(() => chineseRemainderTheorem([
      { remainder: 1, modulus: 4 },
      { remainder: 2, modulus: 6 },
    ])).toThrow(RangeError);
  });

  it('handles negative remainder', () => {
    const r = chineseRemainderTheorem([
      { remainder: -1, modulus: 3 },
      { remainder: 1, modulus: 5 },
    ]);
    // -1 mod 3 = 2; need x = 2 mod 3, x = 1 mod 5 => 11 mod 15
    expect(r).toEqual({ remainder: 11, modulus: 15 });
  });

  it('three coprime entries 2,3,2 mod 5,7,11', () => {
    const r = chineseRemainderTheorem([
      { remainder: 2, modulus: 5 },
      { remainder: 3, modulus: 7 },
      { remainder: 2, modulus: 11 },
    ]);
    expect(r.modulus).toBe(385);
    expect(r.remainder % 5).toBe(2);
    expect(r.remainder % 7).toBe(3);
    expect(r.remainder % 11).toBe(2);
  });

  it('all entries trivial 0 mod k', () => {
    const r = chineseRemainderTheorem([
      { remainder: 0, modulus: 3 },
      { remainder: 0, modulus: 5 },
    ]);
    expect(r).toEqual({ remainder: 0, modulus: 15 });
  });

  it('identical entries', () => {
    const r = chineseRemainderTheorem([
      { remainder: 4, modulus: 7 },
      { remainder: 4, modulus: 7 },
    ]);
    expect(r).toEqual({ remainder: 4, modulus: 7 });
  });

  it('handles large moduli', () => {
    const r = chineseRemainderTheorem([
      { remainder: 17, modulus: 1000 },
      { remainder: 99, modulus: 1009 },
    ]);
    expect(r.remainder % 1000).toBe(17);
    expect(r.remainder % 1009).toBe(99);
  });

  it('returns canonical (0 <= r < m)', () => {
    const r = chineseRemainderTheorem([
      { remainder: 100, modulus: 3 },
      { remainder: 100, modulus: 5 },
    ]);
    expect(r.remainder).toBeGreaterThanOrEqual(0);
    expect(r.remainder).toBeLessThan(r.modulus);
  });
});
