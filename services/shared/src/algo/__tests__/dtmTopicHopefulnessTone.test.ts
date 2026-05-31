import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicHopefulnessTone, hopelessDtmTopics } from '../dtmTopicHopefulnessTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicHopefulnessTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicHopefulnessTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicHopefulnessTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('hopeful => optimistic', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'hopeful' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('optimistic');
  });

  it('optimistic => neutral', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'optimistic' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('neutral => neutral', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'neutral' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('neutral');
  });

  it('discouraged => hopeless', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'discouraged' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hopeless');
  });

  it('hopeless => hopeless', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'hopeless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hopeless');
  });

  it('mixed 0.5 => discouraged', () => {
    const r = summarizeDtmTopicHopefulnessTone([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'values', signal: 'hopeless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('discouraged');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'x', signal: 'hopeful' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicHopefulnessTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicHopefulnessTone([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'values', signal: 'discouraged' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('hopelessDtmTopics filter', () => {
    const r = summarizeDtmTopicHopefulnessTone([
      { topic: 'values', signal: 'hopeless' },
      { topic: 'family', signal: 'discouraged' },
      { topic: 'finance', signal: 'hopeful' },
    ]);
    expect(hopelessDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicHopefulnessTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicHopefulnessTone([
      { topic: 'values', signal: 'hopeful' },
      { topic: 'family', signal: 'hopeless' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
