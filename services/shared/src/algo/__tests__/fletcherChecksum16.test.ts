import { describe, it, expect } from 'vitest';
import { fletcher16Bytes, fletcher16String, fletcherChecksum16 } from '../fletcherChecksum16';

describe('fletcherChecksum16', () => {
  it('factory exposes both', () => {
    const api = fletcherChecksum16();
    expect(typeof api.fletcher16Bytes).toBe('function');
    expect(typeof api.fletcher16String).toBe('function');
  });

  it('empty => 0', () => {
    expect(fletcher16String('')).toBe(0);
  });

  it('"abcde" => 0xC8F0 (canonical Fletcher-16 example)', () => {
    expect(fletcher16String('abcde')).toBe(0xc8f0);
  });

  it('"abcdef" => 0x2057 (canonical Fletcher-16 example)', () => {
    expect(fletcher16String('abcdef')).toBe(0x2057);
  });

  it('bytes API matches string API', () => {
    const s = 'hello';
    expect(fletcher16Bytes(new TextEncoder().encode(s))).toBe(fletcher16String(s));
  });

  it('order matters (positional)', () => {
    expect(fletcher16String('ab')).not.toBe(fletcher16String('ba'));
  });

  it('result fits 16 bits', () => {
    const v = fletcher16String('miamo-checksum-test');
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1 << 16);
  });

  it('plain number arrays accepted', () => {
    expect(fletcher16Bytes([97, 98, 99, 100, 101])).toBe(0xc8f0);
  });

  it('different inputs produce different sums', () => {
    expect(fletcher16String('foo')).not.toBe(fletcher16String('bar'));
  });

  it('throws on bad input', () => {
    expect(() => fletcher16Bytes(null as any)).toThrow();
    expect(() => fletcher16String(1 as any)).toThrow();
  });

  it('repeated input deterministic', () => {
    expect(fletcher16String('repeat')).toBe(fletcher16String('repeat'));
  });
});
