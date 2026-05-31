/**
 * pagination \u2014 Phase 15 cursor-based pagination helper.
 *
 * Offset pagination is the obvious wrong answer at scale (skew + duplicates
 * + table scans). Every list endpoint should accept an opaque cursor that
 * encodes (sortKey, lastSeenId). This module is the pure codec:
 *
 *   - `encodeCursor`  packs an object into base64url JSON.
 *   - `decodeCursor`  unpacks + validates schema + rejects oversized blobs.
 *   - `clampPageSize` enforces a per-endpoint cap so callers can't ask for
 *                      1M rows.
 *
 * Pure & deterministic; no IO.
 */
export type CursorPayload = {
  /** Monotone sort key value (timestamp ms, score, etc.). */
  k: number;
  /** Last-seen primary id (string). */
  id: string;
};

export type DecodeCursorResult =
  | { ok: true; cursor: CursorPayload }
  | { ok: false; reason: 'missing' | 'invalid' | 'too_large' };

const MAX_CURSOR_BYTES = 256;

function b64UrlEncode(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64UrlDecode(s: string): string {
  const pad = (4 - (s.length % 4)) % 4;
  const norm = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(norm, 'base64').toString('utf8');
}

export function encodeCursor(p: CursorPayload): string {
  if (!Number.isFinite(p.k)) throw new Error('encodeCursor: k must be finite');
  if (typeof p.id !== 'string' || p.id.length === 0) {
    throw new Error('encodeCursor: id must be a non-empty string');
  }
  return b64UrlEncode(JSON.stringify({ k: p.k, id: p.id }));
}

export function decodeCursor(input: string | null | undefined): DecodeCursorResult {
  if (input == null || input.length === 0) return { ok: false, reason: 'missing' };
  if (input.length > MAX_CURSOR_BYTES) return { ok: false, reason: 'too_large' };
  let raw: string;
  try { raw = b64UrlDecode(input); }
  catch { return { ok: false, reason: 'invalid' }; }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, reason: 'invalid' }; }
  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'invalid' };
  const o = parsed as Record<string, unknown>;
  if (typeof o.k !== 'number' || !Number.isFinite(o.k)) return { ok: false, reason: 'invalid' };
  if (typeof o.id !== 'string' || o.id.length === 0)    return { ok: false, reason: 'invalid' };
  return { ok: true, cursor: { k: o.k, id: o.id } };
}

export function clampPageSize(requested: number | null | undefined, defaultSize: number, max: number): number {
  if (!Number.isFinite(requested as number) || (requested as number) <= 0) return defaultSize;
  return Math.min(Math.floor(requested as number), max);
}
