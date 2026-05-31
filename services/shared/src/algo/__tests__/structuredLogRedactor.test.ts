import { describe, it, expect } from 'vitest';
import { redactStructuredLog } from '../structuredLogRedactor';

describe('structuredLogRedactor', () => {
  it('returns primitives unchanged when no tokens', () => {
    expect(redactStructuredLog(42)).toBe(42);
    expect(redactStructuredLog(true)).toBe(true);
    expect(redactStructuredLog(null)).toBeNull();
    expect(redactStructuredLog('plain')).toBe('plain');
  });

  it('redacts default sensitive keys', () => {
    const r = redactStructuredLog({
      password: 'hunter2',
      apiKey: 'abc',
      otherField: 'ok',
    });
    expect((r as any).password).toBe('[REDACTED]');
    expect((r as any).apiKey).toBe('[REDACTED]');
    expect((r as any).otherField).toBe('ok');
  });

  it('matches deny-list as case-insensitive substring', () => {
    const r = redactStructuredLog({ MyAuthorizationHeader: 'x', set_session_cookie: 'y' });
    expect((r as any).MyAuthorizationHeader).toBe('[REDACTED]');
    expect((r as any).set_session_cookie).toBe('[REDACTED]');
  });

  it('respects custom denyKeys', () => {
    const r = redactStructuredLog(
      { foo: 'sensitive', bar: 'ok' },
      { denyKeys: ['foo'] }
    );
    expect((r as any).foo).toBe('[REDACTED]');
    expect((r as any).bar).toBe('ok');
  });

  it('uses custom mask', () => {
    const r = redactStructuredLog({ token: 'x' }, { mask: '***' });
    expect((r as any).token).toBe('***');
  });

  it('preserves null/undefined inside redacted keys', () => {
    const r = redactStructuredLog({ password: null, token: undefined });
    expect((r as any).password).toBeNull();
    expect((r as any).token).toBeUndefined();
  });

  it('recurses into nested objects', () => {
    const r = redactStructuredLog({
      user: { name: 'a', password: 'b' },
    });
    expect((r as any).user.name).toBe('a');
    expect((r as any).user.password).toBe('[REDACTED]');
  });

  it('recurses into arrays', () => {
    const r = redactStructuredLog([{ token: 'x' }, { token: 'y' }]);
    expect((r as any[])[0].token).toBe('[REDACTED]');
    expect((r as any[])[1].token).toBe('[REDACTED]');
  });

  it('scrubs Bearer tokens in string values', () => {
    const r = redactStructuredLog({ headers: 'Bearer abc123.def' });
    expect((r as any).headers).toBe('Bearer [REDACTED]');
  });

  it('scrubs JWT-shaped strings', () => {
    const jwt = 'aaaaaaaaaa.bbbbbbbbbb.cccccccccc';
    const r = redactStructuredLog({ note: `log says ${jwt} ok` });
    expect((r as any).note).toContain('[REDACTED]');
    expect((r as any).note).not.toContain(jwt);
  });

  it('can disable token scrubbing', () => {
    const r = redactStructuredLog(
      { msg: 'Bearer abc.def.ghi' },
      { scrubBearerTokens: false }
    );
    expect((r as any).msg).toBe('Bearer abc.def.ghi');
  });

  it('does not mutate input', () => {
    const input = { password: 'hunter2', child: { token: 'x' } };
    const r = redactStructuredLog(input);
    expect(input.password).toBe('hunter2');
    expect(input.child.token).toBe('x');
    expect(r).not.toBe(input);
  });

  it('handles circular references', () => {
    const a: any = { name: 'a' };
    a.self = a;
    const r = redactStructuredLog(a);
    expect((r as any).self).toBe('[CIRCULAR]');
  });

  it('truncates at max depth', () => {
    let cur: any = { val: 'leaf' };
    for (let i = 0; i < 50; i++) cur = { nested: cur };
    const r = redactStructuredLog(cur, { maxDepth: 5 });
    let walk: any = r;
    for (let i = 0; i < 6; i++) walk = walk.nested;
    expect(walk).toBe('[TRUNCATED]');
  });

  it('stringifies non-plain objects (Date, Map) instead of recursing', () => {
    const d = new Date('2024-01-02T03:04:05Z');
    const r = redactStructuredLog({ ts: d });
    expect(typeof (r as any).ts).toBe('string');
  });
});
