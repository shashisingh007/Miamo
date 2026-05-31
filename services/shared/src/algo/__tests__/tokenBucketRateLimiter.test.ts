import { describe, it, expect } from 'vitest';
import {
  createTokenBucket,
  refillTokenBucket,
  tryConsumeTokens,
} from '../tokenBucketRateLimiter';

describe('tokenBucketRateLimiter', () => {
  it('createTokenBucket validates args', () => {
    expect(() => createTokenBucket(0, 1, 0)).toThrow(RangeError);
    expect(() => createTokenBucket(10, -1, 0)).toThrow(RangeError);
    expect(() => createTokenBucket(10, 1, Number.NaN)).toThrow(RangeError);
  });

  it('starts full by default', () => {
    const b = createTokenBucket(10, 1, 0);
    expect(b.tokens).toBe(10);
  });

  it('clamps initial tokens to [0, capacity]', () => {
    expect(createTokenBucket(10, 1, 0, -5).tokens).toBe(0);
    expect(createTokenBucket(10, 1, 0, 50).tokens).toBe(10);
  });

  it('refill adds tokens based on elapsed time', () => {
    const b = createTokenBucket(10, 2, 0, 0);
    const r = refillTokenBucket(b, 1000);
    expect(r.tokens).toBe(2);
    expect(r.updatedAtMs).toBe(1000);
  });

  it('refill caps at capacity', () => {
    const b = createTokenBucket(10, 100, 0, 0);
    const r = refillTokenBucket(b, 1000);
    expect(r.tokens).toBe(10);
  });

  it('refill is a no-op when time goes backwards', () => {
    const b = createTokenBucket(10, 1, 1000, 5);
    expect(refillTokenBucket(b, 500)).toBe(b);
  });

  it('consume succeeds when tokens available', () => {
    const b = createTokenBucket(10, 1, 0);
    const d = tryConsumeTokens(b, 0, 3);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(7);
    expect(d.retryAfterMs).toBe(0);
  });

  it('consume fails and reports retry-after when empty', () => {
    const b = createTokenBucket(10, 2, 0, 0);
    const d = tryConsumeTokens(b, 0, 1);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterMs).toBe(500);
    expect(d.remaining).toBe(0);
  });

  it('consume of cost > capacity is permanently denied', () => {
    const b = createTokenBucket(5, 1, 0);
    const d = tryConsumeTokens(b, 0, 10);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterMs).toBe(Infinity);
  });

  it('consume after enough refill succeeds', () => {
    const empty = createTokenBucket(10, 5, 0, 0);
    const d = tryConsumeTokens(empty, 1000, 3);
    expect(d.allowed).toBe(true);
    expect(d.remaining).toBe(2);
  });

  it('consume rejects non-positive cost without mutating state', () => {
    const b = createTokenBucket(10, 1, 0);
    const d = tryConsumeTokens(b, 0, 0);
    expect(d.allowed).toBe(false);
    expect(d.state).toBe(b);
  });

  it('zero refill rate denies indefinitely when empty', () => {
    const b = createTokenBucket(10, 0, 0, 0);
    const d = tryConsumeTokens(b, 5000, 1);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterMs).toBe(Infinity);
  });

  it('successive consumes preserve balance via returned state', () => {
    let s = createTokenBucket(10, 1, 0);
    s = tryConsumeTokens(s, 0, 4).state;
    s = tryConsumeTokens(s, 0, 3).state;
    expect(s.tokens).toBe(3);
  });

  it('retry-after rounds up to whole ms', () => {
    const b = createTokenBucket(10, 3, 0, 0); // 3 tokens/sec → 1 token = 333.33ms
    const d = tryConsumeTokens(b, 0, 1);
    expect(d.retryAfterMs).toBe(334);
  });
});
