import { describe, it, expect } from 'vitest';
import { resolveRequestId, isValidRequestId } from '../requestId';

const rand = () => 0.5;
const NOW = 1_700_000_000_000;

describe('requestId', () => {
  it('passes through a valid inbound id', () => {
    const r = resolveRequestId('01h9k2x7v8tnf3r', { nowMs: NOW, genRandom: rand });
    expect(r).toEqual({ id: '01h9k2x7v8tnf3r', source: 'inbound' });
  });

  it('lower-cases an inbound id', () => {
    const r = resolveRequestId('ABC-123', { nowMs: NOW, genRandom: rand });
    expect(r).toEqual({ id: 'abc-123', source: 'inbound' });
  });

  it('trims whitespace', () => {
    const r = resolveRequestId('  req-1  ', { nowMs: NOW, genRandom: rand });
    expect(r.id).toBe('req-1');
    expect(r.source).toBe('inbound');
  });

  it('rejects ids with disallowed characters', () => {
    const r = resolveRequestId('bad id!', { nowMs: NOW, genRandom: rand });
    expect(r.source).toBe('generated');
    expect(isValidRequestId(r.id)).toBe(true);
  });

  it('rejects ids longer than 128 chars', () => {
    const r = resolveRequestId('a'.repeat(129), { nowMs: NOW, genRandom: rand });
    expect(r.source).toBe('generated');
  });

  it('mints a generated id when inbound is null/undefined/empty', () => {
    for (const v of [null, undefined, '', '   ']) {
      const r = resolveRequestId(v as any, { nowMs: NOW, genRandom: rand });
      expect(r.source).toBe('generated');
      expect(isValidRequestId(r.id)).toBe(true);
      expect(r.id).toHaveLength(16);
    }
  });

  it('generated id encodes time monotonically (base36 prefix)', () => {
    const a = resolveRequestId(null, { nowMs: 1000, genRandom: rand });
    const b = resolveRequestId(null, { nowMs: 2_000_000, genRandom: rand });
    expect(b.id.slice(0, 10) > a.id.slice(0, 10)).toBe(true);
  });

  it('isValidRequestId guards', () => {
    expect(isValidRequestId('abc')).toBe(true);
    expect(isValidRequestId('AbC-1')).toBe(true);
    expect(isValidRequestId('with space')).toBe(false);
    expect(isValidRequestId('')).toBe(false);
    expect(isValidRequestId(123 as any)).toBe(false);
    expect(isValidRequestId(null)).toBe(false);
  });

  it('handles negative nowMs by clamping to 0', () => {
    const r = resolveRequestId(null, { nowMs: -999, genRandom: rand });
    expect(isValidRequestId(r.id)).toBe(true);
    expect(r.id).toHaveLength(16);
  });

  it('handles out-of-range rand by clamping', () => {
    const r = resolveRequestId(null, { nowMs: NOW, genRandom: () => 5 });
    expect(isValidRequestId(r.id)).toBe(true);
    const r2 = resolveRequestId(null, { nowMs: NOW, genRandom: () => -2 });
    expect(isValidRequestId(r2.id)).toBe(true);
  });
});
