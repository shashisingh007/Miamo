/**
 * etagWeak \u2014 Phase 15 weak ETag helpers (pure).
 *
 * - `weakEtag(body)` \u2192 stable W/"<hash>" string for any JSON-serialisable
 *   body. Uses a fast 32-bit FNV-1a hash; weak quality so callers can
 *   tweak whitespace / key order without breaking caching guarantees
 *   for clients that only check structural equality.
 * - `matchesIfNoneMatch(etag, header)` \u2192 RFC-7232 style comparison that
 *   accepts comma-separated lists and the wildcard "*".
 */
function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((v as any)[k])).join(',') + '}';
}

export function weakEtag(body: unknown): string {
  const s = typeof body === 'string' ? body : stableStringify(body);
  const h = fnv1a32(s).toString(16).padStart(8, '0');
  // include length to reduce 32-bit collision risk
  const lenHex = (s.length >>> 0).toString(16);
  return `W/"${h}-${lenHex}"`;
}

export function matchesIfNoneMatch(etag: string, header: string | null | undefined): boolean {
  if (!header) return false;
  const norm = (s: string) => s.trim().replace(/^W\//i, '');
  const target = norm(etag);
  for (const part of header.split(',')) {
    const t = part.trim();
    if (t === '*') return true;
    if (norm(t) === target) return true;
  }
  return false;
}
