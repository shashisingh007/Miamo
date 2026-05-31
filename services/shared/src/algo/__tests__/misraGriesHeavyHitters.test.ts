import { describe, it, expect } from 'vitest';
import { MisraGriesHeavyHitters } from '../misraGriesHeavyHitters';

describe('MisraGriesHeavyHitters', () => {
  it('throws on invalid k', () => {
    expect(() => new MisraGriesHeavyHitters(0)).toThrow(RangeError);
    expect(() => new MisraGriesHeavyHitters(-1)).toThrow(RangeError);
    expect(() => new MisraGriesHeavyHitters(1.5)).toThrow(RangeError);
  });

  it('empty', () => {
    const m = new MisraGriesHeavyHitters<string>(3);
    expect(m.size()).toBe(0);
    expect(m.candidates()).toEqual([]);
    expect(m.count('a')).toBe(0);
  });

  it('within capacity counts exactly', () => {
    const m = new MisraGriesHeavyHitters<string>(3);
    'aaabbcc'.split('').forEach((x) => m.add(x));
    expect(m.count('a')).toBe(3);
    expect(m.count('b')).toBe(2);
    expect(m.count('c')).toBe(2);
    expect(m.size()).toBe(7);
  });

  it('over capacity may evict but keeps majority candidate', () => {
    const m = new MisraGriesHeavyHitters<string>(2);
    'aaaaabcde'.split('').forEach((x) => m.add(x));
    const items = m.candidates().map((c) => c.item);
    expect(items).toContain('a');
  });

  it('candidates sorted by count desc', () => {
    const m = new MisraGriesHeavyHitters<string>(3);
    'aaaabbbcc'.split('').forEach((x) => m.add(x));
    const c = m.candidates();
    for (let i = 1; i < c.length; i += 1) {
      expect(c[i - 1].count).toBeGreaterThanOrEqual(c[i].count);
    }
  });

  it('boyer-moore (k=1) majority', () => {
    const m = new MisraGriesHeavyHitters<string>(1);
    'aabaa'.split('').forEach((x) => m.add(x));
    const c = m.candidates();
    expect(c[0].item).toBe('a');
  });

  it('no false negatives for >n/(k+1) elements', () => {
    const k = 3;
    const m = new MisraGriesHeavyHitters<number>(k);
    const stream: number[] = [];
    for (let i = 0; i < 100; i += 1) stream.push(1); // heavy: 100/400 = 25% > 25%? threshold is >n/(k+1)=>100
    for (let i = 0; i < 50; i += 1) stream.push(2);
    for (let i = 0; i < 200; i += 1) stream.push(i % 50 + 10);
    // total = 350; threshold = 350/4 = 87.5; only "1" is heavy (count 100)
    stream.forEach((x) => m.add(x));
    const items = m.candidates().map((c) => c.item);
    expect(items).toContain(1);
  });

  it('size counts all adds', () => {
    const m = new MisraGriesHeavyHitters<string>(2);
    for (let i = 0; i < 1000; i += 1) m.add(String(i % 7));
    expect(m.size()).toBe(1000);
  });

  it('count returns 0 for missing', () => {
    const m = new MisraGriesHeavyHitters<string>(2);
    m.add('a');
    expect(m.count('z')).toBe(0);
  });

  it('counter limit ≤ k', () => {
    const m = new MisraGriesHeavyHitters<number>(3);
    for (let i = 0; i < 100; i += 1) m.add(i);
    expect(m.candidates().length).toBeLessThanOrEqual(3);
  });

  it('handles repeated single element', () => {
    const m = new MisraGriesHeavyHitters<string>(2);
    for (let i = 0; i < 50; i += 1) m.add('x');
    expect(m.count('x')).toBe(50);
  });

  it('numeric items', () => {
    const m = new MisraGriesHeavyHitters<number>(2);
    [1, 1, 1, 2, 3].forEach((x) => m.add(x));
    expect(m.count(1)).toBeGreaterThan(0);
  });
});
