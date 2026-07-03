import { describe, it, expect } from 'vitest';
import { redactPII, PII_KEY_BLOCKLIST } from '../piiRedact';

describe('redactPII — key blocklist', () => {
  it('redacts password / token / authorization / cookie fields', () => {
    const out = redactPII({
      password: 'p@ss', token: 'eyJ', authorization: 'Bearer x', cookie: 'sid=abc',
    }) as Record<string, string>;
    expect(out.password).toBe('[REDACTED]');
    expect(out.token).toBe('[REDACTED]');
    expect(out.authorization).toBe('[REDACTED]');
    expect(out.cookie).toBe('[REDACTED]');
  });

  it('redacts case-insensitively and on substring match', () => {
    const out = redactPII({
      userEmail: 'a@b.co', PhoneNumber: '+1 555 0100', User_Token: 'tk',
    }) as Record<string, string>;
    expect(out.userEmail).toBe('[REDACTED]');
    expect(out.PhoneNumber).toBe('[REDACTED]');
    expect(out.User_Token).toBe('[REDACTED]');
  });

  it('does NOT redact unrelated keys', () => {
    const out = redactPII({ city: 'Berlin', age: 30 }) as Record<string, unknown>;
    expect(out.city).toBe('Berlin');
    expect(out.age).toBe(30);
  });

  it('exports the blocklist', () => {
    expect(PII_KEY_BLOCKLIST.length).toBeGreaterThan(10);
  });
});

describe('redactPII — value patterns', () => {
  it('redacts email-shaped strings anywhere in values', () => {
    const out = redactPII({ note: 'ping me at jane@example.com okay?' }) as Record<string, string>;
    expect(out.note).toContain('[REDACTED]');
    expect(out.note).not.toContain('@example.com');
  });

  it('redacts phone-shaped strings', () => {
    const out = redactPII({ msg: 'call +44 7700 900123 thanks' }) as Record<string, string>;
    expect(out.msg).toContain('[REDACTED]');
    expect(out.msg).not.toMatch(/7700\s*900123/);
  });

  it('preserves non-string scalars', () => {
    const out = redactPII({ n: 42, b: true, x: null }) as Record<string, unknown>;
    expect(out.n).toBe(42);
    expect(out.b).toBe(true);
    expect(out.x).toBeNull();
  });
});

describe('redactPII — recursion', () => {
  it('recurses into nested objects and arrays', () => {
    const out = redactPII({
      user: { password: 'x', name: 'ok' },
      contacts: [{ email: 'a@b.co' }, { name: 'fine' }],
    }) as any;
    expect(out.user.password).toBe('[REDACTED]');
    expect(out.user.name).toBe('ok');
    expect(out.contacts[0].email).toBe('[REDACTED]');
    expect(out.contacts[1].name).toBe('fine');
  });

  it('caps depth (deeply nested becomes [DEPTH])', () => {
    let v: any = 'leaf';
    for (let i = 0; i < 20; i++) v = { next: v };
    const out = redactPII(v);
    const json = JSON.stringify(out);
    expect(json).toContain('[DEPTH]');
  });

  it('does not mutate the input object', () => {
    const input = { password: 'orig', nested: { token: 't' } };
    const snap = JSON.stringify(input);
    redactPII(input);
    expect(JSON.stringify(input)).toBe(snap);
  });

  it('handles null / undefined / primitives at the top level', () => {
    expect(redactPII(null)).toBeNull();
    expect(redactPII(undefined)).toBeUndefined();
    expect(redactPII(42)).toBe(42);
    expect(redactPII('hello')).toBe('hello');
  });
});
