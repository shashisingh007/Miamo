import { describe, it, expect } from 'vitest';
import { checkSsrf } from '../ssrfGuard';

describe('ssrfGuard', () => {
  it('allows a plain https URL', () => {
    const r = checkSsrf('https://api.example.com/v1/x');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.host).toBe('api.example.com');
  });

  it('blocks invalid URLs', () => {
    expect(checkSsrf('not a url')).toEqual({ ok: false, reason: 'invalid_url' });
  });

  it('blocks non-https by default', () => {
    expect(checkSsrf('http://example.com').ok).toBe(false);
    expect(checkSsrf('file:///etc/passwd').ok).toBe(false);
    expect(checkSsrf('gopher://example.com').ok).toBe(false);
  });

  it('allows http when scheme allow-list includes it', () => {
    expect(checkSsrf('http://example.com', { allowedSchemes: ['http:', 'https:'] }).ok).toBe(true);
  });

  it('blocks URLs with userinfo (credential smuggling)', () => {
    const r = checkSsrf('https://user:pass@example.com');
    expect(r).toEqual({ ok: false, reason: 'userinfo_not_allowed' });
  });

  it('blocks localhost', () => {
    expect(checkSsrf('https://localhost/x')).toEqual({ ok: false, reason: 'localhost' });
  });

  it('blocks RFC1918 / loopback / CGNAT IPv4', () => {
    expect(checkSsrf('https://10.0.0.5').reason).toBe('private_ip');
    expect(checkSsrf('https://192.168.1.1').reason).toBe('private_ip');
    expect(checkSsrf('https://172.20.0.1').reason).toBe('private_ip');
    expect(checkSsrf('https://127.0.0.1').reason).toBe('private_ip');
    expect(checkSsrf('https://100.64.5.5').reason).toBe('private_ip');
    expect(checkSsrf('https://0.0.0.0').reason).toBe('private_ip');
  });

  it('blocks link-local IPv4 (AWS metadata)', () => {
    expect(checkSsrf('https://169.254.169.254/latest/meta-data/').reason).toBe('link_local');
  });

  it('blocks IPv6 loopback and ULA / link-local', () => {
    expect(checkSsrf('https://[::1]/').reason).toBe('localhost');
    expect(checkSsrf('https://[fc00::1]/').reason).toBe('private_ip');
    expect(checkSsrf('https://[fe80::1]/').reason).toBe('private_ip');
  });

  it('allows a public IPv4', () => {
    expect(checkSsrf('https://8.8.8.8').ok).toBe(true);
  });

  it('honours allowedHosts allow-list', () => {
    expect(checkSsrf('https://evil.com', { allowedHosts: ['api.example.com'] }).reason).toBe('host_not_allowed');
    expect(checkSsrf('https://api.example.com', { allowedHosts: ['api.example.com'] }).ok).toBe(true);
  });

  it('honours allowedPorts (default port resolution)', () => {
    expect(checkSsrf('https://example.com', { allowedPorts: [443] }).ok).toBe(true);
    expect(checkSsrf('https://example.com:8443', { allowedPorts: [443] }).reason).toBe('port_not_allowed');
    expect(checkSsrf('https://example.com:8443', { allowedPorts: [443, 8443] }).ok).toBe(true);
  });

  it('case-insensitive scheme + host', () => {
    expect(checkSsrf('HTTPS://Example.COM').ok).toBe(true);
  });
});
