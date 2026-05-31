import { describe, it, expect } from 'vitest';
import { checkAuth, hasScopes, type Principal } from '../authBypassGuards';

const NOW = 1_700_000_000_000;
const goodP: Principal = {
  uid: 'user_123',
  sessionId: 'sess_abcdefgh',
  scopes: ['read', 'write'],
  expiresAtMs: NOW + 60_000,
};

describe('authBypassGuards', () => {
  it('accepts a valid principal', () => {
    const r = checkAuth({ principal: goodP, nowMs: NOW });
    expect(r.ok).toBe(true);
  });

  it('rejects missing principal', () => {
    expect(checkAuth({ principal: null, nowMs: NOW })).toEqual({ ok: false, reason: 'missing_principal' });
    expect(checkAuth({ principal: undefined, nowMs: NOW })).toEqual({ ok: false, reason: 'missing_principal' });
  });

  it('rejects malformed uid', () => {
    const p = { ...goodP, uid: 'bad uid!' };
    expect(checkAuth({ principal: p, nowMs: NOW }).ok).toBe(false);
    expect(checkAuth({ principal: { ...goodP, uid: '' }, nowMs: NOW }).reason).toBe('invalid_uid');
  });

  it('rejects malformed session id', () => {
    expect(checkAuth({ principal: { ...goodP, sessionId: 'short' }, nowMs: NOW }).reason).toBe('invalid_session');
    expect(checkAuth({ principal: { ...goodP, sessionId: 'has space!' }, nowMs: NOW }).reason).toBe('invalid_session');
  });

  it('rejects expired principal (inclusive boundary)', () => {
    expect(checkAuth({ principal: { ...goodP, expiresAtMs: NOW }, nowMs: NOW }).reason).toBe('expired');
    expect(checkAuth({ principal: { ...goodP, expiresAtMs: NOW - 1 }, nowMs: NOW }).reason).toBe('expired');
  });

  it('requires all listed scopes', () => {
    expect(checkAuth({ principal: goodP, nowMs: NOW, requiredScopes: ['read'] }).ok).toBe(true);
    expect(checkAuth({ principal: goodP, nowMs: NOW, requiredScopes: ['admin'] }).reason).toBe('missing_scope');
    expect(checkAuth({ principal: goodP, nowMs: NOW, requiredScopes: ['read', 'write'] }).ok).toBe(true);
    expect(checkAuth({ principal: goodP, nowMs: NOW, requiredScopes: ['read', 'admin'] }).reason).toBe('missing_scope');
  });

  it('enforces targetUid when supplied', () => {
    expect(checkAuth({ principal: goodP, nowMs: NOW, targetUid: 'user_123' }).ok).toBe(true);
    expect(checkAuth({ principal: goodP, nowMs: NOW, targetUid: 'someone_else' }).reason).toBe('uid_mismatch');
  });

  it('hasScopes helper', () => {
    expect(hasScopes(goodP, ['read'])).toBe(true);
    expect(hasScopes(goodP, ['read', 'write'])).toBe(true);
    expect(hasScopes(goodP, ['admin'])).toBe(false);
    expect(hasScopes(null, ['read'])).toBe(false);
    expect(hasScopes({ ...goodP, scopes: [] }, ['read'])).toBe(false);
  });

  it('rejects non-finite expiry', () => {
    expect(checkAuth({ principal: { ...goodP, expiresAtMs: Number.NaN }, nowMs: NOW }).reason).toBe('expired');
    expect(checkAuth({ principal: { ...goodP, expiresAtMs: Number.POSITIVE_INFINITY }, nowMs: NOW }).reason).toBe('expired');
  });
});
