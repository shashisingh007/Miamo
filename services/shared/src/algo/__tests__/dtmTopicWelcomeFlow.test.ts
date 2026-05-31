import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicWelcomeFlow, rejectedDtmTopics } from '../dtmTopicWelcomeFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicWelcomeFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicWelcomeFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicWelcomeFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('embraced => welcomed', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'embraced' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('welcomed');
  });

  it('welcomed => mixed', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'welcomed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('tolerated', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'tolerated' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejected');
  });

  it('rejected', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'rejected' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('rejected');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicWelcomeFlow([
      { topic: 'values', signal: 'embraced' },
      { topic: 'values', signal: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('tolerated');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'x', signal: 'embraced' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicWelcomeFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicWelcomeFlow([
      { topic: 'values', signal: 'embraced' },
      { topic: 'values', signal: 'rejected' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('rejectedDtmTopics filter', () => {
    const r = summarizeDtmTopicWelcomeFlow([
      { topic: 'values', signal: 'rejected' },
      { topic: 'family', signal: 'tolerated' },
      { topic: 'finance', signal: 'embraced' },
    ]);
    expect(rejectedDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicWelcomeFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicWelcomeFlow([
      { topic: 'values', signal: 'embraced' },
      { topic: 'family', signal: 'rejected' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
