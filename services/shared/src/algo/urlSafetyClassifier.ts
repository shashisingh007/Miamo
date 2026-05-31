export type UrlSafetyClassification =
  | { safe: true; normalized: string; host: string; protocol: 'http:' | 'https:' }
  | { safe: false; reason: UrlSafetyReason };

export type UrlSafetyReason =
  | 'not_a_string'
  | 'invalid_url'
  | 'disallowed_protocol'
  | 'credentials_in_url'
  | 'private_host'
  | 'loopback_host'
  | 'opaque_host'
  | 'blocked_host';

export type UrlSafetyOptions = {
  readonly allowHttp?: boolean;
  readonly blockHosts?: ReadonlyArray<string>;
};

const PRIVATE_V4 = [
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./, // link-local
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^0\./,
];

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

function isPrivateIPv4(host: string): boolean {
  return PRIVATE_V4.some((re) => re.test(host));
}

function isPrivateIPv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === '::') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // ULA
  if (h.startsWith('fe80')) return true; // link-local
  return false;
}

export function classifyUrlSafety(
  input: unknown,
  opts: UrlSafetyOptions = {},
): UrlSafetyClassification {
  if (typeof input !== 'string') return { safe: false, reason: 'not_a_string' };
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { safe: false, reason: 'invalid_url' };
  }
  const allowHttp = opts.allowHttp === true;
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) {
    return { safe: false, reason: 'disallowed_protocol' };
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return { safe: false, reason: 'credentials_in_url' };
  }
  const rawHost = url.hostname.toLowerCase();
  if (rawHost.length === 0) return { safe: false, reason: 'opaque_host' };
  // Node's URL keeps IPv6 brackets in hostname; strip for matching.
  const host =
    rawHost.startsWith('[') && rawHost.endsWith(']')
      ? rawHost.slice(1, -1)
      : rawHost;
  if (LOOPBACK.has(host)) return { safe: false, reason: 'loopback_host' };
  // IPv6 bracketed form: URL strips brackets in hostname
  if (host.includes(':') && isPrivateIPv6(host)) {
    return { safe: false, reason: 'private_host' };
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && isPrivateIPv4(host)) {
    return { safe: false, reason: 'private_host' };
  }
  if (opts.blockHosts) {
    for (const b of opts.blockHosts) {
      const blocked = b.toLowerCase();
      if (host === blocked || host.endsWith('.' + blocked)) {
        return { safe: false, reason: 'blocked_host' };
      }
    }
  }
  return {
    safe: true,
    normalized: url.toString(),
    host,
    protocol: url.protocol as 'http:' | 'https:',
  };
}
