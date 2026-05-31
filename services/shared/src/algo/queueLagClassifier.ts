/**
 * queueLagClassifier \u2014 Phase 18 message-queue lag severity (pure).
 *
 * Given current backlog size, consumer throughput (msgs/sec), and target
 * SLO, derive estimated drain time and a severity verdict.
 *
 *   etaSeconds = backlog / max(throughput, epsilon)
 *
 * Severity vs `targetEtaSeconds` (default 60s):
 *   ok       eta <= target
 *   warn     target < eta <= 2*target
 *   degraded 2*target < eta <= 5*target
 *   critical eta > 5*target  OR throughput <= 0 with backlog > 0
 */

export type QueueLagInput = {
  backlog: number;
  throughputPerSec: number;
  targetEtaSeconds?: number; // default 60
};

export type QueueLagSeverity = 'ok' | 'warn' | 'degraded' | 'critical';

export type QueueLagResult = {
  etaSeconds: number;
  severity: QueueLagSeverity;
  stalled: boolean;
};

export function classifyQueueLag(i: QueueLagInput): QueueLagResult {
  const backlog = Math.max(0, Number.isFinite(i.backlog) ? i.backlog : 0);
  const tp = Number.isFinite(i.throughputPerSec) ? i.throughputPerSec : 0;
  const target = Math.max(1, i.targetEtaSeconds ?? 60);

  if (backlog === 0) {
    return { etaSeconds: 0, severity: 'ok', stalled: false };
  }
  if (tp <= 0) {
    return { etaSeconds: Infinity, severity: 'critical', stalled: true };
  }
  const eta = backlog / tp;
  let severity: QueueLagSeverity = 'ok';
  if (eta > 5 * target) severity = 'critical';
  else if (eta > 2 * target) severity = 'degraded';
  else if (eta > target) severity = 'warn';
  return { etaSeconds: eta, severity, stalled: false };
}
