/**
 * v4 algo end-to-end: drive every algorithm with a synthetic SignalReader
 * and assert the contract — no crashes, scores in 0..100, explain shape
 * present, identical inputs → identical outputs (determinism).
 *
 * Uses zero database; the FakeSignalReader implements SignalReader directly
 * so this runs in <100ms and is safe in any CI.
 */
import { describe, it, expect } from 'vitest';
import type { SignalReader, FeatureRow, PairRow, EvtCount } from '../services/shared/src/algo/signals';
import { rankForYou, scoreForYou } from '../services/shared/src/algo/forYou';
import { scoreAiPicksV4 } from '../services/shared/src/algo/aiPicks';
import { suggestMoves } from '../services/shared/src/algo/moves';
import { suggestMessages } from '../services/shared/src/algo/messageSuggest';
import { pickBeats } from '../services/shared/src/algo/beats';
import { nextNotifyAt } from '../services/shared/src/algo/notifyTiming';
import { rerankSearch } from '../services/shared/src/algo/searchAugment';
import { rerankFeed } from '../services/shared/src/algo/feedAugment';
import { postImpressionPenalty } from '../services/shared/src/algo/postImpressionRerank';
import { pickAiMatch } from '../services/shared/src/algo/aiMatch';
import { scoreNew } from '../services/shared/src/algo/new';
import { scoreActive } from '../services/shared/src/algo/active';
import { scoreVerified } from '../services/shared/src/algo/verified';
import { scoreSerious } from '../services/shared/src/algo/serious';
import { dtmAffinity } from '../services/shared/src/algo/dtm';
import { cfScore } from '../services/shared/src/algo/cf';

function vec(n: number, seed = 1): Float32Array {
  const v = new Float32Array(n);
  // deterministic pseudo-random
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    v[i] = (s / 0x7fffffff) - 0.5;
  }
  let sum = 0; for (const x of v) sum += x*x;
  const inv = sum > 0 ? 1/Math.sqrt(sum) : 1;
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

class FakeSignalReader implements SignalReader {
  private features_ = new Map<string, FeatureRow>();
  private pairs_ = new Map<string, PairRow>();
  private priors_ = new Map<string, number>();

  hashOf(userId: string): string { return `h:${userId}`; }

  putFeature(uidHash: string, row: FeatureRow): void { this.features_.set(uidHash, row); }
  putPair(p: PairRow): void { this.pairs_.set(`${p.aHash}|${p.bHash}`, p); }
  putPrior(aHash: string, bHash: string, count: number): void { this.priors_.set(`${aHash}|${bHash}`, count); }

  async features(uidHash: string): Promise<FeatureRow | null> {
    return this.features_.get(uidHash) || null;
  }
  async pairCompat(aHash: string, bHashes: string[]): Promise<Map<string, PairRow>> {
    const out = new Map<string, PairRow>();
    for (const b of bHashes) {
      const p = this.pairs_.get(`${aHash}|${b}`);
      if (p) out.set(b, p);
    }
    return out;
  }
  async recentEvents(_u: string, evts: string[], days: number): Promise<EvtCount[]> {
    return evts.map((e) => ({ evt: e, count: 0, days }));
  }
  async priorTargets(aHash: string, bHashes: string[], _d: number): Promise<Map<string, number>> {
    const m = new Map<string, number>();
    for (const b of bHashes) {
      const c = this.priors_.get(`${aHash}|${b}`);
      if (c) m.set(b, c);
    }
    return m;
  }
  async targetImpressions(_a: string, _b: string[], _d: number): Promise<Map<string, number>> {
    return new Map();
  }
  async dailyMatch(_u: string): Promise<{ bHash: string; score: number; computedAt: string } | null> {
    return null;
  }
}

function feature(uidHash: string, seed: number): FeatureRow {
  return {
    uidHash, chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0.02, deadClickRate: 0.02, swipeRightRatio: 0.45,
    replyPersonaP50Ms: 45_000, responseRate: 0.7,
    interestVec: vec(32, seed),
    vibeEmb: vec(64, seed + 100),
    behaviorEmb: vec(64, seed + 200),
    peakHours: [20, 21, 22],
  };
}

