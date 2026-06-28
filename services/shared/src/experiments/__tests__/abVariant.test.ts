import { describe, it, expect } from 'vitest';
import { hashKey, pickVariant, pickAB } from '../abVariant';

describe('hashKey', () => {
  it('is deterministic', () => {
    expect(hashKey('user-123:reasonChipsExp')).toBe(hashKey('user-123:reasonChipsExp'));
  });
  it('returns a 32-bit unsigned integer', () => {
    const h = hashKey('anything');
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(0x1_0000_0000);
    expect(Number.isInteger(h)).toBe(true);
  });
  it('differs across small input changes', () => {
    expect(hashKey('a')).not.toBe(hashKey('b'));
  });
});

describe('pickVariant', () => {
  it('throws on empty variants', () => {
    expect(() => pickVariant('k', [])).toThrow();
  });
  it('throws on negative weight', () => {
    expect(() => pickVariant('k', [{ id: 'x', weight: -1 }])).toThrow();
  });
  it('is deterministic per key', () => {
    const variants = [
      { id: 'a' as const, weight: 1 },
      { id: 'b' as const, weight: 1 },
    ];
    const first = pickVariant('user-42', variants);
    for (let i = 0; i < 20; i++) {
      expect(pickVariant('user-42', variants)).toBe(first);
    }
  });
  it('all-zero weights falls through to first variant', () => {
    expect(pickVariant('k', [{ id: 'a', weight: 0 }, { id: 'b', weight: 0 }])).toBe('a');
  });
  it('approximates the configured split over many keys', () => {
    const variants = [
      { id: 'A' as const, weight: 3 },
      { id: 'B' as const, weight: 1 },
    ];
    let a = 0, b = 0;
    for (let i = 0; i < 4000; i++) {
      const v = pickVariant(`user-${i}`, variants);
      if (v === 'A') a++; else b++;
    }
    const ratio = a / (a + b);
    expect(ratio).toBeGreaterThan(0.70);
    expect(ratio).toBeLessThan(0.80);
  });
  it('honours single-variant lists', () => {
    expect(pickVariant('k', [{ id: 'only', weight: 5 }])).toBe('only');
  });
});

describe('pickAB', () => {
  it('returns one of the two options', () => {
    const r = pickAB('k', 'control', 'treat');
    expect(['control', 'treat']).toContain(r);
  });
  it('approximates 50/50 over many keys', () => {
    let c = 0;
    for (let i = 0; i < 4000; i++) {
      if (pickAB(`u-${i}`, 'A', 'B') === 'A') c++;
    }
    const ratio = c / 4000;
    expect(ratio).toBeGreaterThan(0.45);
    expect(ratio).toBeLessThan(0.55);
  });
});
