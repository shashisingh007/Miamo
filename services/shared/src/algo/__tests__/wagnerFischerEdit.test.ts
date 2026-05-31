import { describe, it, expect } from 'vitest';
import { wagnerFischerEdit } from '../wagnerFischerEdit';

describe('wagnerFischerEdit', () => {
  it('identical strings => 0', () => {
    expect(wagnerFischerEdit('cat', 'cat')).toBe(0);
  });

  it('empty vs empty', () => {
    expect(wagnerFischerEdit('', '')).toBe(0);
  });

  it('empty vs str = length', () => {
    expect(wagnerFischerEdit('', 'abc')).toBe(3);
    expect(wagnerFischerEdit('xyz', '')).toBe(3);
  });

  it('classic kitten -> sitting = 3', () => {
    expect(wagnerFischerEdit('kitten', 'sitting')).toBe(3);
  });

  it('saturday -> sunday = 3', () => {
    expect(wagnerFischerEdit('saturday', 'sunday')).toBe(3);
  });

  it('single substitution', () => {
    expect(wagnerFischerEdit('cat', 'bat')).toBe(1);
  });

  it('single insertion', () => {
    expect(wagnerFischerEdit('cat', 'cats')).toBe(1);
  });

  it('single deletion', () => {
    expect(wagnerFischerEdit('cats', 'cat')).toBe(1);
  });

  it('symmetric in default costs', () => {
    expect(wagnerFischerEdit('flaw', 'lawn')).toBe(wagnerFischerEdit('lawn', 'flaw'));
  });

  it('custom higher substitute cost', () => {
    expect(wagnerFischerEdit('cat', 'bat', { substituteCost: 2 })).toBe(2);
  });

  it('substitute cost 100 prefers ins+del', () => {
    // sub=100 means substituting 1 char costs 100, but ins+del = 2, so distance for cat->bat is 2.
    expect(wagnerFischerEdit('cat', 'bat', { substituteCost: 100 })).toBe(2);
  });

  it('throws on negative cost', () => {
    expect(() => wagnerFischerEdit('a', 'b', { insertCost: -1 })).toThrow();
  });

  it('long string', () => {
    expect(wagnerFischerEdit('abcdefg', 'abcxefg')).toBe(1);
  });
});
