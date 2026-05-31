import { describe, it, expect } from 'vitest';
import {
  parseUtcOffsetMinutes,
  formatUtcOffsetMinutes,
  isUtcOffsetEquivalent,
} from '../utcOffsetParser';

describe('utcOffsetParser', () => {
  it('parses Z and z as 0', () => {
    expect(parseUtcOffsetMinutes('Z')).toBe(0);
    expect(parseUtcOffsetMinutes('z')).toBe(0);
  });

  it('parses UTC and GMT bare as 0', () => {
    expect(parseUtcOffsetMinutes('UTC')).toBe(0);
    expect(parseUtcOffsetMinutes('GMT')).toBe(0);
  });

  it('parses ±HH:MM', () => {
    expect(parseUtcOffsetMinutes('+05:30')).toBe(330);
    expect(parseUtcOffsetMinutes('-08:00')).toBe(-480);
  });

  it('parses ±HHMM', () => {
    expect(parseUtcOffsetMinutes('+0530')).toBe(330);
    expect(parseUtcOffsetMinutes('-0800')).toBe(-480);
  });

  it('parses ±HH', () => {
    expect(parseUtcOffsetMinutes('+05')).toBe(300);
    expect(parseUtcOffsetMinutes('-08')).toBe(-480);
  });

  it('parses UTC±… and GMT±… forms (case-insensitive)', () => {
    expect(parseUtcOffsetMinutes('UTC+5')).toBeNull(); // single-digit not supported
    expect(parseUtcOffsetMinutes('UTC+05')).toBe(300);
    expect(parseUtcOffsetMinutes('gmt-08:00')).toBe(-480);
  });

  it('returns null on garbage', () => {
    expect(parseUtcOffsetMinutes('hello')).toBeNull();
    expect(parseUtcOffsetMinutes('+99:00')).toBeNull();
    expect(parseUtcOffsetMinutes('+05:99')).toBeNull();
    expect(parseUtcOffsetMinutes('')).toBeNull();
    expect(parseUtcOffsetMinutes(null as any)).toBeNull();
  });

  it('rejects out-of-range hours', () => {
    expect(parseUtcOffsetMinutes('+15:00')).toBeNull();
    expect(parseUtcOffsetMinutes('-14:00')).toBe(-840);
  });

  it('trims whitespace', () => {
    expect(parseUtcOffsetMinutes('  +05:30  ')).toBe(330);
  });

  it('formatUtcOffsetMinutes round-trips with parse', () => {
    const s = formatUtcOffsetMinutes(330);
    expect(s).toBe('+05:30');
    expect(parseUtcOffsetMinutes(s!)).toBe(330);
  });

  it('formatUtcOffsetMinutes supports compact form', () => {
    expect(formatUtcOffsetMinutes(-480, { includeColon: false })).toBe('-0800');
  });

  it('formatUtcOffsetMinutes returns null for out-of-range', () => {
    expect(formatUtcOffsetMinutes(15 * 60)).toBeNull();
    expect(formatUtcOffsetMinutes(Number.NaN)).toBeNull();
  });

  it('formatUtcOffsetMinutes formats zero', () => {
    expect(formatUtcOffsetMinutes(0)).toBe('+00:00');
  });

  it('isUtcOffsetEquivalent considers different spellings equal', () => {
    expect(isUtcOffsetEquivalent('+05:30', '+0530')).toBe(true);
    expect(isUtcOffsetEquivalent('Z', '+00:00')).toBe(true);
    expect(isUtcOffsetEquivalent('-08:00', '+08:00')).toBe(false);
  });

  it('isUtcOffsetEquivalent returns false when either side is invalid', () => {
    expect(isUtcOffsetEquivalent('garbage', '+00:00')).toBe(false);
  });
});
