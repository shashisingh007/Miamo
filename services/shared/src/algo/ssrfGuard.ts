/**
 * ssrfGuard \u2014 Phase 20 OWASP A10 outbound-URL allow-list (pure).
 *
 * Pre-flight check for any `fetch()` to a user-influenced URL. We do **not**
 * resolve DNS here \u2014 the caller is expected to chain a DNS-pinning fetcher
 * after this guard for defence-in-depth. This module only blocks the
 * obvious things: non-http(s) schemes, IP-literal targets in private ranges,
 * `localhost`, link-local, userinfo, and explicit port allow-list.
 */
export type SsrfPolicy = {
  allowedSchemes?: string[];   // default ['https:']
  allowedPorts?: number[];     // default [] = any port allowed
  allowedHosts?: string[];     // optional exact host allow-list
};

export type SsrfCheckResult =
  | { ok: true; url: string; host: string }
  | { ok: false; reason:
      | 'invalid_url'
      | 'scheme_not_allowed'
      | 'userinfo_not_allowed'
      | 'host_not_allowed'
      | 'private_ip'
      | 'localhost'
      | 'link_local'
      | 'port_not_allowed' };

const PRIVATE_V4 = [
  [10, 0, 0, 0, 8],
  [172, 16, 0, 0, 12],
  [192, 168, 0, 0, 16],
  [127, 0, 0, 0, 8],   // loopback
  [169, 254, 0, 0, 16], // link-local
  [100, 64, 0, 0, 10], // CGNAT
  [0, 0, 0, 0, 8],     // "this" network
] as const;

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const b = Number(p);
    if (b < 0 || b > 255) return null;
    n = (n << 8) + b;
  }
  return n >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return false;
  for (const [a, b, c, d, bits] of PRIVATE_V4) {
    const base = ((a << 24) + (b << 16) + (c << 8) + d) >>> 0;
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    if ((n & mask) === (base & mask)) return true;
  }
  return false;
}

function isLinkLocalV4(ip: string): boolean {
  return ip.startsWith('169.254.');
}

function isV6Loopback(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  return h === '::1' || h === '0:0:0:0:0:0:0:1';
}

function isV6Private(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  // fc00::/7 (ULA) and fe80::/10 (link-local)
  return h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb');
}

export function checkSsrf(rawUrl: string, policy: SsrfPolicy = {}): SsrfCheckResult {
  let u: URL;
  try { u = new URL(rawUrl); } catch { return { ok: false, reason: 'invalid_url' }; }

  const schemes = (policy.allowedSchemes ?? ['https:']).map(s => s.toLowerCase());
  if (!schemes.includes(u.protocol.toLowerCase())) return { ok: false, reason: 'scheme_not_allowed' };

  if (u.username || u.password) return { ok: false, reason: 'userinfo_not_allowed' };

  const host = u.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'invalid_url' };

  if (policy.allowedHosts && policy.allowedHosts.length > 0) {
    if (!policy.allowedHosts.map(h => h.toLowerCase()).includes(host)) {
      return { ok: false, reason: 'host_not_allowed' };
    }
  }

  if (host === 'localhost') return { ok: false, reason: 'localhost' };

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isLinkLocalV4(host)) return { ok: false, reason: 'link_local' };
    if (isPrivateV4(host)) return { ok: false, reason: 'private_ip' };
  } else if (host.startsWith('[') || host.includes(':')) {
    if (isV6Loopback(host)) return { ok: false, reason: 'localhost' };
    if (isV6Private(host)) return { ok: false, reason: 'private_ip' };
  }

  if (policy.allowedPorts && policy.allowedPorts.length > 0) {
    const defaultPort = u.protocol === 'https:' ? 443 : u.protocol === 'http:' ? 80 : 0;
    const port = u.port ? Number(u.port) : defaultPort;
    if (!policy.allowedPorts.includes(port)) return { ok: false, reason: 'port_not_allowed' };
  }

  return { ok: true, url: u.toString(), host };
}
