import { describe, it, expect } from 'vitest';
import { hammingCodeEncode, hammingCodeDecode, type Bit } from '../hammingCode';

describe('hammingCode', () => {
  it('encodes all-zeros to all-zeros', () => {
    expect(hammingCodeEncode([0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('encodes all-ones correctly', () => {
    expect(hammingCodeEncode([1, 1, 1, 1])).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });

  it('encode-then-decode is identity for clean channel', () => {
    for (let i = 0; i < 16; i++) {
      const data: Bit[] = [
        (i >> 3) & 1,
        (i >> 2) & 1,
        (i >> 1) & 1,
        i & 1,
      ].map((b) => b as Bit) as Bit[];
      const w = hammingCodeEncode(data);
      const r = hammingCodeDecode(w);
      expect(r.data).toEqual(data);
      expect(r.errorPosition).toBe(0);
    }
  });

  it('corrects any single-bit flip', () => {
    const data: Bit[] = [1, 0, 1, 1];
    const w = hammingCodeEncode(data);
    for (let pos = 0; pos < 7; pos++) {
      const corrupted = w.slice() as Bit[];
      corrupted[pos] = (corrupted[pos] ^ 1) as Bit;
      const r = hammingCodeDecode(corrupted);
      expect(r.data).toEqual(data);
      expect(r.errorPosition).toBe(pos + 1);
      expect(r.corrected).toEqual(w);
    }
  });

  it('errorPosition is zero on clean codeword', () => {
    const w = hammingCodeEncode([1, 0, 1, 0]);
    const r = hammingCodeDecode(w);
    expect(r.errorPosition).toBe(0);
    expect(r.corrected).toEqual(w);
  });

  it('rejects wrong-length data on encode', () => {
    expect(() => hammingCodeEncode([1, 0, 1] as Bit[])).toThrow();
  });

  it('rejects wrong-length word on decode', () => {
    expect(() => hammingCodeDecode([1, 0, 1, 0, 1, 0] as Bit[])).toThrow();
  });

  it('rejects non-binary inputs', () => {
    expect(() => hammingCodeEncode([1, 2 as Bit, 0, 1])).toThrow();
    expect(() => hammingCodeDecode([1, 0, 1, 0, 1, 0, 3 as Bit])).toThrow();
  });

  it('parity bit positions hold consistent parities', () => {
    const w = hammingCodeEncode([1, 0, 1, 1]);
    const [p1, p2, d1, p4, d2, d3, d4] = w;
    expect((p1 ^ d1 ^ d2 ^ d4) as number).toBe(0);
    expect((p2 ^ d1 ^ d3 ^ d4) as number).toBe(0);
    expect((p4 ^ d2 ^ d3 ^ d4) as number).toBe(0);
  });

  it('flipping data bit reports the right syndrome', () => {
    const w = hammingCodeEncode([0, 0, 0, 1]);
    // d4 sits at index 6 (1-based position 7).
    const corrupted = w.slice() as Bit[];
    corrupted[6] = (corrupted[6] ^ 1) as Bit;
    expect(hammingCodeDecode(corrupted).errorPosition).toBe(7);
  });

  it('two-bit error is not corrected (known limitation)', () => {
    const data: Bit[] = [1, 0, 1, 0];
    const w = hammingCodeEncode(data);
    const corrupted = w.slice() as Bit[];
    corrupted[0] = (corrupted[0] ^ 1) as Bit;
    corrupted[1] = (corrupted[1] ^ 1) as Bit;
    const r = hammingCodeDecode(corrupted);
    // It must claim some correction (syndrome != 0 in general) but the
    // recovered data may differ from the original - we assert it does NOT
    // silently match the original two-bit-error case.
    expect(r.data).not.toEqual(data);
  });
});
