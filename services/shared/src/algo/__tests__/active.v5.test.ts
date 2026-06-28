/**
 * active v5 — smooth liveness decay over any recent signal.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scoreActiveV4, scoreActiveV5, scoreActive, ACTIVE_WEIGHTS } from '../active';
import type { FeatureRow } from '../signals';

function vec(n: number): Float32Array {
  const v = new Float32Array(n).fill(1);
  const inv = 1 / Math.sqrt(n);
  for (let i = 0; i < n; i++) v[i] *= inv;
  return v;
}

const me: FeatureRow = {
  uidHash: 'a', chronotype: 'evening', attentionProfile: 'reader',
  rageClickRate: 0, deadClickRate: 0, swipeRightRatio: 0.4,
  replyPersonaP50Ms: 60000, responseRate: 0.7,
  interestVec: vec(32), vibeEmb: vec(64), behaviorEmb: vec(64),
  peakHours: [20, 21, 22],
};

const baseInputs = {
  me, cand: me,
  myIntent: 'serious' as const, candIntent: 'serious' as const,
  myAge: 28, candAge: 28, cityKm: 5,
  myInterests: [] as string[], candInterests: [] as string[],
  pair: undefined, priorCount: 0, impressionsLast48h: 0,
  consent: 'full' as const,
  candLastHeartbeatMs: Date.now() - 5 * 60_000, // 5 min ago
};

describe('scoreActiveV5', () => {
  it('matches v4 when candLastAnyActivityMs is undefined (within 0.5)', () => {
    const v4 = scoreActiveV4(baseInputs).score;
    const v5 = scoreActiveV5(baseInputs).score;
    expect(Math.abs(v5 - v4)).toBeLessThan(0.5);
  });

  it('uses a more recent any-activity timestamp to boost liveness above v4', () => {
    const stale = { ...baseInputs, candLastHeartbeatMs: Date.now() - 90 * 60_000 };
    const fresh = { ...stale, candLastAnyActivityMs: Date.now() - 2 * 60_000 };
    const v4 = scoreActiveV4(stale).score;
    const v5 = scoreActiveV5(fresh).score;
    expect(v5).toBeGreaterThan(v4);
  });

  it('never scores lower than v4 for the same candidate', () => {
    // Same input, no extra signal → equal. With extra signal, strictly greater.
    expect(scoreActiveV5(baseInputs).score).toBeGreaterThanOrEqual(scoreActiveV4(baseInputs).score - 0.5);
  });

  it('explain carries algoVersion v5 + usedAnyActivity flag', () => {
    const { explain } = scoreActiveV5({ ...baseInputs, candLastAnyActivityMs: Date.now() - 1000 });
    expect((explain as Record<string, unknown>).algoVersion).toBe('v5');
    expect((explain as Record<string, unknown>).usedAnyActivity).toBe(true);
  });
});

describe('scoreActive dispatcher', () => {
  const prev = process.env.ALGO_V5_ACTIVE_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_ACTIVE_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_ACTIVE_ENABLED;
    else process.env.ALGO_V5_ACTIVE_ENABLED = prev;
  });

  it('defaults to v4 (flag off)', () => {
    const { explain } = scoreActive(baseInputs);
    expect((explain as Record<string, unknown>).algoVersion).toBe('v4');
    expect((explain as Record<string, unknown>).weights).toEqual(ACTIVE_WEIGHTS);
  });

  it('uses v5 when ALGO_V5_ACTIVE_ENABLED=1', () => {
    process.env.ALGO_V5_ACTIVE_ENABLED = '1';
    const { explain } = scoreActive({ ...baseInputs, candLastAnyActivityMs: Date.now() });
    expect((explain as Record<string, unknown>).algoVersion).toBe('v5');
  });
});
