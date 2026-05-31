/**
 * traceContextPropagator \u2014 Phase 18 W3C trace-context parser (pure).
 *
 * Parses + builds W3C `traceparent` headers
 *   version-traceId-parentId-flags
 *   00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
 *
 * Provides `parseTraceParent`, `buildTraceParent`, and `nextChildSpanId`.
 * Validates lengths and hex characters; rejects all-zero ids per spec.
 */
const RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

export type TraceParent = {
  version: string;     // '00'
  traceId: string;     // 32-hex
  parentId: string;    // 16-hex
  flags: string;       // 2-hex (e.g. '01' = sampled)
};

export type ParseTraceResult =
  | { ok: true; parsed: TraceParent }
  | { ok: false; reason: 'invalid_format' | 'invalid_trace_id' | 'invalid_parent_id' | 'unsupported_version' };

export function parseTraceParent(header: string | null | undefined): ParseTraceResult {
  if (typeof header !== 'string' || header.length === 0) return { ok: false, reason: 'invalid_format' };
  const m = header.trim().toLowerCase().match(RE);
  if (!m) return { ok: false, reason: 'invalid_format' };
  const [, version, traceId, parentId, flags] = m;
  if (version === 'ff') return { ok: false, reason: 'unsupported_version' };
  if (/^0+$/.test(traceId)) return { ok: false, reason: 'invalid_trace_id' };
  if (/^0+$/.test(parentId)) return { ok: false, reason: 'invalid_parent_id' };
  return { ok: true, parsed: { version, traceId, parentId, flags } };
}

export function buildTraceParent(parts: { traceId: string; parentId: string; sampled?: boolean; version?: string }): string {
  const v = (parts.version ?? '00').toLowerCase();
  const t = parts.traceId.toLowerCase();
  const p = parts.parentId.toLowerCase();
  const f = parts.sampled ? '01' : '00';
  if (!/^[0-9a-f]{2}$/.test(v)) throw new Error('traceparent: bad version');
  if (!/^[0-9a-f]{32}$/.test(t) || /^0+$/.test(t)) throw new Error('traceparent: bad traceId');
  if (!/^[0-9a-f]{16}$/.test(p) || /^0+$/.test(p)) throw new Error('traceparent: bad parentId');
  return `${v}-${t}-${p}-${f}`;
}

/** Generate a 16-hex child span id from a pseudo-random source. */
export function nextChildSpanId(rand: () => number = Math.random): string {
  let out = '';
  while (out.length < 16) {
    out += Math.floor(rand() * 0xffffffff).toString(16).padStart(8, '0');
  }
  out = out.slice(0, 16);
  // ensure non-zero
  if (/^0+$/.test(out)) return '0000000000000001';
  return out;
}
