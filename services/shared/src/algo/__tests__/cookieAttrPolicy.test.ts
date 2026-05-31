import { describe, it, expect } from 'vitest';
import { auditCookie } from '../cookieAttrPolicy';

describe('cookieAttrPolicy', () => {
  it('flags unparseable input', () => {
    const r = auditCookie('');
    expect(r.ok).toBe(false);
    expect(r.issues).toContain('unparseable');
  });

  it('valid secure cookie passes', () => {
    const r = auditCookie('sid=abc; Secure; HttpOnly; SameSite=Lax; Path=/');
    expect(r.ok).toBe(true);
    expect(r.name).toBe('sid');
  });

  it('missing Secure flagged', () => {
    const r = auditCookie('sid=abc; HttpOnly; SameSite=Lax');
    expect(r.issues).toContain('missing_secure');
  });

  it('missing HttpOnly flagged', () => {
    const r = auditCookie('sid=abc; Secure; SameSite=Lax');
    expect(r.issues).toContain('missing_http_only');
  });

  it('missing SameSite flagged', () => {
    const r = auditCookie('sid=abc; Secure; HttpOnly');
    expect(r.issues).toContain('missing_samesite');
  });

  it('SameSite=None without Secure flagged', () => {
    const r = auditCookie('sid=abc; SameSite=None; HttpOnly');
    expect(r.issues).toContain('samesite_none_without_secure');
  });

  it('__Host- prefix violation when Domain present', () => {
    const r = auditCookie('__Host-sid=abc; Secure; HttpOnly; SameSite=Lax; Path=/; Domain=miamo.app');
    expect(r.issues).toContain('host_prefix_violation');
  });

  it('__Host- prefix violation when Path is not /', () => {
    const r = auditCookie('__Host-sid=abc; Secure; HttpOnly; SameSite=Lax; Path=/app');
    expect(r.issues).toContain('host_prefix_violation');
  });

  it('__Host- prefix passes when correct', () => {
    const r = auditCookie('__Host-sid=abc; Secure; HttpOnly; SameSite=Lax; Path=/');
    expect(r.ok).toBe(true);
  });

  it('__Secure- prefix requires Secure flag', () => {
    const r = auditCookie('__Secure-sid=abc; HttpOnly; SameSite=Lax');
    expect(r.issues).toContain('secure_prefix_violation');
  });

  it('policy can disable HttpOnly requirement', () => {
    const r = auditCookie('sid=abc; Secure; SameSite=Lax', { requireHttpOnly: false });
    expect(r.issues).not.toContain('missing_http_only');
  });

  it('parses no-value attributes correctly', () => {
    const r = auditCookie('sid=abc; Secure; HttpOnly; SameSite=Lax');
    expect(r.attrs.secure).toBe(true);
    expect(r.attrs.httponly).toBe(true);
    expect(r.attrs.samesite).toBe('Lax');
  });
});
