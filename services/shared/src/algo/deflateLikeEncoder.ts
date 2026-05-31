// Simplified DEFLATE-style encoder. Implements an LZ77 sliding-window pass
// only: emits a stream of literals or back-references {offset, length}.
// No Huffman stage — keeps the demo focused and exact. Round-trips perfectly.

export type DeflateToken =
  | { kind: 'literal'; value: number }
  | { kind: 'match'; offset: number; length: number };

const MIN_MATCH = 3;
const MAX_MATCH = 258;
const WINDOW = 32768;

export function deflateLikeEncode(input: Uint8Array | string): DeflateToken[] {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const tokens: DeflateToken[] = [];
  let i = 0;
  while (i < bytes.length) {
    let bestLen = 0;
    let bestOff = 0;
    const limitOff = Math.max(0, i - WINDOW);
    if (i + MIN_MATCH <= bytes.length) {
      for (let j = i - 1; j >= limitOff; j -= 1) {
        if (bytes[j] !== bytes[i]) continue;
        let len = 0;
        while (
          len < MAX_MATCH &&
          i + len < bytes.length &&
          bytes[j + len] === bytes[i + len]
        ) len += 1;
        if (len > bestLen) {
          bestLen = len;
          bestOff = i - j;
          if (len === MAX_MATCH) break;
        }
      }
    }
    if (bestLen >= MIN_MATCH) {
      tokens.push({ kind: 'match', offset: bestOff, length: bestLen });
      i += bestLen;
    } else {
      tokens.push({ kind: 'literal', value: bytes[i] });
      i += 1;
    }
  }
  return tokens;
}

export function deflateLikeDecode(tokens: readonly DeflateToken[]): Uint8Array {
  const out: number[] = [];
  for (const tok of tokens) {
    if (tok.kind === 'literal') {
      out.push(tok.value & 0xff);
    } else {
      if (tok.offset <= 0 || tok.offset > out.length) {
        throw new Error('deflateLikeEncoder: invalid match offset');
      }
      if (tok.length <= 0) {
        throw new Error('deflateLikeEncoder: invalid match length');
      }
      const start = out.length - tok.offset;
      for (let i = 0; i < tok.length; i += 1) out.push(out[start + i]);
    }
  }
  return Uint8Array.from(out);
}

export const deflateLikeEncoder = {
  encode: deflateLikeEncode,
  decode: deflateLikeDecode,
};
