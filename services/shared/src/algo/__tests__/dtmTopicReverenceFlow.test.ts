import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicReverenceFlow, dismissiveDtmTopics } from '../dtmTopicReverenceFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicReverenceFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicReverenceFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicReverenceFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('reverent => reverent', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'reverent' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('reverent');
  });

  it('respectful signal => mixed', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'respectful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('casual => dismissive', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'casual' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('dismissive => dismissive', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'dismissive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('mixed midpoint => casual', () => {
    const r = summarizeDtmTopicReverenceFlow([
      { topic: 'values', signal: 'reverent' },
      { topic: 'values', signal: 'dismissive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('casual');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'x', signal: 'reverent' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicReverenceFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicReverenceFlow([
      { topic: 'values', signal: 'reverent' },
      { topic: 'values', signal: 'casual' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('dismissiveDtmTopics filter', () => {
    const r = summarizeDtmTopicReverenceFlow([
      { topic: 'values', signal: 'dismissive' },
      { topic: 'family', signal: 'casual' },
      { topic: 'finance', signal: 'reverent' },
    ]);
    expect(dismissiveDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicReverenceFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicReverenceFlow([
      { topic: 'values', signal: 'reverent' },
      { topic: 'family', signal: 'dismissive' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
