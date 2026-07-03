import { describe, it, expect } from 'vitest';
import {
  extractContextualRewards,
  rollupContextualRewards,
  bestContextWindow,
} from '../contextAwareRewards';
import type { ExplainReport } from '../explain';

const REPORT: ExplainReport = {
  baseScore: 0.5,
  finalScore: 0.62,
  rows: [
    { kind: 'ingredient', key: 'interestsOverlap', weight: 0.18, raw: 0.9, contribution: 0.162 },
    { kind: 'ingredient', key: 'vibeAlignment', weight: 0.15, raw: 0.6, contribution: 0.09 },
    { kind: 'ingredient', key: 'attentionFit', weight: 0.10, raw: 0.5, contribution: 0.05 },
  ],
};

describe('extractContextualRewards', () => {
  it('tags each sample with surface and hour from envelope ctx', () => {
    const out = extractContextualRewards({
      outcome: 'match',
      explain: REPORT,
      ctx: { sf: 'discover', lh: 22 },
    });
    expect(out.length).toBeGreaterThan(0);
    for (const s of out) {
      expect(s.surface).toBe('discover');
      expect(s.hourOfDay).toBe(22);
    }
  });

  it('falls back to "" / -1 when ctx missing', () => {
    const out = extractContextualRewards({ outcome: 'match', explain: REPORT });
    expect(out[0].surface).toBe('');
    expect(out[0].hourOfDay).toBe(-1);
  });

  it('clamps invalid hour to -1', () => {
    const out = extractContextualRewards({
      outcome: 'match',
      explain: REPORT,
      ctx: { lh: 99 },
    });
    expect(out[0].hourOfDay).toBe(-1);
  });

  it('returns empty for no_decision outcome', () => {
    const out = extractContextualRewards({
      outcome: 'no_decision',
      explain: REPORT,
      ctx: { sf: 'discover', lh: 10 },
    });
    expect(out).toHaveLength(0);
  });

  it('lowercases and truncates surface to 32 chars', () => {
    const out = extractContextualRewards({
      outcome: 'match',
      explain: REPORT,
      ctx: { sf: 'A'.repeat(50) },
    });
    expect(out[0].surface).toHaveLength(32);
    expect(out[0].surface).toBe('a'.repeat(32));
  });
});

describe('rollupContextualRewards', () => {
  it('aggregates samples by (surface, hour)', () => {
    const samples = [
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'discover', lh: 22 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'discover', lh: 22 } }),
      ...extractContextualRewards({ outcome: 'match', explain: REPORT, ctx: { sf: 'dtm', lh: 8 } }),
    ];
    const r = rollupContextualRewards(samples);
    const discover22 = r.get('discover|22');
    expect(discover22).toBeDefined();
    expect(discover22!.n).toBeGreaterThan(0);
    expect(discover22!.totalReward).toBeGreaterThan(0);
    expect(r.get('dtm|8')).toBeDefined();
  });

  it('best window picks the bucket with most net positive reward', () => {
    const samples = [
      ...extractContextualRewards({ outcome: 'mutual_quality_chat', explain: REPORT, ctx: { sf: 'discover', lh: 22 } }),
      ...extractContextualRewards({ outcome: 'regret', explain: REPORT, ctx: { sf: 'dtm', lh: 8 } }),
    ];
    const r = rollupContextualRewards(samples);
    const best = bestContextWindow(r);
    expect(best).not.toBeNull();
    expect(best!.surface).toBe('discover');
    expect(best!.hourOfDay).toBe(22);
  });

  it('best window returns null when no positive bucket exists', () => {
    const samples = extractContextualRewards({
      outcome: 'regret',
      explain: REPORT,
      ctx: { sf: 'dtm', lh: 8 },
    });
    const r = rollupContextualRewards(samples);
    expect(bestContextWindow(r)).toBeNull();
  });
});
