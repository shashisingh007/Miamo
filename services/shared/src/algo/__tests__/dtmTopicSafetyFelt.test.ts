import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSafetyFelt,
  unsafeDtmTopics,
} from '../dtmTopicSafetyFelt';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSafetyFelt', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicSafetyFelt([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSafetyFelt([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('fully-safe => safe', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'fully-safe' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('safe');
  });

  it('mostly-safe (0.8) => cautious', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'mostly-safe' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('cautious');
  });

  it('cautious (0.55) => cautious', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'cautious' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('cautious');
  });

  it('guarded (0.25) => unsafe', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'guarded' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('unsafe');
  });

  it('unsafe => unsafe', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'unsafe' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('unsafe');
  });

  it('mixed (0.5) => guarded', () => {
    const r = summarizeDtmTopicSafetyFelt([
      { topic: 'intimacy', signal: 'fully-safe' },
      { topic: 'intimacy', signal: 'unsafe' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('guarded');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'x', signal: 'fully-safe' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicSafetyFelt([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSafetyFelt([
      { topic: 'intimacy', signal: 'fully-safe' },
      { topic: 'intimacy', signal: 'mostly-safe' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('unsafeDtmTopics filters', () => {
    const r = summarizeDtmTopicSafetyFelt([
      { topic: 'intimacy', signal: 'unsafe' },
      { topic: 'leisure', signal: 'fully-safe' },
    ]);
    expect(unsafeDtmTopics(r)).toHaveLength(1);
    expect(unsafeDtmTopics(r)[0].topic).toBe('intimacy');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSafetyFelt([
      { topic: 'intimacy', signal: 'fully-safe' },
      { topic: 'leisure', signal: 'unsafe' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicSafetyFelt([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
