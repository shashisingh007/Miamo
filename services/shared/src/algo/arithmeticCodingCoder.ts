// Static-model arithmetic coding using BigInt arithmetic to keep precision
// exact. Encodes a sequence of symbols (string) using a frequency table into a
// BigInt value. Decoding requires the same frequency table and length.

export interface ArithmeticEncoded {
  value: bigint;
  length: number;
  total: bigint;
}

interface SymbolRange {
  symbol: string;
  cumLow: bigint;
  cumHigh: bigint;
}

function buildTable(freq: Record<string, number>): { table: SymbolRange[]; lookup: Map<string, SymbolRange>; total: bigint } {
  const symbols = Object.keys(freq).sort();
  if (symbols.length === 0) throw new Error('arithmeticCodingCoder: frequency table is empty');
  let cum = 0n;
  const table: SymbolRange[] = [];
  const lookup = new Map<string, SymbolRange>();
  for (const s of symbols) {
    const f = freq[s];
    if (!Number.isInteger(f) || f <= 0) throw new Error(`arithmeticCodingCoder: frequency for "${s}" must be a positive integer`);
    const fb = BigInt(f);
    const entry: SymbolRange = { symbol: s, cumLow: cum, cumHigh: cum + fb };
    table.push(entry);
    lookup.set(s, entry);
    cum += fb;
  }
  return { table, lookup, total: cum };
}

export function arithmeticCodingEncode(input: string, freq: Record<string, number>): ArithmeticEncoded {
  if (typeof input !== 'string') throw new Error('arithmeticCodingCoder: input must be a string');
  const { lookup, total } = buildTable(freq);
  if (input.length === 0) return { value: 0n, length: 0, total };
  let low = 0n;
  let range = 1n;
  for (const ch of input) {
    const entry = lookup.get(ch);
    if (entry === undefined) throw new Error(`arithmeticCodingCoder: symbol "${ch}" missing from frequency table`);
    low = low * total + range * entry.cumLow;
    range = range * (entry.cumHigh - entry.cumLow);
  }
  return { value: low, length: input.length, total };
}

export function arithmeticCodingDecode(encoded: ArithmeticEncoded, freq: Record<string, number>): string {
  const { table, total } = buildTable(freq);
  if (encoded.total !== total) throw new Error('arithmeticCodingCoder: frequency total mismatch');
  if (encoded.length === 0) return '';
  let denom = 1n;
  for (let i = 0; i < encoded.length; i += 1) denom *= total;
  let low = 0n;
  let rangeGlobal = denom;
  let out = '';
  for (let i = 0; i < encoded.length; i += 1) {
    const range = rangeGlobal / total;
    const diff = encoded.value - low;
    const q = diff / range;
    let chosen: SymbolRange | undefined;
    for (const entry of table) {
      if (q >= entry.cumLow && q < entry.cumHigh) {
        chosen = entry;
        break;
      }
    }
    if (chosen === undefined) throw new Error('arithmeticCodingCoder: decode failed (corrupt value)');
    out += chosen.symbol;
    low = low + range * chosen.cumLow;
    rangeGlobal = range * (chosen.cumHigh - chosen.cumLow);
  }
  return out;
}

export const arithmeticCodingCoder = {
  encode: arithmeticCodingEncode,
  decode: arithmeticCodingDecode,
};
