import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicCareFlow, neglectfulDtmTopics } from '../dtmTopicCareFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicCareFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicCareFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicCareFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('devoted => caring', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'devoted' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('caring');
  });

  it('caring => mixed', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'caring' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('distant', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'distant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neglectful');
  });

  it('neglectful', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'neglectful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neglectful');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicCareFlow([
      { topic: 'values', signal: 'devoted' },
      { topic: 'values', signal: 'neglectful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('distant');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'x', signal: 'devoted' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicCareFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicCareFlow([
      { topic: 'values', signal: 'devoted' },
      { topic: 'values', signal: 'neglectful' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('neglectfulDtmTopics filter', () => {
    const r = summarizeDtmTopicCareFlow([
      { topic: 'values', signal: 'neglectful' },
      { topic: 'family', signal: 'distant' },
      { topic: 'finance', signal: 'devoted' },
    ]);
    expect(neglectfulDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicCareFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicCareFlow([
      { topic: 'values', signal: 'devoted' },
      { topic: 'family', signal: 'neglectful' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
