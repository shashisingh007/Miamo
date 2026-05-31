import { describe, it, expect } from 'vitest';
import { classifyError } from '../errorClassifier';

describe('errorClassifier', () => {
  it('null/undefined -> unknown not retryable', () => {
    expect(classifyError(null)).toEqual({ class: 'unknown', retryable: false, statusHint: 500 });
    expect(classifyError(undefined).class).toBe('unknown');
  });

  it('ECONNRESET -> transient retryable', () => {
    const c = classifyError({ code: 'ECONNRESET' });
    expect(c.class).toBe('transient');
    expect(c.retryable).toBe(true);
  });

  it('ETIMEDOUT -> timeout retryable', () => {
    const c = classifyError({ code: 'ETIMEDOUT' });
    expect(c.class).toBe('timeout');
    expect(c.statusHint).toBe(504);
  });

  it('AbortError name -> timeout', () => {
    expect(classifyError({ name: 'AbortError' }).class).toBe('timeout');
  });

  it('message timeout -> timeout', () => {
    expect(classifyError(new Error('Request timed out')).class).toBe('timeout');
  });

  it('status 401/403 -> auth not retryable', () => {
    expect(classifyError({ status: 401 })).toEqual({ class: 'auth', retryable: false, statusHint: 401 });
    expect(classifyError({ statusCode: 403 }).class).toBe('auth');
  });

  it('status 429 -> transient retryable', () => {
    expect(classifyError({ status: 429 }).retryable).toBe(true);
  });

  it('status 5xx -> server retryable', () => {
    expect(classifyError({ status: 503 })).toEqual({ class: 'server', retryable: true, statusHint: 503 });
  });

  it('status 4xx (non-auth/non-429) -> client not retryable', () => {
    const c = classifyError({ status: 422 });
    expect(c.class).toBe('client');
    expect(c.retryable).toBe(false);
  });

  it('integrity-ish message -> integrity not retryable', () => {
    expect(classifyError(new Error('checksum mismatch')).class).toBe('integrity');
    expect(classifyError(new Error('signature mismatch on payload')).class).toBe('integrity');
  });

  it('unknown shape -> unknown', () => {
    expect(classifyError({ foo: 'bar' }).class).toBe('unknown');
  });
});
