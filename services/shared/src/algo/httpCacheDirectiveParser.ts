export type HttpCacheDirectiveSet = {
  readonly maxAgeSec: number | null;
  readonly sMaxAgeSec: number | null;
  readonly staleWhileRevalidateSec: number | null;
  readonly staleIfErrorSec: number | null;
  readonly visibility: 'public' | 'private' | null;
  readonly noStore: boolean;
  readonly noCache: boolean;
  readonly mustRevalidate: boolean;
  readonly immutable: boolean;
};

function num(token: string, prefix: string): number | null {
  if (!token.startsWith(prefix + '=')) return null;
  const raw = token.slice(prefix.length + 1).replace(/"/g, '');
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function parseCacheControl(header: string | null | undefined): HttpCacheDirectiveSet {
  const empty: HttpCacheDirectiveSet = {
    maxAgeSec: null,
    sMaxAgeSec: null,
    staleWhileRevalidateSec: null,
    staleIfErrorSec: null,
    visibility: null,
    noStore: false,
    noCache: false,
    mustRevalidate: false,
    immutable: false,
  };
  if (!header || typeof header !== 'string') return empty;
  const tokens = header
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);

  let maxAge: number | null = null;
  let sMaxAge: number | null = null;
  let swr: number | null = null;
  let sie: number | null = null;
  let vis: 'public' | 'private' | null = null;
  let noStore = false;
  let noCache = false;
  let mustRev = false;
  let immut = false;

  for (const t of tokens) {
    if (t === 'public') vis = vis ?? 'public';
    else if (t === 'private') vis = 'private';
    else if (t === 'no-store') noStore = true;
    else if (t === 'no-cache') noCache = true;
    else if (t === 'must-revalidate') mustRev = true;
    else if (t === 'immutable') immut = true;
    else {
      const m = num(t, 'max-age');
      if (m !== null) maxAge = m;
      const s = num(t, 's-maxage');
      if (s !== null) sMaxAge = s;
      const w = num(t, 'stale-while-revalidate');
      if (w !== null) swr = w;
      const e = num(t, 'stale-if-error');
      if (e !== null) sie = e;
    }
  }

  return {
    maxAgeSec: maxAge,
    sMaxAgeSec: sMaxAge,
    staleWhileRevalidateSec: swr,
    staleIfErrorSec: sie,
    visibility: vis,
    noStore,
    noCache,
    mustRevalidate: mustRev,
    immutable: immut,
  };
}

export function isCacheable(d: HttpCacheDirectiveSet): boolean {
  if (d.noStore) return false;
  if (d.maxAgeSec !== null && d.maxAgeSec > 0) return true;
  if (d.sMaxAgeSec !== null && d.sMaxAgeSec > 0) return true;
  return false;
}

export function effectiveFreshnessSec(
  d: HttpCacheDirectiveSet,
  ctx: 'shared' | 'private' = 'shared',
): number {
  if (d.noStore) return 0;
  if (ctx === 'shared' && d.sMaxAgeSec !== null) return d.sMaxAgeSec;
  return d.maxAgeSec ?? 0;
}
