/**
 * ipCidrMatch \u2014 Phase 20 IPv4 CIDR membership check (pure).
 *
 * Supports IPv4 only (the most common case for inbound/outbound firewall
 * rules in our gateway). For IPv6, returns false with reason.
 *
 *   ipInCidr('10.0.0.5', '10.0.0.0/8')  -> true
 *   ipInCidr('10.0.0.5', '192.168.0.0/16') -> false
 *
 * `anyIpInCidrList(ip, ['10.0.0.0/8', '127.0.0.1/32'])` ORs across entries.
 */

const V4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function parseV4(ip: string): number | null {
  const m = V4.exec(ip.trim());
  if (!m) return null;
  let n = 0;
  for (let i = 1; i <= 4; i++) {
    const oct = Number(m[i]);
    if (!Number.isInteger(oct) || oct < 0 || oct > 255) return null;
    n = (n * 256) + oct;
  }
  return n >>> 0;
}

function parseCidr(cidr: string): { base: number; bits: number } | null {
  const idx = cidr.indexOf('/');
  if (idx === -1) {
    const ip = parseV4(cidr);
    return ip === null ? null : { base: ip, bits: 32 };
  }
  const ip = parseV4(cidr.slice(0, idx));
  const bits = Number(cidr.slice(idx + 1));
  if (ip === null) return null;
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return null;
  return { base: ip, bits };
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const ipN = parseV4(ip);
  const c = parseCidr(cidr);
  if (ipN === null || c === null) return false;
  if (c.bits === 0) return true;
  const mask = c.bits === 32 ? 0xffffffff : (~0 << (32 - c.bits)) >>> 0;
  return ((ipN & mask) >>> 0) === ((c.base & mask) >>> 0);
}

export function anyIpInCidrList(ip: string, cidrs: ReadonlyArray<string>): boolean {
  for (const c of cidrs) {
    if (ipInCidr(ip, c)) return true;
  }
  return false;
}

export function isValidIpv4(ip: string): boolean {
  return parseV4(ip) !== null;
}

export function isValidCidr(cidr: string): boolean {
  return parseCidr(cidr) !== null;
}
