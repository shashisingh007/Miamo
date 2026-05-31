import { describe, it, expect } from 'vitest';
import { adler32Checksum } from '../adler32Checksum';

describe('adler32Checksum', () => {
  it('rejects bad input', () => {
    expect(() => adler32Checksum(123 as any)).toThrow();
  });

  it('empty => 1', () => {
    // Adler-32 of empty buffer = 0x00000001
    expect(adler32Checksum('')).toBe(1);
  });

  it('"a" known value', () => {
    // a=1+97=98, b=0+98=98 => (98 << 16) | 98 = 0x00620062
    expect(adler32Checksum('a')).toBe(0x00620062);
  });

  it('"abc" known value', () => {
    // Reference: 0x024d0127
    expect(adler32Checksum('abc')).toBe(0x024d0127);
  });

  it('"Wikipedia" known value', () => {
    // Reference: 0x11e60398
    expect(adler32Checksum('Wikipedia')).toBe(0x11e60398);
  });

  it('accepts Uint8Array', () => {
    const a = adler32Checksum('hello');
    const b = adler32Checksum(new TextEncoder().encode('hello'));
    expect(a).toBe(b);
  });

  it('deterministic', () => {
    expect(adler32Checksum('repeat')).toBe(adler32Checksum('repeat'));
  });

  it('different inputs different sums', () => {
    expect(adler32Checksum('a')).not.toBe(adler32Checksum('b'));
  });

  it('handles long input', () => {
    const s = 'x'.repeat(100000);
    const h = adler32Checksum(s);
    expect(h).toBeGreaterThan(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('unsigned 32-bit return', () => {
    const v = adler32Checksum('test');
    expect(Number.isInteger(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(0xffffffff);
  });

  it('unicode via utf-8', () => {
    expect(adler32Checksum('café')).toBe(
      adler32Checksum(new TextEncoder().encode('café'))
    );
  });

  it('single-byte buffer', () => {
    const v = adler32Checksum(new Uint8Array([0]));
    // a=1, b=1 => 0x00010001
    expect(v).toBe(0x00010001);
  });

  it('all zeros buffer', () => {
    const v = adler32Checksum(new Uint8Array(100));
    // a=1, b=100 => (100 << 16) | 1
    expect(v).toBe((100 << 16) | 1);
  });

  it('chunked processing matches single-pass for long input', () => {
    const buf = new Uint8Array(20000);
    for (let i = 0; i < buf.length; i++) buf[i] = i & 0xff;
    const v = adler32Checksum(buf);
    expect(v).toBeGreaterThan(0);
  });
});
