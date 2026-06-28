import { describe, it, expect } from 'vitest';
import { makeRng, seedFromString } from '../seedRandom';

describe('seedFromString', () => {
  it('is deterministic for the same input', () => {
    expect(seedFromString('user-42')).toBe(seedFromString('user-42'));
  });
  it('distinguishes similar strings', () => {
    expect(seedFromString('user-42')).not.toBe(seedFromString('user-43'));
  });
  it('returns a 32-bit unsigned int', () => {
    const h = seedFromString('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe('makeRng.next', () => {
  it('produces values in [0, 1)', () => {
    const rng = makeRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('is deterministic for the same seed', () => {
    const a = makeRng(7); const b = makeRng(7);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });
  it('diverges for different seeds', () => {
    const a = makeRng(1).next();
    const b = makeRng(2).next();
    expect(a).not.toBe(b);
  });
});

describe('makeRng.nextInt', () => {
  it('respects [lo, hi] bounds', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(5, 9);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(9);
    }
  });
  it('returns lo when hi < lo', () => {
    expect(makeRng(1).nextInt(10, 3)).toBe(10);
  });
});

describe('makeRng.pick', () => {
  it('returns null for empty array', () => {
    expect(makeRng(1).pick([])).toBeNull();
  });
  it('returns an element from the array', () => {
    const xs = ['a', 'b', 'c'];
    const v = makeRng(1).pick(xs);
    expect(xs).toContain(v);
  });
  it('is deterministic for fixed seed', () => {
    expect(makeRng(42).pick(['x', 'y', 'z'])).toBe(makeRng(42).pick(['x', 'y', 'z']));
  });
});
