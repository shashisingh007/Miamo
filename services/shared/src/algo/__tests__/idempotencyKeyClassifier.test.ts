import { describe, it, expect } from 'vitest';
import {
  classifyIdempotencyKey,
  namespaceIdempotencyKey,
} from '../idempotencyKeyClassifier';

describe('idempotencyKeyClassifier', () => {
  it('valid 16-char key', () => {
    const r = classifyIdempotencyKey('abcdefghij012345');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('abcdefghij012345');
  });

  it('valid UUID-style', () => {
    const r = classifyIdempotencyKey('550e8400-e29b-41d4-a716-446655440000');
    expect(r.valid).toBe(true);
  });

  it('rejects non-string', () => {
    expect(classifyIdempotencyKey(123 as any).reason).toBe('not_a_string');
    expect(classifyIdempotencyKey(null as any).reason).toBe('not_a_string');
  });

  it('rejects empty after trim', () => {
    expect(classifyIdempotencyKey('   ').reason).toBe('empty');
  });

  it('rejects too short', () => {
    expect(classifyIdempotencyKey('short').reason).toBe('too_short');
  });

  it('rejects too long', () => {
    const k = 'a'.repeat(256);
    expect(classifyIdempotencyKey(k).reason).toBe('too_long');
  });

  it('rejects unsafe chars (space)', () => {
    expect(classifyIdempotencyKey('abcdefghij 12345').reason).toBe('invalid_chars');
  });

  it('rejects unsafe chars (slash)', () => {
    expect(classifyIdempotencyKey('abc/defghij12345').reason).toBe('invalid_chars');
  });

  it('accepts dot/colon/dash/underscore', () => {
    expect(classifyIdempotencyKey('abc.def:ghi-jkl_mno').valid).toBe(true);
  });

  it('trims surrounding whitespace before validating length', () => {
    const r = classifyIdempotencyKey('   abcdefghij012345   ');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('abcdefghij012345');
  });

  it('namespaceIdempotencyKey adds scope prefix', () => {
    expect(namespaceIdempotencyKey('payments', 'k1')).toBe('payments:k1');
  });

  it('namespaceIdempotencyKey ignores empty scope', () => {
    expect(namespaceIdempotencyKey('', 'k1')).toBe('k1');
    expect(namespaceIdempotencyKey('  ', 'k1')).toBe('k1');
  });

  it('namespaceIdempotencyKey lowercases scope', () => {
    expect(namespaceIdempotencyKey('PAY', 'X')).toBe('pay:X');
  });
});
