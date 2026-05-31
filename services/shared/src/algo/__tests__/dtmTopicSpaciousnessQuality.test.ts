import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicSpaciousnessQuality, suffocatingDtmTopics } from '../dtmTopicSpaciousnessQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicSpaciousnessQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicSpaciousnessQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('expansive => roomy', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'expansive' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('roomy');
  });

  it('roomy => snug', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'roomy' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('snug');
  });

  it('snug => snug', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'snug' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('snug');
  });

  it('cramped => suffocating', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'cramped' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('suffocating');
  });

  it('suffocating => suffocating', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'suffocating' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('suffocating');
  });

  it('mixed 0.5 => cramped', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([
      { topic: 'values', signal: 'expansive' },
      { topic: 'values', signal: 'suffocating' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('cramped');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'x', signal: 'roomy' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([
      { topic: 'values', signal: 'roomy' },
      { topic: 'values', signal: 'snug' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('suffocatingDtmTopics filters', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([
      { topic: 'values', signal: 'suffocating' },
      { topic: 'family', signal: 'cramped' },
      { topic: 'finance', signal: 'expansive' },
    ]);
    expect(suffocatingDtmTopics(r).length).toBe(2);
  });

  it('canonical anchors', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicSpaciousnessQuality([
      { topic: 'values', signal: 'expansive' },
      { topic: 'family', signal: 'suffocating' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
