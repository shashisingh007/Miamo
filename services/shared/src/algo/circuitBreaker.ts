/**
 * circuitBreaker \u2014 Phase 13/14 pure circuit-breaker state machine.
 *
 * Wraps downstream calls (Redis, embedding worker, external HTTP) so a
 * sudden burst of failures opens the circuit and short-circuits new calls
 * for a cooldown window. Pure: state is in, state is out, caller persists.
 *
 * States:
 *   closed       calls pass through; failures increment counter.
 *   open         calls short-circuited; after `cooldownMs` transitions to half-open.
 *   half-open    next call is a probe; success -> closed, failure -> open.
 *
 * Tunables:
 *   failureThreshold   consecutive failures in `closed` to trip the breaker.
 *   cooldownMs         time the breaker stays open before half-open probe.
 */
export type BreakerState = 'closed' | 'open' | 'half-open';

export type BreakerStatus = {
  state: BreakerState;
  consecutiveFailures: number;
  openedAtMs: number | null;
};

export type BreakerOptions = {
  failureThreshold?: number;     // default 5
  cooldownMs?: number;           // default 30s
};

const DEFAULT_THRESHOLD = 5;
const DEFAULT_COOLDOWN_MS = 30_000;

export function initialBreaker(): BreakerStatus {
  return { state: 'closed', consecutiveFailures: 0, openedAtMs: null };
}

/** Should this call be allowed through? Pure: also returns the *new state*
 *  (e.g. open → half-open transition after cooldown elapses). */
export function allow(s: BreakerStatus, nowMs: number, opts: BreakerOptions = {}): { allowed: boolean; next: BreakerStatus } {
  const cooldown = opts.cooldownMs ?? DEFAULT_COOLDOWN_MS;
  if (s.state === 'closed')    return { allowed: true, next: s };
  if (s.state === 'half-open') return { allowed: true, next: s };
  // open
  const openedAt = s.openedAtMs ?? nowMs;
  if (nowMs - openedAt >= cooldown) {
    return { allowed: true, next: { state: 'half-open', consecutiveFailures: s.consecutiveFailures, openedAtMs: openedAt } };
  }
  return { allowed: false, next: s };
}

export function onSuccess(_s: BreakerStatus): BreakerStatus {
  return initialBreaker();
}

export function onFailure(s: BreakerStatus, nowMs: number, opts: BreakerOptions = {}): BreakerStatus {
  const threshold = opts.failureThreshold ?? DEFAULT_THRESHOLD;
  if (s.state === 'half-open') {
    return { state: 'open', consecutiveFailures: s.consecutiveFailures + 1, openedAtMs: nowMs };
  }
  const n = s.consecutiveFailures + 1;
  if (n >= threshold) {
    return { state: 'open', consecutiveFailures: n, openedAtMs: nowMs };
  }
  return { state: 'closed', consecutiveFailures: n, openedAtMs: null };
}
