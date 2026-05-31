import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicAspirationFlow, stalledDtmTopics } from '../dtmTopicAspirationFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicAspirationFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicAspirationFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicAspirationFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reaching => leaning', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'reaching' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('leaning');
  });

  it('leaning => mixed', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'leaning' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('drifting => stalled', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'drifting' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stalled');
  });

  it('stalled => stalled', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'stalled' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('stalled');
  });

  it('mixed midpoint => drifting', () => {
    const r = summarizeDtmTopicAspirationFlow([
      { topic: 'values', signal: 'reaching' },
      { topic: 'values', signal: 'stalled' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('drifting');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'x', signal: 'reaching' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicAspirationFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicAspirationFlow([
      { topic: 'values', signal: 'reaching' },
      { topic: 'values', signal: 'drifting' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('stalledDtmTopics filter', () => {
    const r = summarizeDtmTopicAspirationFlow([
      { topic: 'values', signal: 'stalled' },
      { topic: 'family', signal: 'drifting' },
      { topic: 'finance', signal: 'reaching' },
    ]);
    expect(stalledDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicAspirationFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicAspirationFlow([
      { topic: 'values', signal: 'reaching' },
      { topic: 'family', signal: 'stalled' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
