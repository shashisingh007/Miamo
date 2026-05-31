import { describe, it, expect } from 'vitest';
import { boothLeastRotation, leastRotationString } from '../boothLeastRotation';

function bruteLeastRotation(s: string): number {
  let best = 0;
  for (let i = 1; i < s.length; i++) {
    const a = s.slice(i) + s.slice(0, i);
    const b = s.slice(best) + s.slice(0, best);
    if (a < b) best = i;
  }
  return best;
}

describe('boothLeastRotation', () => {
  it('single char => 0', () => {
    expect(boothLeastRotation('a')).toBe(0);
  });

  it('all same char => 0', () => {
    expect(boothLeastRotation('aaaa')).toBe(0);
  });

  it('classic example bbaaccaadd', () => {
    const s = 'bbaaccaadd';
    const k = boothLeastRotation(s);
    expect(leastRotationString(s)).toBe(s.slice(k) + s.slice(0, k));
    expect(k).toBe(bruteLeastRotation(s));
  });

  it('already minimal rotation', () => {
    expect(boothLeastRotation('abcde')).toBe(0);
  });

  it('matches brute force on random strings', () => {
    const chars = 'abc';
    for (let t = 0; t < 30; t++) {
      const len = 1 + Math.floor(Math.random() * 12);
      let s = '';
      for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
      expect(boothLeastRotation(s)).toBe(bruteLeastRotation(s));
    }
  });

  it('leastRotationString equals minimum over all rotations', () => {
    const s = 'cabbage';
    const all: string[] = [];
    for (let i = 0; i < s.length; i++) all.push(s.slice(i) + s.slice(0, i));
    all.sort();
    expect(leastRotationString(s)).toBe(all[0]);
  });

  it('digits handled', () => {
    const s = '90210';
    expect(boothLeastRotation(s)).toBe(bruteLeastRotation(s));
  });

  it('palindromic input', () => {
    const s = 'abcba';
    expect(boothLeastRotation(s)).toBe(bruteLeastRotation(s));
  });

  it('rejects empty', () => {
    expect(() => boothLeastRotation('')).toThrow();
  });

  it('rejects non-string', () => {
    expect(() => boothLeastRotation(123 as any)).toThrow();
  });

  it('result index in range', () => {
    const s = 'zyxwvutsrqp';
    const k = boothLeastRotation(s);
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThan(s.length);
  });
});
