import { describe, it, expect } from 'vitest';
import { redactSecrets, redactSecretsWithStats } from '../secretRedactor';

describe('secretRedactor', () => {
  it('redacts Authorization Bearer tokens', () => {
    const r = redactSecrets('Authorization: Bearer abcdef1234567890');
    expect(r).toBe('Authorization: Bearer [REDACTED]');
  });

  it('redacts JWT-shaped strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJ';
    expect(redactSecrets(`token=${jwt}`)).not.toContain(jwt);
  });

  it('redacts password= / api_key= forms', () => {
    expect(redactSecrets('password=hunter2')).toContain('[REDACTED]');
    expect(redactSecrets('api_key: "abc123def"')).toContain('[REDACTED]');
    expect(redactSecrets('access-key=AKIAFAKEDUMMYKEYZZZZ')).toContain('[REDACTED]');
  });

  it('redacts Stripe keys', () => {
    expect(redactSecrets('use sk_live_abcdef1234567890XYZ')).toContain('[REDACTED]');
  });

  it('redacts AWS access keys', () => {
    expect(redactSecrets('id=AKIAIOSFODNN7EXAMPLE')).toContain('[REDACTED]');
  });

  it('leaves benign text alone', () => {
    const out = redactSecrets('hello world, this is fine');
    expect(out).toBe('hello world, this is fine');
  });

  it('returns stats with redactions count', () => {
    const { output, stats } = redactSecretsWithStats('password=longerSecret and token=bar1234');
    expect(stats.redactions).toBeGreaterThanOrEqual(2);
    expect(output).not.toContain('longerSecret');
    expect(output).not.toContain('bar1234');
  });

  it('handles empty / non-string input', () => {
    expect(redactSecrets('')).toBe('');
    expect(redactSecrets(undefined as any)).toBe('');
  });

  it('redacts 32+ hex strings (likely api hashes)', () => {
    const s = 'sig=' + 'a'.repeat(64);
    expect(redactSecrets(s)).toContain('[REDACTED]');
  });

  it('multiple secrets in one string each redacted', () => {
    const r = redactSecrets('password=abcd1234 and api_key=secretval123');
    const occurrences = (r.match(/\[REDACTED\]/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});
