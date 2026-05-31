/**
 * RFC 7233 Range header parser for `bytes=` unit only.
 * Returns satisfiable absolute ranges given a known total size, or null when unsatisfiable.
 */

export interface ByteRange {
  start: number;
  end: number; // inclusive
  length: number;
}

export interface RangeParseResult {
  unit: 'bytes';
  ranges: ByteRange[];
  satisfiable: boolean;
}

const SPEC_RE = /^\s*(\d*)\s*-\s*(\d*)\s*$/;

function parseSpec(spec: string, totalSize: number): ByteRange | null {
  const m = SPEC_RE.exec(spec);
  if (!m) return null;
  const sRaw = m[1];
  const eRaw = m[2];
  if (sRaw === '' && eRaw === '') return null;
  if (sRaw === '') {
    // suffix: -N => last N bytes
    const n = Number(eRaw);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (totalSize === 0) return null;
    const start = Math.max(0, totalSize - n);
    const end = totalSize - 1;
    return { start, end, length: end - start + 1 };
  }
  const start = Number(sRaw);
  if (!Number.isFinite(start) || start < 0) return null;
  if (start >= totalSize) return null;
  let end: number;
  if (eRaw === '') {
    end = totalSize - 1;
  } else {
    end = Number(eRaw);
    if (!Number.isFinite(end) || end < start) return null;
    if (end >= totalSize) end = totalSize - 1;
  }
  return { start, end, length: end - start + 1 };
}

export function parseRangeHeader(
  header: string | null | undefined,
  totalSize: number
): RangeParseResult | null {
  if (header == null || typeof header !== 'string') return null;
  if (!Number.isFinite(totalSize) || totalSize < 0) return null;
  const eq = header.indexOf('=');
  if (eq < 0) return null;
  const unit = header.slice(0, eq).trim().toLowerCase();
  if (unit !== 'bytes') return null;
  const specs = header
    .slice(eq + 1)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (specs.length === 0) return null;
  const ranges: ByteRange[] = [];
  for (const spec of specs) {
    const r = parseSpec(spec, totalSize);
    if (r) ranges.push(r);
  }
  if (ranges.length === 0) {
    return { unit: 'bytes', ranges: [], satisfiable: false };
  }
  return { unit: 'bytes', ranges, satisfiable: true };
}

export function contentRangeHeader(r: ByteRange, totalSize: number): string {
  return `bytes ${r.start}-${r.end}/${totalSize}`;
}

export function unsatisfiableContentRange(totalSize: number): string {
  return `bytes */${totalSize}`;
}
