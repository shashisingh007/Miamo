import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicRespectFlow, contemptuousDtmTopics } from '../dtmTopicRespectFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicRespectFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicRespectFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicRespectFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('respectful => respectful', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'respectful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('respectful');
  });

  it('considerate => mixed', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'considerate' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('dismissive => contemptuous', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'dismissive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('contemptuous');
  });

  it('contemptuous => contemptuous', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'contemptuous' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('contemptuous');
  });

  it('mid => dismissive', () => {
    const r = summarizeDtmTopicRespectFlow([
      { topic: 'values', signal: 'respectful' },
      { topic: 'values', signal: 'contemptuous' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('dismissive');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'x', signal: 'respectful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicRespectFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicRespectFlow([
      { topic: 'values', signal: 'respectful' },
      { topic: 'values', signal: 'dismissive' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('contemptuousDtmTopics filter', () => {
    const r = summarizeDtmTopicRespectFlow([
      { topic: 'values', signal: 'contemptuous' },
      { topic: 'family', signal: 'dismissive' },
      { topic: 'finance', signal: 'respectful' },
    ]);
    expect(contemptuousDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicRespectFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicRespectFlow([
      { topic: 'values', signal: 'respectful' },
      { topic: 'family', signal: 'contemptuous' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
