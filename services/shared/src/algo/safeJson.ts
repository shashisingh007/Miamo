/**
 * safeJson \u2014 Phase 20 OWASP A03 / A04 hardened JSON parser.
 *
 * `JSON.parse` is fine on trusted input but two failure modes bite us at
 * the wire boundary (webhooks, federated payloads, user-supplied editor
 * configs):
 *
 *   1. Prototype pollution via `__proto__` / `constructor.prototype` keys.
 *   2. Resource exhaustion via deeply-nested or oversized payloads
 *      (parser stack blowup, GC pressure).
 *
 * `safeJsonParse` enforces:
 *   - max byte length on the raw string (default 1 MB).
 *   - max nesting depth on the parsed value (default 16).
 *   - strips any `__proto__` / `constructor` / `prototype` keys post-parse.
 *
 * Returns a discriminated result rather than throwing so callers can pick
 * a 400 vs 500 response cleanly.
 */
export type SafeJsonOptions = {
  maxBytes?: number;     // default 1 MB
  maxDepth?: number;     // default 16
};

export type SafeJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: 'too_large' | 'invalid_json' | 'too_deep' };

const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_DEPTH = 16;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function byteLength(s: string): number {
  // Cheap upper-bound: each char up to 4 bytes UTF-8. Use exact when small.
  if (s.length < 1024) return new TextEncoder().encode(s).length;
  return s.length * 4;
}

function checkDepthAndScrub(v: unknown, depth: number, maxDepth: number): unknown {
  if (depth > maxDepth) throw new Error('too_deep');
  if (Array.isArray(v)) {
    return v.map((x) => checkDepthAndScrub(x, depth + 1, maxDepth));
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = Object.create(null);
    for (const k of Object.keys(v)) {
      if (FORBIDDEN_KEYS.has(k)) continue;
      out[k] = checkDepthAndScrub((v as Record<string, unknown>)[k], depth + 1, maxDepth);
    }
    return out;
  }
  return v;
}

export function safeJsonParse(input: string, opts: SafeJsonOptions = {}): SafeJsonResult {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (byteLength(input) > maxBytes) return { ok: false, reason: 'too_large' };
  let parsed: unknown;
  try { parsed = JSON.parse(input); }
  catch { return { ok: false, reason: 'invalid_json' }; }
  try {
    const scrubbed = checkDepthAndScrub(parsed, 0, maxDepth);
    return { ok: true, value: scrubbed };
  } catch (e) {
    if ((e as Error).message === 'too_deep') return { ok: false, reason: 'too_deep' };
    return { ok: false, reason: 'invalid_json' };
  }
}
