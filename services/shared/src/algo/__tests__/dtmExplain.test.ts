import { describe, it, expect } from 'vitest';
import { formatDtmExplain, dtmExplainToText } from '../dtmExplain';
import type { DtmAffinityV6Report } from '../dtmV6';

function v(arr: number[]): Float32Array {
  const out = new Float32Array(16);
  for (let i = 0; i < Math.min(arr.length, 16); i++) out[i] = arr[i];
  return out;
}

const baseReport: DtmAffinityV6Report = {
  score: 0.82,
  rawCosine: 0.95,
  coverageWeight: 0.75,
  sharedMassBonus: 0.04,
  meStage: 'sufficient',
  candStage: 'sufficient',
};

describe('formatDtmExplain', () => {
  it('produces exactly 16 rows (one per topic)', () => {
    const r = formatDtmExplain(baseReport, v([0.5, 0.5, 0.5, 0.5]), v([0.5, 0.5, 0.5, 0.5]));
    expect(r.rows).toHaveLength(16);
  });

  it('rows are sorted by contribution descending', () => {
    const r = formatDtmExplain(baseReport, v([1, 0, 0, 0]), v([1, 0, 0, 0]));
    for (let i = 1; i < r.rows.length; i++) {
      expect(r.rows[i - 1].contribution).toBeGreaterThanOrEqual(r.rows[i].contribution);
    }
  });

  it('falls back to uniform weights when none provided', () => {
    const r = formatDtmExplain(baseReport, v([0.5]), v([0.5]));
    expect(r.rows[0].weight).toBeCloseTo(1 / 16, 6);
  });

  it('normalises supplied weight profile to sum=1.0', () => {
    const weights = [2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const r = formatDtmExplain(baseReport, v([0.5]), v([0.5]), weights);
    const sum = r.rows.reduce((s, row) => s + row.weight, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('zero/negative weights are sanitised', () => {
    const r = formatDtmExplain(baseReport, v([0.5]), v([0.5]), [NaN, -1, 0]);
    const sum = r.rows.reduce((s, row) => s + row.weight, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('propagates stages and scores from report', () => {
    const r = formatDtmExplain(baseReport, v([0.5]), v([0.5]));
    expect(r.finalScore).toBe(0.82);
    expect(r.rawCosine).toBe(0.95);
    expect(r.meStage).toBe('sufficient');
  });
});

describe('dtmExplainToText', () => {
  it('renders a multi-line table with header', () => {
    const r = formatDtmExplain(baseReport, v([0.5]), v([0.5]));
    const text = dtmExplainToText(r);
    expect(text.split('\n').length).toBeGreaterThanOrEqual(18); // header + col header + 16 rows
    expect(text).toMatch(/algo=dtmV6/);
    expect(text).toMatch(/topic/);
  });
});
