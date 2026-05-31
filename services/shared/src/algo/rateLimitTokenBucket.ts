/**
 * rateLimitTokenBucket \u2014 Phase 9/20 pure token-bucket calculator.
 *
 * Pure function (no clocks, no I/O) suitable for both edge gateway and
 * server-side enforcement. Caller persists state externally; this just
 * computes the next state + decision.
 *
 *   const next = stepTokenBucket(prev, { nowMs, capacity, refillPerSec, cost });
 *   if (!next.allowed) reject();
 */
export type TokenBucketState = { tokens: number; updatedMs: number };

export type TokenBucketStep = {
  nowMs: number;
  capacity: number;       // max tokens
  refillPerSec: number;   // tokens added per second
  cost?: number;          // tokens consumed by this call; default 1
};

export type TokenBucketResult = {
  allowed: boolean;
  next: TokenBucketState;
  remaining: number;
  retryAfterMs: number;   // 0 when allowed; else ms until enough tokens
};

export function initTokenBucket(capacity: number, nowMs: number): TokenBucketState {
  return { tokens: Math.max(0, capacity), updatedMs: nowMs };
}

export function stepTokenBucket(prev: TokenBucketState, step: TokenBucketStep): TokenBucketResult {
  const capacity = Math.max(1, step.capacity);
  const refill = Math.max(0, step.refillPerSec);
  const cost = Math.max(0, step.cost ?? 1);

  const elapsedMs = Math.max(0, step.nowMs - (prev?.updatedMs ?? step.nowMs));
  const refilled = Math.min(capacity, (prev?.tokens ?? capacity) + (refill * elapsedMs) / 1000);

  if (cost === 0) {
    return { allowed: true, next: { tokens: refilled, updatedMs: step.nowMs }, remaining: refilled, retryAfterMs: 0 };
  }

  if (refilled >= cost) {
    const tokens = refilled - cost;
    return { allowed: true, next: { tokens, updatedMs: step.nowMs }, remaining: tokens, retryAfterMs: 0 };
  }

  const deficit = cost - refilled;
  const retryAfterMs = refill > 0 ? Math.ceil((deficit / refill) * 1000) : Number.POSITIVE_INFINITY;
  return {
    allowed: false,
    next: { tokens: refilled, updatedMs: step.nowMs },
    remaining: refilled,
    retryAfterMs,
  };
}
