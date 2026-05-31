export type IdempotencyKeyClassification = {
  readonly valid: boolean;
  readonly normalized: string | null;
  readonly reason?:
    | 'empty'
    | 'too_short'
    | 'too_long'
    | 'invalid_chars'
    | 'not_a_string';
};

const MIN_LEN = 16;
const MAX_LEN = 255;
const SAFE_CHARS = /^[A-Za-z0-9._:\-]+$/;

export function classifyIdempotencyKey(raw: unknown): IdempotencyKeyClassification {
  if (typeof raw !== 'string') {
    return { valid: false, normalized: null, reason: 'not_a_string' };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: false, normalized: null, reason: 'empty' };
  }
  if (trimmed.length < MIN_LEN) {
    return { valid: false, normalized: null, reason: 'too_short' };
  }
  if (trimmed.length > MAX_LEN) {
    return { valid: false, normalized: null, reason: 'too_long' };
  }
  if (!SAFE_CHARS.test(trimmed)) {
    return { valid: false, normalized: null, reason: 'invalid_chars' };
  }
  return { valid: true, normalized: trimmed };
}

export function namespaceIdempotencyKey(
  scope: string,
  key: string,
): string {
  const s = (scope || '').trim().toLowerCase();
  return s.length === 0 ? key : `${s}:${key}`;
}
