export type RetryClassification = 'retryable' | 'non_retryable' | 'rate_limited';

export type RetryDecision = {
  readonly classification: RetryClassification;
  readonly shouldRetry: boolean;
  readonly delayMs: number;
  readonly nextAttempt: number;
  readonly reason: RetryReason;
};

export type RetryReason =
  | 'success'
  | 'attempts_exhausted'
  | 'client_error'
  | 'server_error'
  | 'rate_limited'
  | 'network_error'
  | 'unknown';

export type RetryInput = {
  readonly statusCode?: number;
  readonly errorCode?: string;
  readonly retryAfterMs?: number;
  readonly attempt: number;
  readonly maxAttempts: number;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly jitter?: number; // [0,1]
};

const NETWORK_ERRORS = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EPIPE',
]);

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function decideRetry(input: RetryInput): RetryDecision {
  const attempt = Math.max(0, Math.floor(input.attempt));
  const maxAttempts = Math.max(1, Math.floor(input.maxAttempts));
  const baseDelay = clamp(input.baseDelayMs ?? 100, 0, 60_000);
  const maxDelay = clamp(input.maxDelayMs ?? 30_000, baseDelay, 5 * 60_000);
  const jitter = clamp(input.jitter ?? 0, 0, 1);

  const code = input.statusCode;
  const err = input.errorCode;

  let classification: RetryClassification;
  let reason: RetryReason;

  if (code && code >= 200 && code < 300) {
    return {
      classification: 'non_retryable',
      shouldRetry: false,
      delayMs: 0,
      nextAttempt: attempt,
      reason: 'success',
    };
  } else if (code === 429) {
    classification = 'rate_limited';
    reason = 'rate_limited';
  } else if (code && code >= 500 && code < 600) {
    classification = 'retryable';
    reason = 'server_error';
  } else if (code && code >= 400 && code < 500 && code !== 408) {
    classification = 'non_retryable';
    reason = 'client_error';
  } else if (code === 408) {
    classification = 'retryable';
    reason = 'server_error';
  } else if (err && NETWORK_ERRORS.has(err)) {
    classification = 'retryable';
    reason = 'network_error';
  } else if (!code && !err) {
    classification = 'non_retryable';
    reason = 'unknown';
  } else {
    classification = 'non_retryable';
    reason = 'unknown';
  }

  if (classification === 'non_retryable') {
    return { classification, shouldRetry: false, delayMs: 0, nextAttempt: attempt, reason };
  }

  if (attempt + 1 >= maxAttempts) {
    return {
      classification,
      shouldRetry: false,
      delayMs: 0,
      nextAttempt: attempt,
      reason: 'attempts_exhausted',
    };
  }

  let delay: number;
  if (classification === 'rate_limited' && typeof input.retryAfterMs === 'number' && input.retryAfterMs >= 0) {
    delay = Math.min(input.retryAfterMs, maxDelay);
  } else {
    const exp = Math.min(maxDelay, baseDelay * Math.pow(2, attempt));
    const jitterAmount = exp * jitter;
    // deterministic-friendly: caller can pass jitter=0 for stable tests
    delay = exp - jitterAmount / 2;
  }

  return {
    classification,
    shouldRetry: true,
    delayMs: Math.max(0, Math.floor(delay)),
    nextAttempt: attempt + 1,
    reason,
  };
}
