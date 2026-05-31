import { describe, it, expect } from 'vitest';
import { parseIpAddress, parseCidr, ipMatchesCidr, ipMatchesAnyCidr } from '../ipCidrMatcher';

describe('ipCidrMatcher', () => {
  it('parses ipv4', () => {
    expect(parseIpAddress('10.0.0.1')?.family).toBe(4);
  });

  it('rejects bad ipv4', () => {
    expect(parseIpAddress('256.0.0.1')).toBeNull();
    expect(parseIpAddress('10.0.0')).toBeNull();
    expect(parseIpAddress('10.0.0.01')).toBeNull();
  });

  it('parses ipv6 short form', () => {
    expect(parseIpAddress('::1')?.family).toBe(6);
    expect(parseIpAddress('2001:db8::1')?.family).toBe(6);
  });

  it('rejects ipv6 with two ::', () => {
    expect(parseIpAddress('1::2::3')).toBeNull();
  });

  it('parses ipv6 with embedded ipv4', () => {
    const p = parseIpAddress('::ffff:192.168.1.1');
    expect(p?.family).toBe(6);
    expect(p?.bytes[12]).toBe(192);
    expect(p?.bytes[15]).toBe(1);
  });

  it('parses CIDR and canonicalizes network', () => {
    const c = parseCidr('10.0.5.123/16')!;
    expect(c.bytes[0]).toBe(10);
    expect(c.bytes[1]).toBe(0);
    expect(c.bytes[2]).toBe(0);
    expect(c.bytes[3]).toBe(0);
    expect(c.prefixLen).toBe(16);
  });

  it('rejects bad CIDR prefix', () => {
    expect(parseCidr('10.0.0.0/33')).toBeNull();
    expect(parseCidr('10.0.0.0/-1')).toBeNull();
    expect(parseCidr('10.0.0.0')).toBeNull();
    expect(parseCidr('::1/129')).toBeNull();
  });

  it('matches v4 inside /24', () => {
    expect(ipMatchesCidr('10.0.0.5', '10.0.0.0/24')).toBe(true);
    expect(ipMatchesCidr('10.0.1.5', '10.0.0.0/24')).toBe(false);
  });

  it('matches /32 single host', () => {
    expect(ipMatchesCidr('192.0.2.1', '192.0.2.1/32')).toBe(true);
    expect(ipMatchesCidr('192.0.2.2', '192.0.2.1/32')).toBe(false);
  });

  it('matches /0 — every v4', () => {
    expect(ipMatchesCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
  });

  it('matches odd prefix length', () => {
    expect(ipMatchesCidr('10.128.0.1', '10.128.0.0/9')).toBe(true);
    expect(ipMatchesCidr('10.127.0.1', '10.128.0.0/9')).toBe(false);
  });

  it('family mismatch never matches', () => {
    expect(ipMatchesCidr('::1', '127.0.0.0/8')).toBe(false);
    expect(ipMatchesCidr('127.0.0.1', '::/0')).toBe(false);
  });

  it('matches v6 prefix', () => {
    expect(ipMatchesCidr('2001:db8::1234', '2001:db8::/32')).toBe(true);
    expect(ipMatchesCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
  });

  it('matches v6 /128 single host', () => {
    expect(ipMatchesCidr('::1', '::1/128')).toBe(true);
  });

  it('ipMatchesAnyCidr checks list', () => {
    expect(ipMatchesAnyCidr('10.0.0.5', ['192.168.0.0/16', '10.0.0.0/8'])).toBe(true);
    expect(ipMatchesAnyCidr('8.8.8.8', ['192.168.0.0/16', '10.0.0.0/8'])).toBe(false);
  });

  it('invalid ip never matches', () => {
    expect(ipMatchesCidr('not-an-ip', '10.0.0.0/8')).toBe(false);
  });

  it('invalid cidr never matches', () => {
    expect(ipMatchesCidr('10.0.0.1', 'garbage')).toBe(false);
  });
});
