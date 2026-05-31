import { describe, it, expect } from 'vitest';
import { applyHardening, auditHardening } from '../headerHardener';

describe('headerHardener', () => {
  it('adds all baseline headers when none present', () => {
    const out = applyHardening();
    expect(out['Strict-Transport-Security']).toContain('max-age=');
    expect(out['X-Frame-Options']).toBe('DENY');
    expect(out['X-Content-Type-Options']).toBe('nosniff');
    expect(out['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(out['Permissions-Policy']).toContain('geolocation=()');
    expect(out['Cross-Origin-Opener-Policy']).toBe('same-origin');
  });

  it('preserves existing headers (case-sensitive same key)', () => {
    const out = applyHardening({ 'X-Frame-Options': 'SAMEORIGIN' });
    expect(out['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('does not overwrite lowercase variant', () => {
    const out = applyHardening({ 'x-frame-options': 'sameorigin' });
    expect(out['X-Frame-Options']).toBeUndefined();
    expect(out['x-frame-options']).toBe('sameorigin');
  });

  it('hsts=false omits HSTS', () => {
    const out = applyHardening({}, { hsts: false });
    expect(out['Strict-Transport-Security']).toBeUndefined();
  });

  it('hsts options reflected', () => {
    const out = applyHardening({}, { hsts: { maxAgeSeconds: 100, preload: true } });
    expect(out['Strict-Transport-Security']).toBe('max-age=100; includeSubDomains; preload');
  });

  it('contentTypeNoSniff=false omits header', () => {
    const out = applyHardening({}, { contentTypeNoSniff: false });
    expect(out['X-Content-Type-Options']).toBeUndefined();
  });

  it('custom permissions policy applied', () => {
    const out = applyHardening({}, { permissionsPolicy: 'camera=()' });
    expect(out['Permissions-Policy']).toBe('camera=()');
  });

  it('frameAncestors override uppercased', () => {
    const out = applyHardening({}, { frameAncestors: 'sameorigin' });
    expect(out['X-Frame-Options']).toBe('SAMEORIGIN');
  });

  it('audit reports missing required headers', () => {
    const r = auditHardening({ 'X-Frame-Options': 'DENY' });
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('Strict-Transport-Security');
  });

  it('audit ok after applyHardening', () => {
    const out = applyHardening();
    expect(auditHardening(out).ok).toBe(true);
  });
});
