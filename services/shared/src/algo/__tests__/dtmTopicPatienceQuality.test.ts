import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPatienceQuality, impatientDtmTopics } from '../dtmTopicPatienceQuality';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPatienceQuality', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPatienceQuality([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPatienceQuality([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('patient => patient', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'patient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('patient');
  });

  it('steady => mixed', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'steady' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed => mixed', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('restless => impatient', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'restless' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('impatient => impatient', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'impatient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('mixed midpoint => restless', () => {
    const r = summarizeDtmTopicPatienceQuality([
      { topic: 'values', signal: 'patient' },
      { topic: 'values', signal: 'impatient' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('restless');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'x', signal: 'patient' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPatienceQuality([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPatienceQuality([
      { topic: 'values', signal: 'patient' },
      { topic: 'values', signal: 'restless' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('impatientDtmTopics filter', () => {
    const r = summarizeDtmTopicPatienceQuality([
      { topic: 'values', signal: 'impatient' },
      { topic: 'family', signal: 'restless' },
      { topic: 'finance', signal: 'patient' },
    ]);
    expect(impatientDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicPatienceQuality([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicPatienceQuality([
      { topic: 'values', signal: 'patient' },
      { topic: 'family', signal: 'impatient' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
