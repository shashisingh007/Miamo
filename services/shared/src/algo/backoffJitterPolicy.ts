/**
 * Pure backoff + jitter policies (AWS Architecture Blog "Exponential Backoff And Jitter").
 *
 * - full     : sleep = random(0, min(cap, base * 2^attempt))
 * - equal    : sleep = exp/2 + random(0, exp/2)
 * - decorrelated: sleep = min(cap, random(base, prev * 3))
 *
 * RNG is injectable so callers can deterministically test. All functions return
 * the next sleep in ms and the value to pass as `prev` next time.
 */

export type JitterStrategy = 'full' | 'equal' | 'decorrelated' | 'none';

export interface BackoffOptions {
  baseMs: number;
  capMs: number;
  attempt: number; // 0-based
  prevMs?: number; // only used by 'decorrelated'
  strategy: JitterStrategy;
  /** RNG returning [0, 1); defaults to Math.random */
  rng?: () => number;
}

export interface BackoffResult {
  sleepMs: number;
  nextPrevMs: number;
}

function expBackoff(baseMs: number, attempt: number, capMs: number): number {
  if (attempt < 0) attempt = 0;
  // 2^attempt; cap exponent so it can't overflow before clamping
  const exp = attempt > 30 ? Infinity : 2 ** attempt;
  return Math.min(capMs, baseMs * exp);
}

export function nextBackoffDelay(opts: BackoffOptions): BackoffResult {
  if (!Number.isFinite(opts.baseMs) || opts.baseMs <= 0) {
    throw new RangeError('baseMs must be > 0');
  }
  if (!Number.isFinite(opts.capMs) || opts.capMs < opts.baseMs) {
    throw new RangeError('capMs must be >= baseMs');
  }
  const rng = opts.rng ?? Math.random;
  const exp = expBackoff(opts.baseMs, opts.attempt, opts.capMs);

  let sleep: number;
  switch (opts.strategy) {
    case 'none':
      sleep = exp;
      break;
    case 'full':
      sleep = rng() * exp;
      break;
    case 'equal':
      sleep = exp / 2 + rng() * (exp / 2);
      break;
    case 'decorrelated': {
      const prev = Math.max(opts.prevMs ?? opts.baseMs, opts.baseMs);
      const upper = Math.min(opts.capMs, prev * 3);
      sleep = opts.baseMs + rng() * (upper - opts.baseMs);
      break;
    }
    default:
      throw new RangeError(`unknown strategy ${opts.strategy as string}`);
  }
  sleep = Math.max(0, Math.min(opts.capMs, sleep));
  return { sleepMs: sleep, nextPrevMs: sleep };
}
