import { describe, it, expect } from 'vitest';
import { formatExplain, explainToText } from '../explain';
import { scoreForYouV6 } from '../forYouV6';
import type { FeatureRow, PairBehavior } from '../signals';

function vec(n: number, fn: (i: number) => number): Float32Array {
  const v = new Float32Array(n);
  for (let i = 0; i < n; i++) v[i] = fn(i);
  let s = 0; for (const x of v) s += x * x;
  const inv = s > 0 ? 1 / Math.sqrt(s) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

function feature(): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0,
    replyPersonaP50Ms: 60_000, responseRate: 0.7,
    interestVec: vec(32, () => 0.5),
    vibeEmb: vec(64, () => 0.3),
    behaviorEmb: vec(64, () => 0.2),
    peakHours: null,
    dwellHistogram: [0.1, 0.2, 0.3, 0.3, 0.1],
    hesitationP50Ms: 4500,
  };
}

const BASE = {
  myIntent: 'serious' as string | null, candIntent: 'serious' as string | null,
  myAge: 28 as number | null, candAge: 28 as number | null, cityKm: 5 as number | null,
  myInterests: ['hiking'], candInterests: ['hiking'],
  pair: undefined, priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
};

describe('formatExplain', () => {
  it('produces one row per non-null breakdown key', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    const r = formatExplain(out.explain);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((row) => Number.isFinite(row.contribution))).toBe(true);
  });

  it('rows are sorted by |contribution| descending', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    const r = formatExplain(out.explain);
    for (let i = 1; i < r.rows.length; i++) {
      expect(Math.abs(r.rows[i - 1].contribution)).toBeGreaterThanOrEqual(Math.abs(r.rows[i].contribution));
    }
  });

  it('classifies adjustments separately from ingredients', () => {
    const behavior: PairBehavior = { regrets: 3, repeatPasses: 0, returns: 2, maxDwellMs: 0 };
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature(), behavior });
    const r = formatExplain(out.explain);
    const adj = r.rows.filter((row) => row.kind === 'adjustment');
    expect(adj.some((row) => row.key === 'regretPenalty')).toBe(true);
    expect(adj.some((row) => row.key === 'returnBoost')).toBe(true);
  });

  it('preserves algo, cacheHit, finalScore, fatigue fields', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    const r = formatExplain(out.explain);
    expect(r.algo).toBe('forYouV6');
    expect(r.cacheHit).toBe(false);
    expect(r.finalScore).toBe(out.score);
  });

  it('skips null breakdown values', () => {
    const out = scoreForYouV6({ ...BASE, me: null, cand: null });
    const r = formatExplain(out.explain);
    for (const row of r.rows) expect(row.value).not.toBeNaN();
  });
});

describe('explainToText', () => {
  it('returns a multi-line string with a header row', () => {
    const out = scoreForYouV6({ ...BASE, me: feature(), cand: feature() });
    const text = explainToText(formatExplain(out.explain));
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(3);
    expect(lines[0]).toContain('algo=forYouV6');
    expect(lines[1]).toContain('key');
    expect(lines[1]).toContain('contrib');
  });
});
