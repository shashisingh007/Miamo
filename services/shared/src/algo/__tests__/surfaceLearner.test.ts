import { describe, it, expect } from 'vitest';
import {
  withSurface,
  splitBySurface,
  HALF_LIFE_DAYS,
} from '../surfaceLearner';
import { defaultProfile } from '../learner';
import type { ContextualRewardSample } from '../contextAwareRewards';

describe('surfaceLearner', () => {
  it('withSurface tags a profile without mutating the input', () => {
    const p = defaultProfile();
    const tagged = withSurface(p, 'dtm');
    expect(tagged.surface).toBe('dtm');
    // input stays clean
    expect((p as { surface?: unknown }).surface).toBeUndefined();
    // weights preserved
    expect(tagged.weights).toEqual(p.weights);
  });

  it('withSurface accepts both surfaces', () => {
    const p = defaultProfile();
    expect(withSurface(p, 'discover').surface).toBe('discover');
    expect(withSurface(p, 'dtm').surface).toBe('dtm');
  });

  it('splitBySurface buckets samples by surface', () => {
    const samples: ContextualRewardSample[] = [
      { ingredient: 'interestsOverlap', reward: 0.5, surface: 'discover', hourOfDay: 9 },
      { ingredient: 'vibeAlignment',    reward: 0.3, surface: 'dtm',      hourOfDay: 9 },
      { ingredient: 'attentionFit',     reward: 0.2, surface: '',         hourOfDay: 9 },
      { ingredient: 'ageSimilarity',    reward: 0.1, surface: 'matches',  hourOfDay: 9 },
    ];
    const out = splitBySurface(samples);
    expect(out.discover).toHaveLength(1);
    expect(out.dtm).toHaveLength(1);
    expect(out.unknown).toHaveLength(2);
  });

  it('half-life DTM > Discover (DTM ages slower)', () => {
    expect(HALF_LIFE_DAYS.dtm).toBeGreaterThan(HALF_LIFE_DAYS.discover);
  });
});
