import { describe, it, expect } from 'vitest';
import { jaroSimilarity, jaroWinklerSimilarity } from '../jaroWinklerSimilarity';

describe('jaroSimilarity', () => {
  it('rejects non-string', () => {
    expect(() => jaroSimilarity(1 as any, 'x')).toThrow();
  });

  it('identical => 1', () => {
    expect(jaroSimilarity('hello', 'hello')).toBe(1);
  });

  it('empty either => 0', () => {
    expect(jaroSimilarity('', 'abc')).toBe(0);
    expect(jaroSimilarity('abc', '')).toBe(0);
  });

  it('both empty => 1', () => {
    expect(jaroSimilarity('', '')).toBe(1);
  });

  it('completely different => 0', () => {
    expect(jaroSimilarity('abc', 'xyz')).toBe(0);
  });

  it('MARTHA vs MARHTA ~ 0.944', () => {
    expect(jaroSimilarity('MARTHA', 'MARHTA')).toBeCloseTo(0.9444, 3);
  });

  it('DIXON vs DICKSONX ~ 0.767', () => {
    expect(jaroSimilarity('DIXON', 'DICKSONX')).toBeCloseTo(0.7666, 3);
  });

  it('JELLYFISH vs SMELLYFISH ~ 0.896', () => {
    expect(jaroSimilarity('JELLYFISH', 'SMELLYFISH')).toBeCloseTo(0.8962, 3);
  });
});

describe('jaroWinklerSimilarity', () => {
  it('rejects bad prefixScale', () => {
    expect(() => jaroWinklerSimilarity('a', 'a', -1)).toThrow();
    expect(() => jaroWinklerSimilarity('a', 'a', 0.5)).toThrow();
  });

  it('rejects bad maxPrefix', () => {
    expect(() => jaroWinklerSimilarity('a', 'a', 0.1, -1)).toThrow();
    expect(() => jaroWinklerSimilarity('a', 'a', 0.1, 1.5)).toThrow();
  });

  it('identical => 1', () => {
    expect(jaroWinklerSimilarity('hello', 'hello')).toBe(1);
  });

  it('MARTHA vs MARHTA ~ 0.961', () => {
    expect(jaroWinklerSimilarity('MARTHA', 'MARHTA')).toBeCloseTo(0.9611, 3);
  });

  it('DWAYNE vs DUANE ~ 0.84', () => {
    expect(jaroWinklerSimilarity('DWAYNE', 'DUANE')).toBeCloseTo(0.84, 2);
  });

  it('boosts prefix-matched pairs above jaro', () => {
    const j = jaroSimilarity('prefer', 'prefab');
    const jw = jaroWinklerSimilarity('prefer', 'prefab');
    expect(jw).toBeGreaterThan(j);
  });

  it('zero prefix gives jaro = jw', () => {
    const a = 'abcdef';
    const b = 'xyzdef';
    expect(jaroWinklerSimilarity(a, b)).toBe(jaroSimilarity(a, b));
  });

  it('prefix cap at maxPrefix', () => {
    const a = 'abcdefghij';
    const b = 'abcdefghij';
    expect(jaroWinklerSimilarity(a, b)).toBe(1);
  });

  it('completely different => 0', () => {
    expect(jaroWinklerSimilarity('abc', 'xyz')).toBe(0);
  });

  it('result in [0,1]', () => {
    for (const [a, b] of [['hi', 'hello'], ['a', 'b'], ['xy', 'yx']] as const) {
      const v = jaroWinklerSimilarity(a, b);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
