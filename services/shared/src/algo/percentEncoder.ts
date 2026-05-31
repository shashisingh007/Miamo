// RFC 3986 percent-encoding utilities — finer-grained than encodeURIComponent.
// Supports configurable "unreserved" character classes.

const HEX = '0123456789ABCDEF';

function isAlphaNum(code: number): boolean {
  return (
    (code >= 0x30 && code <= 0x39) || // 0-9
    (code >= 0x41 && code <= 0x5a) || // A-Z
    (code >= 0x61 && code <= 0x7a)    // a-z
  );
}

const UNRESERVED_EXTRA = new Set('-._~'.split('').map((c) => c.charCodeAt(0)));

function isUnreserved(code: number): boolean {
  return isAlphaNum(code) || UNRESERVED_EXTRA.has(code);
}

export type PercentMode = 'component' | 'path' | 'query' | 'form';

// Characters explicitly safe per mode (in addition to unreserved set).
const MODE_SAFE: Record<PercentMode, Set<number>> = {
  component: new Set(),
  path: new Set("/:@!$&'()*+,;=".split('').map((c) => c.charCodeAt(0))),
  query: new Set("/:@!$'()*,;".split('').map((c) => c.charCodeAt(0))),
  form: new Set(), // form: ' ' becomes '+'
};

export function percentEncode(input: string, mode: PercentMode = 'component'): string {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const bytes = new TextEncoder().encode(input);
  const safe = MODE_SAFE[mode];
  if (!safe) throw new Error(`unknown mode: ${mode}`);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (mode === 'form' && b === 0x20) {
      out += '+';
      continue;
    }
    if (isUnreserved(b) || safe.has(b)) {
      out += String.fromCharCode(b);
    } else {
      out += '%' + HEX[b >> 4] + HEX[b & 0x0f];
    }
  }
  return out;
}

export interface PercentDecodeOptions {
  plusAsSpace?: boolean; // default false; true for application/x-www-form-urlencoded
}

export function percentDecode(input: string, opts: PercentDecodeOptions = {}): string {
  if (typeof input !== 'string') throw new TypeError('input must be a string');
  const plusAsSpace = opts.plusAsSpace ?? false;
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    if (c === 0x25) {
      // '%'
      if (i + 2 >= input.length) throw new Error('truncated percent-escape');
      const hi = parseHex(input.charCodeAt(i + 1));
      const lo = parseHex(input.charCodeAt(i + 2));
      if (hi < 0 || lo < 0) throw new Error(`invalid percent-escape at index ${i}`);
      bytes.push((hi << 4) | lo);
      i += 2;
    } else if (plusAsSpace && c === 0x2b) {
      bytes.push(0x20);
    } else if (c > 0xff) {
      // Encode multi-byte JS char back to UTF-8 (caller already had raw chars).
      const enc = new TextEncoder().encode(input[i]);
      for (const x of enc) bytes.push(x);
    } else {
      bytes.push(c);
    }
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(Uint8Array.from(bytes));
}

function parseHex(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30;
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10;
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10;
  return -1;
}
