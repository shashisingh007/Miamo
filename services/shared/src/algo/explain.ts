/**
 * v6 explain formatter — Phase 11 debug surface.
 *
 * Turns a v6 `Explain` record into a flat, human-readable list that the
 * gateway `/v1/explain/:targetId` endpoint can render. Pure: no DB.
 *
 * Output shape is intentionally tabular so a curl + jq pipeline stays
 * readable for on-call investigations.
 */
import type { Explain } from './forYou';

export type ExplainRow = {
  /** ingredient or adjustment name. */
  key: string;
  /** numeric value (0..1 for ingredients, signed for adjustments). */
  value: number;
  /** weight applied (0..1 for ingredients, 1 for adjustments). */
  weight: number;
  /** contribution to the final score (value * weight, on the 0..100 scale). */
  contribution: number;
  /** 'ingredient' (weighted compose) or 'adjustment' (additive post-compose). */
  kind: 'ingredient' | 'adjustment';
};

export type ExplainReport = {
  algo: string;
  cacheHit: boolean;
  finalScore: number;
  fatiguePenalty: number;
  rows: ExplainRow[];
};

const ADJUSTMENT_KEYS = new Set([
  'regretPenalty', 'repeatPassPenalty', 'returnBoost', 'windowShoppingDamp', 'priorBoost',
]);

export function formatExplain(e: Explain): ExplainReport {
  const rows: ExplainRow[] = [];

  for (const [key, valueAny] of Object.entries(e.breakdown)) {
    if (valueAny == null) continue;
    const value = Number(valueAny);
    if (!Number.isFinite(value)) continue;

    if (ADJUSTMENT_KEYS.has(key)) {
      rows.push({
        key, value, weight: 1, contribution: value, kind: 'adjustment',
      });
    } else {
      const w = (e.weights as Record<string, number>)[key] ?? 0;
      rows.push({
        key, value, weight: w, contribution: value * w * 100, kind: 'ingredient',
      });
    }
  }

  rows.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  return {
    algo: e.algo,
    cacheHit: e.cacheHit,
    finalScore: e.finalScore,
    fatiguePenalty: e.fatiguePenalty,
    rows,
  };
}

/** Pretty-print to a fixed-width multi-line string for curl + on-call use. */
export function explainToText(r: ExplainReport): string {
  const lines: string[] = [];
  lines.push(`algo=${r.algo} cacheHit=${r.cacheHit} final=${r.finalScore.toFixed(2)} fatigue=-${r.fatiguePenalty.toFixed(2)}`);
  lines.push(`${'key'.padEnd(28)} ${'value'.padStart(8)} ${'weight'.padStart(8)} ${'contrib'.padStart(10)}  kind`);
  for (const row of r.rows) {
    lines.push(
      `${row.key.padEnd(28)} ${row.value.toFixed(3).padStart(8)} ${row.weight.toFixed(3).padStart(8)} ${row.contribution.toFixed(2).padStart(10)}  ${row.kind}`,
    );
  }
  return lines.join('\n');
}
