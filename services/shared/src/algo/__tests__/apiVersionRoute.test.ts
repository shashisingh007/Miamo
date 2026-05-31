import { describe, it, expect } from 'vitest';
import { parseApiVersion, buildVersionedPath } from '../apiVersionRoute';

describe('apiVersionRoute', () => {
  it('parses /v1/users/me', () => {
    expect(parseApiVersion('/v1/users/me')).toEqual({ ok: true, version: 1, rest: '/users/me' });
  });

  it('parses multi-digit versions', () => {
    expect(parseApiVersion('/v12/x')).toEqual({ ok: true, version: 12, rest: '/x' });
  });

  it('handles bare /vN (no rest) as /', () => {
    expect(parseApiVersion('/v3')).toEqual({ ok: true, version: 3, rest: '/' });
  });

  it('not_versioned for unversioned paths', () => {
    expect(parseApiVersion('/health')).toEqual({ ok: false, reason: 'not_versioned' });
    expect(parseApiVersion('/about')).toEqual({ ok: false, reason: 'not_versioned' });
  });

  it('invalid_version for v0 / v01 / vfoo', () => {
    expect(parseApiVersion('/v0/x').reason).toBe('invalid_version');
    expect(parseApiVersion('/v01/x').reason).toBe('invalid_version');
    expect(parseApiVersion('/vfoo/x').reason).toBe('invalid_version');
  });

  it('invalid_path for non-/ start or non-strings', () => {
    expect(parseApiVersion('v1/x').reason).toBe('invalid_path');
    expect(parseApiVersion('' as any).reason).toBe('invalid_path');
    expect(parseApiVersion(null as any).reason).toBe('invalid_path');
  });

  it('unsupported_version honoured', () => {
    expect(parseApiVersion('/v9/x', [1, 2]).reason).toBe('unsupported_version');
    expect(parseApiVersion('/v2/x', [1, 2]).ok).toBe(true);
  });

  it('buildVersionedPath round-trips', () => {
    expect(buildVersionedPath(1, '/users')).toBe('/v1/users');
    expect(buildVersionedPath(2, 'me')).toBe('/v2/me');
    expect(buildVersionedPath(1, '/')).toBe('/v1');
  });

  it('buildVersionedPath rejects bad version', () => {
    expect(() => buildVersionedPath(0, '/x')).toThrow();
    expect(() => buildVersionedPath(-1, '/x')).toThrow();
    expect(() => buildVersionedPath(1.5, '/x')).toThrow();
  });

  it('caps at 999', () => {
    expect(parseApiVersion('/v9999/x').reason).toBe('invalid_version');
  });

  it('preserves query/trailing structure inside rest', () => {
    expect(parseApiVersion('/v1/users?cursor=abc')).toEqual({ ok: true, version: 1, rest: '/users?cursor=abc' });
  });
});
