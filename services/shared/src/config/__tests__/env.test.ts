import { describe, it, expect } from 'vitest';
import { validateEnv, assertEnv, type EnvSchema } from '../env';

const schema: EnvSchema = {
  NODE_ENV:        { kind: 'enum',    required: true,  values: ['development', 'staging', 'production'] },
  CSRF_SECRET:     { kind: 'string',  required: true,  minLen: 16 },
  RATE_LIMIT_RPS:  { kind: 'number',  required: false, min: 1, max: 10_000 },
  FLAG_V6:         { kind: 'boolean', required: false },
  DB_URL:          { kind: 'string',  required: true,  pattern: /^postgres:\/\// },
};

describe('validateEnv', () => {
  it('passes a fully-valid env', () => {
    const r = validateEnv({
      NODE_ENV: 'production',
      CSRF_SECRET: 'a'.repeat(20),
      RATE_LIMIT_RPS: '500',
      FLAG_V6: 'true',
      DB_URL: 'postgres://localhost/miamo',
    }, schema);
    expect(r.ok).toBe(true);
    expect(r.values.RATE_LIMIT_RPS).toBe(500);
    expect(r.values.FLAG_V6).toBe(true);
  });

  it('reports missing required vars', () => {
    const r = validateEnv({}, schema);
    expect(r.ok).toBe(false);
    const codes = r.issues.filter((i) => i.code === 'missing').map((i) => i.name);
    expect(codes).toContain('NODE_ENV');
    expect(codes).toContain('CSRF_SECRET');
    expect(codes).toContain('DB_URL');
  });

  it('ignores missing optional vars', () => {
    const r = validateEnv({
      NODE_ENV: 'staging',
      CSRF_SECRET: 'x'.repeat(16),
      DB_URL: 'postgres://x',
    }, schema);
    expect(r.ok).toBe(true);
  });

  it('detects string too short', () => {
    const r = validateEnv({
      NODE_ENV: 'production', CSRF_SECRET: 'short', DB_URL: 'postgres://x',
    }, schema);
    expect(r.issues.some((i) => i.name === 'CSRF_SECRET' && i.code === 'too_short')).toBe(true);
  });

  it('detects pattern mismatch', () => {
    const r = validateEnv({
      NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'mysql://x',
    }, schema);
    expect(r.issues.some((i) => i.code === 'pattern_mismatch')).toBe(true);
  });

  it('detects enum mismatch', () => {
    const r = validateEnv({
      NODE_ENV: 'live', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
    }, schema);
    expect(r.issues.some((i) => i.code === 'not_in_enum')).toBe(true);
  });

  it('detects number out of range', () => {
    const r = validateEnv({
      NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
      RATE_LIMIT_RPS: '99999',
    }, schema);
    expect(r.issues.some((i) => i.code === 'above_max')).toBe(true);
  });

  it('detects non-numeric values', () => {
    const r = validateEnv({
      NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
      RATE_LIMIT_RPS: 'abc',
    }, schema);
    expect(r.issues.some((i) => i.code === 'not_a_number')).toBe(true);
  });

  it('parses boolean variants', () => {
    for (const truthy of ['1', 'true', 'yes', 'on', 'TRUE']) {
      const r = validateEnv({
        NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
        FLAG_V6: truthy,
      }, schema);
      expect(r.values.FLAG_V6).toBe(true);
    }
    for (const falsy of ['0', 'false', 'no', 'off']) {
      const r = validateEnv({
        NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
        FLAG_V6: falsy,
      }, schema);
      expect(r.values.FLAG_V6).toBe(false);
    }
  });

  it('rejects invalid boolean strings', () => {
    const r = validateEnv({
      NODE_ENV: 'staging', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
      FLAG_V6: 'maybe',
    }, schema);
    expect(r.issues.some((i) => i.code === 'not_a_boolean')).toBe(true);
  });

  it('treats empty string as missing', () => {
    const r = validateEnv({
      NODE_ENV: '', CSRF_SECRET: 'x'.repeat(16), DB_URL: 'postgres://x',
    }, schema);
    expect(r.issues.some((i) => i.name === 'NODE_ENV' && i.code === 'missing')).toBe(true);
  });
});

describe('assertEnv', () => {
  it('does nothing when report is ok', () => {
    expect(() => assertEnv({ ok: true, issues: [], values: {} })).not.toThrow();
  });
  it('throws with all issue lines when not ok', () => {
    expect(() => assertEnv({
      ok: false,
      issues: [
        { name: 'X', code: 'missing', detail: 'a' },
        { name: 'Y', code: 'too_short', detail: 'b' },
      ],
      values: {},
    })).toThrow(/X.*missing[\s\S]*Y.*too_short/);
  });
});
