import { describe, it, expect } from 'vitest';
import { soundexEncode } from '../soundexEncoder';

describe('soundexEncode', () => {
  it('throws on non-string', () => {
    expect(() => soundexEncode(123 as any)).toThrow(TypeError);
  });

  it('empty => 0000', () => {
    expect(soundexEncode('')).toBe('0000');
  });

  it('Robert => R163', () => {
    expect(soundexEncode('Robert')).toBe('R163');
  });

  it('Rupert => R163', () => {
    expect(soundexEncode('Rupert')).toBe('R163');
  });

  it('Rubin => R150', () => {
    expect(soundexEncode('Rubin')).toBe('R150');
  });

  it('Ashcraft => A261', () => {
    expect(soundexEncode('Ashcraft')).toBe('A261');
  });

  it('Ashcroft => A261', () => {
    expect(soundexEncode('Ashcroft')).toBe('A261');
  });

  it('Tymczak => T522', () => {
    expect(soundexEncode('Tymczak')).toBe('T522');
  });

  it('Pfister => P236', () => {
    expect(soundexEncode('Pfister')).toBe('P236');
  });

  it('Honeyman => H555', () => {
    expect(soundexEncode('Honeyman')).toBe('H555');
  });

  it('pads with zeros for short names', () => {
    expect(soundexEncode('Lee')).toBe('L000');
  });

  it('case-insensitive', () => {
    expect(soundexEncode('robert')).toBe('R163');
  });

  it('non-letters ignored', () => {
    expect(soundexEncode('Ro!be#rt')).toBe('R163');
  });

  it('only vowels yields first letter + 000', () => {
    expect(soundexEncode('AEIOU')).toBe('A000');
  });

  it('handles single letter', () => {
    expect(soundexEncode('A')).toBe('A000');
  });
});
