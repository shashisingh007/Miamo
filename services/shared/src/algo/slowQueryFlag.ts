/**
 * slowQueryFlag \u2014 Phase 14 observability classifier (pure).
 *
 * Buckets a single query/RPC duration into ok/warn/slow/critical so
 * dashboards & alerts can share one definition. All thresholds are
 * configurable; defaults match the V2 SLO doc.
 */
export type SlowQueryTier = 'ok' | 'warn' | 'slow' | 'critical';

export type SlowQueryThresholds = {
  warnMs?: number;     // default 100
  slowMs?: number;     // default 500
  criticalMs?: number; // default 2000
};

const D_WARN = 100;
const D_SLOW = 500;
const D_CRIT = 2000;

export function classifyQuery(durationMs: number, t: SlowQueryThresholds = {}): SlowQueryTier {
  if (!Number.isFinite(durationMs) || durationMs < 0) return 'ok';
  const w = t.warnMs ?? D_WARN;
  const s = t.slowMs ?? D_SLOW;
  const c = t.criticalMs ?? D_CRIT;
  if (durationMs >= c) return 'critical';
  if (durationMs >= s) return 'slow';
  if (durationMs >= w) return 'warn';
  return 'ok';
}

/** Should we ship this query duration to the trace sampler? */
export function shouldSampleQuery(durationMs: number, t: SlowQueryThresholds = {}): boolean {
  const tier = classifyQuery(durationMs, t);
  return tier === 'slow' || tier === 'critical';
}
