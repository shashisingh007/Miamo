import { describe, it, expect } from 'vitest';
import {
  gosperNextSameBits,
  gosperSubsetsOfSize,
  gosperHackSubsets,
} from '../gosperHackSubsets';

function popcount(x: number): number {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>>= 1;
  }
  return c;
}

describe('gosperHackSubsets', () => {
  it('factory exposes both', () => {
    const api = gosperHackSubsets();
    expect(typeof api.gosperNextSameBits).toBe('function');
    expect(typeof api.gosperSubsetsOfSize).toBe('function');
  });

  it('next after 0b0011 is 0b0101', () => {
    expect(gosperNextSameBits(0b0011)).toBe(0b0101);
  });

  it('next after 0b0101 is 0b0110', () => {
    expect(gosperNextSameBits(0b0101)).toBe(0b0110);
  });

  it('k=0 returns [0]', () => {
    expect(gosperSubsetsOfSize(4, 0)).toEqual([0]);
  });

  it('k>n returns []', () => {
    expect(gosperSubsetsOfSize(3, 4)).toEqual([]);
  });

  it('n=4 k=2 enumerates all C(4,2)=6 subsets', () => {
    const r = gosperSubsetsOfSize(4, 2);
    expect(r.length).toBe(6);
    for (const v of r) expect(popcount(v)).toBe(2);
  });

  it('values are strictly increasing', () => {
    const r = gosperSubsetsOfSize(5, 3);
    for (let i = 1; i < r.length; i += 1) expect(r[i]).toBeGreaterThan(r[i - 1]);
  });

  it('n=5 k=3 has C(5,3)=10', () => {
    expect(gosperSubsetsOfSize(5, 3).length).toBe(10);
  });

  it('throws on bad inputs', () => {
    expect(() => gosperNextSameBits(0)).toThrow();
    expect(() => gosperSubsetsOfSize(-1, 1)).toThrow();
    expect(() => gosperSubsetsOfSize(5, -1)).toThrow();
    expect(() => gosperSubsetsOfSize(31, 5)).toThrow();
  });

  it('k=n returns single all-ones', () => {
    expect(gosperSubsetsOfSize(4, 4)).toEqual([0b1111]);
  });
});
