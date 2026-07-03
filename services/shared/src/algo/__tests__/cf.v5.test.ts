/**
 * cf v5 — dwell-weighted collaborative filter.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cfScoreV4, cfScoreV5, cfScore, type CfNeighbourV5 } from '../cf';

const base: CfNeighbourV5 = { bHash: 'b', affinity: 0.6, coCount: 30 };

describe('cfScoreV5', () => {
  it('matches v4 when dwellWeight is absent', () => {
    expect(cfScoreV5(base)).toBe(cfScoreV4(base));
  });

  it('boosts above v4 when dwellWeight > affinity baseline', () => {
    const v4 = cfScoreV4(base);
    const v5 = cfScoreV5({ ...base, dwellWeight: 1 });
    expect(v5).toBeGreaterThanOrEqual(v4);
  });

  it('penalises below v4 when dwellWeight = 0 (shared viewers bounce)', () => {
    const v4 = cfScoreV4(base);
    const v5 = cfScoreV5({ ...base, dwellWeight: 0 });
    expect(v5).toBeLessThan(v4);
  });

  it('clips dwellWeight to [0, 1]', () => {
    const high = cfScoreV5({ ...base, dwellWeight: 9 });
    const one = cfScoreV5({ ...base, dwellWeight: 1 });
    expect(high).toBe(one);
  });

  it('returns 0 for an undefined neighbour', () => {
    expect(cfScoreV5(undefined)).toBe(0);
  });
});

describe('cfScore dispatcher', () => {
  const prev = process.env.ALGO_V5_CF_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_CF_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_CF_ENABLED;
    else process.env.ALGO_V5_CF_ENABLED = prev;
  });

  it('uses v4 by default', () => {
    expect(cfScore({ ...base, dwellWeight: 0 })).toBe(cfScoreV4(base));
  });

  it('uses v5 when ALGO_V5_CF_ENABLED=1', () => {
    process.env.ALGO_V5_CF_ENABLED = '1';
    expect(cfScore({ ...base, dwellWeight: 0 })).toBeLessThan(cfScoreV4(base));
  });
});
