/**
 * urlSafe \u2014 Phase 20 OWASP A01 open-redirect / SSRF guard.
 *
 * Validates user-supplied URLs against an allow-list before:
 *   - issuing an HTTP redirect (open-redirect class).
 *   - making a server-side fetch (SSRF class).
 *
 * Rules:
 *   - Scheme must be in `allowedSchemes` (default: http, https).
 *   - Host must exactly match or be a subdomain of an entry in `allowedHosts`.
 *   - IP-literal hosts (4 / 6) are rejected when `blockIpLiterals` is true.
 *   - Loopback / link-local / private ranges are rejected when
 *     `blockPrivateNetworks` is true (SSRF defence-in-depth).
 *
 * Pure & deterministic.
 */
export type UrlSafeOptions = {
  allowedSchemes?: readonly string[];
  /** Bare hostnames; matching is suffix-with-dot (a.example.com matches example.com). */
  allowedHosts: readonly string[];
  blockIpLiterals?: boolean;
  blockPrivateNetworks?: boolean;
};

export type UrlSafeResult =
  | { ok: true; url: URL }
  | { ok: false; reason: 'invalid' | 'bad_scheme' | 'bad_host' | 'ip_literal' | 'private_net' };

const DEFAULT_SCHEMES = ['http', 'https'];

function isIpLiteral(host: string): boolean {
  // strip [..] from IPv6 literals
  const h = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return true;
  if (/^[0-9a-f:]+$/i.test(h) && h.includes(':')) return true;
  return false;
}

function isPrivateIp(host: string): boolean {
  const h = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
  if (h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;       // link-local
  if (/^fc/i.test(h) || /^fd/i.test(h)) return true; // IPv6 ULA
  if (/^fe80/i.test(h)) return true;            // IPv6 link-local
  return false;
}

function hostAllowed(host: string, allowed: readonly string[]): boolean {
  const h = host.toLowerCase();
  for (const a of allowed) {
    const aa = a.toLowerCase();
    if (h === aa) return true;
    if (h.endsWith(`.${aa}`)) return true;
  }
  return false;
}

export function isSafeUrl(input: string, opts: UrlSafeOptions): UrlSafeResult {
  const schemes = opts.allowedSchemes ?? DEFAULT_SCHEMES;
  let url: URL;
  try { url = new URL(input); }
  catch { return { ok: false, reason: 'invalid' }; }

  const scheme = url.protocol.replace(/:$/, '').toLowerCase();
  if (!schemes.includes(scheme)) return { ok: false, reason: 'bad_scheme' };

  const host = url.hostname;
  if (opts.blockIpLiterals && isIpLiteral(host)) return { ok: false, reason: 'ip_literal' };
  if (opts.blockPrivateNetworks && (isPrivateIp(host) || host === 'localhost')) {
    return { ok: false, reason: 'private_net' };
  }
  if (!hostAllowed(host, opts.allowedHosts)) return { ok: false, reason: 'bad_host' };
  return { ok: true, url };
}
