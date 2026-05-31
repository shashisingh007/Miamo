import { describe, it, expect } from 'vitest';
import { deflateLikeEncode, deflateLikeDecode, deflateLikeEncoder } from '../deflateLikeEncoder';

function str(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

describe('deflateLikeEncoder', () => {
  it('empty input', () => {
    expect(deflateLikeEncode('')).toEqual([]);
    expect(deflateLikeDecode([]).length).toBe(0);
  });

  it('single char literal round-trips', () => {
    const tokens = deflateLikeEncode('a');
    expect(tokens).toEqual([{ kind: 'literal', value: 97 }]);
    expect(str(deflateLikeDecode(tokens))).toBe('a');
  });

  it('non-repeating round-trips', () => {
    const s = 'abcdefg';
    expect(str(deflateLikeDecode(deflateLikeEncode(s)))).toBe(s);
  });

  it('repeating string produces matches', () => {
    const s = 'abcabcabc';
    const tokens = deflateLikeEncode(s);
    expect(tokens.some((t) => t.kind === 'match')).toBe(true);
    expect(str(deflateLikeDecode(tokens))).toBe(s);
  });

  it('overlap-style match (runs)', () => {
    const s = 'a' + 'b'.repeat(20);
    const tokens = deflateLikeEncode(s);
    expect(str(deflateLikeDecode(tokens))).toBe(s);
  });

  it('round-trips 500-byte input', () => {
    const s = 'lorem ipsum dolor sit amet '.repeat(20);
    expect(str(deflateLikeDecode(deflateLikeEncode(s)))).toBe(s);
  });

  it('decode throws on invalid offset', () => {
    expect(() => deflateLikeDecode([{ kind: 'match', offset: 5, length: 3 }])).toThrow();
  });

  it('decode throws on invalid length', () => {
    expect(() => deflateLikeDecode([
      { kind: 'literal', value: 1 },
      { kind: 'match', offset: 1, length: 0 },
    ])).toThrow();
  });

  it('high-byte data round-trips', () => {
    const data = new Uint8Array([0, 255, 128, 255, 0, 128, 0, 255]);
    expect(Array.from(deflateLikeDecode(deflateLikeEncode(data)))).toEqual(Array.from(data));
  });

  it('object wrapper round-trips', () => {
    const s = 'hello hello hello world';
    expect(str(deflateLikeEncoder.decode(deflateLikeEncoder.encode(s)))).toBe(s);
  });
});
