import { describe, it, expect } from 'vitest';
import { redactExplain } from '../explainRedact';
import type { ExplainReport } from '../explain';

const fullReport: ExplainReport = {
  algo: 'forYouV6',
  cacheHit: false,
  finalScore: 73.123456789,
  fatiguePenalty: 1.999999,
  rows: [
    { key: 'interestsOverlap', kind: 'ingredient', value: 0.811111, weight: 0.18, contribution: 14.6 },
    { key: 'vibeAlignment',    kind: 'ingredient', value: 0.5,      weight: 0.15, contribution: 7.5 },
    { key: 'distanceFit',      kind: 'ingredient', value: 0.123456, weight: 0.05, contribution: 0.6 },
    { key: 'regretPenalty',    kind: 'adjustment', value: -3, weight: 1, contribution: -3 },
  ],
};

describe('redactExplain', () => {
  it('rounds floats to 4dp', () => {
    const r = redactExplain(fullReport);
    expect(r.finalScore).toBe(73.1235);
    expect(r.fatiguePenalty).toBe(2);
    expect(r.rows[0].value).toBe(0.8111);
  });

  it('honours maxRows + sets truncated flag', () => {
    const r = redactExplain(fullReport, { maxRows: 2 });
    expect(r.rows).toHaveLength(2);
    expect(r.truncated).toBe(true);
  });

  it('does not mark truncated when rows fit', () => {
    const r = redactExplain(fullReport, { maxRows: 10 });
    expect(r.truncated).toBe(false);
  });

  it('drops rows below minContribution', () => {
    const r = redactExplain(fullReport, { minContribution: 5 });
    const keys = r.rows.map((x) => x.key);
    expect(keys).toContain('interestsOverlap');
    expect(keys).toContain('vibeAlignment');
    expect(keys).not.toContain('distanceFit');
  });

  it('attaches labels when provided', () => {
    const r = redactExplain(fullReport, {
      labels: { interestsOverlap: 'Shared interests', vibeAlignment: 'Same vibe' },
    });
    expect(r.rows[0].label).toBe('Shared interests');
    expect(r.rows[1].label).toBe('Same vibe');
    expect(r.rows[2].label).toBeUndefined();
  });

  it('preserves algo + cacheHit', () => {
    const r = redactExplain(fullReport);
    expect(r.algo).toBe('forYouV6');
    expect(r.cacheHit).toBe(false);
  });

  it('handles Infinity / NaN by rounding to 0', () => {
    const r = redactExplain({
      ...fullReport, finalScore: Number.NaN, fatiguePenalty: Infinity,
    });
    expect(r.finalScore).toBe(0);
    expect(r.fatiguePenalty).toBe(0);
  });

  it('does not mutate the input report', () => {
    const snap = JSON.stringify(fullReport);
    redactExplain(fullReport, { maxRows: 1, labels: { interestsOverlap: 'X' } });
    expect(JSON.stringify(fullReport)).toBe(snap);
  });
});
