/**
 * searchAugment v5 — search-health-aware re-rank.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rerankSearchV4, rerankSearchV5, rerankSearch, type SearchInputsV5 } from '../searchAugment';

const base: SearchInputsV5 = {
  textScore: 0.7,
  candUpdatedAtMs: Date.now() - 5 * 86400_000,
  consent: 'A' as any,
  me: null, cand: null,
  myIntent: null, candIntent: null,
  myAge: 28, candAge: 30,
  cityKm: 10,
  myInterests: [], candInterests: [],
  pair: undefined,
  priorCount: 0,
  impressionsLast48h: 0,
};

describe('searchAugment V5', () => {
  it('returns finite 0..100 with no rollup data', () => {
    const r = rerankSearchV5(base);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('healthier search history (more clicks) scores >= frustrated history', () => {
    const happy = rerankSearchV5({ ...base, resultClickCount7d: 20, noResultsCount7d: 0 });
    const sad = rerankSearchV5({ ...base, resultClickCount7d: 0, noResultsCount7d: 20 });
    expect(happy.score).toBeGreaterThanOrEqual(sad.score);
  });

  it('explain payload labels v5', () => {
    expect(rerankSearchV5(base).explain.algoVersion).toBe('v5');
    expect(rerankSearchV4(base).explain.algoVersion).toBe('v4');
  });
});

describe('rerankSearch dispatcher', () => {
  const prev = process.env.ALGO_V5_SEARCH_AUGMENT_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_SEARCH_AUGMENT_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_SEARCH_AUGMENT_ENABLED;
    else process.env.ALGO_V5_SEARCH_AUGMENT_ENABLED = prev;
  });

  it('uses v4 by default', () => {
    expect(rerankSearch(base).explain.algoVersion).toBe('v4');
  });

  it('uses v5 when flag on', () => {
    process.env.ALGO_V5_SEARCH_AUGMENT_ENABLED = '1';
    expect(rerankSearch(base).explain.algoVersion).toBe('v5');
  });
});
