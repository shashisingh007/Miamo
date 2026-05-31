import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicMatteringSignal, devaluedDtmTopics } from '../dtmTopicMatteringSignal';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicMatteringSignal', () => {
  it('returns 16 in canonical order', () => {
    const r = summarizeDtmTopicMatteringSignal([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicMatteringSignal([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('central => mattering', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'central' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('mattering');
  });

  it('mattering (0.8) => incidental', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'mattering' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('incidental');
  });

  it('incidental => incidental', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'incidental' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('incidental');
  });

  it('invisible => devalued', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'invisible' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('devalued');
  });

  it('devalued => devalued', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'devalued' }]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('devalued');
  });

  it('mixed 0.5 => invisible', () => {
    const r = summarizeDtmTopicMatteringSignal([
      { topic: 'communication', signal: 'central' },
      { topic: 'communication', signal: 'devalued' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.band).toBe('invisible');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'x', signal: 'central' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicMatteringSignal([{ topic: 'communication', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicMatteringSignal([
      { topic: 'communication', signal: 'central' },
      { topic: 'communication', signal: 'mattering' },
    ]);
    expect(r.find((x) => x.topic === 'communication')!.n).toBe(2);
  });

  it('devaluedDtmTopics filters', () => {
    const r = summarizeDtmTopicMatteringSignal([
      { topic: 'communication', signal: 'devalued' },
      { topic: 'family', signal: 'invisible' },
      { topic: 'finance', signal: 'central' },
    ]);
    expect(devaluedDtmTopics(r).length).toBe(2);
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicMatteringSignal([
      { topic: 'communication', signal: 'central' },
      { topic: 'family', signal: 'devalued' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicMatteringSignal([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });
});
