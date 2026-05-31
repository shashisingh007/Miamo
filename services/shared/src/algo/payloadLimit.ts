/**
 * payloadLimit \u2014 Phase 20 OWASP A04 (insecure design) helper (pure).
 *
 * Validates inbound request body size + Content-Type before the server
 * spends CPU parsing it. Designed to live in front of `body-parser` so
 * malicious clients can't smuggle 1 GB JSON.
 */
export type PayloadLimitInputs = {
  contentLengthHeader?: string | null;
  contentTypeHeader?: string | null;
  maxBytes?: number;          // default 1 MiB
  allowedTypes?: string[];    // default ['application/json']
};

export type PayloadLimitResult =
  | { ok: true; bytes: number; mediaType: string }
  | { ok: false; reason: 'missing_length' | 'invalid_length' | 'too_large' | 'unsupported_type' | 'missing_type' };

const DEFAULT_MAX = 1024 * 1024;
const DEFAULT_TYPES = ['application/json'];

export function checkPayload(inp: PayloadLimitInputs): PayloadLimitResult {
  const max = Math.max(1, inp.maxBytes ?? DEFAULT_MAX);
  const allowed = (inp.allowedTypes ?? DEFAULT_TYPES).map(t => t.trim().toLowerCase());

  // content-length
  if (inp.contentLengthHeader == null || inp.contentLengthHeader === '') {
    return { ok: false, reason: 'missing_length' };
  }
  const bytes = Number(inp.contentLengthHeader);
  if (!Number.isFinite(bytes) || !Number.isInteger(bytes) || bytes < 0) {
    return { ok: false, reason: 'invalid_length' };
  }
  if (bytes > max) return { ok: false, reason: 'too_large' };

  // content-type
  if (inp.contentTypeHeader == null || inp.contentTypeHeader.trim() === '') {
    return { ok: false, reason: 'missing_type' };
  }
  const mediaType = inp.contentTypeHeader.split(';')[0].trim().toLowerCase();
  if (!allowed.includes(mediaType)) return { ok: false, reason: 'unsupported_type' };

  return { ok: true, bytes, mediaType };
}
