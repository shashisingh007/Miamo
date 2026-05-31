import { describe, it, expect } from 'vitest';
import { summarizeDtmTopicPatienceWeight, impatientDtmTopics } from '../dtmTopicPatienceWeight';
import { DTM_TOPIC_KEYS } from '../dtmTopics';

describe('summarizeDtmTopicPatienceWeight', () => {
  it('16 canonical', () => {
    const r = summarizeDtmTopicPatienceWeight([]);
    expect(r).toHaveLength(16);
    expect(r.map((x) => x.topic)).toEqual(DTM_TOPIC_KEYS);
  });

  it('empty => untested', () => {
    expect(summarizeDtmTopicPatienceWeight([]).every((x) => x.band === 'untested')).toBe(true);
  });

  it('patient', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'patient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('patient');
  });

  it('composed => mixed', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'composed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('mixed', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'mixed' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('mixed');
  });

  it('hurried => impatient', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'hurried' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('impatient', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'impatient' }]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('impatient');
  });

  it('mid => hurried', () => {
    const r = summarizeDtmTopicPatienceWeight([
      { topic: 'values', signal: 'patient' },
      { topic: 'values', signal: 'impatient' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.band).toBe('hurried');
  });

  it('unknown topic ignored', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'x', signal: 'patient' }]);
    expect(r.every((x) => x.n === 0)).toBe(true);
  });

  it('unknown signal ignored', () => {
    const r = summarizeDtmTopicPatienceWeight([{ topic: 'values', signal: 'q' as any }]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(0);
  });

  it('counts n', () => {
    const r = summarizeDtmTopicPatienceWeight([
      { topic: 'values', signal: 'patient' },
      { topic: 'values', signal: 'hurried' },
    ]);
    expect(r.find((x) => x.topic === 'values')!.n).toBe(2);
  });

  it('impatientDtmTopics filter', () => {
    const r = summarizeDtmTopicPatienceWeight([
      { topic: 'values', signal: 'impatient' },
      { topic: 'family', signal: 'hurried' },
      { topic: 'finance', signal: 'patient' },
    ]);
    expect(impatientDtmTopics(r).length).toBe(2);
  });

  it('anchors', () => {
    const r = summarizeDtmTopicPatienceWeight([]);
    expect(r[0].topic).toBe('values');
    expect(r[15].topic).toBe('future');
  });

  it('score in [0,1]', () => {
    const r = summarizeDtmTopicPatienceWeight([
      { topic: 'values', signal: 'patient' },
      { topic: 'family', signal: 'impatient' },
    ]);
    for (const x of r) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });
});
