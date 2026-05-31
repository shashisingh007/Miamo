import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSincerityTone, insincereDtmTopics } from '../dtmTopicSincerityTone';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSincerityTone', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSincerityTone([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSincerityTone([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('sincere => sincere', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'sincere' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('sincere');
  });

  it('genuine => mixed', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'genuine' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('performative => insincere', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'performative' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('insincere');
  });

  it('insincere => insincere', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'insincere' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('insincere');
  });

  it('mixed midpoint => performative', () => {
    const r = summarizeDtmTopicSincerityTone([
      { topic: 'values', signal: 'sincere' },
      { topic: 'values', signal: 'insincere' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('performative');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'x', signal: 'sincere' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSincerityTone([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSincerityTone([
      { topic: 'values', signal: 'sincere' },
      { topic: 'values', signal: 'performative' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('insincereDtmTopics filter', () => {
    const r = summarizeDtmTopicSincerityTone([
      { topic: 'values', signal: 'insincere' },
      { topic: 'family', signal: 'performative' },
      { topic: 'finance', signal: 'sincere' },
    ]);
    expect(insincereDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicSincerityTone([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSincerityTone([
      { topic: 'values', signal: 'sincere' },
      { topic: 'family', signal: 'insincere' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
