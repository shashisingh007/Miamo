import { describe, it, expect } from 'vitest';
import { buildCsp, defaultMiamoCsp } from '../cspBuilder';

describe('cspBuilder', () => {
  it('builds a single directive', () => {
    expect(buildCsp({ defaultSrc: ["'self'"] })).toBe("default-src 'self'");
  });

  it('emits directives in the canonical order', () => {
    const s = buildCsp({
      objectSrc: ["'none'"],
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    });
    const idxDefault = s.indexOf('default-src');
    const idxScript = s.indexOf('script-src');
    const idxObject = s.indexOf('object-src');
    expect(idxDefault).toBeLessThan(idxScript);
    expect(idxScript).toBeLessThan(idxObject);
  });

  it('dedupes and sorts sources within a directive', () => {
    const s = buildCsp({ imgSrc: ['https:', "'self'", 'data:', "'self'"] });
    expect(s).toBe("img-src 'self' data: https:");
  });

  it('drops invalid sources', () => {
    const s = buildCsp({ scriptSrc: ["'self'", 'javascript:evil()', 'has space.com'] });
    expect(s).toBe("script-src 'self'");
  });

  it('omits a directive entirely if all sources are invalid', () => {
    expect(buildCsp({ scriptSrc: ['javascript:evil()'] })).toBe('');
  });

  it('accepts nonce-/sha-prefixed keyword sources', () => {
    const s = buildCsp({ scriptSrc: ["'self'", "'nonce-abc123'", "'sha256-XYZ='"] });
    expect(s).toContain("'nonce-abc123'");
    expect(s).toContain("'sha256-XYZ='");
  });

  it('appends report-uri when valid http(s)', () => {
    const s = buildCsp({ defaultSrc: ["'self'"], reportUri: 'https://csp.example.com/r' });
    expect(s.endsWith('report-uri https://csp.example.com/r')).toBe(true);
  });

  it('ignores invalid report-uri', () => {
    const s = buildCsp({ defaultSrc: ["'self'"], reportUri: 'ftp://x' });
    expect(s).toBe("default-src 'self'");
  });

  it('default Miamo policy includes the strict basics', () => {
    const s = defaultMiamoCsp();
    expect(s).toContain("default-src 'self'");
    expect(s).toContain("object-src 'none'");
    expect(s).toContain("frame-ancestors 'none'");
  });

  it('byte-stable output for equal inputs (different array order)', () => {
    const a = buildCsp({ imgSrc: ["'self'", 'data:', 'https:'] });
    const b = buildCsp({ imgSrc: ['https:', 'data:', "'self'"] });
    expect(a).toBe(b);
  });
});
