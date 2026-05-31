import { describe, it, expect } from 'vitest';
import { parseRfc3339, isValidRfc3339, formatRfc3339Utc } from '../rfc3339DateTimeParser';

describe('rfc3339DateTimeParser', () => {
  it('parses Z UTC', () => {
    const p = parseRfc3339('2024-05-01T12:00:00Z')!;
    expect(p.year).toBe(2024);
    expect(p.month).toBe(5);
    expect(p.offsetMinutes).toBe(0);
  });

  it('parses lowercase z', () => {
    expect(parseRfc3339('2024-05-01T12:00:00z')).not.toBeNull();
  });

  it('parses fractional seconds', () => {
    const p = parseRfc3339('2024-05-01T12:00:00.123Z')!;
    expect(p.fractionMs).toBe(123);
  });

  it('truncates fractional to milliseconds', () => {
    const p = parseRfc3339('2024-05-01T12:00:00.123456Z')!;
    expect(p.fractionMs).toBe(123);
  });

  it('pads fractional', () => {
    const p = parseRfc3339('2024-05-01T12:00:00.1Z')!;
    expect(p.fractionMs).toBe(100);
  });

  it('parses positive offset', () => {
    const p = parseRfc3339('2024-05-01T12:00:00+05:30')!;
    expect(p.offsetMinutes).toBe(330);
    expect(new Date(p.epochMs).toISOString()).toBe('2024-05-01T06:30:00.000Z');
  });

  it('parses negative offset', () => {
    const p = parseRfc3339('2024-05-01T12:00:00-08:00')!;
    expect(p.offsetMinutes).toBe(-480);
  });

  it('accepts space separator', () => {
    expect(parseRfc3339('2024-05-01 12:00:00Z')).not.toBeNull();
  });

  it('rejects missing timezone', () => {
    expect(parseRfc3339('2024-05-01T12:00:00')).toBeNull();
  });

  it('rejects bad month/day', () => {
    expect(parseRfc3339('2024-13-01T00:00:00Z')).toBeNull();
    expect(parseRfc3339('2024-02-30T00:00:00Z')).toBeNull();
  });

  it('accepts Feb 29 in leap year', () => {
    expect(parseRfc3339('2024-02-29T00:00:00Z')).not.toBeNull();
  });

  it('rejects Feb 29 in non-leap year', () => {
    expect(parseRfc3339('2023-02-29T00:00:00Z')).toBeNull();
  });

  it('rejects bad hour/minute', () => {
    expect(parseRfc3339('2024-05-01T24:00:00Z')).toBeNull();
    expect(parseRfc3339('2024-05-01T12:60:00Z')).toBeNull();
  });

  it('accepts leap second :60', () => {
    expect(parseRfc3339('2016-12-31T23:59:60Z')).not.toBeNull();
  });

  it('rejects offset hours > 14', () => {
    expect(parseRfc3339('2024-05-01T12:00:00+15:00')).toBeNull();
  });

  it('rejects non-string', () => {
    expect(parseRfc3339(123 as any)).toBeNull();
  });

  it('isValidRfc3339 true/false', () => {
    expect(isValidRfc3339('2024-05-01T12:00:00Z')).toBe(true);
    expect(isValidRfc3339('garbage')).toBe(false);
  });

  it('formatRfc3339Utc round-trips', () => {
    const ms = Date.UTC(2024, 4, 1, 12, 34, 56, 789);
    const s = formatRfc3339Utc(ms);
    expect(s).toBe('2024-05-01T12:34:56.789Z');
    expect(parseRfc3339(s)!.epochMs).toBe(ms);
  });

  it('formatRfc3339Utc without fractional', () => {
    const ms = Date.UTC(2024, 4, 1, 12, 0, 0, 0);
    expect(formatRfc3339Utc(ms, { fractional: false })).toBe('2024-05-01T12:00:00Z');
  });

  it('formatRfc3339Utc throws on non-finite', () => {
    expect(() => formatRfc3339Utc(NaN)).toThrow();
  });

  it('epoch computation across offsets is consistent', () => {
    const a = parseRfc3339('2024-05-01T12:00:00+05:30')!.epochMs;
    const b = parseRfc3339('2024-05-01T06:30:00Z')!.epochMs;
    expect(a).toBe(b);
  });
});
