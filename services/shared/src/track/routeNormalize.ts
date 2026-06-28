/**
 * Phase 2 web SDK — route normalizer.
 *
 * Turns Next.js router paths into stable, low-cardinality route templates
 * so `nav.route` events can be aggregated. Without this, every dynamic
 * segment becomes its own bucket (`/profile/abc`, `/profile/xyz`, ...).
 *
 * Rules:
 *   - Replace numeric segments with `:id`.
 *   - Replace UUID-ish / 16+ char hex/base32 segments with `:id`.
 *   - Strip trailing slash (except for root).
 *   - Drop query string + hash.
 *   - Cap depth at 6 (deeper routes collapse to `/…`).
 *
 * Pure: no side effects, no `window` access.
 */

const ID_RE  = /^[0-9]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE  = /^[0-9a-f]{16,}$/i;
const SLUG_LONG_RE = /^[a-z0-9]{24,}$/i;

const MAX_DEPTH = 6;

export function normalizeRoute(raw: string | null | undefined): string {
  if (!raw) return '/';
  // Strip query + hash.
  const noHash = raw.split('#', 1)[0];
  const path = noHash.split('?', 1)[0] || '/';
  if (path === '/') return '/';

  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return '/';

  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i >= MAX_DEPTH) { out.push('…'); break; }
    out.push(normaliseSegment(parts[i]));
  }
  return '/' + out.join('/');
}

function normaliseSegment(s: string): string {
  if (ID_RE.test(s))    return ':id';
  if (UUID_RE.test(s))  return ':id';
  if (HEX_RE.test(s))   return ':id';
  if (SLUG_LONG_RE.test(s)) return ':id';
  return s;
}

/** Convenience: extract a clean path from a Next router-like object. */
export function routeFromRouter(r: { pathname?: string; asPath?: string } | null | undefined): string {
  if (!r) return '/';
  // Prefer `pathname` (already templated by Next: e.g. `/profile/[id]`),
  // fall back to normalising `asPath` (raw URL).
  if (r.pathname) {
    // Next.js dynamic segments use [id] — normalise to :id for parity.
    return r.pathname.replace(/\[([^\]]+)\]/g, ':$1') || '/';
  }
  return normalizeRoute(r.asPath);
}
