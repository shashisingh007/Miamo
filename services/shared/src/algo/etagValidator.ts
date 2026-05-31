/**
 * RFC 7232 ETag parser + If-None-Match / If-Match comparison.
 * Strong validators: "abc"     Weak validators: W/"abc"
 * Strong comparison: both strong AND opaque tags equal.
 * Weak comparison: opaque tags equal regardless of weak flag.
 */

export interface EtagToken {
  raw: string;
  opaque: string;
  weak: boolean;
}

const ETAG_RE = /^\s*(W\/)?"((?:[^"\\]|\\.)*)"\s*$/;

export function parseEtag(input: string): EtagToken | null {
  if (typeof input !== 'string') return null;
  const m = ETAG_RE.exec(input);
  if (!m) return null;
  return { raw: input.trim(), opaque: m[2], weak: Boolean(m[1]) };
}

export function parseEtagList(header: string): EtagToken[] {
  if (typeof header !== 'string') return [];
  const trimmed = header.trim();
  if (trimmed === '*') return [];
  const out: EtagToken[] = [];
  // split on commas not inside quotes
  let buf = '';
  let inQuote = false;
  let esc = false;
  for (const ch of trimmed) {
    if (esc) {
      buf += ch;
      esc = false;
      continue;
    }
    if (ch === '\\' && inQuote) {
      buf += ch;
      esc = true;
      continue;
    }
    if (ch === '"') {
      inQuote = !inQuote;
      buf += ch;
      continue;
    }
    if (ch === ',' && !inQuote) {
      const tok = parseEtag(buf);
      if (tok) out.push(tok);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) {
    const tok = parseEtag(buf);
    if (tok) out.push(tok);
  }
  return out;
}

export function etagStrongEquals(a: EtagToken, b: EtagToken): boolean {
  return !a.weak && !b.weak && a.opaque === b.opaque;
}

export function etagWeakEquals(a: EtagToken, b: EtagToken): boolean {
  return a.opaque === b.opaque;
}

export function isWildcardEtagList(header: string): boolean {
  return typeof header === 'string' && header.trim() === '*';
}

/** RFC 7232 §3.1 If-Match (strong). Wildcard matches any resource (current=non-null). */
export function ifMatchAllows(
  header: string | null | undefined,
  current: EtagToken | null
): boolean {
  if (header == null) return true;
  if (isWildcardEtagList(header)) return current !== null;
  if (!current) return false;
  const list = parseEtagList(header);
  return list.some((t) => etagStrongEquals(t, current));
}

/** RFC 7232 §3.2 If-None-Match (weak). Wildcard means "no representation". */
export function ifNoneMatchAllows(
  header: string | null | undefined,
  current: EtagToken | null
): boolean {
  if (header == null) return true;
  if (isWildcardEtagList(header)) return current === null;
  if (!current) return true;
  const list = parseEtagList(header);
  return !list.some((t) => etagWeakEquals(t, current));
}
