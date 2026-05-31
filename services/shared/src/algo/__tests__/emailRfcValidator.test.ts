import { describe, it, expect } from 'vitest';
import { validateEmail } from '../emailRfcValidator';

describe('emailRfcValidator', () => {
  it('valid simple address', () => {
    const r = validateEmail('alice@example.com');
    expect(r.valid).toBe(true);
    expect(r.local).toBe('alice');
    expect(r.domain).toBe('example.com');
  });

  it('lowercases domain only', () => {
    const r = validateEmail('Alice@Example.COM');
    expect(r.normalized).toBe('Alice@example.com');
  });

  it('trims surrounding whitespace', () => {
    const r = validateEmail('  a@b.co  ');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('a@b.co');
  });

  it('rejects non-string', () => {
    expect(validateEmail(null as any).reason).toBe('not_a_string');
  });

  it('rejects empty', () => {
    expect(validateEmail('   ').reason).toBe('empty');
  });

  it('rejects too long total', () => {
    const r = validateEmail('a'.repeat(255) + '@b.co');
    expect(r.reason).toBe('too_long');
  });

  it('rejects missing @', () => {
    expect(validateEmail('alice.example.com').reason).toBe('missing_at');
  });

  it('rejects multiple @', () => {
    expect(validateEmail('a@b@c.com').reason).toBe('multiple_at');
  });

  it('rejects empty local / domain', () => {
    expect(validateEmail('@b.com').reason).toBe('empty_local');
    expect(validateEmail('a@').reason).toBe('empty_domain');
  });

  it('rejects local > 64 chars', () => {
    const r = validateEmail('a'.repeat(65) + '@b.co');
    expect(r.reason).toBe('local_too_long');
  });

  it('rejects invalid local chars', () => {
    expect(validateEmail('a b@c.co').reason).toBe('invalid_local');
  });

  it('rejects leading/trailing dot in local', () => {
    expect(validateEmail('.a@b.co').reason).toBe('leading_or_trailing_dot');
    expect(validateEmail('a.@b.co').reason).toBe('leading_or_trailing_dot');
  });

  it('rejects consecutive dots in local', () => {
    expect(validateEmail('a..b@c.co').reason).toBe('consecutive_dot');
  });

  it('rejects single-label domain', () => {
    expect(validateEmail('a@localhost').reason).toBe('invalid_domain');
  });

  it('rejects empty domain label', () => {
    expect(validateEmail('a@b..co').reason).toBe('invalid_domain');
  });

  it('rejects label starting with hyphen', () => {
    expect(validateEmail('a@-bad.co').reason).toBe('invalid_domain');
  });

  it('accepts plus aliases and dots', () => {
    expect(validateEmail('first.last+tag@sub.example.co').valid).toBe(true);
  });
});
