import { describe, it, expect } from 'vitest';
import { xxhash32 } from '../xxhash32';

describe('xxhash32', () => {
  it('empty string seed 0', () => {
    // Reference: xxhash32("", 0) = 0x02cc5d05
    expect(xxhash32('', 0)).toBe(0x02cc5d05);
  });

  it('empty string seed 1', () => {
    // Reference: 0x0b2cb792
    expect(xxhash32('', 1)).toBe(0x0b2cb792);
  });

  it('deterministic', () => {
    expect(xxhash32('hello', 0)).toBe(xxhash32('hello', 0));
  });

  it('different seeds differ', () => {
    expect(xxhash32('hello', 0)).not.toBe(xxhash32('hello', 1));
  });

  it('accepts Uint8Array', () => {
    expect(xxhash32(new TextEncoder().encode('hello'), 0)).toBe(xxhash32('hello', 0));
  });

  it('rejects bad seed', () => {
    expect(() => xxhash32('x', NaN)).toThrow();
  });

  it('rejects bad input', () => {
    expect(() => xxhash32(123 as any)).toThrow();
  });

  it('returns unsigned 32-bit', () => {
    for (let i = 0; i < 64; i++) {
      const h = xxhash32('item-' + i, 0);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('handles small inputs 1..15', () => {
    for (let len = 1; len <= 15; len++) {
      const s = 'x'.repeat(len);
      const h = xxhash32(s, 0);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });

  it('handles inputs >= 16', () => {
    for (let len = 16; len <= 100; len += 5) {
      const s = 'x'.repeat(len);
      const h = xxhash32(s, 0);
      expect(h).toBeGreaterThanOrEqual(0);
    }
  });

  it('long input ok', () => {
    expect(typeof xxhash32('a'.repeat(10000), 0)).toBe('number');
  });

  it('avalanche: bit-flip differs', () => {
    expect(xxhash32('abc', 0)).not.toBe(xxhash32('abd', 0));
  });

  it('low collision 10k', () => {
    const seen = new Set<number>();
    let coll = 0;
    for (let i = 0; i < 10000; i++) {
      const h = xxhash32('k-' + i, 0);
      if (seen.has(h)) coll++;
      else seen.add(h);
    }
    expect(coll).toBeLessThan(20);
  });

  it('boundary at 16 bytes', () => {
    expect(typeof xxhash32('x'.repeat(16), 0)).toBe('number');
  });

  it('boundary at 32 bytes', () => {
    expect(typeof xxhash32('x'.repeat(32), 0)).toBe('number');
  });

  it('seed defaults to 0', () => {
    expect(xxhash32('hello')).toBe(xxhash32('hello', 0));
  });

  it('unicode utf-8', () => {
    const a = xxhash32('café', 0);
    const b = xxhash32(new TextEncoder().encode('café'), 0);
    expect(a).toBe(b);
  });
});
