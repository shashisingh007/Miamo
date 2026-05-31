import { describe, it, expect } from 'vitest';
import { dtmTopicDiversityBoost } from '../dtmTopicDiversity';
import type { DtmTopicKey } from '../dtmTopics';

const T = (k: DtmTopicKey) => k;

describe('dtmTopicDiversityBoost', () => {
  it('returns insufficient_data when fewer than 5 items', () => {
    const r = dtmTopicDiversityBoost({ recentDominantTopics: [T('values'), T('finance')] });
    expect(r.reason).toBe('insufficient_data');
    expect(r.multiplier).toBe(1.0);
    expect(r.dominantTopic).toBeNull();
  });

  it('returns all_same when every dominant topic matches', () => {
    const r = dtmTopicDiversityBoost({
      recentDominantTopics: [T('values'), T('values'), T('values'), T('values'), T('values')],
    });
    expect(r.reason).toBe('all_same');
    expect(r.multiplier).toBeCloseTo(1.3, 6);
    expect(r.dominantTopic).toBe('values');
  });

  it('returns dominant when top topic ratio >= 0.8', () => {
    const r = dtmTopicDiversityBoost({
      recentDominantTopics: [
        T('values'), T('values'), T('values'), T('values'), T('finance'),
      ],
    });
    expect(r.reason).toBe('dominant');
    expect(r.multiplier).toBeCloseTo(1.15, 6);
    expect(r.dominantTopic).toBe('values');
  });

  it('returns balanced for a mixed history', () => {
    const r = dtmTopicDiversityBoost({
      recentDominantTopics: [
        T('values'), T('finance'), T('intimacy'), T('lifestyle'), T('future'),
      ],
    });
    expect(r.reason).toBe('balanced');
    expect(r.multiplier).toBe(1.0);
  });

  it('multiplier is capped at 1.5', () => {
    const r = dtmTopicDiversityBoost({
      recentDominantTopics: new Array(10).fill(T('values')),
    });
    expect(r.multiplier).toBeLessThanOrEqual(1.5);
  });

  it('order does not affect the result', () => {
    const a = dtmTopicDiversityBoost({
      recentDominantTopics: [T('values'), T('finance'), T('values'), T('values'), T('values')],
    });
    const b = dtmTopicDiversityBoost({
      recentDominantTopics: [T('finance'), T('values'), T('values'), T('values'), T('values')],
    });
    expect(a.reason).toBe(b.reason);
    expect(a.multiplier).toBe(b.multiplier);
    expect(a.dominantTopic).toBe(b.dominantTopic);
  });

  it('handles empty input gracefully', () => {
    const r = dtmTopicDiversityBoost({ recentDominantTopics: [] });
    expect(r.reason).toBe('insufficient_data');
  });
});
