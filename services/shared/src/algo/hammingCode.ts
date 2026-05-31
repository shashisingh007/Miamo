// Hamming(7,4) single-error correcting code. Encodes 4 data bits into a
// 7-bit codeword, decodes a 7-bit word back to 4 data bits, correcting any
// single-bit error in transit. Bits are arrays of 0/1 in the standard
// position layout: [p1, p2, d1, p4, d2, d3, d4].

export type Bit = 0 | 1;

function ensureBits(bits: Bit[], n: number): void {
  if (bits.length !== n) throw new RangeError(`expected ${n} bits, got ${bits.length}`);
  for (const b of bits) {
    if (b !== 0 && b !== 1) throw new RangeError('bits must be 0 or 1');
  }
}

export function hammingCodeEncode(data: Bit[]): Bit[] {
  ensureBits(data, 4);
  const [d1, d2, d3, d4] = data;
  const p1 = (d1 ^ d2 ^ d4) as Bit;
  const p2 = (d1 ^ d3 ^ d4) as Bit;
  const p4 = (d2 ^ d3 ^ d4) as Bit;
  return [p1, p2, d1, p4, d2, d3, d4];
}

export interface HammingDecodeResult {
  data: Bit[];
  errorPosition: number; // 0 means no error; 1..7 is the corrected bit index.
  corrected: Bit[];
}

export function hammingCodeDecode(word: Bit[]): HammingDecodeResult {
  ensureBits(word, 7);
  const [p1, p2, d1, p4, d2, d3, d4] = word;
  const s1 = p1 ^ d1 ^ d2 ^ d4;
  const s2 = p2 ^ d1 ^ d3 ^ d4;
  const s4 = p4 ^ d2 ^ d3 ^ d4;
  const syndrome = s1 + (s2 << 1) + (s4 << 2);
  const corrected = word.slice() as Bit[];
  if (syndrome !== 0) {
    const idx = syndrome - 1;
    corrected[idx] = (corrected[idx] ^ 1) as Bit;
  }
  return {
    data: [corrected[2], corrected[4], corrected[5], corrected[6]],
    errorPosition: syndrome,
    corrected,
  };
}
