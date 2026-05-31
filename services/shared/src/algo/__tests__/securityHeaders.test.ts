import { describe, it, expect } from 'vitest';
import { buildSecurityHeaders } from '../securityHeaders';

describe('buildSecurityHeaders', () => {
  it('includes the core safe-by-default bundle', () => {
    const h = buildSecurityHeaders();
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(h['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(h['Permissions-Policy']).toMatch(/camera=\(\)/);
  });

  it('emits HSTS by default with 2y + preload', () => {
    const h = buildSecurityHeaders();
    expect(h['Strict-Transport-Security']).toMatch(/max-age=63072000/);
    expect(h['Strict-Transport-Security']).toMatch(/preload/);
  });

  it('omits HSTS when disabled', () => {
    const h = buildSecurityHeaders({ enableHsts: false });
    expect(h['Strict-Transport-Security']).toBeUndefined();
  });

  it('uses report-only CSP header when requested', () => {
    const h = buildSecurityHeaders({ reportOnly: true });
    expect(h['Content-Security-Policy-Report-Only']).toBeDefined();
    expect(h['Content-Security-Policy']).toBeUndefined();
  });

  it('CSP is deny-by-default (frame-ancestors none, default-src self)', () => {
    const csp = buildSecurityHeaders()['Content-Security-Policy'];
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/upgrade-insecure-requests/);
  });

  it('appends allowed hosts to script/img/connect directives', () => {
    const csp = buildSecurityHeaders({ allowedHosts: ['cdn.miamo.app'] })['Content-Security-Policy'];
    expect(csp).toContain('cdn.miamo.app');
  });

  it('Permissions-Policy denies camera & microphone', () => {
    const p = buildSecurityHeaders()['Permissions-Policy'];
    expect(p).toContain('camera=()');
    expect(p).toContain('microphone=()');
  });
});
