import { describe, it, expect } from 'vitest';
import { AliasMethodSampler } from '../aliasMethodSampler';

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % (2 ** 31);
    return s / 2 ** 31;
  };
}

describe('AliasMethodSampler', () => {
  it('throws on empty weights', () => {
    expect(() => new AliasMethodSampler([])).toThrow(RangeError);
  });

  it('throws on negative weight', () => {
    expect(() => new AliasMethodSampler([1, -1])).toThrow(RangeError);
  });

  it('throws on non-finite weight', () => {
    expect(() => new AliasMethodSampler([1, Infinity])).toThrow(RangeError);
  });

  it('throws on zero sum', () => {
    expect(() => new AliasMethodSampler([0, 0])).toThrow(RangeError);
  });

  it('size matches weights length', () => {
    expect(new AliasMethodSampler([1, 2, 3]).size()).toBe(3);
  });

  it('single weight => always 0', () => {
    const s = new AliasMethodSampler([5]);
    for (let i = 0; i < 10; i++) expect(s.sample()).toBe(0);
  });

  it('uniform distribution', () => {
    const s = new AliasMethodSampler([1, 1, 1, 1], seeded(42));
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 8000; i++) counts[s.sample()] += 1;
    for (const c of counts) expect(c).toBeGreaterThan(1700);
  });

  it('weighted distribution roughly matches', () => {
    const s = new AliasMethodSampler([1, 3], seeded(7));
    let a = 0, b = 0;
    for (let i = 0; i < 8000; i++) (s.sample() === 0 ? a++ : b++);
    expect(b / (a + b)).toBeCloseTo(0.75, 1);
  });

  it('always returns valid index', () => {
    const s = new AliasMethodSampler([1, 2, 3], seeded(9));
    for (let i = 0; i < 200; i++) {
      const x = s.sample();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(3);
    }
  });

  it('deterministic with seeded rng', () => {
    const s1 = new AliasMethodSampler([1, 2, 3], seeded(123));
    const s2 = new AliasMethodSampler([1, 2, 3], seeded(123));
    for (let i = 0; i < 50; i++) expect(s1.sample()).toBe(s2.sample());
  });

  it('strongly skewed weights mostly hit max', () => {
    const s = new AliasMethodSampler([1, 1, 100], seeded(3));
    let c2 = 0;
    for (let i = 0; i < 1000; i++) if (s.sample() === 2) c2 += 1;
    expect(c2).toBeGreaterThan(900);
  });

  it('zero-weight entry never sampled', () => {
    const s = new AliasMethodSampler([0, 1], seeded(11));
    for (let i = 0; i < 500; i++) expect(s.sample()).toBe(1);
  });

  it('handles many bins', () => {
    const w = Array.from({ length: 50 }, (_, i) => i + 1);
    const s = new AliasMethodSampler(w, seeded(99));
    for (let i = 0; i < 200; i++) {
      const x = s.sample();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(50);
    }
  });
});
