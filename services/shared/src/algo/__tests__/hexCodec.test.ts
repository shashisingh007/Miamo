import { describe, it, expect } from 'vitest';
import { hexEncode, hexDecode } from '../hexCodec';

describe('hexCodec', () => {
  it('encode rejects bad input', () => {
    expect(() => hexEncode(123 as any)).toThrow();
  });

  it('decode rejects non-string', () => {
    expect(() => hexDecode(123 as any)).toThrow();
  });

  it('decode rejects odd length', () => {
    expect(() => hexDecode('abc')).toThrow();
  });

  it('decode rejects invalid char', () => {
    expect(() => hexDecode('zz')).toThrow();
  });

  it('empty round-trip', () => {
    expect(hexEncode(new Uint8Array(0))).toBe('');
    expect(hexDecode('').length).toBe(0);
  });

  it('encodes single byte', () => {
    expect(hexEncode(new Uint8Array([0xff]))).toBe('ff');
  });

  it('encodes upper-case', () => {
    expect(hexEncode(new Uint8Array([0xff]), true)).toBe('FF');
  });

  it('encodes multiple bytes', () => {
    expect(hexEncode(new Uint8Array([0x00, 0x12, 0xab]))).toBe('0012ab');
  });

  it('decodes single byte', () => {
    expect(Array.from(hexDecode('ff'))).toEqual([0xff]);
  });

  it('decodes mixed case', () => {
    expect(Array.from(hexDecode('aBcD'))).toEqual([0xab, 0xcd]);
  });

  it('round-trip random', () => {
    const buf = new Uint8Array(256);
    for (let i = 0; i < 256; i++) buf[i] = i;
    expect(Array.from(hexDecode(hexEncode(buf)))).toEqual(Array.from(buf));
  });

  it('encodes a string via utf-8', () => {
    expect(hexEncode('a')).toBe('61');
  });

  it('decode all digits', () => {
    expect(Array.from(hexDecode('0123456789abcdef'))).toEqual([
      0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    ]);
  });

  it('long round-trip', () => {
    const buf = new Uint8Array(1000);
    for (let i = 0; i < buf.length; i++) buf[i] = (i * 31 + 7) & 0xff;
    expect(Array.from(hexDecode(hexEncode(buf)))).toEqual(Array.from(buf));
  });

  it('encode result is twice the byte length', () => {
    expect(hexEncode(new Uint8Array(50)).length).toBe(100);
  });

  it('decoded result is half the hex length', () => {
    expect(hexDecode('aa'.repeat(50)).length).toBe(50);
  });

  it('decode whitespace rejected', () => {
    expect(() => hexDecode(' a')).toThrow();
  });
});
