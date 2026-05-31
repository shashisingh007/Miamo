export type CursorPaginationParams = {
  readonly cursor?: string | null;
  readonly limit?: number;
};

export type CursorPaginationDecoded = {
  readonly offset: number;
  readonly limit: number;
  readonly issuedAtMs: number | null;
};

export type CursorPaginationPage<T> = {
  readonly items: ReadonlyArray<T>;
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;

function encode(offset: number, issuedAtMs: number): string {
  const json = JSON.stringify({ o: offset, t: issuedAtMs });
  return Buffer.from(json, 'utf8').toString('base64url');
}

function decode(cursor: string): { offset: number; issuedAtMs: number | null } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const obj = JSON.parse(raw);
    if (typeof obj !== 'object' || obj === null) return null;
    const o = (obj as { o?: unknown }).o;
    const t = (obj as { t?: unknown }).t;
    if (typeof o !== 'number' || !Number.isFinite(o) || o < 0) return null;
    const issuedAtMs = typeof t === 'number' && Number.isFinite(t) ? t : null;
    return { offset: Math.floor(o), issuedAtMs };
  } catch {
    return null;
  }
}

export function parseCursorParams(input: CursorPaginationParams): CursorPaginationDecoded {
  const rawLimit = input.limit;
  const limit =
    typeof rawLimit === 'number' && Number.isFinite(rawLimit)
      ? Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(rawLimit)))
      : DEFAULT_LIMIT;
  if (!input.cursor || typeof input.cursor !== 'string') {
    return { offset: 0, limit, issuedAtMs: null };
  }
  const decoded = decode(input.cursor);
  if (!decoded) return { offset: 0, limit, issuedAtMs: null };
  return { offset: decoded.offset, limit, issuedAtMs: decoded.issuedAtMs };
}

export function buildCursorPage<T>(
  rowsPlusOne: ReadonlyArray<T>,
  decoded: CursorPaginationDecoded,
  nowMs: number,
): CursorPaginationPage<T> {
  const hasMore = rowsPlusOne.length > decoded.limit;
  const items = hasMore ? rowsPlusOne.slice(0, decoded.limit) : rowsPlusOne;
  const nextCursor = hasMore ? encode(decoded.offset + decoded.limit, nowMs) : null;
  return { items, nextCursor, hasMore };
}
