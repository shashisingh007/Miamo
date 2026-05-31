import { describe, it, expect } from 'vitest';
import { isSafeUrl } from '../urlSafe';

const BASE = { allowedHosts: ['miamo.app', 'cdn.miamo.app'] };

describe('isSafeUrl — happy path', () => {
  it('accepts exact-host https url', () => {
    const r = isSafeUrl('https://miamo.app/x', BASE);
    expect(r.ok).toBe(true);
  });
  it('accepts subdomain of allowed host', () => {
    const r = isSafeUrl('https://www.miamo.app/x', BASE);
    expect(r.ok).toBe(true);
  });
});

describe('isSafeUrl — rejections', () => {
  it('rejects invalid input', () => {
    const r = isSafeUrl('not a url', BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid');
  });
  it('rejects disallowed scheme', () => {
    const r = isSafeUrl('javascript:alert(1)', BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(['bad_scheme', 'invalid']).toContain(r.reason);
  });
  it('rejects disallowed host', () => {
    const r = isSafeUrl('https://evil.com/x', BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_host');
  });
  it('rejects substring-only host (anchor on label boundary)', () => {
    const r = isSafeUrl('https://evil-miamo.app/x', BASE);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad_host');
  });
  it('rejects IPv4 literal when blockIpLiterals=true', () => {
    const r = isSafeUrl('http://203.0.113.1/x', { ...BASE, blockIpLiterals: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('ip_literal');
  });
  it('rejects loopback when blockPrivateNetworks=true', () => {
    const r = isSafeUrl('http://127.0.0.1/x', { ...BASE, blockPrivateNetworks: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('private_net');
  });
  it('rejects localhost when blockPrivateNetworks=true', () => {
    const r = isSafeUrl('http://localhost/x', { ...BASE, blockPrivateNetworks: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('private_net');
  });
  it('rejects RFC1918 192.168.x when blockPrivateNetworks=true', () => {
    const r = isSafeUrl('http://192.168.1.1/x', { ...BASE, blockPrivateNetworks: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('private_net');
  });
  it('rejects link-local 169.254.x when blockPrivateNetworks=true', () => {
    const r = isSafeUrl('http://169.254.169.254/latest/meta-data', { ...BASE, blockPrivateNetworks: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('private_net');
  });
});

describe('isSafeUrl — case-insensitive', () => {
  it('matches host irrespective of case', () => {
    const r = isSafeUrl('https://Miamo.App/x', BASE);
    expect(r.ok).toBe(true);
  });
});
