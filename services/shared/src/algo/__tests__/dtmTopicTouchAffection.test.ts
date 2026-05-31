import { describe, it, expect } from 'vitest';
import {
  summarizeDtmTopicTouchAffection,
  avoidedDtmTopics,
} from '../dtmTopicTouchAffection';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicTouchAffection', () => {
  it('returns 16', () => {
    const r = summarizeDtmTopicTouchAffection([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty untested', () => {
    expect(summarizeDtmTopicTouchAffection([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('sought-warm => affectionate', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'sought-warm' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('affectionate');
  });

  it('received-warm (0.8) => connected', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'received-warm' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('connected');
  });

  it('neutral (0.55) => connected', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'neutral-contact' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('connected');
  });

  it('withdrawn (0.25) => avoided', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'withdrawn' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('avoided');
  });

  it('avoided => avoided', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'avoided' }]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('avoided');
  });

  it('mixed sought + avoided (0.5) => distant', () => {
    const r = summarizeDtmTopicTouchAffection([
      { topic: 'intimacy', signal: 'sought-warm' },
      { topic: 'intimacy', signal: 'avoided' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.band).toBe('distant');
  });

  it('ignores unknown topic', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'zzz', signal: 'sought-warm' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('ignores unknown signal', () => {
    const r = summarizeDtmTopicTouchAffection([{ topic: 'intimacy', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicTouchAffection([
      { topic: 'intimacy', signal: 'sought-warm' },
      { topic: 'intimacy', signal: 'avoided' },
    ]);
    expect(r.find((x) => x.topic === 'intimacy')!.n).toBe(2);
  });

  it('avoidedDtmTopics filters', () => {
    const r = summarizeDtmTopicTouchAffection([
      { topic: 'intimacy', signal: 'avoided' },
      { topic: 'family', signal: 'sought-warm' },
    ]);
    expect(avoidedDtmTopics(r)).toHaveLength(1);
  });

  it('score bounds', () => {
    const r = summarizeDtmTopicTouchAffection([
      { topic: 'intimacy', signal: 'sought-warm' },
      { topic: 'family', signal: 'avoided' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical order', () => {
    const r = summarizeDtmTopicTouchAffection([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
