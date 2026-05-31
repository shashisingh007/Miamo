/**
 * headerHardener \u2014 Phase 20 OWASP A05 baseline security headers (pure).
 *
 * Produces a security-header map suitable for `res.setHeader()` at the
 * gateway. Caller-controlled overrides preserved; only missing headers
 * are set. Distinct from `cspBuilder` which composes the CSP value
 * itself; `headerHardener` ensures the broader hardening envelope is
 * present.
 */
export type HeaderMap = Record<string, string>;

export type HardenOptions = {
  hsts?: boolean | { maxAgeSeconds?: number; includeSubDomains?: boolean; preload?: boolean };
  frameAncestors?: 'deny' | 'sameorigin' | string; // value for X-Frame-Options
  referrerPolicy?: string;
  permissionsPolicy?: string;
  contentTypeNoSniff?: boolean;
  crossOriginOpener?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none';
  crossOriginEmbedder?: 'require-corp' | 'credentialless' | 'unsafe-none';
  crossOriginResource?: 'same-origin' | 'same-site' | 'cross-origin';
};

const DEFAULT_PERMISSIONS = 'geolocation=(), microphone=(), camera=(), payment=()';

function hstsValue(opt: HardenOptions['hsts']): string {
  if (opt === false) return '';
  const o = (opt === true || opt === undefined) ? {} : opt;
  const parts = [`max-age=${o.maxAgeSeconds ?? 63072000}`];
  if (o.includeSubDomains !== false) parts.push('includeSubDomains');
  if (o.preload) parts.push('preload');
  return parts.join('; ');
}

export function applyHardening(existing: HeaderMap = {}, options: HardenOptions = {}): HeaderMap {
  const out: HeaderMap = { ...existing };
  const setIfMissing = (k: string, v: string) => {
    if (v && out[k] === undefined && out[k.toLowerCase()] === undefined) out[k] = v;
  };

  if (options.hsts !== false) setIfMissing('Strict-Transport-Security', hstsValue(options.hsts));
  setIfMissing('X-Frame-Options', (options.frameAncestors ?? 'DENY').toUpperCase());
  if (options.contentTypeNoSniff !== false) setIfMissing('X-Content-Type-Options', 'nosniff');
  setIfMissing('Referrer-Policy', options.referrerPolicy ?? 'strict-origin-when-cross-origin');
  setIfMissing('Permissions-Policy', options.permissionsPolicy ?? DEFAULT_PERMISSIONS);
  setIfMissing('Cross-Origin-Opener-Policy', options.crossOriginOpener ?? 'same-origin');
  setIfMissing('Cross-Origin-Embedder-Policy', options.crossOriginEmbedder ?? 'require-corp');
  setIfMissing('Cross-Origin-Resource-Policy', options.crossOriginResource ?? 'same-origin');

  return out;
}

export function auditHardening(headers: HeaderMap): { ok: boolean; missing: string[] } {
  const required = [
    'Strict-Transport-Security',
    'X-Frame-Options',
    'X-Content-Type-Options',
    'Referrer-Policy',
    'Permissions-Policy',
  ];
  const present = new Set(Object.keys(headers).map((h) => h.toLowerCase()));
  const missing = required.filter((r) => !present.has(r.toLowerCase()));
  return { ok: missing.length === 0, missing };
}
