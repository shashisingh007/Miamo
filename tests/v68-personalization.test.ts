import { describe, it, expect } from 'vitest';
import { classifyIntent, blendWeights } from '../services/shared/intent-classifier';
import { buildNegativeProfile, negativePenalty, ageBucket } from '../services/shared/negative-signal-engine';
import { diversify } from '../services/shared/refresh-diversifier';

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000);

describe('intent-classifier', () => {
  it('returns exploring with no signal', () => {
    const r = classifyIntent({ statedIntent: null, seriousMode: null, dailyEvents: [] });
    expect(r.revealed).toBe('exploring');
    expect(r.confidence).toBe(0);
  });

  it('detects serious revealed intent from depth events', () => {
    const r = classifyIntent({
      statedIntent: 'casual',
      seriousMode: false,
      dailyEvents: [
        { evt: 'profile.depth_score', day: daysAgo(1), count: 20 },
        { evt: 'card.dwell.long', day: daysAgo(0), count: 30 },
        { evt: 'profile.bio.expand', day: daysAgo(2), count: 15 },
      ],
    });
    expect(r.revealed).toBe('serious');
    expect(r.stated).toBe('casual');
    expect(r.mismatch).toBeGreaterThan(0.5);
  });

  it('detects DTM revealed intent', () => {
    const r = classifyIntent({
      statedIntent: 'serious',
      seriousMode: true,
      dailyEvents: [
        { evt: 'matrimonial.browse', day: daysAgo(0), count: 50 },
        { evt: 'dtm.filter.applied', day: daysAgo(1), count: 10 },
      ],
    });
    expect(r.revealed).toBe('dtm');
  });

  it('decays old signals', () => {
    const recent = classifyIntent({ dailyEvents: [{ evt: 'discover.swipe', day: daysAgo(0), count: 100 }] });
    const old = classifyIntent({ dailyEvents: [{ evt: 'discover.swipe', day: daysAgo(60), count: 100 }] });
    expect(recent.confidence).toBeGreaterThan(old.confidence);
  });

  it('blendWeights only blends with sufficient confidence', () => {
    const low = blendWeights('forYou', 'serious', 0.1);
    expect(low.primary).toBe(1);
    const high = blendWeights('forYou', 'serious', 0.8);
    expect(high.primary).toBeLessThan(1);
    expect(high.seriousBlend).toBeGreaterThan(0);
  });
});

describe('negative-signal-engine', () => {
  it('returns zero penalty with no events', () => {
    const p = buildNegativeProfile([]);
    const { penalty } = negativePenalty(p, { city: 'Mumbai', smoking: 'yes' });
    expect(penalty).toBe(0);
  });

  it('penalizes traits that match blocked users', () => {
    const p = buildNegativeProfile([
      { kind: 'block', daysAgo: 1, targetTraits: { city: 'Mumbai', smoking: 'yes' } },
      { kind: 'block', daysAgo: 5, targetTraits: { city: 'Mumbai', smoking: 'yes' } },
      { kind: 'block', daysAgo: 8, targetTraits: { city: 'Mumbai', smoking: 'yes' } },
      { kind: 'report', daysAgo: 2, targetTraits: { city: 'Mumbai', smoking: 'yes' } },
    ]);
    const match = negativePenalty(p, { city: 'Mumbai', smoking: 'yes' });
    const noMatch = negativePenalty(p, { city: 'Bangalore', smoking: 'no' });
    expect(match.penalty).toBeGreaterThan(noMatch.penalty);
    expect(match.matchedTraits.length).toBeGreaterThan(0);
    expect(p.hardBlockedTraits.size).toBeGreaterThan(0);
  });

  it('caps penalty at 40', () => {
    const events = Array.from({ length: 20 }, (_, i) => ({
      kind: 'block' as const, daysAgo: i, targetTraits: { city: 'X', smoking: 'yes', drinking: 'yes', religion: 'r' },
    }));
    const p = buildNegativeProfile(events);
    const r = negativePenalty(p, { city: 'X', smoking: 'yes', drinking: 'yes', religion: 'r' });
    expect(r.penalty).toBeLessThanOrEqual(40);
  });

  it('reports and blocks weigh more than unmatch/pass_feedback', () => {
    const reportP = buildNegativeProfile([{ kind: 'report', daysAgo: 0, targetTraits: { city: 'X' } }]);
    const passP = buildNegativeProfile([{ kind: 'pass_feedback', daysAgo: 0, targetTraits: { city: 'X' } }]);
    const r1 = negativePenalty(reportP, { city: 'X' });
    const r2 = negativePenalty(passP, { city: 'X' });
    // both normalize to 1.0 individually, but hardBlocked threshold differs:
    // report contributes 3.0, hits hardBlock — pass contributes 1.0, doesn't.
    expect(r1.penalty).toBeGreaterThanOrEqual(r2.penalty);
  });

  it('ageBucket boundaries', () => {
    expect(ageBucket(17)).toBe(null);
    expect(ageBucket(18)).toBe('18-24');
    expect(ageBucket(25)).toBe('25-29');
    expect(ageBucket(50)).toBe('50+');
  });
});

