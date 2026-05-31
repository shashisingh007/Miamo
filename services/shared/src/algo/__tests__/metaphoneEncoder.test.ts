import { describe, it, expect } from 'vitest';
import { metaphoneEncode } from '../metaphoneEncoder';

describe('metaphoneEncode', () => {
  it('throws on non-string', () => {
    expect(() => metaphoneEncode(123 as any)).toThrow(TypeError);
  });

  it('empty => empty', () => {
    expect(metaphoneEncode('')).toBe('');
  });

  it('only punctuation => empty', () => {
    expect(metaphoneEncode('!!!')).toBe('');
  });

  it('drops silent KN', () => {
    expect(metaphoneEncode('Knight').startsWith('N')).toBe(true);
  });

  it('drops silent GN', () => {
    expect(metaphoneEncode('Gnome').startsWith('N')).toBe(true);
  });

  it('PH => F', () => {
    expect(metaphoneEncode('Phone')).toContain('F');
  });

  it('WH => W (initial vowel preserved or skipped)', () => {
    const out = metaphoneEncode('Whale');
    expect(out.length).toBeGreaterThan(0);
  });

  it('TH => 0', () => {
    expect(metaphoneEncode('Thomas')).toContain('0');
  });

  it('case-insensitive', () => {
    expect(metaphoneEncode('phone')).toBe(metaphoneEncode('PHONE'));
  });

  it('similar-sounding produce overlap', () => {
    const a = metaphoneEncode('Smith');
    const b = metaphoneEncode('Smyth');
    expect(a).toBe(b);
  });

  it('different sounds differ', () => {
    expect(metaphoneEncode('cat')).not.toBe(metaphoneEncode('dog'));
  });

  it('duplicate letters collapsed', () => {
    expect(metaphoneEncode('Apple')).toBe(metaphoneEncode('Aple'));
  });

  it('X at start => S', () => {
    expect(metaphoneEncode('Xerox').startsWith('S')).toBe(true);
  });

  it('CH => X', () => {
    expect(metaphoneEncode('Chair')).toContain('X');
  });

  it('initial vowel preserved', () => {
    expect(metaphoneEncode('Apple').startsWith('A')).toBe(true);
  });

  it('non-letters ignored', () => {
    expect(metaphoneEncode('S-m-i-t-h')).toBe(metaphoneEncode('Smith'));
  });
});
