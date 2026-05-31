import { describe, it, expect } from 'vitest';
import { checkUrlAllowed } from '../urlAllowList';

describe('urlAllowList', () => {
  it('empty allow-list -> denied', () => {
    const r = checkUrlAllowed('https://api.example.com/x', { allow: [] });
    expect(r).toEqual({ allowed: false, reason: 'empty_allow_list' });
  });

  it('invalid url -> invalid_url', () => {
    const r = checkUrlAllowed('not-a-url', { allow: ['*'] });
    expect(r.allowed).toBe(false);
    expect((r as any).reason).toBe('invalid_url');
  });

  it('bad scheme -> bad_scheme (http not allowed by default)', () => {
    const r = checkUrlAllowed('http://api.example.com/x', { allow: ['api.example.com'] });
    expect((r as any).reason).toBe('bad_scheme');
  });

  it('exact host match allowed', () => {
    const r = checkUrlAllowed('https://api.example.com/x', { allow: ['api.example.com'] });
    expect(r.allowed).toBe(true);
    expect((r as any).host).toBe('api.example.com');
  });

  it('host not in list -> denied', () => {
    const r = checkUrlAllowed('https://evil.com/', { allow: ['api.example.com'] });
    expect((r as any).reason).toBe('host_not_allowed');
  });

  it('suffix wildcard matches subdomains', () => {
    const r = checkUrlAllowed('https://x.y.example.com/p', { allow: ['.example.com'] });
    expect(r.allowed).toBe(true);
  });

  it('suffix wildcard does NOT match unrelated TLD', () => {
    const r = checkUrlAllowed('https://example.com.evil.com/', { allow: ['.example.com'] });
    expect(r.allowed).toBe(false);
  });

  it('* wildcard allows anything', () => {
    const r = checkUrlAllowed('https://random.host/path', { allow: ['*'] });
    expect(r.allowed).toBe(true);
  });

  it('port restriction enforced', () => {
    const allow = ['api.example.com:8443'];
    expect(checkUrlAllowed('https://api.example.com:8443/x', { allow }).allowed).toBe(true);
    expect(checkUrlAllowed('https://api.example.com/x', { allow }).allowed).toBe(false);
    expect(checkUrlAllowed('https://api.example.com:9000/x', { allow }).allowed).toBe(false);
  });

  it('custom allowedSchemes (http only)', () => {
    const r = checkUrlAllowed('http://api.example.com/x', {
      allow: ['api.example.com'],
      allowedSchemes: ['http:'],
    });
    expect(r.allowed).toBe(true);
  });

  it('host comparison is case-insensitive', () => {
    const r = checkUrlAllowed('https://API.Example.COM/x', { allow: ['api.example.com'] });
    expect(r.allowed).toBe(true);
  });

  it('skips empty entries gracefully', () => {
    const r = checkUrlAllowed('https://api.example.com/', { allow: ['', '  ', 'api.example.com'] });
    expect(r.allowed).toBe(true);
  });
});
