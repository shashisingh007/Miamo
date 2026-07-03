import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  cursorQuerySchema,
} from './schemas';

describe('emailSchema', () => {
  it('accepts a valid email and normalises to lowercase/trim', () => {
    expect(emailSchema.parse('  MIAMO1@miamo.test ')).toBe('miamo1@miamo.test');
  });
  it('rejects missing @', () => {
    expect(() => emailSchema.parse('not-an-email')).toThrow();
  });
  it('rejects > 254 chars', () => {
    expect(() => emailSchema.parse('a'.repeat(250) + '@x.io')).toThrow();
  });
});

describe('passwordSchema', () => {
  it('rejects < 8 chars', () => {
    expect(() => passwordSchema.parse('short')).toThrow();
  });
  it('rejects > 128 chars', () => {
    expect(() => passwordSchema.parse('a'.repeat(129))).toThrow();
  });
  it('accepts 8-char password', () => {
    expect(passwordSchema.parse('abcdefgh')).toBe('abcdefgh');
  });
});

describe('registerBodySchema', () => {
  it('parses a valid register body', () => {
    const out = registerBodySchema.parse({
      email: 'New@Example.com',
      password: 'longenoughpw',
      displayName: '  Alice  ',
    });
    expect(out).toEqual({ email: 'new@example.com', password: 'longenoughpw', displayName: 'Alice' });
  });
  it('rejects missing displayName', () => {
    expect(() => registerBodySchema.parse({ email: 'a@b.co', password: 'longenoughpw' })).toThrow();
  });
});

describe('loginBodySchema', () => {
  it('accepts any non-empty password (no length cap on login)', () => {
    const out = loginBodySchema.parse({ email: 'a@b.co', password: 'x' });
    expect(out.email).toBe('a@b.co');
  });
});

describe('refreshBodySchema', () => {
  it('rejects token < 20 chars', () => {
    expect(() => refreshBodySchema.parse({ refreshToken: 'short' })).toThrow();
  });
  it('accepts a realistic JWT-shaped token', () => {
    const token = 'a'.repeat(40) + '.' + 'b'.repeat(40) + '.' + 'c'.repeat(40);
    expect(refreshBodySchema.parse({ refreshToken: token }).refreshToken).toBe(token);
  });
});

describe('cursorQuerySchema', () => {
  it('coerces string limit to number', () => {
    expect(cursorQuerySchema.parse({ limit: '20' }).limit).toBe(20);
  });
  it('rejects limit > 100', () => {
    expect(() => cursorQuerySchema.parse({ limit: 999 })).toThrow();
  });
  it('rejects non-numeric limit', () => {
    expect(() => cursorQuerySchema.parse({ limit: 'abc' })).toThrow();
  });
});
