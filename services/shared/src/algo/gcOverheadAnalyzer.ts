/**
 * gcOverheadAnalyzer \u2014 Phase 18 heap / GC pressure classifier (pure).
 *
 * Given total GC time and observation-window duration, returns the GC
 * overhead percentage and a severity verdict you can wire to alerting.
 *
 *   overheadPct = (gcMs / windowMs) * 100
 *
 *   severity:
 *     ok       overheadPct < 2
 *     warn     2  <= overheadPct < 5
 *     degraded 5  <= overheadPct < 10
 *     critical 10 <= overheadPct
 *
 * Optional heap fields refine the verdict \u2014 if `heapUsedBytes / heapLimitBytes`
 * exceeds 0.9 it bumps severity by at least one notch.
 */

export type GcOverheadInput = {
  gcMs: number;
  windowMs: number;
  heapUsedBytes?: number;
  heapLimitBytes?: number;
};

export type GcSeverity = 'ok' | 'warn' | 'degraded' | 'critical';

export type GcOverheadResult = {
  overheadPct: number;
  heapPressure: number; // 0..1 (or 0 if not provided)
  severity: GcSeverity;
};

const ORDER: GcSeverity[] = ['ok', 'warn', 'degraded', 'critical'];

function bump(s: GcSeverity, by: number): GcSeverity {
  const idx = Math.min(ORDER.length - 1, ORDER.indexOf(s) + by);
  return ORDER[idx];
}

export function analyzeGcOverhead(i: GcOverheadInput): GcOverheadResult {
  const gc = Math.max(0, Number.isFinite(i.gcMs) ? i.gcMs : 0);
  const win = Math.max(0, Number.isFinite(i.windowMs) ? i.windowMs : 0);
  const pct = win > 0 ? (gc / win) * 100 : 0;

  let severity: GcSeverity = 'ok';
  if (pct >= 10) severity = 'critical';
  else if (pct >= 5) severity = 'degraded';
  else if (pct >= 2) severity = 'warn';

  let heapPressure = 0;
  if (
    typeof i.heapUsedBytes === 'number' &&
    typeof i.heapLimitBytes === 'number' &&
    i.heapLimitBytes > 0 &&
    Number.isFinite(i.heapUsedBytes) &&
    Number.isFinite(i.heapLimitBytes)
  ) {
    heapPressure = Math.max(0, Math.min(1, i.heapUsedBytes / i.heapLimitBytes));
    if (heapPressure >= 0.9) severity = bump(severity, 1);
  }

  return { overheadPct: pct, heapPressure, severity };
}
