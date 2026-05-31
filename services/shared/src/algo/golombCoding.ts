// Golomb coding for non-negative integers with parameter M (M >= 1).
// Quotient = floor(n / M) encoded in unary; remainder encoded in truncated
// binary using ceil(log2 M) bits with a Rice-style shift when M is power of 2.

export function golombEncode(n: number, m: number): string {
  if (!Number.isInteger(n) || n < 0) throw new Error('golombCoding: n must be a non-negative integer');
  if (!Number.isInteger(m) || m < 1) throw new Error('golombCoding: m must be >= 1');
  const q = Math.floor(n / m);
  const r = n - q * m;
  const unary = '1'.repeat(q) + '0';
  if (m === 1) return unary;
  const b = Math.ceil(Math.log2(m));
  const cutoff = (1 << b) - m;
  let rem: string;
  if (r < cutoff) {
    rem = r.toString(2).padStart(b - 1, '0');
  } else {
    rem = (r + cutoff).toString(2).padStart(b, '0');
  }
  return unary + rem;
}

export function golombDecode(bits: string, m: number, start = 0): { value: number; nextIndex: number } {
  if (typeof bits !== 'string') throw new Error('golombCoding: bits must be a string');
  if (!Number.isInteger(m) || m < 1) throw new Error('golombCoding: m must be >= 1');
  if (start < 0 || start >= bits.length) throw new Error('golombCoding: start out of range');
  let q = 0;
  while (start + q < bits.length && bits[start + q] === '1') q += 1;
  if (start + q >= bits.length) throw new Error('golombCoding: truncated unary');
  let idx = start + q + 1; // skip terminating 0
  let r = 0;
  if (m === 1) return { value: q, nextIndex: idx };
  const b = Math.ceil(Math.log2(m));
  const cutoff = (1 << b) - m;
  if (idx + (b - 1) > bits.length) throw new Error('golombCoding: truncated remainder');
  const short = bits.slice(idx, idx + b - 1);
  const shortVal = short.length === 0 ? 0 : parseInt(short, 2);
  if (shortVal < cutoff) {
    r = shortVal;
    idx += b - 1;
  } else {
    if (idx + b > bits.length) throw new Error('golombCoding: truncated remainder');
    const longBits = bits.slice(idx, idx + b);
    r = parseInt(longBits, 2) - cutoff;
    idx += b;
  }
  return { value: q * m + r, nextIndex: idx };
}

export function golombEncodeAll(values: readonly number[], m: number): string {
  return values.map((v) => golombEncode(v, m)).join('');
}

export function golombDecodeAll(bits: string, m: number): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < bits.length) {
    const r = golombDecode(bits, m, i);
    out.push(r.value);
    i = r.nextIndex;
  }
  return out;
}

export const golombCoding = {
  encode: golombEncode,
  decode: golombDecode,
  encodeAll: golombEncodeAll,
  decodeAll: golombDecodeAll,
};
