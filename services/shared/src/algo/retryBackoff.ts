/**
 * retryBackoff \u2014 Phase 13/14 retry-with-jitter policy (pure).
 *
 * Companion to `circuitBreaker`. Given an attempt number returns the
 * delay before the next retry. Uses "decorrelated jitter" (AWS-style)
 * which avoids the thundering-herd that fixed-exponential creates.
 *
 *   delay = min(maxMs, randIn(baseMs, max(baseMs, prevDelay) * 3))
 *
 * `nextDelayMs` is pure and deterministic given a seeded random value in
 * [0, 1) (`rand`). Callers can pass `Math.random` or a seeded PRNG.
 */
export type RetryPolicy = {
  baseMs?: number;       // default 100
  maxMs?: number;        // default 30_000
  maxAttempts?: number;  // default 5
};

const DEFAULT_BASE = 100;
const DEFAULT_MAX = 30_000;
const DEFAULT_MAX_ATTEMPTS = 5;

/** Should we attempt retry number `attempt` (1-indexed)? */
export function shouldRetry(attempt: number, policy: RetryPolicy = {}): boolean {
  const max = policy.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  return attempt > 0 && attempt <= max;
}

/** Compute the delay before retry `attempt`. `prevDelayMs` is the last
 *  delay used (0 for the first retry). `rand` is in [0, 1). */
export function nextDelayMs(
  attempt: number,
  prevDelayMs: number,
  rand: number,
  policy: RetryPolicy = {},
): number {
  if (attempt <= 0) return 0;
  const base = Math.max(1, policy.baseMs ?? DEFAULT_BASE);
  const cap  = Math.max(base, policy.maxMs ?? DEFAULT_MAX);
  const r = Math.max(0, Math.min(1, Number.isFinite(rand) ? rand : 0));
  const lo = base;
  const hi = Math.max(base, prevDelayMs) * 3;
  const sampled = lo + r * (hi - lo);
  return Math.min(cap, Math.round(sampled));
}

/** Convenience: generate a deterministic sequence of delays for testing /
 *  pre-flight. Uses caller-supplied PRNG so output is reproducible. */
export function delaySchedule(
  rand: () => number,
  policy: RetryPolicy = {},
): number[] {
  const max = policy.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const out: number[] = [];
  let prev = 0;
  for (let a = 1; a <= max; a++) {
    const d = nextDelayMs(a, prev, rand(), policy);
    out.push(d);
    prev = d;
  }
  return out;
}
