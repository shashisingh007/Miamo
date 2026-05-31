import { describe, it, expect } from 'vitest';
import { topReasonChips } from '../reasonChips';
import type { ExplainReport } from '../explain';

const baseReport: ExplainReport = {
  algo: 'forYouV6', cacheHit: false, finalScore: 78, fatiguePenalty: 0,
  rows: [
    { key: 'interestsOverlap', kind: 'ingredient', value: 0.8, weight: 0.18, contribution: 14.4 },
    { key: 'vibeAlignment',    kind: 'ingredient', value: 0.5, weight: 0.15, contribution: 7.5 },
    { key: 'distanceFit',      kind: 'ingredient', value: 0.2, weight: 0.05, contribution: 1.0 },
    { key: 'regretPenalty',    kind: 'adjustment', value: -3,  weight: 1,    contribution: -3 },
  ],
};

describe('topReasonChips', () => {
  it('returns top-3 by absolute contribution by default', () => {
    const chips = topReasonChips(baseReport);
    expect(chips).toHaveLength(3);
    expect(chips[0].key).toBe('interestsOverlap');
    expect(chips[1].key).toBe('vibeAlignment');
    expect(chips[2].key).toBe('regretPenalty'); // |\u22123| > 1
  });

  it('tags negative contributions as warn, positive as positive', () => {
    const chips = topReasonChips(baseReport);
    expect(chips[0].tone).toBe('positive');
    const warn = chips.find((c) => c.key === 'regretPenalty');
    expect(warn?.tone).toBe('warn');
  });

  it('uses default labels for known v6 keys', () => {
    const chips = topReasonChips(baseReport);
    expect(chips.find((c) => c.key === 'interestsOverlap')?.label).toBe('Shared interests');
  });

  it('respects label overrides', () => {
    const chips = topReasonChips(baseReport, { labels: { interestsOverlap: 'Same hobbies' } });
    expect(chips[0].label).toBe('Same hobbies');
  });

  it('positiveOnly drops warn chips', () => {
    const chips = topReasonChips(baseReport, { positiveOnly: true });
    expect(chips.every((c) => c.tone === 'positive')).toBe(true);
    expect(chips.find((c) => c.key === 'regretPenalty')).toBeUndefined();
  });

  it('honours topN', () => {
    expect(topReasonChips(baseReport, { topN: 1 })).toHaveLength(1);
    expect(topReasonChips(baseReport, { topN: 10 })).toHaveLength(4);
  });

  it('drops zero-contribution rows', () => {
    const r: ExplainReport = {
      ...baseReport,
      rows: [...baseReport.rows, { key: 'noop', kind: 'ingredient', value: 0, weight: 0.1, contribution: 0 }],
    };
    const chips = topReasonChips(r, { topN: 10 });
    expect(chips.find((c) => c.key === 'noop')).toBeUndefined();
  });

  it('humanises unknown keys when no label provided', () => {
    const r: ExplainReport = {
      ...baseReport,
      rows: [{ key: 'someNewSignal', kind: 'ingredient', value: 1, weight: 0.1, contribution: 10 }],
    };
    const chips = topReasonChips(r);
    expect(chips[0].label).toBe('Some New Signal');
  });
});