describe('algo e2e', () => {
  const reader = new FakeSignalReader();
  reader.putFeature('h:me', feature('h:me', 1));
  reader.putFeature('h:u1', feature('h:u1', 2));
  reader.putFeature('h:u2', feature('h:u2', 3));
  reader.putFeature('h:u3', feature('h:u3', 4));
  reader.putPrior('h:me', 'h:u1', 7);

  it('rankForYou returns sorted scored list of all cands', async () => {
    const out = await rankForYou(reader, 'me', [
      { id: 'u1', intent: 'serious', age: 28, interests: ['hiking'], cityKm: 3 },
      { id: 'u2', intent: 'serious', age: 30, interests: ['hiking'], cityKm: 10 },
      { id: 'u3', intent: 'casual',  age: 50, interests: [],          cityKm: 200 },
    ], 'full');
    expect(out.length).toBe(3);
    for (const r of out) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.explain.algo).toBe('forYou');
    }
    // sorted desc
    for (let i = 1; i < out.length; i++) expect(out[i - 1].score).toBeGreaterThanOrEqual(out[i].score);
  });

  it('determinism: same input → same output', async () => {
    const a = await rankForYou(reader, 'me', [{ id: 'u1', intent: 'serious', age: 28, interests: ['x'], cityKm: 3 }], 'full');
    const b = await rankForYou(reader, 'me', [{ id: 'u1', intent: 'serious', age: 28, interests: ['x'], cityKm: 3 }], 'full');
    expect(a[0].score).toBe(b[0].score);
  });

  it('every algorithm produces 0..100 scores under healthy inputs', () => {
    const me = feature('h:me', 1);
    const cand = feature('h:u1', 2);
    const fyInputs = {
      me, cand, myIntent: 'serious', candIntent: 'serious', myAge: 28, candAge: 28, cityKm: 5,
      myInterests: ['a'], candInterests: ['a'], pair: undefined, priorCount: 3, impressionsLast48h: 0,
      consent: 'full' as const,
    };
    const range = (n: number): void => { expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(100); };
    range(scoreForYou(fyInputs).score);
    range(scoreAiPicksV4({ ...fyInputs, subs: { cf: 50, active: 50, serious: 50, matchHistoryAffinity: 50, vibeMomentum: 50 }, rand: () => 1 }).score);
    range(scoreNew({ ...fyInputs, candCreatedAtMs: Date.now(), verified: true, completeness: 0.8 }).score);
    range(scoreActive({ ...fyInputs, candLastHeartbeatMs: Date.now() - 60_000 }).score);
    range(scoreVerified({ ...fyInputs, photoVerified: true, phoneVerified: true, idVerified: true }).score);
    range(scoreSerious({ ...fyInputs, dtmCompletes90d: 3, lovelangCompat: 0.7, completeness: 0.8 }).score);
    range(rerankSearch({ ...fyInputs, textScore: 0.7, candUpdatedAtMs: Date.now() }).score);
    range(rerankFeed({ sourceScore: 0.5, forYouScore: 60, itemAgeSec: 600 }));
    range(postImpressionPenalty(5, 600));
    range(cfScore({ bHash: 'x', affinity: 0.6, coCount: 20 }));
    expect(dtmAffinity(vec(16, 1), vec(16, 2))).toBeGreaterThanOrEqual(0);
    const moves = suggestMoves({
      candFeatures: cand, lastUsedAgoSec: {}, candLastAction: null,
      nowHour: 20, deepCompatAffinity: {}, consent: 'full',
    }, 3);
    expect(moves.length).toBe(3);
    moves.forEach((m) => range(m.score));
    const sugg = suggestMessages({
      candFeatures: cand, lastInboundKind: 'text', ageSec: {},
      myIntent: 'serious', candIntent: 'serious', nowHour: 20,
    }, 3);
    expect(sugg.length).toBe(3);
    sugg.forEach((s) => range(s.score));
    const beats = pickBeats([
      { id: 'a', genres: ['lofi'], bpm: 90, recentPlays: 100 },
      { id: 'b', genres: ['edm'],  bpm: 128, recentPlays: 200 },
    ], { candFeatures: cand, candPreferredGenres: ['lofi'], candPreferredBpm: { min: 80, max: 100 }, ageSinceLastBeatSec: null, nowHour: 21 }, 2);
    beats.forEach((b) => range(b.score));
    const t = nextNotifyAt({ now: new Date('2026-05-26T09:00:00Z'), peakHours: [20, 21], quietHours: [], lastSent: null, minSpacingSec: 0, tzOffsetMin: 0 });
    expect(t.getUTCHours()).toBeGreaterThanOrEqual(20);
    const daily = pickAiMatch([{
      candId: 'u1', ...fyInputs,
      subs: { cf: 90, active: 90, serious: 90, matchHistoryAffinity: 90, vibeMomentum: 90 },
    }]);
    expect(daily).not.toBeNull();
    if (daily) range(daily.score);
  });
});
