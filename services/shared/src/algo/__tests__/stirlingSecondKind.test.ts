import { describe, it, expect } from 'vitest';
import { stirlingSecondKind, bellNumber } from '../stirlingSecondKind';

describe('stirlingSecondKind', () => {
  it('throws on negative', () => {
    expect(() => stirlingSecondKind(-1, 0)).toThrow(RangeError);
    expect(() => stirlingSecondKind(0, -1)).toThrow(RangeError);
  });

  it('throws on non-integer', () => {
    expect(() => stirlingSecondKind(1.5, 1)).toThrow(RangeError);
  });

  it('S(0,0) = 1', () => {
    expect(stirlingSecondKind(0, 0)).toBe(1n);
  });

  it('S(n,0) = 0 for n>=1', () => {
    expect(stirlingSecondKind(5, 0)).toBe(0n);
  });

  it('S(n,n) = 1', () => {
    expect(stirlingSecondKind(5, 5)).toBe(1n);
  });

  it('S(n,1) = 1', () => {
    expect(stirlingSecondKind(5, 1)).toBe(1n);
  });

  it('k>n => 0', () => {
    expect(stirlingSecondKind(3, 5)).toBe(0n);
  });

  it('S(4,2) = 7', () => {
    expect(stirlingSecondKind(4, 2)).toBe(7n);
  });

  it('S(5,2) = 15', () => {
    expect(stirlingSecondKind(5, 2)).toBe(15n);
  });

  it('S(5,3) = 25', () => {
    expect(stirlingSecondKind(5, 3)).toBe(25n);
  });

  it('S(6,3) = 90', () => {
    expect(stirlingSecondKind(6, 3)).toBe(90n);
  });
});

describe('bellNumber', () => {
  it('B(0)=1', () => {
    expect(bellNumber(0)).toBe(1n);
  });

  it('B(1)=1', () => {
    expect(bellNumber(1)).toBe(1n);
  });

  it('B(2)=2', () => {
    expect(bellNumber(2)).toBe(2n);
  });

  it('B(3)=5', () => {
    expect(bellNumber(3)).toBe(5n);
  });

  it('B(4)=15', () => {
    expect(bellNumber(4)).toBe(15n);
  });

  it('B(5)=52', () => {
    expect(bellNumber(5)).toBe(52n);
  });

  it('B(6)=203', () => {
    expect(bellNumber(6)).toBe(203n);
  });

  it('throws on negative', () => {
    expect(() => bellNumber(-1)).toThrow(RangeError);
  });
});
