import { describe, it, expect } from 'vitest';
import { stirlingSecond, bellNumber, stirlingNumbers } from '../stirlingNumbers';

describe('stirlingNumbers', () => {
  it('factory exposes both', () => {
    const api = stirlingNumbers();
    expect(typeof api.stirlingSecond).toBe('function');
    expect(typeof api.bellNumber).toBe('function');
  });

  it('S(0,0) = 1', () => {
    expect(stirlingSecond(0, 0)).toBe(1);
  });

  it('S(n,0) = 0 for n>0', () => {
    expect(stirlingSecond(3, 0)).toBe(0);
  });

  it('S(n,n) = 1', () => {
    for (let n = 0; n <= 6; n += 1) expect(stirlingSecond(n, n)).toBe(1);
  });

  it('S(n,1) = 1 for n>=1', () => {
    for (let n = 1; n <= 6; n += 1) expect(stirlingSecond(n, 1)).toBe(1);
  });

  it('S(n,k) = 0 if k>n', () => {
    expect(stirlingSecond(3, 5)).toBe(0);
  });

  it('S(4,2) = 7', () => {
    expect(stirlingSecond(4, 2)).toBe(7);
  });

  it('S(5,3) = 25', () => {
    expect(stirlingSecond(5, 3)).toBe(25);
  });

  it('S(6,3) = 90', () => {
    expect(stirlingSecond(6, 3)).toBe(90);
  });

  it('Bell numbers: 1,1,2,5,15,52,203', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(bellNumber)).toEqual([1, 1, 2, 5, 15, 52, 203]);
  });

  it('throws on bad input', () => {
    expect(() => stirlingSecond(-1, 0)).toThrow();
    expect(() => stirlingSecond(1, -1)).toThrow();
    expect(() => stirlingSecond(1.5, 0)).toThrow();
    expect(() => bellNumber(-1)).toThrow();
  });
});
