/**
 * Structured log redactor for nested objects.
 *
 * Walks a value graph and rewrites any value reached via a key matching the
 * configured deny-list (case-insensitive substring match) with a masked form.
 * Cycles are detected via a WeakSet; arrays and plain objects are recursed.
 * Returns a fresh copy — the input is never mutated.
 */

export interface RedactionOptions {
  /** key-substrings to redact (default sensitive set) */
  denyKeys?: ReadonlyArray<string>;
  /** mask used in place of redacted values (default '[REDACTED]') */
  mask?: string;
  /** also redact bearer/jwt-like strings found ANYWHERE (default true) */
  scrubBearerTokens?: boolean;
  /** max depth before truncating (default 16) */
  maxDepth?: number;
}

const DEFAULT_DENY = [
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'authorization',
  'cookie',
  'set-cookie',
  'session',
  'sessionid',
  'ssn',
  'credit',
  'cvv',
  'pin',
  'privatekey',
  'private_key',
];

const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-]+/g;
const JWT_RE = /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

function keyMatches(key: string, deny: ReadonlyArray<string>): boolean {
  const lk = key.toLowerCase();
  for (const d of deny) if (lk.includes(d)) return true;
  return false;
}

function scrubStringTokens(s: string, mask: string): string {
  return s
    .replace(BEARER_RE, `Bearer ${mask}`)
    .replace(JWT_RE, mask);
}

export function redactStructuredLog<T>(input: T, opts: RedactionOptions = {}): T {
  const deny = (opts.denyKeys ?? DEFAULT_DENY).map((d) => d.toLowerCase());
  const mask = opts.mask ?? '[REDACTED]';
  const scrubTokens = opts.scrubBearerTokens ?? true;
  const maxDepth = opts.maxDepth ?? 16;
  const seen = new WeakSet<object>();

  function visit(value: unknown, depth: number): unknown {
    if (depth > maxDepth) return '[TRUNCATED]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') {
      return scrubTokens ? scrubStringTokens(value, mask) : value;
    }
    if (typeof value !== 'object') return value;
    if (seen.has(value as object)) return '[CIRCULAR]';
    seen.add(value as object);
    if (Array.isArray(value)) {
      return value.map((v) => visit(v, depth + 1));
    }
    if (isPlainObject(value)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        if (keyMatches(k, deny)) {
          out[k] = v === null || v === undefined ? v : mask;
        } else {
          out[k] = visit(v, depth + 1);
        }
      }
      return out;
    }
    // Non-plain objects (Date, Map, Buffer…) → stringify rather than recurse
    return String(value);
  }

  return visit(input, 0) as T;
}
