import { describe, it, expect } from 'vitest';
import { wyhash64, wyhash64Hex } from '../wyhash64';

describe('wyhash64', () => {
  it('empty input is deterministic', () => {
    expect(wyhash64('')).toBe(wyhash64(''));
  });

  it('returns bigint', () => {
    expect(typeof wyhash64('hello')).toBe('bigint');
  });

  it('output is within 64-bit range', () => {
    const h = wyhash64('hello world');
    expect(h).toBeGreaterThanOrEqual(0n);
    expect(h).toBeLessThan(1n << 64n);
  });

  it('deterministic for same input', () => {
    expect(wyhash64('abc')).toBe(wyhash64('abc'));
  });

  it('different strings => different hashes (likely)', () => {
    expect(wyhash64('foo')).not.toBe(wyhash64('bar'));
  });

  it('seed changes output', () => {
    expect(wyhash64('test', 0n)).not.toBe(wyhash64('test', 1n));
  });

  it('Uint8Array equals string for same bytes', () => {
    const s = 'hello';
    const bytes = new TextEncoder().encode(s);
    expect(wyhash64(bytes)).toBe(wyhash64(s));
  });

  it('small inputs distinct', () => {
    expect(wyhash64('a')).not.toBe(wyhash64('b'));
    expect(wyhash64('ab')).not.toBe(wyhash64('ba'));
  });

  it('length 16 boundary', () => {
    expect(wyhash64('0123456789abcdef')).toBeGreaterThanOrEqual(0n);
  });

  it('large input', () => {
    const big = 'x'.repeat(1024);
    expect(wyhash64(big)).toBeGreaterThanOrEqual(0n);
  });

  it('hex format', () => {
    const h = wyhash64Hex('hello');
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it('1000 distinct strings have low collision rate', () => {
    const seen = new Set<bigint>();
    for (let i = 0; i < 1000; i++) seen.add(wyhash64(`input-${i}`));
    expect(seen.size).toBeGreaterThanOrEqual(995);
  });

  it('handles unicode', () => {
    const h = wyhash64('héllo \u{1F600}');
    expect(h).toBeGreaterThanOrEqual(0n);
  });

  it('boundary 48+ bytes path', () => {
    const s = 'x'.repeat(100);
    expect(wyhash64(s)).toBeGreaterThanOrEqual(0n);
  });

  it('boundary 17 bytes path', () => {
    const s = 'x'.repeat(17);
    expect(wyhash64(s)).toBeGreaterThanOrEqual(0n);
  });

  it('seed of large bigint', () => {
    const h = wyhash64('hello', (1n << 60n) + 42n);
    expect(h).toBeGreaterThanOrEqual(0n);
  });
});
