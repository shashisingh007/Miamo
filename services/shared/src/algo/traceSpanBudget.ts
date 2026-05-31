/**
 * traceSpanBudget \u2014 Phase 18 per-trace span budget enforcer (pure).
 *
 * Tracks span counts per traceId via a tiny LRU and reports whether each
 * new span is admissible, near budget, or over budget. Helps prevent
 * runaway trace fan-out from blowing up the collector.
 *
 *   admit(traceId) -> { admit: boolean, severity: 'ok'|'near'|'over', count }
 */

export type SpanBudgetOptions = {
  maxSpansPerTrace?: number;     // default 500
  warnAtRatio?: number;          // default 0.8
  maxTracesTracked?: number;     // default 5000 (LRU)
};

export type AdmissionResult = {
  admit: boolean;
  severity: 'ok' | 'near' | 'over';
  count: number;
};

export function createTraceSpanBudget(opts: SpanBudgetOptions = {}) {
  const max = Math.max(1, opts.maxSpansPerTrace ?? 500);
  const warnRatio = Math.min(1, Math.max(0, opts.warnAtRatio ?? 0.8));
  const lruMax = Math.max(1, opts.maxTracesTracked ?? 5000);

  // Map preserves insertion order \u2014 use for LRU by deleting + reinserting.
  const map = new Map<string, number>();

  function admit(traceId: string): AdmissionResult {
    if (!traceId) return { admit: false, severity: 'over', count: 0 };
    const prev = map.get(traceId) ?? 0;
    if (prev >= max) {
      return { admit: false, severity: 'over', count: prev };
    }
    const next = prev + 1;
    // refresh LRU
    map.delete(traceId);
    map.set(traceId, next);
    if (map.size > lruMax) {
      // evict oldest
      const oldest = map.keys().next().value;
      if (oldest !== undefined) map.delete(oldest);
    }
    const severity: 'ok' | 'near' | 'over' =
      next >= max ? 'over' : next >= max * warnRatio ? 'near' : 'ok';
    return { admit: true, severity, count: next };
  }

  function count(traceId: string): number {
    return map.get(traceId) ?? 0;
  }

  function reset(): void {
    map.clear();
  }

  function tracesTracked(): number {
    return map.size;
  }

  return { admit, count, reset, tracesTracked };
}
