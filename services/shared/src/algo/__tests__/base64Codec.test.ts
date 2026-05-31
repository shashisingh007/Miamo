import { describe, it, expect } from 'vitest';
import {
  base64Encode,
  base64Decode,
  base64UrlEncode,
  base64UrlDecode,
} from '../base64Codec';

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder().decode(b);

describe('base64Codec', () => {
  it('encodes empty', () => {
    expect(base64Encode(new Uint8Array())).toBe('');
  });

  it('decodes empty', () => {
    expect(base64Decode('')).toEqual(new Uint8Array());
  });

  it('encodes single byte with padding', () => {
    expect(base64Encode(enc('f'))).toBe('Zg==');
  });

  it('encodes two bytes with padding', () => {
    expect(base64Encode(enc('fo'))).toBe('Zm8=');
  });

  it('encodes three bytes no padding', () => {
    expect(base64Encode(enc('foo'))).toBe('Zm9v');
  });

  it('encodes "foobar"', () => {
    expect(base64Encode(enc('foobar'))).toBe('Zm9vYmFy');
  });

  it('decodes "Zg=="', () => {
    expect(dec(base64Decode('Zg=='))).toBe('f');
  });

  it('decodes "Zm9vYmFy"', () => {
    expect(dec(base64Decode('Zm9vYmFy'))).toBe('foobar');
  });

  it('decodes without padding (std alphabet)', () => {
    expect(dec(base64Decode('Zm8'))).toBe('fo');
  });

  it('round-trip ASCII', () => {
    const s = 'Hello, World!';
    expect(dec(base64Decode(base64Encode(enc(s))))).toBe(s);
  });

  it('round-trip UTF-8', () => {
    const s = 'café — Привет';
    expect(dec(base64Decode(base64Encode(enc(s))))).toBe(s);
  });

  it('round-trip binary', () => {
    const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 64]);
    expect(Array.from(base64Decode(base64Encode(bytes)))).toEqual(Array.from(bytes));
  });

  it('rejects non-Uint8Array input to encode', () => {
    expect(() => base64Encode([1, 2, 3] as any)).toThrow();
  });

  it('rejects non-string input to decode', () => {
    expect(() => base64Decode(123 as any)).toThrow();
  });

  it('rejects invalid characters', () => {
    expect(() => base64Decode('!!!!')).toThrow();
  });

  it('rejects bad length (1 leftover char)', () => {
    expect(() => base64Decode('Z')).toThrow();
  });

  it('urlSafe encoding uses - and _ instead of + /', () => {
    // 0xfb 0xff produces "+/8=" in std; URL-safe should be "-_8"
    const std = base64Encode(new Uint8Array([0xfb, 0xff]));
    const url = base64UrlEncode(new Uint8Array([0xfb, 0xff]));
    expect(std).toContain('+');
    expect(std).toContain('/');
    expect(url).not.toContain('+');
    expect(url).not.toContain('/');
    expect(url).not.toContain('=');
  });

  it('urlSafe round-trip', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf, 0x00]);
    expect(Array.from(base64UrlDecode(base64UrlEncode(bytes)))).toEqual(Array.from(bytes));
  });

  it('urlSafe decode rejects + and /', () => {
    expect(() => base64UrlDecode('++//')).toThrow();
  });

  it('std decode rejects - and _', () => {
    expect(() => base64Decode('--__')).toThrow();
  });

  it('encode with padding=false omits =', () => {
    expect(base64Encode(enc('f'), { padding: false })).toBe('Zg');
    expect(base64Encode(enc('fo'), { padding: false })).toBe('Zm8');
  });

  it('decode tolerates missing padding', () => {
    expect(dec(base64Decode('Zg'))).toBe('f');
    expect(dec(base64Decode('Zm8'))).toBe('fo');
  });

  it('large round-trip stability', () => {
    const bytes = new Uint8Array(1024);
    for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7) & 0xff;
    expect(Array.from(base64Decode(base64Encode(bytes)))).toEqual(Array.from(bytes));
  });

  it('urlSafe single-byte', () => {
    expect(base64UrlEncode(enc('f'))).toBe('Zg');
  });
});
