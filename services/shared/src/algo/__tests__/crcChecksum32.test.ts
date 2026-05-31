import { describe, it, expect } from 'vitest';
import { crc32Bytes, crc32String, crcChecksum32 } from '../crcChecksum32';

describe('crcChecksum32', () => {
  it('factory exposes both', () => {
    const api = crcChecksum32();
    expect(typeof api.crc32Bytes).toBe('function');
    expect(typeof api.crc32String).toBe('function');
  });

  it('empty string => 0', () => {
    expect(crc32String('')).toBe(0);
  });

  it('"123456789" => 0xCBF43926 (canonical CRC-32 check value)', () => {
    expect(crc32String('123456789')).toBe(0xcbf43926);
  });

  it('"a" => 0xE8B7BE43', () => {
    expect(crc32String('a')).toBe(0xe8b7be43);
  });

  it('"abc" => 0x352441C2', () => {
    expect(crc32String('abc')).toBe(0x352441c2);
  });

  it('bytes API matches string API', () => {
    const s = 'hello world';
    expect(crc32Bytes(new TextEncoder().encode(s))).toBe(crc32String(s));
  });

  it('different inputs produce different CRCs', () => {
    expect(crc32String('abc')).not.toBe(crc32String('abd'));
  });

  it('result in [0, 2^32)', () => {
    const v = crc32String('miamo');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(2 ** 32);
  });

  it('accepts plain number arrays', () => {
    expect(crc32Bytes([97, 98, 99])).toBe(crc32String('abc'));
  });

  it('throws on bad input', () => {
    expect(() => crc32Bytes(null as any)).toThrow();
    expect(() => crc32String(1 as any)).toThrow();
  });

  it('UTF-8 multibyte matters', () => {
    expect(crc32String('héllo')).not.toBe(crc32String('hello'));
  });
});
