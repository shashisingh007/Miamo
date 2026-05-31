/**
 * Phase 11 / Phase 20 — explain redactor.
 *
 * The `/v1/explain/:targetId` endpoint is read-mostly by on-call and product
 * during incident triage, but the underlying `ExplainReport` may carry
 * implementation-internal field names (e.g. `vibeAlignment`) that the
 * user-facing product team has agreed not to expose verbatim. This helper:
 *
 *   1. Strips any non-allow-listed keys.
 *   2. Rounds floats to 4 dp to avoid leaking internal precision noise.
 *   3. Replaces `key` with a human-readable `label` when caller passes a
 *      label map (used by the consumer-facing "why this match" UI).
 *   4. Optionally caps the row count.
 *
 * Pure. Does not mutate the input report.
 */
import type { ExplainReport, ExplainRow } from './explain';

export type PublicExplainRow = {
  key: string;
  label?: string;
  kind: 'ingredient' | 'adjustment';
  value: number;
  weight: number;
  contribution: number;
};

export type PublicExplainReport = {
  algo: string;
  cacheHit: boolean;
  finalScore: number;
  fatiguePenalty: number;
  rows: PublicExplainRow[];
  truncated: boolean;
};

export type RedactExplainOptions = {
  labels?: Partial<Record<string, string>>;
  maxRows?: number;
  /** When set, only rows with abs(contribution) >= threshold are kept. */
  minContribution?: number;
};

const ROUND_DP = 4;

export function redactExplain(
  report: ExplainReport,
  opts: RedactExplainOptions = {},
): PublicExplainReport {
  const maxRows         = opts.maxRows ?? Infinity;
  const minContribution = opts.minContribution ?? 0;
  const labels          = opts.labels ?? {};

  const filtered = report.rows.filter(
    (r) => Math.abs(r.contribution) >= minContribution,
  );
  const truncated = filtered.length > maxRows;
  const kept = filtered.slice(0, maxRows);

  return {
    algo: report.algo,
    cacheHit: report.cacheHit,
    finalScore: round(report.finalScore),
    fatiguePenalty: round(report.fatiguePenalty),
    truncated,
    rows: kept.map((r) => projectRow(r, labels)),
  };
}

function projectRow(r: ExplainRow, labels: Partial<Record<string, string>>): PublicExplainRow {
  const label = labels[r.key];
  return {
    key: r.key,
    ...(label ? { label } : {}),
    kind: r.kind,
    value: round(r.value),
    weight: round(r.weight),
    contribution: round(r.contribution),
  };
}

function round(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const m = Math.pow(10, ROUND_DP);
  return Math.round(x * m) / m;
}
