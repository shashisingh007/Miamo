import { describe, it, expect } from 'vitest';
import { normalizePhoneE164, isValidPhoneE164 } from '../phoneE164Normalizer';

describe('phoneE164Normalizer', () => {
  it('normalizes already-E.164 US number', () => {
    const r = normalizePhoneE164('+14155552671');
    expect(r?.e164).toBe('+14155552671');
    expect(r?.countryCode).toBe('1');
    expect(r?.national).toBe('4155552671');
  });

  it('treats 00 as +', () => {
    const r = normalizePhoneE164('00441632960123');
    expect(r?.e164).toBe('+441632960123');
    expect(r?.countryCode).toBe('44');
  });

  it('strips formatting characters', () => {
    const r = normalizePhoneE164('+1 (415) 555-2671');
    expect(r?.e164).toBe('+14155552671');
  });

  it('uses defaultCountry US, strips trunk prefix 1', () => {
    const r = normalizePhoneE164('1-415-555-2671', { defaultCountry: 'US' });
    expect(r?.e164).toBe('+14155552671');
  });

  it('uses defaultCountry GB, strips leading 0', () => {
    const r = normalizePhoneE164('07700 900123', { defaultCountry: 'GB' });
    expect(r?.e164).toBe('+447700900123');
  });

  it('returns null without country for bare local number', () => {
    expect(normalizePhoneE164('4155552671')).toBeNull();
  });

  it('defaults applied to bare national number (US)', () => {
    const r = normalizePhoneE164('4155552671', { defaultCountry: 'US' });
    expect(r?.e164).toBe('+14155552671');
  });

  it('extracts extension', () => {
    const r = normalizePhoneE164('+14155552671 x123');
    expect(r?.e164).toBe('+14155552671');
    expect(r?.extension).toBe('123');
  });

  it('rejects too-short numbers', () => {
    expect(normalizePhoneE164('+1234')).toBeNull();
  });

  it('rejects too-long numbers', () => {
    expect(normalizePhoneE164('+1234567890123456')).toBeNull();
  });

  it('rejects letters', () => {
    expect(normalizePhoneE164('+1 555-CALL-NOW')).toBeNull();
  });

  it('rejects empty/whitespace', () => {
    expect(normalizePhoneE164('')).toBeNull();
    expect(normalizePhoneE164('   ')).toBeNull();
  });

  it('rejects non-string input', () => {
    expect(normalizePhoneE164(123 as any)).toBeNull();
  });

  it('isValidPhoneE164 true/false', () => {
    expect(isValidPhoneE164('+14155552671')).toBe(true);
    expect(isValidPhoneE164('garbage')).toBe(false);
  });

  it('recognizes IN dial code', () => {
    const r = normalizePhoneE164('+919876543210');
    expect(r?.countryCode).toBe('91');
    expect(r?.national).toBe('9876543210');
  });

  it('IN with default country trunk 0', () => {
    const r = normalizePhoneE164('09876543210', { defaultCountry: 'IN' });
    expect(r?.e164).toBe('+919876543210');
  });

  it('preserves national exactly when no trunk match', () => {
    const r = normalizePhoneE164('9876543210', { defaultCountry: 'IN' });
    expect(r?.e164).toBe('+919876543210');
  });

  it('extension with caps X', () => {
    const r = normalizePhoneE164('+14155552671X99');
    expect(r?.extension).toBe('99');
  });

  it('handles unicode en-dash separator', () => {
    const r = normalizePhoneE164('+1\u2013415\u2013555\u20132671');
    expect(r?.e164).toBe('+14155552671');
  });
});
