/**
 * dtmExplainRedact \u2014 Phase 11/Phase 20 DTM analog of `explainRedact`.
 *
 * Strips internal-only fields, rounds floats to 4 dp, optionally substitutes
 * labels from a caller-supplied map, filters by minimum contribution, and
 * caps row count. Pure: does not mutate the input.
 */
import type { DtmExplainReport, DtmExplainRow } from './dtmExplain';
import type { DtmTopicKey } from './dtmTopics';

export type PublicDtmExplainRow = {
  topic: DtmTopicKey;
  label: string;
  meScalar: number;
  candScalar: number;
  gap: number;
  weight: number;
  contribution: number;
};

export type PublicDtmExplainReport = {
  algo: 'dtmV6';
  finalScore: number;
  rawCosine: number;
  coverageWeight: number;
  sharedMassBonus: number;
  meStage: DtmExplainReport['meStage'];
  candStage: DtmExplainReport['candStage'];
  rows: PublicDtmExplainRow[];
  truncated: boolean;
};

export type RedactDtmExplainOptions = {
  /** Per-topic label override. Falls back to the canonical label. */
  labels?: Partial<Record<DtmTopicKey, string>>;
  /** Maximum rows to keep (after filtering). Default Infinity. */
  maxRows?: number;
  /** Minimum |contribution| required to keep a row. Default 0. */
  minContribution?: number;
};

const ROUND_DP = 4;

function round(x: number): number {
  if (!Number.isFinite(x)) return 0;
  const m = Math.pow(10, ROUND_DP);
  return Math.round(x * m) / m;
}

function projectRow(
  r: DtmExplainRow,
  labels: Partial<Record<DtmTopicKey, string>>,
): PublicDtmExplainRow {
  return {
    topic: r.topic,
    label: labels[r.topic] ?? r.label,
    meScalar: round(r.meScalar),
    candScalar: round(r.candScalar),
    gap: round(r.gap),
    weight: round(r.weight),
    contribution: round(r.contribution),
  };
}

export function redactDtmExplain(
  report: DtmExplainReport,
  opts: RedactDtmExplainOptions = {},
): PublicDtmExplainReport {
  const maxRows         = opts.maxRows ?? Infinity;
  const minContribution = opts.minContribution ?? 0;
  const labels          = opts.labels ?? {};

  const filtered = report.rows.filter(
    (r) => Math.abs(r.contribution) >= minContribution,
  );
  const truncated = filtered.length > maxRows;
  const kept = filtered.slice(0, maxRows);

  return {
    algo: 'dtmV6',
    finalScore: round(report.finalScore),
    rawCosine: round(report.rawCosine),
    coverageWeight: round(report.coverageWeight),
    sharedMassBonus: round(report.sharedMassBonus),
    meStage: report.meStage,
    candStage: report.candStage,
    truncated,
    rows: kept.map((r) => projectRow(r, labels)),
  };
}
