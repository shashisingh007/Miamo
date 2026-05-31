// IPv4/IPv6 CIDR matcher — additive infra. New symbols only.

export interface ParsedCidr {
  family: 4 | 6;
  bytes: Uint8Array; // length 4 (v4) or 16 (v6)
  prefixLen: number;
}

function parseIPv4(ip: string): Uint8Array | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  const out = new Uint8Array(4);
  for (let i = 0; i < 4; i++) {
    const p = parts[i];
    if (!/^(0|[1-9][0-9]{0,2})$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    out[i] = n;
  }
  return out;
}

function parseIPv6(ip: string): Uint8Array | null {
  // strip zone id (e.g. fe80::1%eth0)
  const pct = ip.indexOf('%');
  const raw = pct >= 0 ? ip.slice(0, pct) : ip;
  // embedded IPv4 in last 32 bits
  let head = raw;
  let tailBytes: Uint8Array | null = null;
  const lastColon = raw.lastIndexOf(':');
  if (lastColon >= 0 && raw.slice(lastColon + 1).includes('.')) {
    const v4 = parseIPv4(raw.slice(lastColon + 1));
    if (!v4) return null;
    head = raw.slice(0, lastColon + 1) + '0:0';
    tailBytes = v4;
  }
  const dcount = (head.match(/::/g) ?? []).length;
  if (dcount > 1) return null;
  let left: string[] = [];
  let right: string[] = [];
  if (head.includes('::')) {
    const [l, r] = head.split('::');
    left = l === '' ? [] : l.split(':');
    right = r === '' ? [] : r.split(':');
  } else {
    left = head.split(':');
    if (left.length !== 8) return null;
  }
  if (left.length + right.length > 8) return null;
  const fill = 8 - left.length - right.length;
  const groups = [...left, ...Array(fill).fill('0'), ...right];
  if (groups.length !== 8) return null;
  const out = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const g = groups[i];
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    out[i * 2] = (n >>> 8) & 0xff;
    out[i * 2 + 1] = n & 0xff;
  }
  if (tailBytes) {
    out[12] = tailBytes[0];
    out[13] = tailBytes[1];
    out[14] = tailBytes[2];
    out[15] = tailBytes[3];
  }
  return out;
}

export function parseIpAddress(ip: string): { family: 4 | 6; bytes: Uint8Array } | null {
  if (typeof ip !== 'string' || !ip) return null;
  if (ip.includes(':')) {
    const b = parseIPv6(ip);
    return b ? { family: 6, bytes: b } : null;
  }
  const b = parseIPv4(ip);
  return b ? { family: 4, bytes: b } : null;
}

export function parseCidr(cidr: string): ParsedCidr | null {
  if (typeof cidr !== 'string') return null;
  const slash = cidr.indexOf('/');
  if (slash < 0) return null;
  const ipPart = cidr.slice(0, slash);
  const prefixPart = cidr.slice(slash + 1);
  if (!/^\d+$/.test(prefixPart)) return null;
  const parsed = parseIpAddress(ipPart);
  if (!parsed) return null;
  const prefixLen = Number(prefixPart);
  const max = parsed.family === 4 ? 32 : 128;
  if (prefixLen < 0 || prefixLen > max) return null;
  // mask off host bits to canonicalize network address
  const bytes = new Uint8Array(parsed.bytes);
  for (let i = 0; i < bytes.length; i++) {
    const bitStart = i * 8;
    if (bitStart >= prefixLen) {
      bytes[i] = 0;
    } else if (bitStart + 8 <= prefixLen) {
      // keep all bits
    } else {
      const keep = prefixLen - bitStart;
      const mask = (0xff << (8 - keep)) & 0xff;
      bytes[i] = bytes[i] & mask;
    }
  }
  return { family: parsed.family, bytes, prefixLen };
}

export function ipMatchesCidr(ip: string, cidr: string | ParsedCidr): boolean {
  const parsedIp = parseIpAddress(ip);
  if (!parsedIp) return false;
  const c = typeof cidr === 'string' ? parseCidr(cidr) : cidr;
  if (!c) return false;
  if (c.family !== parsedIp.family) return false;
  const prefixLen = c.prefixLen;
  const fullBytes = Math.floor(prefixLen / 8);
  for (let i = 0; i < fullBytes; i++) {
    if (parsedIp.bytes[i] !== c.bytes[i]) return false;
  }
  const remBits = prefixLen - fullBytes * 8;
  if (remBits > 0) {
    const mask = (0xff << (8 - remBits)) & 0xff;
    if ((parsedIp.bytes[fullBytes] & mask) !== (c.bytes[fullBytes] & mask)) return false;
  }
  return true;
}

export function ipMatchesAnyCidr(ip: string, cidrs: ReadonlyArray<string>): boolean {
  for (const c of cidrs) {
    if (ipMatchesCidr(ip, c)) return true;
  }
  return false;
}
