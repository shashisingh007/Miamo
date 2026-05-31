// Circuit breaker state machine — additive infra. New symbols only.

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number; // consecutive failures to open
  resetMs: number; // time before half-open probe
  halfOpenSuccessesToClose?: number; // default 1
  now?: () => number;
}

export interface CircuitBreaker {
  readonly state: CircuitState;
  recordSuccess(): void;
  recordFailure(): void;
  canExecute(): boolean;
  forceOpen(): void;
  reset(): void;
  readonly stats: { consecutiveFailures: number; halfOpenSuccesses: number; openedAt: number | null };
}

export function createCircuitBreaker(opts: CircuitBreakerOptions): CircuitBreaker {
  if (!Number.isInteger(opts.failureThreshold) || opts.failureThreshold <= 0) {
    throw new Error('failureThreshold must be a positive integer');
  }
  if (!Number.isFinite(opts.resetMs) || opts.resetMs <= 0) {
    throw new Error('resetMs must be positive');
  }
  const halfOpenSuccessesToClose = opts.halfOpenSuccessesToClose ?? 1;
  if (!Number.isInteger(halfOpenSuccessesToClose) || halfOpenSuccessesToClose <= 0) {
    throw new Error('halfOpenSuccessesToClose must be a positive integer');
  }
  const now = opts.now ?? (() => Date.now());

  let state: CircuitState = 'closed';
  let consecutiveFailures = 0;
  let halfOpenSuccesses = 0;
  let openedAt: number | null = null;

  function maybeTransitionToHalfOpen(): void {
    if (state === 'open' && openedAt !== null && now() - openedAt >= opts.resetMs) {
      state = 'half-open';
      halfOpenSuccesses = 0;
    }
  }

  return {
    get state() {
      maybeTransitionToHalfOpen();
      return state;
    },
    get stats() {
      return { consecutiveFailures, halfOpenSuccesses, openedAt };
    },
    canExecute() {
      maybeTransitionToHalfOpen();
      return state !== 'open';
    },
    recordSuccess() {
      maybeTransitionToHalfOpen();
      if (state === 'half-open') {
        halfOpenSuccesses++;
        if (halfOpenSuccesses >= halfOpenSuccessesToClose) {
          state = 'closed';
          consecutiveFailures = 0;
          halfOpenSuccesses = 0;
          openedAt = null;
        }
      } else if (state === 'closed') {
        consecutiveFailures = 0;
      }
    },
    recordFailure() {
      maybeTransitionToHalfOpen();
      if (state === 'half-open') {
        state = 'open';
        openedAt = now();
        halfOpenSuccesses = 0;
        return;
      }
      consecutiveFailures++;
      if (consecutiveFailures >= opts.failureThreshold && state === 'closed') {
        state = 'open';
        openedAt = now();
      }
    },
    forceOpen() {
      state = 'open';
      openedAt = now();
      halfOpenSuccesses = 0;
    },
    reset() {
      state = 'closed';
      consecutiveFailures = 0;
      halfOpenSuccesses = 0;
      openedAt = null;
    },
  };
}
