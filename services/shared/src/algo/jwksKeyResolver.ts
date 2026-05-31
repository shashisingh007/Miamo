// JWKS key resolver — pure selection logic. Additive infra, new symbols only.

export interface JsonWebKey {
  kid?: string;
  kty: string; // 'RSA' | 'EC' | 'oct' | 'OKP'
  use?: 'sig' | 'enc';
  alg?: string;
  key_ops?: string[];
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
  [k: string]: unknown;
}

export interface JsonWebKeySet {
  keys: JsonWebKey[];
}

export interface JwksResolveCriteria {
  kid?: string;
  alg?: string;
  use?: 'sig' | 'enc';
  kty?: string;
}

// Mapping of JWS alg -> required kty (subset of RFC 7518 §3.1)
const ALG_TO_KTY: Record<string, string> = {
  HS256: 'oct',
  HS384: 'oct',
  HS512: 'oct',
  RS256: 'RSA',
  RS384: 'RSA',
  RS512: 'RSA',
  PS256: 'RSA',
  PS384: 'RSA',
  PS512: 'RSA',
  ES256: 'EC',
  ES384: 'EC',
  ES512: 'EC',
  EdDSA: 'OKP',
};

export function resolveJwksKey(
  jwks: JsonWebKeySet | null | undefined,
  crit: JwksResolveCriteria
): JsonWebKey | null {
  if (!jwks || !Array.isArray(jwks.keys) || jwks.keys.length === 0) return null;
  const ktyForAlg = crit.alg ? ALG_TO_KTY[crit.alg] : undefined;

  const matches: { key: JsonWebKey; score: number }[] = [];
  for (const key of jwks.keys) {
    if (!key || typeof key.kty !== 'string') continue;
    if (crit.kid !== undefined && key.kid !== crit.kid) continue;
    if (crit.use !== undefined && key.use !== undefined && key.use !== crit.use) continue;
    if (crit.kty !== undefined && key.kty !== crit.kty) continue;
    if (ktyForAlg !== undefined && key.kty !== ktyForAlg) continue;
    if (crit.alg !== undefined && key.alg !== undefined && key.alg !== crit.alg) continue;
    // key_ops sanity (when present, sig criterion requires 'verify')
    if (crit.use === 'sig' && Array.isArray(key.key_ops) && key.key_ops.length > 0) {
      if (!key.key_ops.includes('verify') && !key.key_ops.includes('sign')) continue;
    }
    let score = 0;
    if (crit.kid !== undefined && key.kid === crit.kid) score += 8;
    if (crit.alg !== undefined && key.alg === crit.alg) score += 4;
    if (crit.use !== undefined && key.use === crit.use) score += 2;
    if (crit.kty !== undefined && key.kty === crit.kty) score += 1;
    matches.push({ key, score });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.score - a.score);
  return matches[0].key;
}

export function listJwksKids(jwks: JsonWebKeySet | null | undefined): string[] {
  if (!jwks || !Array.isArray(jwks.keys)) return [];
  const out: string[] = [];
  for (const k of jwks.keys) {
    if (k && typeof k.kid === 'string' && k.kid && !out.includes(k.kid)) out.push(k.kid);
  }
  return out;
}

export function isJwksKeyUsableForVerification(key: JsonWebKey, alg?: string): boolean {
  if (!key || typeof key.kty !== 'string') return false;
  if (key.use !== undefined && key.use !== 'sig') return false;
  if (alg !== undefined) {
    const required = ALG_TO_KTY[alg];
    if (required && key.kty !== required) return false;
    if (key.alg !== undefined && key.alg !== alg) return false;
  }
  if (Array.isArray(key.key_ops) && key.key_ops.length > 0) {
    if (!key.key_ops.includes('verify')) return false;
  }
  return true;
}
