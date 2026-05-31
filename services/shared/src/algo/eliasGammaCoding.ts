// Elias gamma coding: variable-length prefix code for positive integers (>= 1).
// Encoding produces a bit-string; helpers are also provided that wrap encoded
// values to an array of bits or pack bits into a Uint8Array.

export function eliasGammaEncode(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error('eliasGammaCoding: n must be a positive integer');
  const bin = n.toString(2);
  return '0'.repeat(bin.length - 1) + bin;
}

export function eliasGammaDecode(bits: string, start = 0): { value: number; nextIndex: number } {
  if (typeof bits !== 'string') throw new Error('eliasGammaCoding: bits must be a string');
  if (start < 0 || start >= bits.length) throw new Error('eliasGammaCoding: start index out of range');
  let zeros = 0;
  while (start + zeros < bits.length && bits[start + zeros] === '0') zeros += 1;
  const totalLen = zeros + 1 + zeros;
  if (start + totalLen > bits.length) throw new Error('eliasGammaCoding: truncated code');
  const value = parseInt(bits.slice(start + zeros, start + totalLen), 2);
  if (!Number.isFinite(value) || value < 1) throw new Error('eliasGammaCoding: corrupt code');
  return { value, nextIndex: start + totalLen };
}

export function eliasGammaEncodeAll(values: readonly number[]): string {
  return values.map(eliasGammaEncode).join('');
}

export function eliasGammaDecodeAll(bits: string): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < bits.length) {
    const r = eliasGammaDecode(bits, i);
    out.push(r.value);
    i = r.nextIndex;
  }
  return out;
}

export const eliasGammaCoding = {
  encode: eliasGammaEncode,
  decode: eliasGammaDecode,
  encodeAll: eliasGammaEncodeAll,
  decodeAll: eliasGammaDecodeAll,
};
