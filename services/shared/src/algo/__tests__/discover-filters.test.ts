import { describe, it, expect } from 'vitest';
import { scoreNew, NEW_WEIGHTS } from '../new';
import { scoreActive, ACTIVE_WEIGHTS } from '../active';
import { scoreVerified, VERIFIED_WEIGHTS } from '../verified';
import { scoreSerious, SERIOUS_WEIGHTS } from '../serious';
import type { FeatureRow } from '../signals';
import type { ForYouInputs } from '../forYou';

function vec(n: number): Float32Array {
  const v = new Float32Array(n).fill(1);
  const inv = 1/Math.sqrt(n);
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}
function f(over: Partial<FeatureRow> = {}): FeatureRow {
  return {
    uidHash: 'h', chronotype: 'evening', attentionProfile: 'reader',
    rageClickRate: 0.01, deadClickRate: 0.01, swipeRightRatio: 0.4,
    replyPersonaP50Ms: 60_000, responseRate: 0.7,
    interestVec: vec(32), vibeEmb: vec(64), behaviorEmb: vec(64),
    peakHours: [20, 21, 22], ...over,
  };
}
function fy(over: Partial<ForYouInputs> = {}): ForYouInputs {
  return {
    me: f(), cand: f(),
    myIntent: 'serious', candIntent: 'serious',
    myAge: 28, candAge: 28,
    cityKm: 5,
    myInterests: [], candInterests: [],
    pair: undefined, priorCount: 0, impressionsLast48h: 0,
    consent: 'full',
    ...over,
  };
}

describe('new filter', () => {
  it('weights sum 1', () => {
    expect(Object.values(NEW_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('recent candidate scores higher than old one', () => {
    const recent = scoreNew({ ...fy(), candCreatedAtMs: Date.now() - 86400_000, verified: true, completeness: 0.8 });
    const old = scoreNew({ ...fy(), candCreatedAtMs: Date.now() - 365 * 86400_000, verified: true, completeness: 0.8 });
    expect(recent.score).toBeGreaterThan(old.score);
  });
});

describe('active filter', () => {
  it('weights sum 1', () => {
    expect(Object.values(ACTIVE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('live user beats dormant user', () => {
    const live = scoreActive({ ...fy(), candLastHeartbeatMs: Date.now() - 5 * 60_000 });
    const cold = scoreActive({ ...fy(), candLastHeartbeatMs: Date.now() - 24 * 3600_000 });
    expect(live.score).toBeGreaterThan(cold.score);
  });
  it('null heartbeat → liveness=0', () => {
    const { explain } = scoreActive({ ...fy(), candLastHeartbeatMs: null });
    expect((explain as { breakdown: { liveness: number } }).breakdown.liveness).toBe(0);
  });
});

describe('verified filter', () => {
  it('weights sum 1', () => {
    expect(Object.values(VERIFIED_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('drops candidates failing photo/phone gate', () => {
    const r = scoreVerified({ ...fy(), photoVerified: false, phoneVerified: true, idVerified: true });
    expect(r.score).toBe(0);
    expect((r.explain as { dropped: boolean }).dropped).toBe(true);
  });
  it('ID-verified outranks non-ID', () => {
    const a = scoreVerified({ ...fy(), photoVerified: true, phoneVerified: true, idVerified: true });
    const b = scoreVerified({ ...fy(), photoVerified: true, phoneVerified: true, idVerified: false });
    expect(a.score).toBeGreaterThan(b.score);
  });
});

describe('serious filter', () => {
  it('weights sum 1', () => {
    expect(Object.values(SERIOUS_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });
  it('drops casual candidates', () => {
    const r = scoreSerious({ ...fy({ candIntent: 'casual' }), dtmCompletes90d: 3, lovelangCompat: 0.7, completeness: 0.9 });
    expect(r.score).toBe(0);
  });
  it('higher DTM depth → higher score', () => {
    const low = scoreSerious({ ...fy(), dtmCompletes90d: 0, lovelangCompat: 0.5, completeness: 0.8 });
    const high = scoreSerious({ ...fy(), dtmCompletes90d: 5, lovelangCompat: 0.5, completeness: 0.8 });
    expect(high.score).toBeGreaterThan(low.score);
  });
  // v2: relaxed intent gate — marriage viewer with a serious candidate still
  // passes the gate; intentMatchScore penalises the mismatch inside compose,
  // so the score is nonzero but strictly less than the exact-match pair.
  it('adjacent intent (marriage viewer ↔ serious candidate) is NOT dropped', () => {
    const exact = scoreSerious({
      ...fy({ myIntent: 'marriage', candIntent: 'marriage' }),
      dtmCompletes90d: 3, lovelangCompat: 0.7, completeness: 0.9,
    });
    const adjacent = scoreSerious({
      ...fy({ myIntent: 'marriage', candIntent: 'serious' }),
      dtmCompletes90d: 3, lovelangCompat: 0.7, completeness: 0.9,
    });
    expect(adjacent.score).toBeGreaterThan(0);
    expect(exact.score).toBeGreaterThan(adjacent.score);
  });
  it('casual candidate is still dropped (gate holds)', () => {
    const r = scoreSerious({
      ...fy({ myIntent: 'serious', candIntent: 'casual' }),
      dtmCompletes90d: 3, lovelangCompat: 0.7, completeness: 0.9,
    });
    expect(r.score).toBe(0);
  });
});
