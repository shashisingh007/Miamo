/**
 * corsOriginCheck \u2014 Phase 20 OWASP A05 CORS origin allow-list (pure).
 *
 * Decides whether an inbound `Origin` header should be reflected back
 * by the gateway. Supports exact matches and `*.domain.tld` wildcards.
 * Rejects null/opaque origins unless explicitly allowed.
 */
export type CorsOriginPolicy = {
  allowed: ReadonlyArray<string>;           // e.g. ['https://miamo.app', 'https://*.miamo.app']
  allowNullOrigin?: boolean;                // default false
  allowCredentials?: boolean;               // gates wildcard '*' usage
};

export type CorsOriginDecision = {
  allowed: boolean;
  reflect: string | null;                   // value to put in Access-Control-Allow-Origin
  reason?: 'no_origin' | 'null_origin' | 'not_allowed' | 'wildcard_with_credentials';
};

function originMatchesPattern(origin: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern === origin) return true;
  // wildcard: https://*.miamo.app
  if (pattern.includes('://*.')) {
    const [scheme, host] = pattern.split('://');
    const suffix = host.slice(2); // remove '*.'
    try {
      const u = new URL(origin);
      if (u.protocol !== `${scheme}:`) return false;
      return u.hostname === suffix || u.hostname.endsWith(`.${suffix}`);
    } catch {
      return false;
    }
  }
  return false;
}

export function checkCorsOrigin(origin: string | null | undefined, policy: CorsOriginPolicy): CorsOriginDecision {
  if (origin === undefined || origin === '') return { allowed: false, reflect: null, reason: 'no_origin' };
  if (origin === 'null') {
    return policy.allowNullOrigin
      ? { allowed: true, reflect: 'null' }
      : { allowed: false, reflect: null, reason: 'null_origin' };
  }
  // Reject '*' reflection when credentials are required by policy
  if (policy.allowed.includes('*') && policy.allowCredentials) {
    return { allowed: false, reflect: null, reason: 'wildcard_with_credentials' };
  }
  for (const pat of policy.allowed) {
    if (originMatchesPattern(origin, pat)) {
      return { allowed: true, reflect: pat === '*' ? '*' : origin };
    }
  }
  return { allowed: false, reflect: null, reason: 'not_allowed' };
}
