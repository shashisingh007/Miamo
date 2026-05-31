/**
 * urlAllowList \u2014 Phase 20 outbound URL allow-list checker (pure).
 *
 * Used to validate webhook / integration target URLs against a configured
 * allow-list of hosts before any outbound HTTP is dispatched. Pure & sync.
 *
 * Rules:
 *   - URL must parse and use http/https (configurable).
 *   - Host must match an entry exactly OR an entry beginning with '.'
 *     acts as a suffix wildcard (e.g. '.example.com' allows any subdomain).
 *   - '*' alone allows everything (escape hatch for tests).
 *   - Optional port restriction per allow entry: 'api.example.com:8443'.
 */

export type UrlAllowListOptions = {
  allow: ReadonlyArray<string>;
  allowedSchemes?: ReadonlyArray<string>; // default ['https:']
};

export type UrlAllowResult =
  | { allowed: true; host: string; scheme: string }
  | { allowed: false; reason: 'invalid_url' | 'bad_scheme' | 'host_not_allowed' | 'empty_allow_list' };

function normalizeEntry(e: string): { host: string; port?: string } | null {
  const s = e.trim().toLowerCase();
  if (!s) return null;
  if (s === '*') return { host: '*' };
  const idx = s.indexOf(':');
  if (idx === -1) return { host: s };
  return { host: s.slice(0, idx), port: s.slice(idx + 1) };
}

export function checkUrlAllowed(rawUrl: string, opts: UrlAllowListOptions): UrlAllowResult {
  const allow = opts.allow ?? [];
  const schemes = opts.allowedSchemes ?? ['https:'];
  if (allow.length === 0) return { allowed: false, reason: 'empty_allow_list' };

  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { allowed: false, reason: 'invalid_url' };
  }
  if (!schemes.includes(u.protocol)) return { allowed: false, reason: 'bad_scheme' };

  const host = u.hostname.toLowerCase();
  const port = u.port || '';

  for (const raw of allow) {
    const entry = normalizeEntry(raw);
    if (!entry) continue;
    if (entry.host === '*') return { allowed: true, host, scheme: u.protocol };
    // suffix wildcard
    if (entry.host.startsWith('.')) {
      const suffix = entry.host;
      if (host === suffix.slice(1) || host.endsWith(suffix)) {
        if (entry.port && entry.port !== port) continue;
        return { allowed: true, host, scheme: u.protocol };
      }
      continue;
    }
    if (host === entry.host) {
      if (entry.port && entry.port !== port) continue;
      return { allowed: true, host, scheme: u.protocol };
    }
  }
  return { allowed: false, reason: 'host_not_allowed' };
}
