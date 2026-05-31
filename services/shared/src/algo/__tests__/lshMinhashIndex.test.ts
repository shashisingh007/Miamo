import { describe, it, expect } from 'vitest';
import { LshMinhashIndex } from '../lshMinhashIndex';

function shingles(s: string, k: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + k <= s.length; i += 1) out.push(s.slice(i, i + k));
  return out;
}

function trueJaccard(a: string[], b: string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  return inter / new Set([...sa, ...sb]).size;
}

describe('LshMinhashIndex', () => {
  it('throws on invalid numHashes/bands', () => {
    expect(() => new LshMinhashIndex({ numHashes: 0 })).toThrow(RangeError);
    expect(() => new LshMinhashIndex({ bands: 0 })).toThrow(RangeError);
    expect(() => new LshMinhashIndex({ numHashes: 10, bands: 3 })).toThrow(RangeError);
  });

  it('add rejects empty/non-string id', () => {
    const ix = new LshMinhashIndex();
    expect(() => ix.add('', ['x'])).toThrow(TypeError);
  });

  it('add rejects duplicates', () => {
    const ix = new LshMinhashIndex();
    ix.add('a', ['x']);
    expect(() => ix.add('a', ['y'])).toThrow(RangeError);
  });

  it('size tracks docs', () => {
    const ix = new LshMinhashIndex();
    expect(ix.size()).toBe(0);
    ix.add('a', ['x']);
    ix.add('b', ['y']);
    expect(ix.size()).toBe(2);
  });

  it('candidate of identical doc includes itself', () => {
    const ix = new LshMinhashIndex();
    ix.add('a', shingles('hello world this is a test', 3));
    expect(ix.candidates(shingles('hello world this is a test', 3))).toContain('a');
  });

  it('estimatedJaccard same doc = 1', () => {
    const ix = new LshMinhashIndex();
    ix.add('a', shingles('hello world hello world', 3));
    expect(ix.estimatedJaccard('a', 'a')).toBe(1);
  });

  it('estimatedJaccard throws unknown id', () => {
    const ix = new LshMinhashIndex();
    ix.add('a', ['x']);
    expect(() => ix.estimatedJaccard('a', 'b')).toThrow(RangeError);
  });

  it('estimatedJaccard approximates truth', () => {
    const ix = new LshMinhashIndex({ numHashes: 128, bands: 32 });
    const tA = shingles('the quick brown fox jumps over the lazy dog', 3);
    const tB = shingles('the quick brown fox jumps over a lazy dog', 3);
    ix.add('a', tA);
    ix.add('b', tB);
    const real = trueJaccard(tA, tB);
    const est = ix.estimatedJaccard('a', 'b');
    expect(Math.abs(real - est)).toBeLessThan(0.2);
  });

  it('finds near-duplicate as candidate', () => {
    const ix = new LshMinhashIndex({ numHashes: 64, bands: 16 });
    const tA = shingles('the quick brown fox jumps over the lazy dog', 3);
    const tB = shingles('the quick brown fox jumps over a lazy dog', 3);
    ix.add('a', tA);
    expect(ix.candidates(tB)).toContain('a');
  });

  it('does not always return dissimilar docs', () => {
    const ix = new LshMinhashIndex({ numHashes: 64, bands: 16 });
    ix.add('a', shingles('aaaaaaaaaaaaaaaaaaaaaa', 3));
    const cand = ix.candidates(shingles('completely different words appear here zzzzz', 3));
    expect(cand).not.toContain('a');
  });

  it('empty token set is handled', () => {
    const ix = new LshMinhashIndex({ numHashes: 32, bands: 8 });
    ix.add('a', []);
    ix.add('b', []);
    expect(ix.estimatedJaccard('a', 'b')).toBe(1);
  });

  it('multiple matches returned', () => {
    const ix = new LshMinhashIndex({ numHashes: 64, bands: 16 });
    const base = shingles('shared text body content here for matching test', 3);
    ix.add('a', base);
    ix.add('b', base);
    ix.add('c', shingles('totally different lorem ipsum dolor', 3));
    const cand = ix.candidates(base);
    expect(cand).toContain('a');
    expect(cand).toContain('b');
  });

  it('deterministic for same input', () => {
    const ix1 = new LshMinhashIndex();
    const ix2 = new LshMinhashIndex();
    ix1.add('a', shingles('hello world', 3));
    ix2.add('a', shingles('hello world', 3));
    expect(ix1.estimatedJaccard('a', 'a')).toBe(ix2.estimatedJaccard('a', 'a'));
  });

  it('numHashes default works', () => {
    const ix = new LshMinhashIndex();
    ix.add('a', shingles('content content content', 3));
    expect(ix.size()).toBe(1);
  });
});