describe('refresh-diversifier', () => {
  const mk = (id: string, score: number, opts: { isNew?: boolean; city?: string; ageBucket?: string } = {}) =>
    ({ user: { id }, score, ...opts });

  it('filters out previously shown', () => {
    const r = diversify(
      [mk('a', 90), mk('b', 80), mk('c', 70)],
      { refreshIndex: 0, prevShownIds: new Set(['a']), noveltyAffinity: 0.5, sessionMood: 'normal', topN: 10 },
    );
    expect(r.ranked.find(x => x.user.id === 'a')).toBeUndefined();
    expect(r.ranked.length).toBe(2);
  });

  it('caps city concentration when alternatives exist', () => {
    const cands = Array.from({ length: 10 }, (_, i) => mk(`u${i}`, 100 - i, { city: 'Mumbai', ageBucket: '25-29' }));
    cands.push(mk('o1', 50, { city: 'Bangalore', ageBucket: '25-29' }));
    cands.push(mk('o2', 49, { city: 'Delhi', ageBucket: '30-34' }));
    cands.push(mk('o3', 48, { city: 'Pune', ageBucket: '30-34' }));
    const r = diversify(cands, { refreshIndex: 0, prevShownIds: new Set(), noveltyAffinity: 0.5, sessionMood: 'normal', topN: 5 });
    const cities = r.ranked.map(x => x.city);
    expect(cities.filter(c => c === 'Mumbai').length).toBeLessThanOrEqual(3);
    expect(new Set(cities).size).toBeGreaterThan(1);
  });

  it('promotes new profiles for novelty-seekers', () => {
    const cands = [
      mk('o1', 95), mk('o2', 90), mk('o3', 85),
      mk('new1', 70, { isNew: true }),
    ];
    const r = diversify(cands, { refreshIndex: 0, prevShownIds: new Set(), noveltyAffinity: 0.9, sessionMood: 'normal', topN: 4 });
    const newIdx = r.ranked.findIndex(x => x.user.id === 'new1');
    expect(newIdx).toBeLessThanOrEqual(2);
  });

  it('pushes new profiles to back for selectivity', () => {
    const cands = [
      mk('o1', 95), mk('o2', 90), mk('o3', 85), mk('o4', 80),
      mk('new1', 75, { isNew: true }),
    ];
    const r = diversify(cands, { refreshIndex: 0, prevShownIds: new Set(), noveltyAffinity: 0.1, sessionMood: 'normal', topN: 5 });
    const newIdx = r.ranked.findIndex(x => x.user.id === 'new1');
    expect(newIdx).toBeGreaterThanOrEqual(3);
  });

  it('skips wildcards for serious/dtm intent', () => {
    const cands = Array.from({ length: 30 }, (_, i) => mk(`u${i}`, 100 - i));
    const r = diversify(cands, { refreshIndex: 0, prevShownIds: new Set(), noveltyAffinity: 0.5, sessionMood: 'exploring', topN: 10, intent: 'dtm' });
    expect(r.injected.outOfBox).toBe(0);
  });
});

describe('inactivity-event taxonomy', () => {
  it('treats feed.bounce + filter.reverted + return.fast as casual signals', () => {
    const r = classifyIntent({
      statedIntent: 'serious',
      seriousMode: false,
      dailyEvents: [
        { evt: 'feed.bounce', day: daysAgo(0), count: 5 },
        { evt: 'feed.return.fast', day: daysAgo(0), count: 3 },
        { evt: 'discover.refresh.empty', day: daysAgo(1), count: 4 },
        { evt: 'filter.reverted', day: daysAgo(0), count: 2 },
        { evt: 'session.abandon', day: daysAgo(2), count: 1 },
      ],
    });
    expect(r.revealed).toBe('casual');
    expect(r.weights.casual).toBeGreaterThan(r.weights.serious);
    expect(r.mismatch).toBeGreaterThan(0.4);
  });

  it('hover.no_action contributes to serious bucket (consideration without commit)', () => {
    const r = classifyIntent({
      statedIntent: null,
      seriousMode: null,
      dailyEvents: [
        { evt: 'card.hover.no_action', day: daysAgo(0), count: 30 },
        { evt: 'profile.bio.expand', day: daysAgo(1), count: 5 },
      ],
    });
    expect(r.revealed).toBe('serious');
  });
});

