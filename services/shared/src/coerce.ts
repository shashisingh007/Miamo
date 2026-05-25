// ─── Lightweight Query/Body Coercion ────────────────────────────────────
// Zero-dep helpers to safely coerce user-supplied query params before they
// reach Prisma. Prisma already escapes parameterised queries so this is
// defence-in-depth: prevents 500s from malformed cursors, caps page sizes,
// and rejects values outside an explicit allow-list.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns the value if it's a valid UUID v1–v5 string, otherwise undefined.
 * Use for `cursor` query params backed by uuid PKs.
 */
export function safeUuid(v: unknown): string | undefined {
  return typeof v === 'string' && UUID_RE.test(v) ? v : undefined;
}

/**
 * Coerce a `?limit=` query param to an int within [1, max].
 * Falls back to `def` for missing/invalid values.
 */
export function safeLimit(v: unknown, def: number, max: number): number {
  const n = typeof v === 'string' ? parseInt(v, 10) : typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

/**
 * Returns the value only if it appears in `allowed`, else `def`.
 * Use for `?type=`, `?category=`, etc. Case-sensitive by design.
 */
export function safeEnum<T extends string>(v: unknown, allowed: readonly T[], def: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : def;
}

/**
 * Coerce an optional `?cursor=` param: returns the uuid or undefined.
 * Aliased for readability at call sites.
 */
export const safeCursor = safeUuid;

/**
 * Build a Prisma `findMany` cursor spread from a possibly-untrusted query
 * value. Returns `{ cursor: { id }, skip: 1 }` for valid uuids, else `{}`.
 *
 * Replaces the unsafe `...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {})`
 * pattern, which 500s when the client supplies a non-uuid cursor.
 */
export function cursorOpt(v: unknown): { cursor: { id: string }; skip: number } | Record<string, never> {
  const id = safeUuid(v);
  return id ? { cursor: { id }, skip: 1 } : {};
}
