/**
 * cookieAttrPolicy \u2014 Phase 20 OWASP A05 cookie attribute validator (pure).
 *
 * Parses a `Set-Cookie` value and decides whether it meets the secure
 * attribute policy: Secure, HttpOnly, SameSite, optional `__Host-` /
 * `__Secure-` prefix conformance. Use at the response-write boundary.
 */
export type CookieIssue =
  | 'missing_secure' | 'missing_http_only' | 'missing_samesite'
  | 'samesite_none_without_secure' | 'host_prefix_violation'
  | 'secure_prefix_violation' | 'unparseable';

export type CookiePolicy = {
  requireSecure?: boolean;      // default true
  requireHttpOnly?: boolean;    // default true
  requireSameSite?: boolean;    // default true
  allowSameSiteNone?: boolean;  // default true (only matters if requireSameSite)
};

export type CookieAudit = {
  name: string | null;
  ok: boolean;
  issues: CookieIssue[];
  attrs: Record<string, string | true>;
};

function parse(setCookie: string): { name: string | null; attrs: Record<string, string | true> } {
  if (typeof setCookie !== 'string' || setCookie.length === 0) return { name: null, attrs: {} };
  const parts = setCookie.split(';').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { name: null, attrs: {} };
  const [first, ...rest] = parts;
  const eq = first.indexOf('=');
  if (eq < 0) return { name: null, attrs: {} };
  const name = first.slice(0, eq);
  const attrs: Record<string, string | true> = {};
  for (const r of rest) {
    const i = r.indexOf('=');
    if (i < 0) attrs[r.toLowerCase()] = true;
    else attrs[r.slice(0, i).toLowerCase()] = r.slice(i + 1);
  }
  return { name, attrs };
}

export function auditCookie(setCookie: string, policy: CookiePolicy = {}): CookieAudit {
  const { name, attrs } = parse(setCookie);
  const issues: CookieIssue[] = [];
  if (!name) {
    return { name: null, ok: false, issues: ['unparseable'], attrs };
  }
  const requireSecure = policy.requireSecure !== false;
  const requireHttpOnly = policy.requireHttpOnly !== false;
  const requireSameSite = policy.requireSameSite !== false;
  const allowSameSiteNone = policy.allowSameSiteNone !== false;

  const hasSecure = attrs.secure === true;
  const hasHttpOnly = attrs.httponly === true;
  const sameSite = typeof attrs.samesite === 'string' ? String(attrs.samesite).toLowerCase() : null;

  if (requireSecure && !hasSecure) issues.push('missing_secure');
  if (requireHttpOnly && !hasHttpOnly) issues.push('missing_http_only');
  if (requireSameSite && !sameSite) issues.push('missing_samesite');
  if (sameSite === 'none' && !hasSecure) issues.push('samesite_none_without_secure');
  if (sameSite === 'none' && !allowSameSiteNone) issues.push('missing_samesite');

  if (name.startsWith('__Host-')) {
    if (!hasSecure || attrs.path !== '/' || attrs.domain !== undefined) issues.push('host_prefix_violation');
  }
  if (name.startsWith('__Secure-') && !hasSecure) issues.push('secure_prefix_violation');

  return { name, ok: issues.length === 0, issues, attrs };
}
