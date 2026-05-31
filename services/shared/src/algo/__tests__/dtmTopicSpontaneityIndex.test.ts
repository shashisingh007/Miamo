import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicSpontaneityIndex,
  stalledDtmTopics,
} from '../dtmTopicSpontaneityIndex';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSpontaneityIndex', () => {
  it('returns 16 in order', () => {
    const r = summarizeDtmTopicSpontaneityIndex([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSpontaneityIndex([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('spontaneous-act => spontaneous', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'spontaneous-act' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('spontaneous');
  });

  it('flexible (0.8) => planned', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'flexible' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('planned');
  });

  it('planned (0.55) => planned', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'planned' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('planned');
  });

  it('rigid (0.25) => stalled', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'rigid' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('stalled');
  });

  it('stalled => stalled', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'stalled' }]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('stalled');
  });

  it('mixed (0.5) => rigid', () => {
    const r = summarizeDtmTopicSpontaneityIndex([
      { topic: 'leisure', signal: 'spontaneous-act' },
      { topic: 'leisure', signal: 'stalled' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.band).toBe('rigid');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'x', signal: 'spontaneous-act' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicSpontaneityIndex([{ topic: 'leisure', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSpontaneityIndex([
      { topic: 'leisure', signal: 'spontaneous-act' },
      { topic: 'leisure', signal: 'flexible' },
    ]);
    expect(r.find((x) => x.topic === 'leisure')!.n).toBe(2);
  });

  it('stalledDtmTopics filters', () => {
    const r = summarizeDtmTopicSpontaneityIndex([
      { topic: 'leisure', signal: 'stalled' },
      { topic: 'intimacy', signal: 'spontaneous-act' },
    ]);
    expect(stalledDtmTopics(r)).toHaveLength(1);
    expect(stalledDtmTopics(r)[0].topic).toBe('leisure');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSpontaneityIndex([
      { topic: 'leisure', signal: 'spontaneous-act' },
      { topic: 'intimacy', signal: 'stalled' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order anchored', () => {
    const r = summarizeDtmTopicSpontaneityIndex([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
