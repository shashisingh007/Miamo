import { describe, it, expect } from 'vitest';
import { encodeBase32, decodeBase32, isValidBase32 } from '../base32Codec';

function bytesOf(...nums: number[]): Uint8Array {
  return new Uint8Array(nums);
}
function strBytes(s: string): Uint8Array {
  return new Uint8Array([...s].map((c) => c.charCodeAt(0)));
}

describe('base32Codec', () => {
  it('encodes empty', () => {
    expect(encodeBase32(new Uint8Array(0))).toBe('');
  });

  it('RFC 4648 test vectors', () => {
    expect(encodeBase32(strBytes(''))).toBe('');
    expect(encodeBase32(strBytes('f'))).toBe('MY======');
    expect(encodeBase32(strBytes('fo'))).toBe('MZXQ====');
    expect(encodeBase32(strBytes('foo'))).toBe('MZXW6===');
    expect(encodeBase32(strBytes('foob'))).toBe('MZXW6YQ=');
    expect(encodeBase32(strBytes('fooba'))).toBe('MZXW6YTB');
    expect(encodeBase32(strBytes('foobar'))).toBe('MZXW6YTBOI======');
  });

  it('round-trip random-ish bytes', () => {
    const data = bytesOf(0, 1, 2, 250, 99, 128, 255);
    const enc = encodeBase32(data);
    const dec = decodeBase32(enc);
    expect(Array.from(dec)).toEqual(Array.from(data));
  });

  it('encode without padding option', () => {
    expect(encodeBase32(strBytes('f'), { padding: false })).toBe('MY');
  });

  it('decodes without padding', () => {
    const dec = decodeBase32('MY');
    expect(Array.from(dec)).toEqual([102]);
  });

  it('decode is case-insensitive and strips whitespace', () => {
    const dec = decodeBase32(' mz xw 6y tb ');
    expect(Array.from(dec)).toEqual([102, 111, 111, 98, 97]);
  });

  it('rejects invalid characters', () => {
    expect(() => decodeBase32('MZX1====')).toThrow();
    expect(() => decodeBase32('!!')).toThrow();
  });

  it('rejects bad padding length', () => {
    expect(() => decodeBase32('MY=====')).toThrow(); // not multiple of 8 when padded
  });

  it('rejects bad padding count', () => {
    expect(() => decodeBase32('A=======')).toThrow(); // 1 char + 7 pads invalid (only 0,1,3,4,6 allowed)
  });

  it('accepts ArrayBuffer input', () => {
    const buf = strBytes('foo').buffer;
    expect(encodeBase32(buf)).toBe('MZXW6===');
  });

  it('decodes empty string to empty bytes', () => {
    expect(decodeBase32('').length).toBe(0);
  });

  it('isValidBase32 true for valid', () => {
    expect(isValidBase32('MZXW6===')).toBe(true);
    expect(isValidBase32('')).toBe(true);
  });

  it('isValidBase32 false for invalid', () => {
    expect(isValidBase32('not-b32!')).toBe(false);
  });

  it('round-trip 64 random bytes', () => {
    const data = new Uint8Array(64);
    for (let i = 0; i < data.length; i++) data[i] = (i * 17 + 3) & 0xff;
    const enc = encodeBase32(data);
    const dec = decodeBase32(enc);
    expect(Array.from(dec)).toEqual(Array.from(data));
  });

  it('non-string input to decode throws', () => {
    expect(() => decodeBase32(123 as any)).toThrow();
  });

  it('encoded length is multiple of 8 when padded', () => {
    expect(encodeBase32(strBytes('xyz')).length % 8).toBe(0);
  });
});
