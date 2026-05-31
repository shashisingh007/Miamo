import { describe, it, expect } from 'vitest';
import { encodeCursor, decodeCursor, clampPageSize } from '../pagination';

describe('encodeCursor / decodeCursor — round trip', () => {
  it('round-trips integer k + string id', () => {
    const enc = encodeCursor({ k: 1_700_000_000_000, id: 'usr_abc' });
    const r = decodeCursor(enc);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cursor).toEqual({ k: 1_700_000_000_000, id: 'usr_abc' });
  });
  it('round-trips float k', () => {
    const enc = encodeCursor({ k: 0.7325, id: 'x' });
    const r = decodeCursor(enc);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.cursor.k).toBeCloseTo(0.7325, 6);
  });
});

describe('encodeCursor — input validation', () => {
  it('rejects non-finite k', () => {
    expect(() => encodeCursor({ k: NaN, id: 'a' })).toThrow();
    expect(() => encodeCursor({ k: Infinity, id: 'a' })).toThrow();
  });
  it('rejects empty id', () => {
    expect(() => encodeCursor({ k: 1, id: '' })).toThrow();
  });
});

describe('decodeCursor — failures', () => {
  it('missing input', () => {
    const r = decodeCursor(null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing');
  });
  it('too-large input', () => {
    const r = decodeCursor('x'.repeat(1000));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('too_large');
  });
  it('invalid base64', () => {
    const r = decodeCursor('!!!!');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid');
  });
  it('valid b64 but not JSON', () => {
    const garbage = Buffer.from('not json', 'utf8').toString('base64')
      .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const r = decodeCursor(garbage);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid');
  });
  it('valid JSON but missing fields', () => {
    const enc = Buffer.from('{"k":1}', 'utf8').toString('base64')
      .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const r = decodeCursor(enc);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid');
  });
});

describe('clampPageSize', () => {
  it('returns default for null / non-positive', () => {
    expect(clampPageSize(null, 20, 100)).toBe(20);
    expect(clampPageSize(0, 20, 100)).toBe(20);
    expect(clampPageSize(-5, 20, 100)).toBe(20);
    expect(clampPageSize(NaN, 20, 100)).toBe(20);
  });
  it('caps at max', () => {
    expect(clampPageSize(500, 20, 100)).toBe(100);
  });
  it('floors fractional', () => {
    expect(clampPageSize(33.7, 20, 100)).toBe(33);
  });
});
