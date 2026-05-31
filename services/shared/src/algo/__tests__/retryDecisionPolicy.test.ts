import { describe, it, expect } from 'vitest';
import { decideRetry } from '../retryDecisionPolicy';

const base = { attempt: 0, maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 10_000, jitter: 0 };

describe('retryDecisionPolicy', () => {
  it('200 -> success non-retryable', () => {
    const r = decideRetry({ ...base, statusCode: 200 });
    expect(r.shouldRetry).toBe(false);
    expect(r.reason).toBe('success');
  });

  it('500 -> retryable with exponential backoff', () => {
    const r = decideRetry({ ...base, statusCode: 500 });
    expect(r.shouldRetry).toBe(true);
    expect(r.delayMs).toBe(100);
    expect(r.nextAttempt).toBe(1);
  });

  it('502 attempt=2 -> delay 400', () => {
    const r = decideRetry({ ...base, statusCode: 502, attempt: 2 });
    expect(r.delayMs).toBe(400);
  });

  it('408 treated as retryable', () => {
    const r = decideRetry({ ...base, statusCode: 408 });
    expect(r.shouldRetry).toBe(true);
  });

  it('400 -> client_error non-retryable', () => {
    const r = decideRetry({ ...base, statusCode: 400 });
    expect(r.shouldRetry).toBe(false);
    expect(r.reason).toBe('client_error');
  });

  it('404 -> client_error non-retryable', () => {
    const r = decideRetry({ ...base, statusCode: 404 });
    expect(r.shouldRetry).toBe(false);
  });

  it('429 -> rate_limited honors retryAfterMs', () => {
    const r = decideRetry({ ...base, statusCode: 429, retryAfterMs: 5_000 });
    expect(r.classification).toBe('rate_limited');
    expect(r.delayMs).toBe(5_000);
  });

  it('429 retryAfterMs capped to maxDelayMs', () => {
    const r = decideRetry({ ...base, statusCode: 429, retryAfterMs: 60_000 });
    expect(r.delayMs).toBe(10_000);
  });

  it('429 without retryAfter falls back to backoff', () => {
    const r = decideRetry({ ...base, statusCode: 429 });
    expect(r.delayMs).toBe(100);
  });

  it('network error code -> retryable', () => {
    const r = decideRetry({ ...base, errorCode: 'ECONNRESET' });
    expect(r.shouldRetry).toBe(true);
    expect(r.reason).toBe('network_error');
  });

  it('unknown error code -> non-retryable', () => {
    const r = decideRetry({ ...base, errorCode: 'EWEIRD' });
    expect(r.shouldRetry).toBe(false);
    expect(r.reason).toBe('unknown');
  });

  it('exhausted attempts -> shouldRetry=false', () => {
    const r = decideRetry({ ...base, statusCode: 500, attempt: 4, maxAttempts: 5 });
    expect(r.shouldRetry).toBe(false);
    expect(r.reason).toBe('attempts_exhausted');
  });

  it('delay capped at maxDelayMs', () => {
    const r = decideRetry({ ...base, statusCode: 500, attempt: 20 });
    expect(r.delayMs).toBeLessThanOrEqual(10_000);
  });

  it('no code, no error -> non-retryable unknown', () => {
    const r = decideRetry({ ...base });
    expect(r.shouldRetry).toBe(false);
    expect(r.reason).toBe('unknown');
  });

  it('maxAttempts floor=1', () => {
    const r = decideRetry({ ...base, statusCode: 500, maxAttempts: 0 });
    expect(r.shouldRetry).toBe(false);
  });
});
