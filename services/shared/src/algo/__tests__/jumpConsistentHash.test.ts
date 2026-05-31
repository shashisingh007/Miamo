import { describe, it, expect } from 'vitest';
import { jumpConsistentHash } from '../jumpConsistentHash';

describe('jumpConsistentHash', () => {
  it('throws on invalid numBuckets', () => {
    expect(() => jumpConsistentHash(0, 0)).toThrow(RangeError);
    expect(() => jumpConsistentHash(0, -1)).toThrow(RangeError);
    expect(() => jumpConsistentHash(0, 1.5)).toThrow(RangeError);
  });

  it('throws on negative key (number)', () => {
    expect(() => jumpConsistentHash(-1, 4)).toThrow(TypeError);
  });

  it('throws on non-integer number key', () => {
    expect(() => jumpConsistentHash(1.5, 4)).toThrow(TypeError);
  });

  it('throws on negative bigint key', () => {
    expect(() => jumpConsistentHash(-1n, 4)).toThrow(RangeError);
  });

  it('numBuckets=1 always returns 0', () => {
    for (let i = 0; i < 50; i += 1) expect(jumpConsistentHash(i, 1)).toBe(0);
  });

  it('output in range', () => {
    for (let i = 0; i < 500; i += 1) {
      const b = jumpConsistentHash(i, 7);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(7);
    }
  });

  it('deterministic for same input', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(jumpConsistentHash(i, 10)).toBe(jumpConsistentHash(i, 10));
    }
  });

  it('distributes across buckets', () => {
    const n = 8;
    const counts = new Array(n).fill(0);
    for (let i = 0; i < 4000; i += 1) counts[jumpConsistentHash(i, n)] += 1;
    for (const c of counts) {
      expect(c).toBeGreaterThan(300);
      expect(c).toBeLessThan(900);
    }
  });

  it('minimal disruption on growth', () => {
    let moved = 0;
    const N = 1000;
    for (let i = 0; i < N; i += 1) {
      const a = jumpConsistentHash(i, 4);
      const b = jumpConsistentHash(i, 5);
      if (a !== b) moved += 1;
    }
    // Expected movement is ~N/5 (= 200); allow generous slack.
    expect(moved).toBeLessThan(N * 0.4);
    expect(moved).toBeGreaterThan(0);
  });

  it('accepts bigint key', () => {
    const b = jumpConsistentHash(0xdeadbeefn, 11);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(11);
  });

  it('canonical published vector: (1, 10) is stable', () => {
    // jumpConsistentHash(1, 10) is canonically 6 per Lamping/Veach paper.
    expect(jumpConsistentHash(1, 10)).toBe(6);
  });

  it('large numBuckets', () => {
    expect(jumpConsistentHash(42, 1_000_000)).toBeLessThan(1_000_000);
  });

  it('different keys land in different buckets sometimes', () => {
    const distinct = new Set<number>();
    for (let i = 0; i < 100; i += 1) distinct.add(jumpConsistentHash(i, 16));
    expect(distinct.size).toBeGreaterThan(8);
  });
});
