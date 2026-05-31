import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicReachingToward,
  turnedAwayDtmTopics,
} from '../dtmTopicReachingToward';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReachingToward', () => {
  it('returns 16 canonical', () => {
    const r = summarizeDtmTopicReachingToward([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReachingToward([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('leaning-in => reaching', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'leaning-in' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reaching');
  });

  it('reaching (0.8) => tentative', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'reaching' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tentative');
  });

  it('tentative => tentative', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'tentative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tentative');
  });

  it('withdrawing => turned-away', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'withdrawing' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('turned-away');
  });

  it('turned-away => turned-away', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'turned-away' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('turned-away');
  });

  it('mixed 0.5 => withdrawing', () => {
    const r = summarizeDtmTopicReachingToward([
      { topic: 'values', signal: 'leaning-in' },
      { topic: 'values', signal: 'turned-away' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('withdrawing');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'q', signal: 'leaning-in' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReachingToward([{ topic: 'values', signal: 'x' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReachingToward([
      { topic: 'values', signal: 'reaching' },
      { topic: 'values', signal: 'tentative' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('turnedAwayDtmTopics filters', () => {
    const r = summarizeDtmTopicReachingToward([
      { topic: 'values', signal: 'turned-away' },
      { topic: 'family', signal: 'withdrawing' },
      { topic: 'finance', signal: 'leaning-in' },
    ]);
    expect(turnedAwayDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReachingToward([
      { topic: 'values', signal: 'leaning-in' },
      { topic: 'family', signal: 'turned-away' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicReachingToward([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
