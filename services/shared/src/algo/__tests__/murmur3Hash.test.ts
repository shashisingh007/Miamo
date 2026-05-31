import { describe, it, expect } from 'vitest';
import { murmur3Hash32 } from '../murmur3Hash';

describe('murmur3Hash32', () => {
  it('empty string with seed 0 => 0', () => {
    expect(murmur3Hash32('', 0)).toBe(0);
  });

  it('known: "hello" seed 0', () => {
    // Reference: Murmur3_x86_32("hello", 0) = 0x248bfa47 = 613153351
    expect(murmur3Hash32('hello', 0)).toBe(0x248bfa47);
  });

  it('known: "The quick brown fox jumps over the lazy dog" seed 0', () => {
    // Reference: 0x2e4ff723 = 776992035
    expect(murmur3Hash32('The quick brown fox jumps over the lazy dog', 0)).toBe(0x2e4ff723);
  });

  it('known: "a" seed 0', () => {
    // Reference: 0x3c2569b2
    expect(murmur3Hash32('a', 0)).toBe(0x3c2569b2);
  });

  it('different seeds give different hashes', () => {
    expect(murmur3Hash32('hello', 0)).not.toBe(murmur3Hash32('hello', 1));
  });

  it('deterministic for same inputs', () => {
    expect(murmur3Hash32('abc', 42)).toBe(murmur3Hash32('abc', 42));
  });

  it('accepts Uint8Array', () => {
    const bytes = new TextEncoder().encode('hello');
    expect(murmur3Hash32(bytes, 0)).toBe(murmur3Hash32('hello', 0));
  });

  it('rejects non-finite seed', () => {
    expect(() => murmur3Hash32('x', NaN)).toThrow();
  });

  it('returns unsigned 32-bit', () => {
    for (const s of ['', 'a', 'ab', 'abc', 'abcd', 'abcde', 'abcdef']) {
      const h = murmur3Hash32(s, 0);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(h)).toBe(true);
    }
  });

  it('handles long input', () => {
    const s = 'x'.repeat(10000);
    const h = murmur3Hash32(s, 0);
    expect(h).toBeGreaterThanOrEqual(0);
  });

  it('avalanche: small change flips many bits', () => {
    const a = murmur3Hash32('test-string-a', 0);
    const b = murmur3Hash32('test-string-b', 0);
    let diff = 0;
    let x = a ^ b;
    while (x) {
      diff += x & 1;
      x >>>= 1;
    }
    expect(diff).toBeGreaterThan(8);
  });

  it('low collision in 10k strings', () => {
    const seen = new Set<number>();
    let coll = 0;
    for (let i = 0; i < 10000; i++) {
      const h = murmur3Hash32('item-' + i, 0);
      if (seen.has(h)) coll++;
      else seen.add(h);
    }
    expect(coll).toBeLessThan(20);
  });

  it('tail length 1', () => {
    expect(typeof murmur3Hash32('abcde', 0)).toBe('number');
  });

  it('tail length 2', () => {
    expect(typeof murmur3Hash32('abcdef', 0)).toBe('number');
  });

  it('tail length 3', () => {
    expect(typeof murmur3Hash32('abcdefg', 0)).toBe('number');
  });

  it('tail length 0', () => {
    expect(typeof murmur3Hash32('abcd', 0)).toBe('number');
  });

  it('unicode handled via utf-8', () => {
    expect(murmur3Hash32('café', 0)).toBe(murmur3Hash32(new TextEncoder().encode('café'), 0));
  });

  it('seed param defaults to 0', () => {
    expect(murmur3Hash32('hello')).toBe(murmur3Hash32('hello', 0));
  });

  it('rejects non-string non-Uint8Array', () => {
    expect(() => murmur3Hash32(123 as any)).toThrow();
  });
});
