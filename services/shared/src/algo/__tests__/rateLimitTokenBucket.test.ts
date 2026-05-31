import { describe, it, expect } from 'vitest';
import { initTokenBucket, stepTokenBucket } from '../rateLimitTokenBucket';

describe('rateLimitTokenBucket', () => {
  it('initTokenBucket starts at capacity', () => {
    const s = initTokenBucket(10, 1000);
    expect(s.tokens).toBe(10);
    expect(s.updatedMs).toBe(1000);
  });

  it('allows when tokens available, decrements by cost', () => {
    const s = initTokenBucket(5, 0);
    const r = stepTokenBucket(s, { nowMs: 0, capacity: 5, refillPerSec: 1, cost: 2 });
    expect(r.allowed).toBe(true);
    expect(r.next.tokens).toBe(3);
    expect(r.retryAfterMs).toBe(0);
  });

  it('denies when not enough tokens; reports retryAfterMs', () => {
    const empty = { tokens: 0, updatedMs: 0 };
    const r = stepTokenBucket(empty, { nowMs: 0, capacity: 5, refillPerSec: 2, cost: 1 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(500); // need 1 token at 2/sec
  });

  it('refills over time but caps at capacity', () => {
    const empty = { tokens: 0, updatedMs: 0 };
    const r = stepTokenBucket(empty, { nowMs: 60_000, capacity: 5, refillPerSec: 1, cost: 0 });
    expect(r.next.tokens).toBe(5);
  });

  it('cost defaults to 1', () => {
    const s = { tokens: 3, updatedMs: 0 };
    const r = stepTokenBucket(s, { nowMs: 0, capacity: 10, refillPerSec: 0 });
    expect(r.next.tokens).toBe(2);
  });

  it('zero refill + insufficient tokens -> retryAfterMs Infinity', () => {
    const r = stepTokenBucket({ tokens: 0, updatedMs: 0 }, { nowMs: 0, capacity: 1, refillPerSec: 0, cost: 1 });
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBe(Number.POSITIVE_INFINITY);
  });

  it('negative elapsed treated as 0 (clock skew)', () => {
    const r = stepTokenBucket({ tokens: 2, updatedMs: 1000 }, { nowMs: 0, capacity: 5, refillPerSec: 100, cost: 1 });
    expect(r.allowed).toBe(true);
    expect(r.next.tokens).toBe(1);
  });

  it('sequential calls deplete then refill correctly', () => {
    let s = initTokenBucket(2, 0);
    let r = stepTokenBucket(s, { nowMs: 0, capacity: 2, refillPerSec: 1 });
    expect(r.allowed).toBe(true);
    s = r.next;
    r = stepTokenBucket(s, { nowMs: 0, capacity: 2, refillPerSec: 1 });
    expect(r.allowed).toBe(true);
    s = r.next;
    r = stepTokenBucket(s, { nowMs: 0, capacity: 2, refillPerSec: 1 });
    expect(r.allowed).toBe(false);
    // wait 1s -> 1 token refilled
    r = stepTokenBucket(s, { nowMs: 1000, capacity: 2, refillPerSec: 1 });
    expect(r.allowed).toBe(true);
  });

  it('clamps capacity floor to 1', () => {
    const r = stepTokenBucket({ tokens: 0, updatedMs: 0 }, { nowMs: 0, capacity: 0, refillPerSec: 10, cost: 1 });
    expect(r.allowed).toBe(false);
  });

  it('cost=0 always allowed and updates timestamp', () => {
    const r = stepTokenBucket({ tokens: 1, updatedMs: 0 }, { nowMs: 5000, capacity: 10, refillPerSec: 1, cost: 0 });
    expect(r.allowed).toBe(true);
    expect(r.next.updatedMs).toBe(5000);
    expect(r.next.tokens).toBe(6);
  });
});
