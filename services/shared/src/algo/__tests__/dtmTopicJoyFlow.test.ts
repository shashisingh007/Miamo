import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicJoyFlow, flatJoyDtmTopics } from '../dtmTopicJoyFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicJoyFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicJoyFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicJoyFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('radiant => bright', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'radiant' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('bright');
  });

  it('bright => mixed', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'bright' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('subdued', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'subdued' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('flat', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'flat' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('flat');
  });

  it('mid mix', () => {
    const r = summarizeDtmTopicJoyFlow([
      { topic: 'values', signal: 'radiant' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('subdued');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'x', signal: 'radiant' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicJoyFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicJoyFlow([
      { topic: 'values', signal: 'radiant' },
      { topic: 'values', signal: 'flat' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('flatJoyDtmTopics filter', () => {
    const r = summarizeDtmTopicJoyFlow([
      { topic: 'values', signal: 'flat' },
      { topic: 'family', signal: 'subdued' },
      { topic: 'finance', signal: 'radiant' },
    ]);
    expect(flatJoyDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicJoyFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score range', () => {
    const r = summarizeDtmTopicJoyFlow([
      { topic: 'values', signal: 'radiant' },
      { topic: 'family', signal: 'flat' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
