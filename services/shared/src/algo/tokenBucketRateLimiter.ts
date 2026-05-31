/**
 * Pure token-bucket rate limiter.
 *
 * Lazy refill on each `tryConsume(nowMs, cost)`. State is plain serializable data
 * so callers can persist it in Redis/Postgres between requests.
 */

export interface TokenBucketState {
  /** maximum tokens the bucket can hold */
  capacity: number;
  /** tokens added per second */
  refillPerSec: number;
  /** current token balance (may be fractional during refill) */
  tokens: number;
  /** last update timestamp in ms */
  updatedAtMs: number;
}

export interface TokenBucketDecision {
  state: TokenBucketState;
  allowed: boolean;
  /** ms until enough tokens for the requested cost will exist; 0 if allowed now */
  retryAfterMs: number;
  /** tokens remaining after this attempt (unchanged when denied) */
  remaining: number;
}

export function createTokenBucket(
  capacity: number,
  refillPerSec: number,
  nowMs: number,
  initialTokens?: number
): TokenBucketState {
  if (!Number.isFinite(capacity) || capacity <= 0) {
    throw new RangeError('capacity must be > 0');
  }
  if (!Number.isFinite(refillPerSec) || refillPerSec < 0) {
    throw new RangeError('refillPerSec must be >= 0');
  }
  if (!Number.isFinite(nowMs)) throw new RangeError('nowMs must be finite');
  const t =
    initialTokens == null
      ? capacity
      : Math.max(0, Math.min(capacity, initialTokens));
  return {
    capacity,
    refillPerSec,
    tokens: t,
    updatedAtMs: nowMs,
  };
}

export function refillTokenBucket(
  state: TokenBucketState,
  nowMs: number
): TokenBucketState {
  if (!Number.isFinite(nowMs) || nowMs <= state.updatedAtMs) {
    return state;
  }
  const elapsedMs = nowMs - state.updatedAtMs;
  const added = (elapsedMs / 1000) * state.refillPerSec;
  const tokens = Math.min(state.capacity, state.tokens + added);
  return { ...state, tokens, updatedAtMs: nowMs };
}

export function tryConsumeTokens(
  state: TokenBucketState,
  nowMs: number,
  cost = 1
): TokenBucketDecision {
  if (!Number.isFinite(cost) || cost <= 0) {
    return {
      state,
      allowed: false,
      retryAfterMs: 0,
      remaining: state.tokens,
    };
  }
  if (cost > state.capacity) {
    // can never be satisfied
    return { state, allowed: false, retryAfterMs: Infinity, remaining: state.tokens };
  }
  const refilled = refillTokenBucket(state, nowMs);
  if (refilled.tokens >= cost) {
    const next: TokenBucketState = {
      ...refilled,
      tokens: refilled.tokens - cost,
    };
    return { state: next, allowed: true, retryAfterMs: 0, remaining: next.tokens };
  }
  const deficit = cost - refilled.tokens;
  const retryAfterMs =
    refilled.refillPerSec > 0
      ? Math.ceil((deficit / refilled.refillPerSec) * 1000)
      : Infinity;
  return {
    state: refilled,
    allowed: false,
    retryAfterMs,
    remaining: refilled.tokens,
  };
}
