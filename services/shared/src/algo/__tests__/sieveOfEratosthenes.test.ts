import { describe, it, expect } from 'vitest';
import { sieveOfEratosthenes, isPrimeSieved } from '../sieveOfEratosthenes';

describe('sieveOfEratosthenes', () => {
  it('throws on non-integer', () => {
    expect(() => sieveOfEratosthenes(1.5)).toThrow(RangeError);
  });

  it('limit < 2 => empty', () => {
    expect(sieveOfEratosthenes(1)).toEqual([]);
    expect(sieveOfEratosthenes(0)).toEqual([]);
    expect(sieveOfEratosthenes(-5)).toEqual([]);
  });

  it('limit 2', () => {
    expect(sieveOfEratosthenes(2)).toEqual([2]);
  });

  it('limit 10', () => {
    expect(sieveOfEratosthenes(10)).toEqual([2, 3, 5, 7]);
  });

  it('limit 30', () => {
    expect(sieveOfEratosthenes(30)).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });

  it('count of primes up to 100 is 25', () => {
    expect(sieveOfEratosthenes(100)).toHaveLength(25);
  });

  it('count of primes up to 1000 is 168', () => {
    expect(sieveOfEratosthenes(1000)).toHaveLength(168);
  });

  it('strictly ascending', () => {
    const p = sieveOfEratosthenes(200);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
  });

  it('isPrimeSieved throws on out-of-range', () => {
    expect(() => isPrimeSieved(10, 11)).toThrow(RangeError);
  });

  it('isPrimeSieved throws on negative', () => {
    expect(() => isPrimeSieved(10, -1)).toThrow(RangeError);
  });

  it('isPrimeSieved 0/1 => false', () => {
    expect(isPrimeSieved(10, 0)).toBe(false);
    expect(isPrimeSieved(10, 1)).toBe(false);
  });

  it('isPrimeSieved 2 => true', () => {
    expect(isPrimeSieved(10, 2)).toBe(true);
  });

  it('isPrimeSieved 7 => true', () => {
    expect(isPrimeSieved(10, 7)).toBe(true);
  });

  it('isPrimeSieved 9 => false', () => {
    expect(isPrimeSieved(10, 9)).toBe(false);
  });

  it('all sieve entries are prime', () => {
    const p = sieveOfEratosthenes(60);
    for (const x of p) {
      let isP = true;
      for (let d = 2; d * d <= x; d++) if (x % d === 0) { isP = false; break; }
      expect(isP).toBe(true);
    }
  });
});
