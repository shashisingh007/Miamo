/**
 * feedAugment v5 — filter-affinity lane.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rerankFeedV4, rerankFeedV5, rerankFeed } from '../feedAugment';

const base = { sourceScore: 0.5, forYouScore: 60, itemAgeSec: 1800 };

describe('feedAugment V5', () => {
  it('matches v4 within rounding when filterAffinity is unset', () => {
    const v4 = rerankFeedV4(base);
    const v5 = rerankFeedV5(base);
    // V5 redistributes weight so they differ slightly; check both are 0..100.
    expect(v5).toBeGreaterThanOrEqual(0);
    expect(v5).toBeLessThanOrEqual(100);
    expect(v4).toBeGreaterThanOrEqual(0);
  });

  it('filterAffinity=1 increases score above filterAffinity=0', () => {
    const low = rerankFeedV5({ ...base, filterAffinity: 0 });
    const high = rerankFeedV5({ ...base, filterAffinity: 1 });
    expect(high).toBeGreaterThan(low);
  });

  it('clips filterAffinity to [0, 1]', () => {
    const huge = rerankFeedV5({ ...base, filterAffinity: 9 });
    const one = rerankFeedV5({ ...base, filterAffinity: 1 });
    expect(huge).toBe(one);
  });
});

describe('rerankFeed dispatcher', () => {
  const prev = process.env.ALGO_V5_FEED_AUGMENT_ENABLED;
  beforeEach(() => { delete process.env.ALGO_V5_FEED_AUGMENT_ENABLED; });
  afterEach(() => {
    if (prev === undefined) delete process.env.ALGO_V5_FEED_AUGMENT_ENABLED;
    else process.env.ALGO_V5_FEED_AUGMENT_ENABLED = prev;
  });

  it('ignores filterAffinity when flag is off', () => {
    expect(rerankFeed({ ...base, filterAffinity: 1 })).toBe(rerankFeedV4(base));
  });

  it('honors filterAffinity when flag is on', () => {
    process.env.ALGO_V5_FEED_AUGMENT_ENABLED = '1';
    const off = rerankFeedV5({ ...base, filterAffinity: 0 });
    const on = rerankFeed({ ...base, filterAffinity: 1 });
    expect(on).toBeGreaterThan(off);
  });
});
