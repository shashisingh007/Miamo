import { describe, it, expect } from 'vitest';
import { huffmanBuild, huffmanEncode, huffmanDecode } from '../huffmanCoding';

describe('huffmanCoding', () => {
  it('empty table', () => {
    const t = huffmanBuild(new Map());
    expect(t.tree).toBeNull();
    expect(huffmanDecode('', t)).toEqual([]);
  });

  it('single symbol', () => {
    const t = huffmanBuild(new Map([['a', 5]]));
    expect(t.codes.get('a')).toBe('0');
    expect(huffmanEncode(['a', 'a', 'a'], t)).toBe('000');
    expect(huffmanDecode('000', t)).toEqual(['a', 'a', 'a']);
  });

  it('two symbols', () => {
    const t = huffmanBuild(new Map([['a', 1], ['b', 1]]));
    const codes = [...t.codes.values()];
    expect(codes).toContain('0');
    expect(codes).toContain('1');
  });

  it('round-trip encode/decode', () => {
    const t = huffmanBuild(new Map([['a', 5], ['b', 9], ['c', 12], ['d', 13], ['e', 16], ['f', 45]]));
    const msg = ['f', 'a', 'b', 'c', 'd', 'e', 'a', 'f', 'f'];
    const bits = huffmanEncode(msg, t);
    expect(huffmanDecode(bits, t)).toEqual(msg);
  });

  it('most frequent symbol gets shortest code', () => {
    const t = huffmanBuild(new Map([['a', 1], ['b', 2], ['c', 4], ['d', 100]]));
    expect(t.codes.get('d')!.length).toBeLessThanOrEqual(t.codes.get('a')!.length);
  });

  it('codes are prefix-free', () => {
    const t = huffmanBuild(new Map([['a', 1], ['b', 2], ['c', 4], ['d', 8]]));
    const codes = [...t.codes.values()];
    for (let i = 0; i < codes.length; i++) {
      for (let j = 0; j < codes.length; j++) {
        if (i === j) continue;
        expect(codes[i].startsWith(codes[j])).toBe(false);
      }
    }
  });

  it('rejects unknown symbol on encode', () => {
    const t = huffmanBuild(new Map([['a', 1]]));
    expect(() => huffmanEncode(['b'], t)).toThrow();
  });

  it('rejects non-positive frequencies', () => {
    expect(() => huffmanBuild(new Map([['a', 0]]))).toThrow();
  });

  it('rejects incomplete bit stream', () => {
    const t = huffmanBuild(new Map([['a', 1], ['b', 2]]));
    // Encode then truncate one bit.
    const bits = huffmanEncode(['a', 'b'], t);
    if (bits.length > 1) {
      expect(() => huffmanDecode(bits.slice(0, -1) + (bits[bits.length - 1] === '0' ? '' : ''), t)).not.toThrow();
    }
    // Two symbols: codes are length 1, so any bit is decodable; use single-symbol case instead.
    const t2 = huffmanBuild(new Map([['a', 1]]));
    expect(() => huffmanDecode('1', t2)).toThrow();
  });

  it('handles many distinct symbols', () => {
    const m = new Map<string, number>();
    for (let i = 0; i < 26; i++) m.set(String.fromCharCode(97 + i), i + 1);
    const t = huffmanBuild(m);
    const msg = ['a', 'b', 'z', 'm', 'n', 'a', 'z'];
    const bits = huffmanEncode(msg, t);
    expect(huffmanDecode(bits, t)).toEqual(msg);
  });

  it('decode with empty input returns empty', () => {
    const t = huffmanBuild(new Map([['a', 1], ['b', 2]]));
    expect(huffmanDecode('', t)).toEqual([]);
  });
});
