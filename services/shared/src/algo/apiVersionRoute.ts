/**
 * apiVersionRoute \u2014 Phase 15 API-version segment parser (pure).
 *
 * Validates and normalises the `/v{N}/...` prefix on inbound paths so
 * routers can dispatch + telemetry can label cleanly.
 *
 *   /v1/users/me    -> { version: 1, rest: '/users/me' }
 *   /v12/x/y        -> { version: 12, rest: '/x/y' }
 *   /v1             -> { version: 1, rest: '/' }
 *   /health         -> not_versioned
 *   /v01/x          -> invalid_version  (leading zero)
 *   /v0/x           -> invalid_version  (0 not allowed)
 */
export type ApiVersionResult =
  | { ok: true; version: number; rest: string }
  | { ok: false; reason: 'not_versioned' | 'invalid_version' | 'invalid_path' | 'unsupported_version' };

const RE = /^\/v([1-9]\d*)(\/.*)?$/;

export function parseApiVersion(path: string, supported?: number[]): ApiVersionResult {
  if (typeof path !== 'string' || !path.startsWith('/')) return { ok: false, reason: 'invalid_path' };
  const m = path.match(RE);
  if (!m) {
    // Distinguish "no v prefix" from "v0/v01 etc"
    if (/^\/v(0\d*|0|\d*[^\/0-9]\S*)/.test(path)) return { ok: false, reason: 'invalid_version' };
    return { ok: false, reason: 'not_versioned' };
  }
  const version = Number(m[1]);
  if (!Number.isInteger(version) || version <= 0 || version > 999) return { ok: false, reason: 'invalid_version' };
  if (supported && supported.length > 0 && !supported.includes(version)) {
    return { ok: false, reason: 'unsupported_version' };
  }
  const rest = m[2] && m[2].length > 0 ? m[2] : '/';
  return { ok: true, version, rest };
}

export function buildVersionedPath(version: number, rest: string): string {
  if (!Number.isInteger(version) || version <= 0) throw new Error('apiVersionRoute: bad version');
  const r = rest.startsWith('/') ? rest : `/${rest}`;
  return `/v${version}${r === '/' ? '' : r}`;
}
