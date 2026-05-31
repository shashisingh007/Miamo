import { describe, it, expect } from 'vitest';
import { parseIdempotencyKey } from '../idempotencyKey';

describe('parseIdempotencyKey', () => {
  it('rejects null / empty', () => {
    expect(parseIdempotencyKey(null).ok).toBe(false);
    expect(parseIdempotencyKey('').ok).toBe(false);
  });
  it('rejects too-short', () => {
    const r = parseIdempotencyKey('abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_short');
  });
  it('rejects too-long', () => {
    const r = parseIdempotencyKey('x'.repeat(200));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_long');
  });
  it('rejects whitespace / control chars', () => {
    const r = parseIdempotencyKey('abcdef ghijkl mnop');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_chars');
  });
  it('accepts a UUIDv4', () => {
    const r = parseIdempotencyKey('123e4567-e89b-42d3-a456-426614174000');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.kind).toBe('uuid');
  });
  it('accepts a ULID (lowercase normalised)', () => {
    const r = parseIdempotencyKey('01J0ABCDEFGHJKMNPQRSTVWXYZ');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kind).toBe('ulid');
      expect(r.key).toBe('01j0abcdefghjkmnpqrstvwxyz');
    }
  });
  it('accepts an opaque alphanumeric key', () => {
    const r = parseIdempotencyKey('my-client-key_2024-q1-001');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.kind).toBe('opaque');
      expect(r.key).toBe('my-client-key_2024-q1-001');
    }
  });
  it('rejects keys with punctuation other than - and _', () => {
    const r = parseIdempotencyKey('abcdef@ghijkl.mnop');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_chars');
  });
});
