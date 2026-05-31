import { describe, it, expect } from 'vitest';
import { bailliePSW } from '../bailliePSW';

describe('bailliePSW', () => {
  it('rejects <2', () => {
    expect(bailliePSW(0n)).toBe(false);
    expect(bailliePSW(1n)).toBe(false);
    expect(bailliePSW(-7n)).toBe(false);
  });

  it('small primes', () => {
    for (const p of [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 97n]) {
      expect(bailliePSW(p)).toBe(true);
    }
  });

  it('small composites', () => {
    for (const c of [4n, 6n, 8n, 9n, 15n, 21n, 25n, 49n, 91n, 121n]) {
      expect(bailliePSW(c)).toBe(false);
    }
  });

  it('medium primes', () => {
    for (const p of [101n, 1009n, 7919n, 65537n, 1000003n]) {
      expect(bailliePSW(p)).toBe(true);
    }
  });

  it('medium composites', () => {
    expect(bailliePSW(1009n * 1013n)).toBe(false);
    expect(bailliePSW(7919n * 7919n)).toBe(false);
  });

  it('Carmichael 561', () => {
    expect(bailliePSW(561n)).toBe(false);
  });

  it('Carmichael 41041', () => {
    expect(bailliePSW(41041n)).toBe(false);
  });

  it('strong pseudoprime base 2 (2047)', () => {
    expect(bailliePSW(2047n)).toBe(false);
  });

  it('large prime', () => {
    expect(bailliePSW(2147483647n)).toBe(true);
  });

  it('large composite', () => {
    expect(bailliePSW(2147483647n * 3n)).toBe(false);
  });

  it('64-bit prime', () => {
    expect(bailliePSW(18446744073709551557n)).toBe(true);
  });

  it('squares', () => {
    expect(bailliePSW(1000003n * 1000003n)).toBe(false);
  });
});
