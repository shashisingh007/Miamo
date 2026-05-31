/**
 * latencyBudget \u2014 Phase 18 per-operation latency budget tracker (pure).
 *
 * Lets a request define a hard wall-clock budget and incrementally
 * record sub-operation costs; reports remaining budget, percent burned,
 * and whether new dependent work should be skipped to stay within SLO.
 */
export type LatencyBudget = {
  startedAtMs: number;
  budgetMs: number;
  spentMs: number;
  segments: Array<{ name: string; ms: number }>;
};

export function startBudget(nowMs: number, budgetMs: number): LatencyBudget {
  return { startedAtMs: nowMs, budgetMs: Math.max(0, budgetMs), spentMs: 0, segments: [] };
}

export function recordSegment(budget: LatencyBudget, name: string, ms: number): LatencyBudget {
  if (!Number.isFinite(ms) || ms < 0) return budget;
  return {
    ...budget,
    spentMs: budget.spentMs + ms,
    segments: [...budget.segments, { name, ms }],
  };
}

export type BudgetStatus = {
  remainingMs: number;     // can be negative when over budget
  burnedPct: number;       // 0..1+, 1 = exhausted
  exhausted: boolean;
  shouldShed: boolean;     // true once >=80% burned
};

export function statusOf(budget: LatencyBudget, nowMs: number): BudgetStatus {
  const elapsedMs = Math.max(budget.spentMs, Math.max(0, nowMs - budget.startedAtMs));
  const remainingMs = budget.budgetMs - elapsedMs;
  const burnedPct = budget.budgetMs > 0 ? elapsedMs / budget.budgetMs : 1;
  return {
    remainingMs,
    burnedPct,
    exhausted: remainingMs <= 0,
    shouldShed: burnedPct >= 0.8,
  };
}

export function summarise(budget: LatencyBudget): { topSegmentName: string | null; topSegmentMs: number } {
  let topName: string | null = null;
  let topMs = 0;
  for (const s of budget.segments) {
    if (s.ms > topMs) { topMs = s.ms; topName = s.name; }
  }
  return { topSegmentName: topName, topSegmentMs: topMs };
}
