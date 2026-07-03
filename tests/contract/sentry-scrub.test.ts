/**
 * Contract test — Sentry PII scrubber.
 *
 * What this test covers:
 *   Our `installSentry()` in services/shared/src/service.ts wires a
 *   `beforeSend` hook that scrubs sensitive fields from every event
 *   before it leaves the process. If that scrubber drifts (missing key
 *   added to bug-hunt fixes, header allow-list changed by mistake), PII
 *   leaks to Sentry. This test locks the scrub contract into a suite.
 *
 * We test the *exported* internal helpers directly rather than booting
 * @sentry/node — the shape of the event.request payload is documented in
 * the beforeSend body and mirrored here.
 *
 * Cross-refs:
 *   - services/shared/src/service.ts §SENTRY_SCRUB_*
 *   - docs/architecture/bug-hunt-2026-07-part2.md #6 / #14
 *   - FULL_AUDIT_AND_LEARNING_V2_PROMPT.md §G.9
 */

import { describe, it, expect } from 'vitest';
import {
  _sentryScrubBody,
  _sentryScrubQueryString,
  _sentryHashEmail,
} from '../../services/shared/src/service';

describe('Sentry scrubber — body key redaction', () => {
  it('redacts password / newPassword / passwordConfirm', () => {
    const out = _sentryScrubBody({
      email: 'a@b.com',
      password: 'hunter2',
      newPassword: 'hunter3',
      passwordConfirm: 'hunter3',
    }) as Record<string, string>;
    expect(out.password).toBe('[Filtered]');
    expect(out.newPassword).toBe('[Filtered]');
    expect(out.passwordConfirm).toBe('[Filtered]');
    // email is NOT in the scrub set for body — it's handled separately
    // by the hash step in beforeSend.
    expect(out.email).toBe('a@b.com');
  });

  it('redacts token / refreshToken / accessToken / idToken / apiKey', () => {
    const out = _sentryScrubBody({
      token: 't1', refreshToken: 't2', accessToken: 't3', idToken: 't4', apiKey: 'k1',
    }) as Record<string, string>;
    expect(out.token).toBe('[Filtered]');
    expect(out.refreshToken).toBe('[Filtered]');
    expect(out.accessToken).toBe('[Filtered]');
    expect(out.idToken).toBe('[Filtered]');
    expect(out.apiKey).toBe('[Filtered]');
  });

  it('redacts code / otp / devCode / secret / internalKey', () => {
    const out = _sentryScrubBody({
      code: 'x', otp: 'y', devCode: 'z', secret: 's', internalKey: 'i',
    }) as Record<string, string>;
    expect(out.code).toBe('[Filtered]');
    expect(out.otp).toBe('[Filtered]');
    expect(out.devCode).toBe('[Filtered]');
    expect(out.secret).toBe('[Filtered]');
    expect(out.internalKey).toBe('[Filtered]');
  });

  it('recurses into nested objects', () => {
    const out = _sentryScrubBody({
      user: { email: 'a@b.com', password: 'p' },
      meta: { token: 'x', nested: { otp: 'y' } },
    }) as Record<string, any>;
    expect(out.user.password).toBe('[Filtered]');
    expect(out.meta.token).toBe('[Filtered]');
    expect(out.meta.nested.otp).toBe('[Filtered]');
  });

  it('recurses into arrays', () => {
    const out = _sentryScrubBody([
      { password: 'p' },
      { token: 't' },
    ]) as Array<Record<string, string>>;
    expect(out[0].password).toBe('[Filtered]');
    expect(out[1].token).toBe('[Filtered]');
  });

  it('leaves benign fields untouched', () => {
    const out = _sentryScrubBody({ displayName: 'Priya', age: 27 }) as Record<string, unknown>;
    expect(out.displayName).toBe('Priya');
    expect(out.age).toBe(27);
  });

  it('is case-insensitive on the scrub-key match', () => {
    const out = _sentryScrubBody({
      PASSWORD: 'p', Token: 't', OTP: 'x',
    }) as Record<string, string>;
    expect(out.PASSWORD).toBe('[Filtered]');
    expect(out.Token).toBe('[Filtered]');
    expect(out.OTP).toBe('[Filtered]');
  });
});

describe('Sentry scrubber — query-string token redaction', () => {
  it('redacts token= in a naked query string', () => {
    expect(_sentryScrubQueryString('token=abc123'))
      .toBe('token=[Filtered]');
  });

  it('redacts access_token / refresh_token / otp in the query', () => {
    expect(_sentryScrubQueryString('foo=1&access_token=abc&bar=2'))
      .toContain('access_token=[Filtered]');
    expect(_sentryScrubQueryString('refresh_token=xyz'))
      .toBe('refresh_token=[Filtered]');
    expect(_sentryScrubQueryString('otp=999999&next=/x'))
      .toContain('otp=[Filtered]');
  });

  it('preserves other keys and their values', () => {
    const out = _sentryScrubQueryString('page=1&token=abc&sort=recent');
    expect(out).toContain('page=1');
    expect(out).toContain('sort=recent');
    expect(out).toContain('token=[Filtered]');
  });

  it('is a no-op on undefined / non-string input', () => {
    expect(_sentryScrubQueryString(undefined)).toBeUndefined();
  });
});

describe('Sentry scrubber — email hashing', () => {
  it('returns a "sha256:" prefixed short hash', () => {
    const h = _sentryHashEmail('priya@miamo.test');
    expect(h.startsWith('sha256:')).toBe(true);
    // 12 hex chars after the prefix.
    expect(h.length).toBe('sha256:'.length + 12);
  });

  it('is case-insensitive (email is lower-cased before hashing)', () => {
    const a = _sentryHashEmail('PRIYA@Miamo.Test');
    const b = _sentryHashEmail('priya@miamo.test');
    expect(a).toBe(b);
  });

  it('produces stable output for the same input', () => {
    const a = _sentryHashEmail('a@b.com');
    const b = _sentryHashEmail('a@b.com');
    expect(a).toBe(b);
  });

  it('produces different outputs for different inputs', () => {
    expect(_sentryHashEmail('a@b.com')).not.toBe(_sentryHashEmail('c@d.com'));
  });
});
