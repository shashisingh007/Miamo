import { describe, it, expect } from 'vitest';
import { catalanNumber, catalanSequence } from '../catalanNumbers';

describe('catalanNumbers', () => {
  it('throws on negative n', () => {
    expect(() => catalanNumber(-1)).toThrow(RangeError);
  });

  it('throws on non-integer n', () => {
    expect(() => catalanNumber(1.5)).toThrow(RangeError);
  });

  it('C(0) = 1', () => {
    expect(catalanNumber(0)).toBe(1n);
  });

  it('C(1) = 1', () => {
    expect(catalanNumber(1)).toBe(1n);
  });

  it('C(2) = 2', () => {
    expect(catalanNumber(2)).toBe(2n);
  });

  it('C(3) = 5', () => {
    expect(catalanNumber(3)).toBe(5n);
  });

  it('C(4) = 14', () => {
    expect(catalanNumber(4)).toBe(14n);
  });

  it('C(5) = 42', () => {
    expect(catalanNumber(5)).toBe(42n);
  });

  it('C(10) = 16796', () => {
    expect(catalanNumber(10)).toBe(16796n);
  });

  it('sequence count=0 empty', () => {
    expect(catalanSequence(0)).toEqual([]);
  });

  it('sequence first 6', () => {
    expect(catalanSequence(6)).toEqual([1n, 1n, 2n, 5n, 14n, 42n]);
  });

  it('sequence matches catalanNumber for each i', () => {
    const s = catalanSequence(11);
    for (let i = 0; i < s.length; i += 1) expect(s[i]).toBe(catalanNumber(i));
  });

  it('throws on negative count', () => {
    expect(() => catalanSequence(-1)).toThrow(RangeError);
  });

  it('large C(20) = 6564120420', () => {
    expect(catalanNumber(20)).toBe(6564120420n);
  });
});
