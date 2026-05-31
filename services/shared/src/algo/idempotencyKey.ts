/**
 * idempotencyKey \u2014 Phase 20 idempotency-key parser & validator.
 *
 * Every state-changing POST/PUT accepts an `Idempotency-Key` header so the
 * client can safely retry without double-charging / double-matching. This
 * module is the pure parser the gateway middleware uses:
 *
 *   - Required shape: ULID, UUIDv4, or printable [A-Za-z0-9-_] 16..128 chars.
 *   - Returns a normalised lowercase form so cache lookups are stable.
 *   - Rejects whitespace / control chars to avoid header-injection oddities.
 *
 * Pure & deterministic.
 */
export type IdempotencyKeyResult =
  | { ok: true; key: string; kind: 'ulid' | 'uuid' | 'opaque' }
  | { ok: false; reason: 'missing' | 'too_short' | 'too_long' | 'invalid_chars' };

const ULID_RE = /^[0-7][0-9a-hjkmnp-tv-z]{25}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPAQUE_RE = /^[A-Za-z0-9_-]+$/;

export function parseIdempotencyKey(raw: string | null | undefined): IdempotencyKeyResult {
  if (raw == null || raw.length === 0) return { ok: false, reason: 'missing' };
  if (raw.length < 16)  return { ok: false, reason: 'too_short' };
  if (raw.length > 128) return { ok: false, reason: 'too_long' };
  if (/[\s\u0000-\u001f\u007f]/.test(raw)) return { ok: false, reason: 'invalid_chars' };
  if (ULID_RE.test(raw))   return { ok: true, key: raw.toLowerCase(), kind: 'ulid' };
  if (UUID_RE.test(raw))   return { ok: true, key: raw.toLowerCase(), kind: 'uuid' };
  if (OPAQUE_RE.test(raw)) return { ok: true, key: raw, kind: 'opaque' };
  return { ok: false, reason: 'invalid_chars' };
}
