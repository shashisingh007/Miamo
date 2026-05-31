import { describe, it, expect } from 'vitest';
import { checkCorsOrigin } from '../corsOriginCheck';

describe('corsOriginCheck', () => {
  it('exact match allowed', () => {
    const r = checkCorsOrigin('https://miamo.app', { allowed: ['https://miamo.app'] });
    expect(r).toEqual({ allowed: true, reflect: 'https://miamo.app' });
  });

  it('subdomain wildcard match', () => {
    const r = checkCorsOrigin('https://app.miamo.app', { allowed: ['https://*.miamo.app'] });
    expect(r.allowed).toBe(true);
    expect(r.reflect).toBe('https://app.miamo.app');
  });

  it('apex matches own wildcard', () => {
    const r = checkCorsOrigin('https://miamo.app', { allowed: ['https://*.miamo.app'] });
    expect(r.allowed).toBe(true);
  });

  it('different scheme rejected', () => {
    const r = checkCorsOrigin('http://miamo.app', { allowed: ['https://*.miamo.app'] });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('not_allowed');
  });

  it('rejects sibling domains', () => {
    const r = checkCorsOrigin('https://miamo.app.evil.com', { allowed: ['https://*.miamo.app'] });
    expect(r.allowed).toBe(false);
  });

  it('no_origin when missing', () => {
    expect(checkCorsOrigin(undefined, { allowed: ['https://miamo.app'] }).reason).toBe('no_origin');
    expect(checkCorsOrigin('', { allowed: ['https://miamo.app'] }).reason).toBe('no_origin');
  });

  it('null origin denied by default, allowed when opt-in', () => {
    expect(checkCorsOrigin('null', { allowed: ['*'] }).reason).toBe('null_origin');
    const ok = checkCorsOrigin('null', { allowed: ['*'], allowNullOrigin: true });
    expect(ok).toEqual({ allowed: true, reflect: 'null' });
  });

  it('wildcard with credentials rejected', () => {
    const r = checkCorsOrigin('https://miamo.app', { allowed: ['*'], allowCredentials: true });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('wildcard_with_credentials');
  });

  it('wildcard without credentials reflects *', () => {
    const r = checkCorsOrigin('https://anything', { allowed: ['*'] });
    expect(r).toEqual({ allowed: true, reflect: '*' });
  });

  it('handles malformed origin URL gracefully', () => {
    const r = checkCorsOrigin('not-a-url', { allowed: ['https://*.miamo.app'] });
    expect(r.allowed).toBe(false);
  });
});
