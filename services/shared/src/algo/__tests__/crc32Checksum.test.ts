import { describe, it, expect } from 'vitest';
import { crc32, crc32Hex, Crc32Stream } from '../crc32Checksum';

// Known CRC-32 vectors
//   ""              => 0x00000000
//   "a"             => 0xe8b7be43
//   "abc"           => 0x352441c2
//   "123456789"     => 0xcbf43926
//   "The quick brown fox jumps over the lazy dog" => 0x414fa339

describe('crc32Checksum', () => {
  it('empty string => 0', () => {
    expect(crc32('')).toBe(0);
    expect(crc32Hex('')).toBe('00000000');
  });

  it('single char "a"', () => {
    expect(crc32('a')).toBe(0xe8b7be43);
    expect(crc32Hex('a')).toBe('e8b7be43');
  });

  it('"abc"', () => {
    expect(crc32('abc')).toBe(0x352441c2);
  });

  it('"123456789" canonical vector', () => {
    expect(crc32('123456789')).toBe(0xcbf43926);
  });

  it('quick brown fox', () => {
    expect(crc32('The quick brown fox jumps over the lazy dog')).toBe(0x414fa339);
  });

  it('Uint8Array equivalent to UTF-8 string', () => {
    const s = 'hello';
    const bytes = new TextEncoder().encode(s);
    expect(crc32(bytes)).toBe(crc32(s));
  });

  it('non-string non-bytes throws', () => {
    expect(() => crc32(123 as any)).toThrow();
  });

  it('crc32Hex zero-pads to 8 chars', () => {
    expect(crc32Hex('')).toHaveLength(8);
    expect(crc32Hex('a')).toHaveLength(8);
  });

  it('Crc32Stream digest matches one-shot', () => {
    const s = 'The quick brown fox jumps over the lazy dog';
    const stream = new Crc32Stream();
    stream.update(s);
    expect(stream.digest()).toBe(crc32(s));
  });

  it('Crc32Stream chunked equals one-shot', () => {
    const s = 'The quick brown fox jumps over the lazy dog';
    const stream = new Crc32Stream();
    stream.update('The quick brown fox ');
    stream.update('jumps over ');
    stream.update('the lazy dog');
    expect(stream.digest()).toBe(crc32(s));
  });

  it('Crc32Stream supports Uint8Array chunks', () => {
    const enc = new TextEncoder();
    const stream = new Crc32Stream();
    stream.update(enc.encode('123'));
    stream.update(enc.encode('456'));
    stream.update(enc.encode('789'));
    expect(stream.digest()).toBe(0xcbf43926);
  });

  it('Crc32Stream digestHex pads', () => {
    const stream = new Crc32Stream();
    stream.update('');
    expect(stream.digestHex()).toBe('00000000');
  });

  it('throws on non-integer seed', () => {
    expect(() => crc32('a', 1.5)).toThrow();
    expect(() => new Crc32Stream(1.1)).toThrow();
  });

  it('non-zero seed differs from default', () => {
    expect(crc32('abc', 1)).not.toBe(crc32('abc'));
  });

  it('large input handled', () => {
    const s = 'x'.repeat(10_000);
    const expected = crc32(s);
    const stream = new Crc32Stream();
    for (let i = 0; i < 10; i++) stream.update('x'.repeat(1000));
    expect(stream.digest()).toBe(expected);
  });

  it('different inputs hash differently', () => {
    expect(crc32('abc')).not.toBe(crc32('abd'));
  });

  it('unicode encoded as UTF-8', () => {
    // café => 63 61 66 c3 a9
    expect(crc32('café')).toBe(crc32(new Uint8Array([0x63, 0x61, 0x66, 0xc3, 0xa9])));
  });
});
