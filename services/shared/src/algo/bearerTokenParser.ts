/**
 * bearerTokenParser \u2014 Phase 20 RFC 6750 `Authorization: Bearer <token>`
 * header parser (pure).
 *
 *   parseBearerToken('Bearer abc.def.ghi') -> { ok: true, token: 'abc.def.ghi' }
 *
 * Validates scheme (case-insensitive), enforces a minimum token length,
 * and restricts to RFC 6750 b64token charset:
 *     1*( ALPHA / DIGIT / "-" / "." / "_" / "~" / "+" / "/" ) *"="
 */

export type BearerParseResult =
  | { ok: true; token: string }
  | {
      ok: false;
      reason: 'missing' | 'wrong_scheme' | 'malformed' | 'empty_token' | 'bad_charset' | 'too_short';
    };

export type BearerParseOptions = {
  minLength?: number;
};

const B64TOKEN = /^[A-Za-z0-9\-._~+/]+=*$/;

export function parseBearerToken(
  header: string | null | undefined,
  opts: BearerParseOptions = {},
): BearerParseResult {
  if (!header || typeof header !== 'string' || !header.trim()) {
    return { ok: false, reason: 'missing' };
  }
  const trimmed = header.trim();
  const spaceIdx = trimmed.search(/\s/);

  // Single-word header: could be a lone "Bearer" (empty_token) or some
  // other scheme (wrong_scheme) or just garbage (malformed).
  if (spaceIdx === -1) {
    if (trimmed.toLowerCase() === 'bearer') return { ok: false, reason: 'empty_token' };
    return { ok: false, reason: 'malformed' };
  }

  const scheme = trimmed.slice(0, spaceIdx);
  if (scheme.toLowerCase() !== 'bearer') return { ok: false, reason: 'wrong_scheme' };

  const token = trimmed.slice(spaceIdx + 1).trim();
  if (!token) return { ok: false, reason: 'empty_token' };
  if (!B64TOKEN.test(token)) return { ok: false, reason: 'bad_charset' };

  const min = opts.minLength ?? 8;
  if (token.length < min) return { ok: false, reason: 'too_short' };

  return { ok: true, token };
}
