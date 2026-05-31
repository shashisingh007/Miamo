import { describe, it, expect } from 'vitest';
import { classifyUrlSafety } from '../urlSafetyClassifier';

describe('urlSafetyClassifier', () => {
  it('https public host -> safe', () => {
    const r = classifyUrlSafety('https://example.com/x');
    expect(r.safe).toBe(true);
    if (r.safe) expect(r.host).toBe('example.com');
  });

  it('rejects non-string', () => {
    const r = classifyUrlSafety(null);
    expect(r.safe).toBe(false);
    if (!r.safe) expect(r.reason).toBe('not_a_string');
  });

  it('rejects invalid url', () => {
    const r = classifyUrlSafety('not a url');
    if (!r.safe) expect(r.reason).toBe('invalid_url');
  });

  it('rejects ftp protocol', () => {
    const r = classifyUrlSafety('ftp://example.com');
    if (!r.safe) expect(r.reason).toBe('disallowed_protocol');
  });

  it('rejects http by default, allows with allowHttp', () => {
    expect((classifyUrlSafety('http://example.com') as any).reason).toBe('disallowed_protocol');
    expect(classifyUrlSafety('http://example.com', { allowHttp: true }).safe).toBe(true);
  });

  it('rejects credentials in URL', () => {
    const r = classifyUrlSafety('https://user:pass@example.com');
    if (!r.safe) expect(r.reason).toBe('credentials_in_url');
  });

  it('rejects loopback (localhost, 127.0.0.1, ::1)', () => {
    expect((classifyUrlSafety('https://localhost/x') as any).reason).toBe('loopback_host');
    expect((classifyUrlSafety('https://127.0.0.1/x') as any).reason).toBe('loopback_host');
    expect((classifyUrlSafety('https://[::1]/x') as any).reason).toBe('loopback_host');
  });

  it('rejects RFC1918 IPv4 (10/8, 192.168/16, 172.16/12)', () => {
    expect((classifyUrlSafety('https://10.0.0.1') as any).reason).toBe('private_host');
    expect((classifyUrlSafety('https://192.168.1.1') as any).reason).toBe('private_host');
    expect((classifyUrlSafety('https://172.16.0.1') as any).reason).toBe('private_host');
  });

  it('rejects link-local 169.254/16', () => {
    expect((classifyUrlSafety('https://169.254.169.254') as any).reason).toBe('private_host');
  });

  it('rejects IPv6 ULA (fc00::/7)', () => {
    expect((classifyUrlSafety('https://[fd00::1]') as any).reason).toBe('private_host');
  });

  it('honors blockHosts (exact + subdomain)', () => {
    expect((classifyUrlSafety('https://evil.com', { blockHosts: ['evil.com'] }) as any).reason).toBe('blocked_host');
    expect((classifyUrlSafety('https://x.evil.com', { blockHosts: ['evil.com'] }) as any).reason).toBe('blocked_host');
    expect(classifyUrlSafety('https://goodevil.com', { blockHosts: ['evil.com'] }).safe).toBe(true);
  });

  it('lowercases host in result', () => {
    const r = classifyUrlSafety('https://EXAMPLE.com');
    if (r.safe) expect(r.host).toBe('example.com');
  });

  it('public IPv4 allowed', () => {
    expect(classifyUrlSafety('https://8.8.8.8').safe).toBe(true);
  });
});
