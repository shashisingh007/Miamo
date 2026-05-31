import { describe, it, expect } from 'vitest';
import {
  eliasGammaEncode,
  eliasGammaDecode,
  eliasGammaEncodeAll,
  eliasGammaDecodeAll,
  eliasGammaCoding,
} from '../eliasGammaCoding';

describe('eliasGammaCoding', () => {
  it('encodes 1 as "1"', () => {
    expect(eliasGammaEncode(1)).toBe('1');
  });

  it('encodes 2 as "010"', () => {
    expect(eliasGammaEncode(2)).toBe('010');
  });

  it('encodes 3 as "011"', () => {
    expect(eliasGammaEncode(3)).toBe('011');
  });

  it('encodes 8 as "0001000"', () => {
    expect(eliasGammaEncode(8)).toBe('0001000');
  });

  it('round-trips 1..50', () => {
    for (let i = 1; i <= 50; i += 1) {
      const enc = eliasGammaEncode(i);
      expect(eliasGammaDecode(enc).value).toBe(i);
    }
  });

  it('decodeAll mirrors encodeAll', () => {
    const arr = [1, 2, 3, 5, 8, 13, 21];
    expect(eliasGammaDecodeAll(eliasGammaEncodeAll(arr))).toEqual(arr);
  });

  it('throws on non-positive integer', () => {
    expect(() => eliasGammaEncode(0)).toThrow();
    expect(() => eliasGammaEncode(-1)).toThrow();
    expect(() => eliasGammaEncode(1.5)).toThrow();
  });

  it('decode throws on truncated bits', () => {
    // "001" has zeros=2, total length should be 5, but only 3 bits
    expect(() => eliasGammaDecode('001')).toThrow();
  });

  it('decode throws on out-of-range start', () => {
    expect(() => eliasGammaDecode('1', 5)).toThrow();
  });

  it('decode throws on non-string bits', () => {
    expect(() => eliasGammaDecode(123 as any)).toThrow();
  });

  it('object wrapper', () => {
    const arr = [1, 4, 7, 9];
    expect(eliasGammaCoding.decodeAll(eliasGammaCoding.encodeAll(arr))).toEqual(arr);
  });
});
