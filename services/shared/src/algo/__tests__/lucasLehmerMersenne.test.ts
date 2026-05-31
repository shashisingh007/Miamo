import { describe, it, expect } from 'vitest';
import { isMersennePrime } from '../lucasLehmerMersenne';

describe('isMersennePrime', () => {
  it('throws on non-integer', () => {
    expect(() => isMersennePrime(2.5)).toThrow(RangeError);
  });

  it('throws on p < 2', () => {
    expect(() => isMersennePrime(1)).toThrow(RangeError);
    expect(() => isMersennePrime(0)).toThrow(RangeError);
  });

  it('p=2 => true (M2=3)', () => {
    expect(isMersennePrime(2)).toBe(true);
  });

  it('p=3 => true (M3=7)', () => {
    expect(isMersennePrime(3)).toBe(true);
  });

  it('p=5 => true (M5=31)', () => {
    expect(isMersennePrime(5)).toBe(true);
  });

  it('p=7 => true (M7=127)', () => {
    expect(isMersennePrime(7)).toBe(true);
  });

  it('p=11 => false (M11=2047=23*89)', () => {
    expect(isMersennePrime(11)).toBe(false);
  });

  it('p=13 => true (M13=8191)', () => {
    expect(isMersennePrime(13)).toBe(true);
  });

  it('p=17 => true', () => {
    expect(isMersennePrime(17)).toBe(true);
  });

  it('p=19 => true', () => {
    expect(isMersennePrime(19)).toBe(true);
  });

  it('p=23 => false', () => {
    expect(isMersennePrime(23)).toBe(false);
  });

  it('p=29 => false', () => {
    expect(isMersennePrime(29)).toBe(false);
  });

  it('p=31 => true', () => {
    expect(isMersennePrime(31)).toBe(true);
  });

  it('p=9 composite => false', () => {
    expect(isMersennePrime(9)).toBe(false);
  });
});
