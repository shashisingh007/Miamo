import { describe, it, expect } from 'vitest';
import { suggestMessages, scoreSuggestion } from '../messageSuggest';
import { pickBeats, scoreBeat } from '../beats';
import { nextNotifyAt } from '../notifyTiming';
import { rerankSearch } from '../searchAugment';
import { rerankFeed } from '../feedAugment';
import { postImpressionPenalty } from '../postImpressionRerank';
import { pickAiMatch } from '../aiMatch';
import type { FeatureRow } from '../signals';

function f(over: Partial<FeatureRow> = {}): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0.4,
    replyPersonaP50Ms: 60_000, responseRate: 0.7,
    interestVec: null, vibeEmb: null, behaviorEmb: null, peakHours: null, ...over,
  };
}

describe('messageSuggest', () => {
  it('reader cand → open_question or callback_to_last top', () => {
    const top = suggestMessages({
      candFeatures: f({ attentionProfile: 'reader' }),
      lastInboundKind: 'text', ageSec: {}, myIntent: 'serious', candIntent: 'serious', nowHour: 20,
    }, 1);
    expect(['open_question', 'callback_to_last', 'date_invite']).toContain(top[0].kind);
  });
  it('voice inbound → voice_invite ranks well', () => {
    const top = suggestMessages({
      candFeatures: f({ attentionProfile: 'voice-first' }),
      lastInboundKind: 'voice', ageSec: {}, myIntent: 'casual', candIntent: 'casual', nowHour: 20,
    }, 3);
    expect(top.map(t => t.kind)).toContain('voice_invite');
  });
  it('null candFeatures → still returns scored list', () => {
    const r = suggestMessages({
      candFeatures: null, lastInboundKind: null, ageSec: {}, myIntent: null, candIntent: null, nowHour: 12,
    }, 3);
    expect(r.length).toBe(3);
  });
  it('explain shape', () => {
    const r = scoreSuggestion('playful', {
      candFeatures: f(), lastInboundKind: 'gif', ageSec: {}, myIntent: null, candIntent: null, nowHour: 12,
    });
    expect(Object.keys(r.why).sort()).toEqual(['attentionFit','chronoFit','intentFit','noveltyFit','recencyFit'].sort());
  });
});

describe('beats', () => {
  const catalog = [
    { id: 'a', genres: ['lofi','jazz'], bpm: 90, recentPlays: 500 },
    { id: 'b', genres: ['edm'], bpm: 128, recentPlays: 100 },
    { id: 'c', genres: ['lofi'], bpm: 70, recentPlays: 10 },
  ];
  it('jazz-lover gets jazz beat top', () => {
    const top = pickBeats(catalog, {
      candFeatures: f(), candPreferredGenres: ['jazz'], candPreferredBpm: { min: 80, max: 110 },
      ageSinceLastBeatSec: null, nowHour: 21,
    }, 1);
    expect(top[0].beat.id).toBe('a');
  });
  it('tempo mismatch hurts score', () => {
    const r1 = scoreBeat(catalog[1], {
      candFeatures: f(), candPreferredGenres: ['edm'], candPreferredBpm: { min: 60, max: 80 },
      ageSinceLastBeatSec: null, nowHour: 21,
    });
    const r2 = scoreBeat(catalog[1], {
      candFeatures: f(), candPreferredGenres: ['edm'], candPreferredBpm: { min: 120, max: 140 },
      ageSinceLastBeatSec: null, nowHour: 21,
    });
    expect(r2.score).toBeGreaterThan(r1.score);
  });
});

describe('notifyTiming', () => {
  it('respects peakHours', () => {
    const now = new Date('2026-05-26T09:00:00Z');
    const t = nextNotifyAt({
      now, peakHours: [20, 21, 22], quietHours: [], lastSent: null,
      minSpacingSec: 0, tzOffsetMin: 0,
    });
    expect(t.getUTCHours()).toBe(20);
  });
  it('respects quietHours and rate limit', () => {
    const now = new Date('2026-05-26T20:00:00Z');
    const t = nextNotifyAt({
      now, peakHours: [20, 21, 22], quietHours: [20],
      lastSent: new Date('2026-05-26T19:30:00Z'), minSpacingSec: 3600, tzOffsetMin: 0,
    });
    expect(t.getUTCHours()).not.toBe(20);
    expect(t.getTime()).toBeGreaterThanOrEqual(new Date('2026-05-26T20:30:00Z').getTime());
  });
  it('null peakHours → next hour now', () => {
    const now = new Date('2026-05-26T09:00:00Z');
    const t = nextNotifyAt({ now, peakHours: null, quietHours: null, lastSent: null, minSpacingSec: 0, tzOffsetMin: 0 });
    expect(t.getUTCHours()).toBe(9);
  });
});

describe('searchAugment', () => {
  it('blends text and forYou', () => {
    const base: Parameters<typeof rerankSearch>[0] = {
      me: f(), cand: f(),
      myIntent: 'serious', candIntent: 'serious', myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [], pair: undefined, priorCount: 0, impressionsLast48h: 0,
      consent: 'full', textScore: 1, candUpdatedAtMs: Date.now(),
    };
    const high = rerankSearch(base);
    const low = rerankSearch({ ...base, textScore: 0 });
    expect(high.score).toBeGreaterThan(low.score);
  });
});

describe('feedAugment', () => {
  it('recency boost', () => {
    const fresh = rerankFeed({ sourceScore: 0.5, forYouScore: 50, itemAgeSec: 60 });
    const stale = rerankFeed({ sourceScore: 0.5, forYouScore: 50, itemAgeSec: 30 * 86400 });
    expect(fresh).toBeGreaterThan(stale);
  });
});

describe('postImpressionRerank', () => {
  it('zero skip → zero penalty', () => {
    expect(postImpressionPenalty(0, 60)).toBe(0);
  });
  it('more skips → more penalty', () => {
    expect(postImpressionPenalty(10, 60)).toBeGreaterThan(postImpressionPenalty(1, 60));
  });
  it('older skip decays', () => {
    expect(postImpressionPenalty(5, 7 * 86400)).toBeLessThan(postImpressionPenalty(5, 60));
  });
});

describe('aiMatch', () => {
  it('returns null when no cand >= 70', () => {
    const r = pickAiMatch([{
      candId: 'a', me: f(), cand: null,
      myIntent: 'serious', candIntent: 'casual', myAge: 28, candAge: 50, cityKm: 200,
      myInterests: [], candInterests: [],
      pair: undefined, priorCount: 0, impressionsLast48h: 0, consent: 'full',
      subs: { cf: 0, active: 0, serious: 0, matchHistoryAffinity: 0, vibeMomentum: 0 },
    }]);
    expect(r).toBeNull();
  });
  it('picks the highest scorer', () => {
    const base = {
      me: f(), cand: f(),
      myIntent: 'serious', candIntent: 'serious', myAge: 28, candAge: 28, cityKm: 5,
      myInterests: [], candInterests: [], pair: undefined, priorCount: 0, impressionsLast48h: 0,
      consent: 'full' as const,
    };
    const r = pickAiMatch([
      { candId: 'low',  ...base, subs: { cf: 60, active: 60, serious: 60, matchHistoryAffinity: 60, vibeMomentum: 60 } },
      { candId: 'high', ...base, subs: { cf: 95, active: 95, serious: 95, matchHistoryAffinity: 95, vibeMomentum: 95 } },
    ]);
    expect(r?.candId).toBe('high');
  });
});
