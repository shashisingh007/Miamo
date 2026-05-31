import { describe, it, expect } from 'vitest';
import { mobiusFunction, mobiusSieve } from '../mobiusFunction';

describe('mobiusFunction', () => {
  it('mu(1) = 1', () => {
    expect(mobiusFunction(1)).toBe(1);
  });

  it('primes => -1', () => {
    for (const p of [2, 3, 5, 7, 11, 13, 17]) expect(mobiusFunction(p)).toBe(-1);
  });

  it('squarefree with 2 primes => 1', () => {
    expect(mobiusFunction(6)).toBe(1);
    expect(mobiusFunction(10)).toBe(1);
    expect(mobiusFunction(15)).toBe(1);
  });

  it('squarefree with 3 primes => -1', () => {
    expect(mobiusFunction(30)).toBe(-1);
    expect(mobiusFunction(42)).toBe(-1);
  });

  it('non-squarefree => 0', () => {
    for (const n of [4, 8, 9, 12, 18, 20, 25, 27, 50]) expect(mobiusFunction(n)).toBe(0);
  });

  it('large composite squarefree 2*3*5*7=210', () => {
    expect(mobiusFunction(210)).toBe(1);
  });

  it('throws on invalid', () => {
    expect(() => mobiusFunction(0)).toThrow();
    expect(() => mobiusFunction(-3)).toThrow();
    expect(() => mobiusFunction(2.5)).toThrow();
  });
});

describe('mobiusSieve', () => {
  it('matches mobiusFunction for n=1..200', () => {
    const sieve = mobiusSieve(200);
    for (let i = 1; i <= 200; i += 1) {
      expect(sieve[i]).toBe(mobiusFunction(i));
    }
  });

  it('throws on invalid limit', () => {
    expect(() => mobiusSieve(0)).toThrow();
    expect(() => mobiusSieve(1.5)).toThrow();
  });

  it('sum of mu(d) for divisors of 12 = 0', () => {
    const sieve = mobiusSieve(20);
    const divs = [1, 2, 3, 4, 6, 12];
    expect(divs.reduce((a, d) => a + sieve[d], 0)).toBe(0);
  });
});
