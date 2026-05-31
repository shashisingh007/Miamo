import { describe, it, expect } from 'vitest';
import { sieveOfAtkin } from '../sieveOfAtkin';

describe('sieveOfAtkin', () => {
  it('rejects non-integer', () => {
    expect(() => sieveOfAtkin(3.5)).toThrow();
  });

  it('rejects negative', () => {
    expect(() => sieveOfAtkin(-1)).toThrow();
  });

  it('limit 0 => empty', () => {
    expect(sieveOfAtkin(0)).toEqual({ primes: [], count: 0 });
  });

  it('limit 1 => empty', () => {
    expect(sieveOfAtkin(1)).toEqual({ primes: [], count: 0 });
  });

  it('limit 2 => [2]', () => {
    expect(sieveOfAtkin(2).primes).toEqual([2]);
  });

  it('limit 10', () => {
    expect(sieveOfAtkin(10).primes).toEqual([2, 3, 5, 7]);
  });

  it('limit 30', () => {
    expect(sieveOfAtkin(30).primes).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29]);
  });

  it('count matches', () => {
    const r = sieveOfAtkin(100);
    expect(r.count).toBe(r.primes.length);
    expect(r.count).toBe(25);
  });

  it('1000 => 168 primes', () => {
    expect(sieveOfAtkin(1000).count).toBe(168);
  });

  it('sorted ascending', () => {
    const ps = sieveOfAtkin(200).primes;
    for (let i = 1; i < ps.length; i++) expect(ps[i]).toBeGreaterThan(ps[i - 1]);
  });

  it('all entries are prime', () => {
    const ps = sieveOfAtkin(200).primes;
    for (const p of ps) {
      let isPrime = p > 1;
      for (let d = 2; d * d <= p; d++) if (p % d === 0) isPrime = false;
      expect(isPrime).toBe(true);
    }
  });
});
