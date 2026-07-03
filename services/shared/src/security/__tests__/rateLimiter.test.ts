import { describe, it, expect, beforeEach } from 'vitest';
import { TokenBucketLimiter } from '../rateLimiter';

describe('TokenBucketLimiter', () => {
  let lim: TokenBucketLimiter;

  beforeEach(() => {
    lim = new TokenBucketLimiter({ capacity: 5, refillPerSec: 1 });
  });

  it('allows up to capacity in a burst', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      const r = lim.take('u1', t);
      expect(r.allowed).toBe(true);
    }
    const blocked = lim.take('u1', t);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('reports accurate retryAfterMs', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) lim.take('u', t);
    const r = lim.take('u', t);
    // need 1 token, refill 1/s, so retry ≈ 1000ms
    expect(r.retryAfterMs).toBe(1000);
  });

  it('refills over time', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) lim.take('u', t);
    expect(lim.take('u', t).allowed).toBe(false);
    // 2 seconds later: 2 tokens refilled
    const later = t + 2000;
    expect(lim.take('u', later).allowed).toBe(true);
    expect(lim.take('u', later).allowed).toBe(true);
    expect(lim.take('u', later).allowed).toBe(false);
  });

  it('caps refill at capacity', () => {
    const t = 1_000_000;
    lim.take('u', t);
    expect(lim.peek('u', t + 999_999_999)).toBe(5);
  });

  it('isolates buckets per key', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) lim.take('a', t);
    expect(lim.take('a', t).allowed).toBe(false);
    expect(lim.take('b', t).allowed).toBe(true);
  });

  it('cost > 1 consumes that many tokens', () => {
    const t = 1_000_000;
    const r = lim.take('u', t, 3);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it('reset() forgets a key', () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) lim.take('u', t);
    lim.reset('u');
    expect(lim.take('u', t).allowed).toBe(true);
  });

  it('sweep() evicts idle buckets', () => {
    const t = 1_000_000;
    lim.take('a', t);
    lim.take('b', t);
    expect(lim.size()).toBe(2);
    const evicted = lim.sweep(t + 10 * 60_000, 5 * 60_000);
    expect(evicted).toBe(2);
    expect(lim.size()).toBe(0);
  });

  it('rejects invalid construction', () => {
    expect(() => new TokenBucketLimiter({ capacity: 0, refillPerSec: 1 })).toThrow();
    expect(() => new TokenBucketLimiter({ capacity: 5, refillPerSec: 0 })).toThrow();
  });

  it('rejects cost <= 0', () => {
    expect(() => lim.take('u', 1_000, 0)).toThrow();
  });
});
