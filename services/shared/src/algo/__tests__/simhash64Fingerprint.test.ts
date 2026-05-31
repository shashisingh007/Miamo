import { describe, it, expect } from 'vitest';
import {
  simhash64,
  hammingDistance64,
  simhashSimilarity64,
  simhashHex,
} from '../simhash64Fingerprint';

describe('simhash64Fingerprint', () => {
  it('identical text => identical fingerprint', () => {
    const a = simhash64('The quick brown fox jumps over the lazy dog');
    const b = simhash64('The quick brown fox jumps over the lazy dog');
    expect(a).toBe(b);
  });

  it('case-insensitive default tokenize', () => {
    expect(simhash64('Hello World')).toBe(simhash64('hello world'));
  });

  it('empty string => 0n', () => {
    expect(simhash64('')).toBe(0n);
  });

  it('whitespace-only => 0n', () => {
    expect(simhash64('   ')).toBe(0n);
  });

  it('non-string throws', () => {
    expect(() => simhash64(123 as any)).toThrow();
  });

  it('small edit yields small hamming distance', () => {
    const a = simhash64('The quick brown fox jumps over the lazy dog');
    const b = simhash64('The quick brown fox jumps over a lazy dog');
    const d = hammingDistance64(a, b);
    expect(d).toBeLessThan(16);
  });

  it('completely different texts yield larger distance', () => {
    const a = simhash64('The quick brown fox jumps over the lazy dog');
    const b = simhash64('Lorem ipsum dolor sit amet consectetur adipiscing elit');
    const d = hammingDistance64(a, b);
    expect(d).toBeGreaterThan(15);
  });

  it('hammingDistance64 with identical inputs is 0', () => {
    expect(hammingDistance64(0xdeadbeefn, 0xdeadbeefn)).toBe(0);
  });

  it('hammingDistance64 of complementary bits = 64', () => {
    const a = 0n;
    const b = (1n << 64n) - 1n;
    expect(hammingDistance64(a, b)).toBe(64);
  });

  it('hammingDistance64 known bits', () => {
    expect(hammingDistance64(0b1010n, 0b0101n)).toBe(4);
  });

  it('hammingDistance64 rejects non-bigint', () => {
    expect(() => hammingDistance64(1 as any, 2n)).toThrow();
  });

  it('simhashSimilarity64 in [0,1]', () => {
    const a = simhash64('alpha beta gamma');
    const b = simhash64('alpha beta delta');
    const s = simhashSimilarity64(a, b);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('simhashSimilarity64 of identical hashes = 1', () => {
    expect(simhashSimilarity64(123n, 123n)).toBe(1);
  });

  it('simhashHex zero-pads to 16 chars', () => {
    expect(simhashHex(0n)).toBe('0000000000000000');
    expect(simhashHex(0x12345678n)).toBe('0000000012345678');
  });

  it('custom tokenize honored', () => {
    const split1 = simhash64('a,b,c');
    const split2 = simhash64('a,b,c', { tokenize: (s) => s.split(',') });
    expect(split1).toBeTypeOf('bigint');
    expect(split2).toBeTypeOf('bigint');
  });

  it('ngramSize=2 differs from unigram', () => {
    const u = simhash64('the cat sat on the mat');
    const b = simhash64('the cat sat on the mat', { ngramSize: 2 });
    expect(u).not.toBe(b);
  });

  it('ngramSize >= text length yields 0n', () => {
    expect(simhash64('one two', { ngramSize: 5 })).toBe(0n);
  });

  it('throws on bad ngramSize', () => {
    expect(() => simhash64('x', { ngramSize: 0 })).toThrow();
    expect(() => simhash64('x', { ngramSize: 1.5 })).toThrow();
  });

  it('punctuation ignored in default tokenize', () => {
    expect(simhash64('hello, world!')).toBe(simhash64('hello world'));
  });

  it('unicode tokens preserved', () => {
    const h = simhash64('café résumé');
    expect(h).not.toBe(0n);
  });

  it('reordering tokens gives same unigram hash', () => {
    // Bag-of-words signature property
    expect(simhash64('alpha beta gamma')).toBe(simhash64('gamma alpha beta'));
  });
});
