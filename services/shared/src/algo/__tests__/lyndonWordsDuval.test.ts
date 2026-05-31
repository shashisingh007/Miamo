import { describe, it, expect } from 'vitest';
import { lyndonFactorization, smallestRotation, lyndonWordsDuval } from '../lyndonWordsDuval';

describe('lyndonWordsDuval', () => {
  it('factory exposes both helpers', () => {
    const api = lyndonWordsDuval();
    expect(typeof api.lyndonFactorization).toBe('function');
    expect(typeof api.smallestRotation).toBe('function');
  });

  it('empty string', () => {
    expect(lyndonFactorization('')).toEqual([]);
    expect(smallestRotation('')).toBe('');
  });

  it('single character', () => {
    expect(lyndonFactorization('a')).toEqual(['a']);
    expect(smallestRotation('a')).toBe('a');
  });

  it('abacb is itself Lyndon', () => {
    expect(lyndonFactorization('abacb')).toEqual(['abacb']);
  });

  it('cbabc decomposes as c, b, abc', () => {
    expect(lyndonFactorization('cbabc')).toEqual(['c', 'b', 'abc']);
  });

  it('all same chars: each char is a factor', () => {
    expect(lyndonFactorization('aaaa')).toEqual(['a', 'a', 'a', 'a']);
  });

  it('strictly increasing => single Lyndon word', () => {
    expect(lyndonFactorization('abcde')).toEqual(['abcde']);
  });

  it('factors are non-increasing', () => {
    const r = lyndonFactorization('cba');
    expect(r).toEqual(['c', 'b', 'a']);
  });

  it('concatenation reproduces input', () => {
    const inputs = ['banana', 'mississippi', 'abracadabra', 'aaba', 'bbabab'];
    for (const s of inputs) {
      expect(lyndonFactorization(s).join('')).toBe(s);
    }
  });

  it('smallestRotation of bca = abc', () => {
    expect(smallestRotation('bca')).toBe('abc');
  });

  it('smallestRotation matches brute force', () => {
    const cases = ['banana', 'cab', 'aaba', 'bcaab', 'helloworld'];
    for (const s of cases) {
      let best = s;
      for (let i = 1; i < s.length; i += 1) {
        const rot = s.slice(i) + s.slice(0, i);
        if (rot < best) best = rot;
      }
      expect(smallestRotation(s)).toBe(best);
    }
  });

  it('throws on non-string', () => {
    expect(() => lyndonFactorization(1 as any)).toThrow();
    expect(() => smallestRotation(1 as any)).toThrow();
  });
});
