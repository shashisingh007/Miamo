/**
 * connectionPoolStats \u2014 Phase 18 connection pool saturation classifier (pure).
 *
 * Given live counters from a DB / HTTP connection pool, derive utilisation
 * ratios, a saturation severity, and a recommendation for the operator.
 *
 *   utilisation       = active / max
 *   waitPressure      = waiting / max
 *
 * Severity ladder:
 *   ok       util < 0.7  AND no waiters
 *   warn     util \u2265 0.7  AND no waiters
 *   degraded util \u2265 0.9  OR  waiters > 0
 *   critical util \u2265 1.0  OR  waitPressure \u2265 0.5
 */

export type ConnectionPoolInput = {
  active: number;
  idle: number;
  waiting: number;
  max: number;
};

export type PoolSeverity = 'ok' | 'warn' | 'degraded' | 'critical';

export type ConnectionPoolStats = {
  total: number;
  utilisation: number;   // 0..\u221E (will be >1 if active > max)
  idleRatio: number;     // 0..1
  waitPressure: number;  // 0..\u221E
  severity: PoolSeverity;
  saturated: boolean;
};

function safeRatio(n: number, d: number): number {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return 0;
  return n / d;
}

export function computeConnectionPoolStats(i: ConnectionPoolInput): ConnectionPoolStats {
  const active = Math.max(0, Number.isFinite(i.active) ? i.active : 0);
  const idle = Math.max(0, Number.isFinite(i.idle) ? i.idle : 0);
  const waiting = Math.max(0, Number.isFinite(i.waiting) ? i.waiting : 0);
  const max = Math.max(0, Number.isFinite(i.max) ? i.max : 0);

  const util = safeRatio(active, max);
  const idleRatio = safeRatio(idle, max);
  const waitPressure = safeRatio(waiting, max);

  let severity: PoolSeverity = 'ok';
  if (util >= 1 || waitPressure >= 0.5) severity = 'critical';
  else if (util >= 0.9 || waiting > 0) severity = 'degraded';
  else if (util >= 0.7) severity = 'warn';

  return {
    total: active + idle,
    utilisation: util,
    idleRatio,
    waitPressure,
    severity,
    saturated: severity === 'critical',
  };
}
