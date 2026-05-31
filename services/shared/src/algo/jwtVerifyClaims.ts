/**
 * jwtVerifyClaims \u2014 Phase 20 OWASP A02 / A07 JWT claim validator (pure).
 *
 * Pure check of *decoded* JWT payload claims (no signature math here;
 * pair with your existing signing layer). Validates `iss`, `aud`,
 * `exp`, `nbf`, `iat` with a configurable clock-skew tolerance, plus
 * mandatory `sub` presence.
 */
export type JwtClaims = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number; // seconds since epoch
  nbf?: number;
  iat?: number;
  [k: string]: unknown;
};

export type JwtVerifyOptions = {
  nowMs: number;
  issuer?: string | string[];
  audience?: string | string[];
  clockSkewSeconds?: number; // default 60
  requireSub?: boolean;       // default true
  maxAgeSeconds?: number;     // optional: reject iat older than this
};

export type JwtVerifyResult =
  | { ok: true }
  | { ok: false; reason:
      | 'missing_claims' | 'bad_issuer' | 'bad_audience'
      | 'expired' | 'not_yet_valid' | 'too_old' | 'missing_sub' };

function asArr(v: string | string[] | undefined): string[] | undefined {
  if (v === undefined) return undefined;
  return Array.isArray(v) ? v : [v];
}

export function verifyJwtClaims(claims: JwtClaims | null | undefined, opts: JwtVerifyOptions): JwtVerifyResult {
  if (!claims || typeof claims !== 'object') return { ok: false, reason: 'missing_claims' };
  const skew = Math.max(0, opts.clockSkewSeconds ?? 60);
  const nowS = Math.floor(opts.nowMs / 1000);

  if ((opts.requireSub ?? true) && (typeof claims.sub !== 'string' || claims.sub.length === 0)) {
    return { ok: false, reason: 'missing_sub' };
  }

  const allowedIss = asArr(opts.issuer);
  if (allowedIss && (typeof claims.iss !== 'string' || !allowedIss.includes(claims.iss))) {
    return { ok: false, reason: 'bad_issuer' };
  }

  const allowedAud = asArr(opts.audience);
  if (allowedAud) {
    const aud = asArr(claims.aud) ?? [];
    if (!aud.some((a) => allowedAud.includes(a))) return { ok: false, reason: 'bad_audience' };
  }

  if (typeof claims.exp === 'number' && nowS - skew > claims.exp) return { ok: false, reason: 'expired' };
  if (typeof claims.nbf === 'number' && nowS + skew < claims.nbf) return { ok: false, reason: 'not_yet_valid' };

  if (typeof opts.maxAgeSeconds === 'number' && typeof claims.iat === 'number') {
    if (nowS - claims.iat > opts.maxAgeSeconds + skew) return { ok: false, reason: 'too_old' };
  }

  return { ok: true };
}
