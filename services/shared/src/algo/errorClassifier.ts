/**
 * errorClassifier \u2014 Phase 18 unified error-class taxonomy (pure).
 *
 * Maps an arbitrary thrown value to a stable category used by retry,
 * alerting, and tracing. Pure & deterministic so it can run in tests
 * and on the edge.
 *
 *   transient   \u2192 retry with backoff
 *   timeout     \u2192 retry (capped)
 *   auth        \u2192 surface 401/403, do not retry
 *   client      \u2192 4xx-like, do not retry
 *   server      \u2192 5xx-like, retry small N times
 *   integrity   \u2192 alert immediately, do not retry
 *   unknown     \u2192 alert + do not retry
 */
export type ErrorClass =
  | 'transient'
  | 'timeout'
  | 'auth'
  | 'client'
  | 'server'
  | 'integrity'
  | 'unknown';

export type ErrorClassification = {
  class: ErrorClass;
  retryable: boolean;
  statusHint: number; // suggested HTTP status if surfacing
};

const TRANSIENT_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'EPIPE', 'ENETUNREACH', 'EHOSTUNREACH']);
const TIMEOUT_CODES = new Set(['ETIMEDOUT', 'ESOCKETTIMEDOUT']);

export function classifyError(err: unknown): ErrorClassification {
  if (err == null) return { class: 'unknown', retryable: false, statusHint: 500 };

  const e: any = err;
  const code: string | undefined = typeof e.code === 'string' ? e.code : undefined;
  const status: number | undefined = typeof e.status === 'number' ? e.status
    : typeof e.statusCode === 'number' ? e.statusCode : undefined;
  const name: string = typeof e.name === 'string' ? e.name : '';
  const msg: string = typeof e.message === 'string' ? e.message.toLowerCase() : '';

  if (code && TIMEOUT_CODES.has(code)) return { class: 'timeout', retryable: true, statusHint: 504 };
  if (code && TRANSIENT_CODES.has(code)) return { class: 'transient', retryable: true, statusHint: 502 };
  if (name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out')) {
    return { class: 'timeout', retryable: true, statusHint: 504 };
  }

  if (typeof status === 'number') {
    if (status === 401 || status === 403) return { class: 'auth', retryable: false, statusHint: status };
    if (status === 408 || status === 504) return { class: 'timeout', retryable: true, statusHint: status };
    if (status === 429) return { class: 'transient', retryable: true, statusHint: 429 };
    if (status >= 500 && status < 600) return { class: 'server', retryable: true, statusHint: status };
    if (status >= 400 && status < 500) return { class: 'client', retryable: false, statusHint: status };
  }

  if (msg.includes('checksum') || msg.includes('integrity') || msg.includes('signature mismatch')) {
    return { class: 'integrity', retryable: false, statusHint: 502 };
  }

  return { class: 'unknown', retryable: false, statusHint: 500 };
}
