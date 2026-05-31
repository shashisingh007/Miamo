// LZW compression over an arbitrary byte/character stream.
// Operates on string inputs (each char treated as a code <= 0xFFFF) and emits
// numeric codes. Decompression mirrors the encoder. Codes are unbounded
// (no dictionary reset) for simplicity.

export function lzwCompress(input: string): number[] {
  if (typeof input !== 'string') throw new Error('lzwCompress: input must be a string');
  if (input.length === 0) return [];

  const dict = new Map<string, number>();
  for (let i = 0; i < 256; i += 1) dict.set(String.fromCharCode(i), i);
  let nextCode = 256;

  const out: number[] = [];
  let w = '';
  for (const c of input) {
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      out.push(dict.get(w)!);
      dict.set(wc, nextCode++);
      w = c;
    }
  }
  if (w !== '') out.push(dict.get(w)!);
  return out;
}

export function lzwDecompress(codes: readonly number[]): string {
  if (!Array.isArray(codes)) throw new Error('lzwDecompress: codes must be an array');
  if (codes.length === 0) return '';

  const dict: string[] = new Array(256);
  for (let i = 0; i < 256; i += 1) dict[i] = String.fromCharCode(i);
  let nextCode = 256;

  let prev = dict[codes[0]];
  if (prev === undefined) throw new Error('lzwDecompress: invalid initial code');
  let out = prev;
  for (let i = 1; i < codes.length; i += 1) {
    const code = codes[i];
    let entry: string;
    if (code < dict.length && dict[code] !== undefined) {
      entry = dict[code];
    } else if (code === nextCode) {
      entry = prev + prev[0];
    } else {
      throw new Error('lzwDecompress: invalid code ' + code);
    }
    out += entry;
    dict[nextCode++] = prev + entry[0];
    prev = entry;
  }
  return out;
}

export const lzwCompression = { compress: lzwCompress, decompress: lzwDecompress };
