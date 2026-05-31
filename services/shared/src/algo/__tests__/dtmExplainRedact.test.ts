import { describe, it, expect } from 'vitest';
import { redactDtmExplain } from '../dtmExplainRedact';
import { formatDtmExplain } from '../dtmExplain';
import type { DtmAffinityV6Report } from '../dtmV6';

function v(arr: number[]): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) out[i] = arr[i];
  return out;
}

const report: DtmAffinityV6Report = {
  score: 0.823456789, rawCosine: 0.951234, coverageWeight: 0.75,
  sharedMassBonus: 0.043210987, meStage: 'sufficient', candStage: 'full',
};

describe('redactDtmExplain', () => {
  it('rounds top-level floats to 4dp', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const p = redactDtmExplain(e);
    expect(p.finalScore).toBeCloseTo(0.8235, 6);
    expect(p.sharedMassBonus).toBeCloseTo(0.0432, 6);
  });

  it('rounds per-row floats to 4dp', () => {
    const e = formatDtmExplain(report, v([0.123456789]), v([0.987654321]));
    const p = redactDtmExplain(e);
    for (const row of p.rows) {
      expect(row.meScalar).toBe(Number(row.meScalar.toFixed(4)));
      expect(row.candScalar).toBe(Number(row.candScalar.toFixed(4)));
      expect(row.gap).toBe(Number(row.gap.toFixed(4)));
    }
  });

  it('substitutes labels from the override map', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const p = redactDtmExplain(e, { labels: { values: 'Core beliefs' } });
    const valuesRow = p.rows.find((r) => r.topic === 'values');
    expect(valuesRow?.label).toBe('Core beliefs');
  });

  it('falls back to canonical label when no override', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const p = redactDtmExplain(e);
    const valuesRow = p.rows.find((r) => r.topic === 'values');
    expect(valuesRow?.label).toBe('Values');
  });

  it('respects maxRows and sets truncated flag', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const p = redactDtmExplain(e, { maxRows: 3 });
    expect(p.rows).toHaveLength(3);
    expect(p.truncated).toBe(true);
  });

  it('does not set truncated when within maxRows', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const p = redactDtmExplain(e, { maxRows: 100 });
    expect(p.truncated).toBe(false);
  });

  it('filters rows below minContribution', () => {
    const e = formatDtmExplain(report, v([0.5, 0, 0]), v([0.5, 0, 0]));
    const p = redactDtmExplain(e, { minContribution: 0.04 });
    for (const row of p.rows) expect(Math.abs(row.contribution)).toBeGreaterThanOrEqual(0.04);
  });

  it('does not mutate the input report', () => {
    const e = formatDtmExplain(report, v([0.5]), v([0.5]));
    const before = JSON.stringify(e);
    redactDtmExplain(e, { maxRows: 2, minContribution: 0.05 });
    expect(JSON.stringify(e)).toBe(before);
  });
});
