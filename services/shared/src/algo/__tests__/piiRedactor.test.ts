import { describe, it, expect } from 'vitest';
import { detectPii, redactPii } from '../piiRedactor';

describe('piiRedactor', () => {
  it('returns empty for empty input', () => {
    expect(detectPii('')).toEqual([]);
    const r = redactPii('');
    expect(r.text).toBe('');
    expect(r.hits).toEqual([]);
  });

  it('detects an email', () => {
    const hits = detectPii('Reach me at alice@example.com please');
    expect(hits).toHaveLength(1);
    expect(hits[0].kind).toBe('email');
  });

  it('redacts an email with default mask', () => {
    const r = redactPii('email alice@example.com today');
    expect(r.text).toBe('email [REDACTED:email] today');
    expect(r.counts.email).toBe(1);
  });

  it('redacts with custom mask', () => {
    const r = redactPii('hi alice@example.com', { mask: '***' });
    expect(r.text).toBe('hi ***');
  });

  it('detects valid Luhn credit card', () => {
    // 4111 1111 1111 1111 is a known Luhn-valid test number
    const r = redactPii('card 4111 1111 1111 1111 expires soon');
    expect(r.counts.credit_card).toBe(1);
  });

  it('does not redact invalid Luhn 16-digit sequence', () => {
    const r = redactPii('order 1234567890123456 today');
    expect(r.counts.credit_card).toBe(0);
  });

  it('detects phone number', () => {
    const r = redactPii('call +1 (415) 555-2671 now');
    expect(r.counts.phone).toBeGreaterThanOrEqual(1);
  });

  it('detects IPv4', () => {
    const r = redactPii('server 192.168.1.10 was hit');
    expect(r.counts.ipv4).toBe(1);
  });

  it('detects IPv6', () => {
    const r = redactPii('peer 2001:0db8:85a3:0000:0000:8a2e:0370:7334 ok');
    expect(r.counts.ipv6).toBe(1);
  });

  it('detects JWT-shaped tokens', () => {
    const jwt = 'aaaaaaaaaa.bbbbbbbbbb.cccccccccc';
    const r = redactPii(`token ${jwt} value`);
    expect(r.counts.jwt).toBe(1);
  });

  it('JWT match takes precedence over component-like phone/digit matches', () => {
    const jwt = 'eyJhbGciOiJI.eyJzdWIiOiJh.SflKxwRJSMe';
    const r = redactPii(jwt);
    expect(r.counts.jwt).toBe(1);
    expect(r.counts.phone).toBe(0);
  });

  it('handles multiple hits in order', () => {
    const r = redactPii('mail a@b.co then ip 10.0.0.1');
    expect(r.counts.email).toBe(1);
    expect(r.counts.ipv4).toBe(1);
    expect(r.text).toBe('mail [REDACTED:email] then ip [REDACTED:ipv4]');
  });

  it('respects kinds filter', () => {
    const r = redactPii('a@b.co and 10.0.0.1', { kinds: ['email'] });
    expect(r.counts.email).toBe(1);
    expect(r.counts.ipv4).toBe(0);
    expect(r.text).toContain('10.0.0.1');
  });

  it('does not overlap matches', () => {
    const r = redactPii('alice@example.com');
    expect(r.hits).toHaveLength(1);
  });

  it('preserves surrounding text unchanged', () => {
    const r = redactPii('--- a@b.co ===');
    expect(r.text.startsWith('--- ')).toBe(true);
    expect(r.text.endsWith(' ===')).toBe(true);
  });
});
