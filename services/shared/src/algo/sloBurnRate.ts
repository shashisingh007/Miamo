/**
 * sloBurnRate \u2014 Phase 18 SLO error-budget burn-rate calculator (pure).
 *
 * Google SRE multi-window burn rate. Given good/bad event counts over
 * short and long windows, plus an SLO target (e.g. 0.999 = 99.9%),
 * returns the burn rate and recommends an alert severity.
 *
 *   burnRate = (bad / total) / (1 - sloTarget)
 *
 * `burnRate=1` means we are exactly consuming the error budget at its
 * sustainable rate; >2 short-window indicates fast burn (page),
 * >1 long-window indicates slow burn (ticket).
 */
export type WindowCounts = { good: number; bad: number };

export type BurnRateInput = {
  sloTarget: number;            // 0..1 (e.g. 0.999)
  short: WindowCounts;
  long: WindowCounts;
  shortFastThreshold?: number;  // default 14 (1h fast-burn from SRE workbook)
  longSlowThreshold?: number;   // default 1
};

export type BurnRateResult = {
  shortBurn: number;
  longBurn: number;
  severity: 'ok' | 'ticket' | 'page';
};

function burn(counts: WindowCounts, sloTarget: number): number {
  const total = counts.good + counts.bad;
  if (total <= 0) return 0;
  const errBudget = 1 - sloTarget;
  if (errBudget <= 0) return counts.bad > 0 ? Number.POSITIVE_INFINITY : 0;
  return (counts.bad / total) / errBudget;
}

export function computeSloBurnRate(inp: BurnRateInput): BurnRateResult {
  const slo = Math.min(1, Math.max(0, inp.sloTarget));
  const shortBurn = burn(inp.short, slo);
  const longBurn = burn(inp.long, slo);
  const fast = inp.shortFastThreshold ?? 14;
  const slow = inp.longSlowThreshold ?? 1;
  let severity: BurnRateResult['severity'] = 'ok';
  if (shortBurn >= fast && longBurn >= slow) severity = 'page';
  else if (longBurn >= slow) severity = 'ticket';
  return { shortBurn, longBurn, severity };
}
