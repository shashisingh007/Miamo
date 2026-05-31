import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicGentlenessFlow, harshDtmTopics } from '../dtmTopicGentlenessFlow';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicGentlenessFlow', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicGentlenessFlow([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicGentlenessFlow([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('soft => gentle', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'soft' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('gentle');
  });

  it('gentle => mixed', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'gentle' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('firm => harsh', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'firm' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('harsh', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'harsh' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('harsh');
  });

  it('mid', () => {
    const r = summarizeDtmTopicGentlenessFlow([
      { topic: 'values', signal: 'soft' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('firm');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'x', signal: 'soft' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicGentlenessFlow([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicGentlenessFlow([
      { topic: 'values', signal: 'soft' },
      { topic: 'values', signal: 'harsh' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('harshDtmTopics filter', () => {
    const r = summarizeDtmTopicGentlenessFlow([
      { topic: 'values', signal: 'harsh' },
      { topic: 'family', signal: 'firm' },
      { topic: 'finance', signal: 'soft' },
    ]);
    expect(harshDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicGentlenessFlow([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicGentlenessFlow([
      { topic: 'values', signal: 'soft' },
      { topic: 'family', signal: 'harsh' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
