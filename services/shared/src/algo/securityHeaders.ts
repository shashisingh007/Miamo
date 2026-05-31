/**
 * securityHeaders \u2014 Phase 20 OWASP A05 (Security Misconfiguration).
 *
 * Returns the standard hardening header bundle every HTTP response from
 * the gateway / web edge should carry. Pure: no side effects, easy to
 * unit-test and snapshot.
 *
 * Header choices (tuned for a dating-app web client, May 2026):
 *   Content-Security-Policy        deny by default, allow self + CDN
 *   Strict-Transport-Security      preload-eligible (2y + includeSubDomains)
 *   X-Content-Type-Options         nosniff
 *   Referrer-Policy                strict-origin-when-cross-origin
 *   Permissions-Policy             disable camera/mic/geo by default
 *   X-Frame-Options                DENY (legacy back-compat; CSP frame-ancestors is the modern equivalent)
 *   Cross-Origin-Opener-Policy     same-origin (Spectre isolation)
 *   Cross-Origin-Resource-Policy   same-origin
 */
export type SecurityHeadersOptions = {
  /** Extra hosts to allow for img-src / connect-src / script-src. */
  allowedHosts?: readonly string[];
  /** Disable HSTS in non-production environments. */
  enableHsts?: boolean;
  /** Treat as "report-only" (Content-Security-Policy-Report-Only header). */
  reportOnly?: boolean;
};

export type HeaderBundle = Record<string, string>;

function buildCsp(allowedHosts: readonly string[]): string {
  const hosts = ['\'self\'', ...allowedHosts];
  const cdn   = hosts.join(' ');
  return [
    `default-src 'self'`,
    `script-src ${cdn} 'wasm-unsafe-eval'`,
    `style-src ${cdn} 'unsafe-inline'`, // tailwind runtime inline ok
    `img-src ${cdn} data: blob:`,
    `font-src ${cdn} data:`,
    `connect-src ${cdn} wss:`,
    `media-src ${cdn} blob:`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `upgrade-insecure-requests`,
  ].join('; ');
}

export function buildSecurityHeaders(opts: SecurityHeadersOptions = {}): HeaderBundle {
  const allowedHosts = opts.allowedHosts ?? [];
  const cspHeader = opts.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
  const h: HeaderBundle = {
    [cspHeader]: buildCsp(allowedHosts),
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
    'X-Frame-Options': 'DENY',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  if (opts.enableHsts !== false) {
    h['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  }
  return h;
}
