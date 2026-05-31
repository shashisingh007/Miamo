import { describe, it, expect } from 'vitest';
import {
  sternBrocotPath,
  sternBrocotMediant,
  sternBrocotLevel,
} from '../sternBrocotTree';

describe('sternBrocotPath', () => {
  it('throws on non-positive', () => {
    expect(() => sternBrocotPath({ numerator: 0, denominator: 1 })).toThrow(RangeError);
    expect(() => sternBrocotPath({ numerator: 1, denominator: 0 })).toThrow(RangeError);
  });

  it('throws on non-reduced', () => {
    expect(() => sternBrocotPath({ numerator: 2, denominator: 4 })).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => sternBrocotPath({ numerator: 1.5, denominator: 2 })).toThrow(RangeError);
  });

  it('1/1 => empty path', () => {
    expect(sternBrocotPath({ numerator: 1, denominator: 1 })).toBe('');
  });

  it('1/2 => L', () => {
    expect(sternBrocotPath({ numerator: 1, denominator: 2 })).toBe('L');
  });

  it('2/1 => R', () => {
    expect(sternBrocotPath({ numerator: 2, denominator: 1 })).toBe('R');
  });

  it('1/3 => LL', () => {
    expect(sternBrocotPath({ numerator: 1, denominator: 3 })).toBe('LL');
  });

  it('2/3 => LR', () => {
    expect(sternBrocotPath({ numerator: 2, denominator: 3 })).toBe('LR');
  });

  it('3/2 => RL', () => {
    expect(sternBrocotPath({ numerator: 3, denominator: 2 })).toBe('RL');
  });

  it('3/1 => RR', () => {
    expect(sternBrocotPath({ numerator: 3, denominator: 1 })).toBe('RR');
  });
});

describe('sternBrocotMediant', () => {
  it('mediant(0/1, 1/0) = 1/1', () => {
    expect(sternBrocotMediant({ numerator: 0, denominator: 1 }, { numerator: 1, denominator: 0 })).toEqual({
      numerator: 1,
      denominator: 1,
    });
  });

  it('mediant(1/2, 2/3) = 3/5', () => {
    expect(sternBrocotMediant({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 3 })).toEqual({
      numerator: 3,
      denominator: 5,
    });
  });
});

describe('sternBrocotLevel', () => {
  it('throws on negative', () => {
    expect(() => sternBrocotLevel(-1)).toThrow(RangeError);
  });

  it('level 0 = [0/1, 1/0]', () => {
    expect(sternBrocotLevel(0)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 0 },
    ]);
  });

  it('level 1 inserts 1/1', () => {
    expect(sternBrocotLevel(1)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 1 },
      { numerator: 1, denominator: 0 },
    ]);
  });

  it('level 2', () => {
    expect(sternBrocotLevel(2)).toEqual([
      { numerator: 0, denominator: 1 },
      { numerator: 1, denominator: 2 },
      { numerator: 1, denominator: 1 },
      { numerator: 2, denominator: 1 },
      { numerator: 1, denominator: 0 },
    ]);
  });

  it('level 3 size = 9', () => {
    expect(sternBrocotLevel(3)).toHaveLength(9);
  });
});
