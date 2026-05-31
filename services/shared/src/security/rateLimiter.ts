/**
 * Phase 20 — token-bucket rate limiter (OWASP A04 — insecure design).
 *
 * Pure in-memory limiter with stable behaviour under burst + sustained
 * traffic. Caller supplies "now" so the limiter is fully deterministic in
 * tests; production wires `Date.now`.
 *
 *   capacity:   max tokens the bucket can hold (burst budget)
 *   refillPerSec: how fast the bucket replenishes
 *
 * Returns `{ allowed, remaining, retryAfterMs }`. `retryAfterMs` is the
 * caller-friendly time-to-wait before a 1-cost request would succeed.
 */
export type RateLimitOptions = {
  capacity: number;
  refillPerSec: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Bucket = { tokens: number; updatedAtMs: number };

export class TokenBucketLimiter {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly opts: RateLimitOptions) {
    if (opts.capacity <= 0) throw new Error('capacity must be > 0');
    if (opts.refillPerSec <= 0) throw new Error('refillPerSec must be > 0');
  }

  /** Consume `cost` tokens for `key` at `nowMs`. Returns decision. */
  take(key: string, nowMs: number, cost = 1): RateLimitDecision {
    if (cost <= 0) throw new Error('cost must be > 0');
    const b = this.refill(key, nowMs);

    if (b.tokens >= cost) {
      b.tokens -= cost;
      return { allowed: true, remaining: Math.floor(b.tokens), retryAfterMs: 0 };
    }

    const deficit = cost - b.tokens;
    const retryAfterMs = Math.ceil((deficit / this.opts.refillPerSec) * 1000);
    return { allowed: false, remaining: Math.floor(b.tokens), retryAfterMs };
  }

  /** For tests/admin: read current token count without consuming. */
  peek(key: string, nowMs: number): number {
    return this.refill(key, nowMs).tokens;
  }

  /** Forget a key (e.g. on logout). */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Drop buckets idle for longer than `maxIdleMs`. Returns count evicted. */
  sweep(nowMs: number, maxIdleMs: number): number {
    let evicted = 0;
    for (const [k, b] of this.buckets) {
      if (nowMs - b.updatedAtMs > maxIdleMs) {
        this.buckets.delete(k);
        evicted += 1;
      }
    }
    return evicted;
  }

  size(): number { return this.buckets.size; }

  private refill(key: string, nowMs: number): Bucket {
    const existing = this.buckets.get(key);
    if (!existing) {
      const fresh: Bucket = { tokens: this.opts.capacity, updatedAtMs: nowMs };
      this.buckets.set(key, fresh);
      return fresh;
    }
    const elapsedSec = Math.max(0, (nowMs - existing.updatedAtMs) / 1000);
    existing.tokens = Math.min(this.opts.capacity, existing.tokens + elapsedSec * this.opts.refillPerSec);
    existing.updatedAtMs = nowMs;
    return existing;
  }
}
