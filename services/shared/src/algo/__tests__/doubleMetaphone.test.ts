import { describe, it, expect } from 'vitest';
import { doubleMetaphone } from '../doubleMetaphone';

describe('doubleMetaphone', () => {
  it('empty string', () => {
    expect(doubleMetaphone('')).toEqual({ primary: '', alternate: '' });
  });

  it('only non-letters => empty', () => {
    expect(doubleMetaphone('!!!')).toEqual({ primary: '', alternate: '' });
  });

  it('throws on non-string', () => {
    expect(() => doubleMetaphone(123 as any)).toThrow();
  });

  it('PH -> F', () => {
    expect(doubleMetaphone('PHONE').primary.startsWith('F')).toBe(true);
  });

  it('silent KN', () => {
    const r = doubleMetaphone('KNIGHT');
    expect(r.primary[0]).toBe('N');
  });

  it('silent GN', () => {
    expect(doubleMetaphone('GNAT').primary[0]).toBe('N');
  });

  it('CH -> X', () => {
    expect(doubleMetaphone('CHURCH').primary).toContain('X');
  });

  it('case-insensitive', () => {
    expect(doubleMetaphone('Smith')).toEqual(doubleMetaphone('SMITH'));
  });

  it('similar names share primary', () => {
    expect(doubleMetaphone('SMITH').primary).toBe(doubleMetaphone('SMYTH').primary);
  });

  it('different names differ', () => {
    expect(doubleMetaphone('JOHNSON').primary).not.toBe(doubleMetaphone('PETERSON').primary);
  });

  it('doubled letters collapse', () => {
    expect(doubleMetaphone('LETTER').primary).toBe(doubleMetaphone('LETER').primary);
  });

  it('X at start emits S', () => {
    expect(doubleMetaphone('XAVIER').primary[0]).toBe('S');
  });

  it('returns both keys', () => {
    const r = doubleMetaphone('GERMAN');
    expect(typeof r.primary).toBe('string');
    expect(typeof r.alternate).toBe('string');
  });
});
