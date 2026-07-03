/**
 * dtmExplain \u2014 Phase 11 explain formatter for the v6 DTM scorer.
 *
 * Turns a `dtmAffinityV6` report plus per-topic gap data into a flat,
 * human-readable list that the gateway `/v1/explain/:targetId?dim=dtm`
 * endpoint renders for on-call. Pure: no DB.
 *
 * Mirrors the shape of `formatExplain` for forYouV6 so the UI can render
 * both with the same table component.
 */
import type { DtmAffinityV6Report } from './dtmV6';
import type { DtmVector } from './dtm';
import {
  DTM_TOPIC_COUNT,
  DTM_TOPIC_KEYS,
  DTM_TOPIC_LABELS,
  type DtmTopicKey,
} from './dtmTopics';

export type DtmExplainRow = {
  topic: DtmTopicKey;
  label: string;
  meScalar: number;
  candScalar: number;
  gap: number;
  /** weight applied (0..1; uniform = 1/DTM_TOPIC_COUNT when no profile). */
  weight: number;
  /** approximate contribution to the v6 score (weight * (1 - gap)). */
  contribution: number;
};

export type DtmExplainReport = {
  algo: 'dtmV6';
  finalScore: number;
  rawCosine: number;
  coverageWeight: number;
  sharedMassBonus: number;
  meStage: DtmAffinityV6Report['meStage'];
  candStage: DtmAffinityV6Report['candStage'];
  rows: DtmExplainRow[];
};

function normaliseWeights(
  weights: ReadonlyArray<number> | Float32Array | null | undefined,
): number[] {
  if (!weights || weights.length === 0) {
    return new Array(DTM_TOPIC_COUNT).fill(1 / DTM_TOPIC_COUNT);
  }
  const out: number[] = new Array(DTM_TOPIC_COUNT).fill(0);
  let sum = 0;
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const v = i < weights.length ? weights[i] : 0;
    const safe = Number.isFinite(v) && v > 0 ? v : 0;
    out[i] = safe;
    sum += safe;
  }
  if (sum === 0) return new Array(DTM_TOPIC_COUNT).fill(1 / DTM_TOPIC_COUNT);
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) out[i] /= sum;
  return out;
}

export function formatDtmExplain(
  report: DtmAffinityV6Report,
  me: DtmVector,
  cand: DtmVector,
  weights?: ReadonlyArray<number> | Float32Array | null,
): DtmExplainReport {
  const w = normaliseWeights(weights);
  const rows: DtmExplainRow[] = [];

  const n = Math.min(me.length, cand.length, DTM_TOPIC_COUNT);
  for (let i = 0; i < DTM_TOPIC_COUNT; i++) {
    const a = i < n ? me[i] : 0;
    const b = i < n ? cand[i] : 0;
    const gap = Math.abs(a - b);
    const topic = DTM_TOPIC_KEYS[i];
    rows.push({
      topic,
      label: DTM_TOPIC_LABELS[topic],
      meScalar: a,
      candScalar: b,
      gap,
      weight: w[i],
      contribution: w[i] * (1 - gap),
    });
  }

  rows.sort((x, y) => y.contribution - x.contribution);

  return {
    algo: 'dtmV6',
    finalScore: report.score,
    rawCosine: report.rawCosine,
    coverageWeight: report.coverageWeight,
    sharedMassBonus: report.sharedMassBonus,
    meStage: report.meStage,
    candStage: report.candStage,
    rows,
  };
}

export function dtmExplainToText(r: DtmExplainReport): string {
  const lines: string[] = [];
  lines.push(
    `algo=${r.algo} final=${r.finalScore.toFixed(3)} cos=${r.rawCosine.toFixed(3)} ` +
    `cov=${r.coverageWeight.toFixed(2)} bonus=${r.sharedMassBonus.toFixed(3)} ` +
    `me=${r.meStage} cand=${r.candStage}`,
  );
  lines.push(
    `${'topic'.padEnd(22)} ${'me'.padStart(7)} ${'cand'.padStart(7)} ` +
    `${'gap'.padStart(7)} ${'weight'.padStart(8)} ${'contrib'.padStart(9)}`,
  );
  for (const row of r.rows) {
    lines.push(
      `${row.label.padEnd(22)} ${row.meScalar.toFixed(3).padStart(7)} ` +
      `${row.candScalar.toFixed(3).padStart(7)} ${row.gap.toFixed(3).padStart(7)} ` +
      `${row.weight.toFixed(3).padStart(8)} ${row.contribution.toFixed(3).padStart(9)}`,
    );
  }
  return lines.join('\n');
}
