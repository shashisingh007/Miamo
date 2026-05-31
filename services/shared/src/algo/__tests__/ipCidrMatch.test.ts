import { describe, it, expect } from 'vitest';
import { ipInCidr, anyIpInCidrList, isValidIpv4, isValidCidr } from '../ipCidrMatch';

describe('ipCidrMatch', () => {
  it('exact /32 match', () => {
    expect(ipInCidr('10.0.0.5', '10.0.0.5/32')).toBe(true);
    expect(ipInCidr('10.0.0.6', '10.0.0.5/32')).toBe(false);
  });

  it('/8 network match', () => {
    expect(ipInCidr('10.255.255.255', '10.0.0.0/8')).toBe(true);
    expect(ipInCidr('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('/16 network match', () => {
    expect(ipInCidr('192.168.1.50', '192.168.0.0/16')).toBe(true);
    expect(ipInCidr('192.169.1.50', '192.168.0.0/16')).toBe(false);
  });

  it('/0 matches anything (v4)', () => {
    expect(ipInCidr('1.2.3.4', '0.0.0.0/0')).toBe(true);
    expect(ipInCidr('255.255.255.255', '0.0.0.0/0')).toBe(true);
  });

  it('bare ip treated as /32', () => {
    expect(ipInCidr('10.0.0.1', '10.0.0.1')).toBe(true);
    expect(ipInCidr('10.0.0.2', '10.0.0.1')).toBe(false);
  });

  it('rejects malformed ip / cidr', () => {
    expect(ipInCidr('not-an-ip', '10.0.0.0/8')).toBe(false);
    expect(ipInCidr('10.0.0.1', 'garbage')).toBe(false);
    expect(ipInCidr('10.0.0.1', '10.0.0.0/33')).toBe(false);
    expect(ipInCidr('10.0.0.1', '10.0.0.0/-1')).toBe(false);
    expect(ipInCidr('10.0.0.256', '10.0.0.0/8')).toBe(false);
  });

  it('rejects IPv6 addresses (v4-only)', () => {
    expect(ipInCidr('::1', '::1/128')).toBe(false);
    expect(isValidIpv4('::1')).toBe(false);
  });

  it('anyIpInCidrList ORs across entries', () => {
    const list = ['10.0.0.0/8', '127.0.0.1/32'];
    expect(anyIpInCidrList('10.5.5.5', list)).toBe(true);
    expect(anyIpInCidrList('127.0.0.1', list)).toBe(true);
    expect(anyIpInCidrList('8.8.8.8', list)).toBe(false);
  });

  it('isValidIpv4 / isValidCidr', () => {
    expect(isValidIpv4('1.2.3.4')).toBe(true);
    expect(isValidIpv4('1.2.3')).toBe(false);
    expect(isValidCidr('10.0.0.0/8')).toBe(true);
    expect(isValidCidr('10.0.0.0/40')).toBe(false);
  });

  it('boundary: /31 covers 2 hosts', () => {
    expect(ipInCidr('10.0.0.0', '10.0.0.0/31')).toBe(true);
    expect(ipInCidr('10.0.0.1', '10.0.0.0/31')).toBe(true);
    expect(ipInCidr('10.0.0.2', '10.0.0.0/31')).toBe(false);
  });

  it('non-canonical base IP still works (mask is applied)', () => {
    // 10.0.0.5/8 \u2014 base is masked down to 10.0.0.0
    expect(ipInCidr('10.99.99.99', '10.0.0.5/8')).toBe(true);
  });

  it('empty list -> false', () => {
    expect(anyIpInCidrList('10.0.0.1', [])).toBe(false);
  });
});
